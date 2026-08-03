import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { anonChats, anonMessages, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { generateShareId } from "@/lib/share";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }

    const [chat] = await db.select().from(anonChats).where(eq(anonChats.id, id)).limit(1);

    if (!chat) {
      return NextResponse.json({ error: "Anonymous message room not found." }, { status: 404 });
    }

    const isSender = token === chat.senderToken;
    const isRecipient = token === chat.recipientToken;

    if (!isSender && !isRecipient) {
      return NextResponse.json({ error: "Invalid token for this private message." }, { status: 403 });
    }

    const role = isSender ? "sender" : "recipient";
    const isExpired = Date.now() > chat.expiresAt;

    // Fetch messages
    const messages = await db.select()
      .from(anonMessages)
      .where(eq(anonMessages.chatId, id))
      .orderBy(asc(anonMessages.createdAt));

    // Lookup sender email if mutually revealed
    let senderEmail: string | null = null;
    const bothRevealed = chat.senderRevealed === 1 && chat.recipientRevealed === 1;

    if (bothRevealed && chat.senderId) {
      const [sUser] = await db.select().from(users).where(eq(users.id, chat.senderId)).limit(1);
      if (sUser) senderEmail = sUser.email;
    }

    return NextResponse.json({
      chat: {
        id: chat.id,
        intent: chat.intent,
        status: chat.status,
        createdAt: chat.createdAt,
        expiresAt: chat.expiresAt,
        isExpired,
        role,
        myRevealed: isSender ? chat.senderRevealed === 1 : chat.recipientRevealed === 1,
        theirRevealed: isSender ? chat.recipientRevealed === 1 : chat.senderRevealed === 1,
        bothRevealed,
        senderEmail,
      },
      messages,
    });
  } catch (error) {
    console.error("Error fetching anon chat:", error);
    return NextResponse.json({ error: "Failed to load chat." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json() as {
      token?: string;
      action?: "accept" | "decline" | "reply" | "reveal";
      text?: string;
    };

    const token = body.token;
    const action = body.action;

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }

    const [chat] = await db.select().from(anonChats).where(eq(anonChats.id, id)).limit(1);

    if (!chat) {
      return NextResponse.json({ error: "Chat room not found." }, { status: 404 });
    }

    const isSender = token === chat.senderToken;
    const isRecipient = token === chat.recipientToken;

    if (!isSender && !isRecipient) {
      return NextResponse.json({ error: "Invalid token." }, { status: 403 });
    }

    const role = isSender ? "sender" : "recipient";

    if (action === "accept") {
      await db.update(anonChats).set({ status: "accepted" }).where(eq(anonChats.id, id));
      return NextResponse.json({ success: true, status: "accepted" });
    }

    if (action === "decline") {
      await db.update(anonChats).set({ status: "declined" }).where(eq(anonChats.id, id));
      return NextResponse.json({ success: true, status: "declined" });
    }

    if (action === "reply") {
      const text = body.text?.trim();
      if (!text) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });

      if (chat.status !== "accepted") {
        return NextResponse.json({ error: "Cannot send reply until recipient accepts the message." }, { status: 400 });
      }

      await db.insert(anonMessages).values({
        id: `am_${generateShareId(12)}`,
        chatId: id,
        senderRole: role,
        text,
        createdAt: Date.now(),
      });

      return NextResponse.json({ success: true });
    }

    if (action === "reveal") {
      if (isSender) {
        await db.update(anonChats).set({ senderRevealed: 1 }).where(eq(anonChats.id, id));
      } else {
        await db.update(anonChats).set({ recipientRevealed: 1 }).where(eq(anonChats.id, id));
      }

      const [updated] = await db.select().from(anonChats).where(eq(anonChats.id, id)).limit(1);
      const bothRevealed = updated.senderRevealed === 1 && updated.recipientRevealed === 1;

      return NextResponse.json({ success: true, bothRevealed });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Error in anon chat action:", error);
    return NextResponse.json({ error: "Operation failed." }, { status: 500 });
  }
}
