import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { anonChats, anonMessages, users } from "@/db/schema";
import { generateShareId } from "@/lib/share";
import { eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const body = (await request.json()) as {
      intent?: string;
      message?: string;
      phone?: string;
      paymentRef?: string;
    };

    const intent = body.intent?.trim() || "Apologise";
    const initialMessage = body.message?.trim();
    const phone = body.phone?.trim() || "";

    if (!initialMessage || initialMessage.length < 3) {
      return NextResponse.json({ error: "Please enter a message to send." }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable. Please try again." }, { status: 503 });
    }

    // Check & deduct credits if user is logged in
    if (user) {
      if (user.credits <= 0) {
        return NextResponse.json({ error: "You have 0 credits. Please get more credits to send a message." }, { status: 402 });
      }
      await db
        .update(users)
        .set({
          credits: sql`MAX(0, ${users.credits} - 1)`,
          updatedAt: Date.now(),
        })
        .where(eq(users.id, user.id));
    }

    const chatId = `ac_${generateShareId(10)}`;
    const senderToken = `stk_${generateShareId(16)}`;
    const recipientToken = `rtk_${generateShareId(16)}`;
    const now = Date.now();
    const expiresAt = now + 14 * 24 * 60 * 60 * 1000; // 14 days

    // Insert room into DB
    await db.insert(anonChats).values({
      id: chatId,
      senderId: user?.id || null,
      recipientPhone: phone || null,
      intent,
      initialMessage,
      status: "pending",
      senderRevealed: 0,
      recipientRevealed: 0,
      senderToken,
      recipientToken,
      createdAt: now,
      expiresAt,
    });

    // Insert initial message into DB
    await db.insert(anonMessages).values({
      id: `am_${generateShareId(12)}`,
      chatId,
      senderRole: "sender",
      text: initialMessage,
      createdAt: now,
    });

    const origin = request.headers.get("origin") || request.headers.get("referer") || "http://localhost:3000";
    const hostOrigin = new URL(origin).origin;
    const inviteLink = `${hostOrigin}/message/view/${chatId}?token=${recipientToken}`;
    const senderLink = `${hostOrigin}/message/room/${chatId}?token=${senderToken}`;

    const whatsappText = encodeURIComponent(
      `🔒 You have received a private anonymous message ("${intent}").\n\nClick to view and choose whether to accept or decline:\n${inviteLink}`
    );
    const whatsappUrl = phone
      ? `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${whatsappText}`
      : `https://wa.me/?text=${whatsappText}`;

    return NextResponse.json({
      chatId,
      senderToken,
      recipientToken,
      inviteLink,
      senderLink,
      whatsappUrl,
      remainingCredits: user ? Math.max(0, user.credits - 1) : 0,
    });
  } catch (error) {
    console.error("Error creating anonymous chat:", error);
    const message = error instanceof Error ? error.message : "Failed to create anonymous message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
