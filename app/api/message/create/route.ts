import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { anonChats, anonMessages, users } from "@/db/schema";
import { generateShareId } from "@/lib/share";
import { saveDevChat, saveDevMessage } from "@/lib/anonStore";
import { eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const body = (await request.json()) as {
      intent?: string;
      message?: string;
      phone?: string;
      recipientName?: string;
      recipient_name?: string;
      paymentRef?: string;
    };

    const intent = body.intent?.trim() || "Apologise";
    const initialMessage = body.message?.trim();
    const phone = body.phone?.trim() || "";
    const recipientName = (body.recipientName || body.recipient_name || "").trim();

    if (!initialMessage || initialMessage.length < 3) {
      return NextResponse.json({ error: "Please enter a message to send." }, { status: 400 });
    }

    const db = getDb();

    // Check & deduct credits if user is logged in
    if (user && db) {
      if (user.credits <= 0) {
        return NextResponse.json({ error: "You have 0 credits. Please get more credits to send a message." }, { status: 402 });
      }
      try {
        await db
          .update(users)
          .set({
            credits: sql`MAX(0, ${users.credits} - 1)`,
            updatedAt: Date.now(),
          })
          .where(eq(users.id, user.id));
      } catch (e) {
        console.warn("Could not deduct credits in DB:", e);
      }
    }

    const chatId = `ac_${generateShareId(10)}`;
    const senderToken = `stk_${generateShareId(16)}`;
    const recipientToken = `rtk_${generateShareId(16)}`;
    const now = Date.now();
    const expiresAt = now + 14 * 24 * 60 * 60 * 1000; // 14 days

    const chatRecord = {
      id: chatId,
      senderId: user?.id || null,
      recipientName: recipientName || null,
      recipientPhone: phone || null,
      intent,
      initialMessage,
      status: "pending" as const,
      senderRevealed: 0,
      recipientRevealed: 0,
      senderToken,
      recipientToken,
      createdAt: now,
      expiresAt,
    };

    const initialMsgRecord = {
      id: `am_${generateShareId(12)}`,
      chatId,
      senderRole: "sender" as const,
      text: initialMessage,
      createdAt: now,
    };

    // Save to dev memory store
    saveDevChat(chatRecord);
    saveDevMessage(initialMsgRecord);

    // Save to D1 DB if active
    if (db) {
      try {
        await db.insert(anonChats).values(chatRecord);
        await db.insert(anonMessages).values(initialMsgRecord);
      } catch (e) {
        console.warn("D1 chat insert warning:", e);
      }
    }

    const origin = request.headers.get("origin") || request.headers.get("referer") || "http://localhost:3000";
    const hostOrigin = new URL(origin).origin;
    const inviteLink = `${hostOrigin}/message/view/${chatId}?token=${recipientToken}`;
    const senderLink = `${hostOrigin}/message/room/${chatId}?token=${senderToken}`;

    const greeting = recipientName ? `Hello ${recipientName}` : "Hello";
    const whatsappText = encodeURIComponent(
      `💌 ${greeting}, someone wants to ${intent.toLowerCase()} with you on Unsaid...\n\nClick to view and choose whether to accept or decline:\n${inviteLink}`
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
