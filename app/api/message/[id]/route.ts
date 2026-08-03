import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { anonChats, anonMessages, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { generateShareId } from "@/lib/share";
import {
  getDevChat,
  getDevMessages,
  saveDevMessage,
  updateDevChatStatus,
  updateDevChatReveal,
  AnonChatRecord,
  AnonMessageRecord,
} from "@/lib/anonStore";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    let chat: AnonChatRecord | null = null;
    let messages: AnonMessageRecord[] = [];
    const db = getDb();

    if (db) {
      try {
        const [d1Chat] = await db.select().from(anonChats).where(eq(anonChats.id, id)).limit(1);
        if (d1Chat) {
          chat = {
            id: d1Chat.id,
            senderId: d1Chat.senderId,
            recipientPhone: d1Chat.recipientPhone,
            intent: d1Chat.intent,
            initialMessage: d1Chat.initialMessage,
            status: d1Chat.status as "pending" | "accepted" | "declined",
            senderRevealed: d1Chat.senderRevealed,
            recipientRevealed: d1Chat.recipientRevealed,
            senderToken: d1Chat.senderToken,
            recipientToken: d1Chat.recipientToken,
            createdAt: d1Chat.createdAt,
            expiresAt: d1Chat.expiresAt,
          };
          const d1Msgs = await db.select()
            .from(anonMessages)
            .where(eq(anonMessages.chatId, id))
            .orderBy(asc(anonMessages.createdAt));
          messages = d1Msgs as AnonMessageRecord[];
        }
      } catch (e) {
        console.warn("D1 chat read warning:", e);
      }
    }

    // Fallback to dev store if not in D1
    if (!chat) {
      const devChat = getDevChat(id);
      if (devChat) {
        chat = devChat;
        messages = getDevMessages(id);
      }
    }

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

    // Lookup sender email & name if mutually revealed
    let senderEmail: string | null = null;
    let senderName: string | null = null;
    const bothRevealed = chat.senderRevealed === 1 && chat.recipientRevealed === 1;

    if (bothRevealed && chat.senderId && db) {
      try {
        const [sUser] = await db.select().from(users).where(eq(users.id, chat.senderId)).limit(1);
        if (sUser) {
          senderEmail = sUser.email;
          senderName = sUser.name || sUser.email.split("@")[0];
        }
      } catch {
        /* ignore */
      }
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
        recipientName: chat.recipientName || null,
        initialMessageTeaser: chat.initialMessage
          ? chat.initialMessage.slice(0, 45) + (chat.initialMessage.length > 45 ? "..." : "")
          : null,
        myRevealed: isSender ? chat.senderRevealed === 1 : chat.recipientRevealed === 1,
        theirRevealed: isSender ? chat.recipientRevealed === 1 : chat.senderRevealed === 1,
        bothRevealed,
        senderEmail,
        senderName,
        disruptedAt: chat.disruptedAt || null,
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

    let chat: AnonChatRecord | null = null;
    const db = getDb();

    if (db) {
      try {
        const [d1Chat] = await db.select().from(anonChats).where(eq(anonChats.id, id)).limit(1);
        if (d1Chat) {
          chat = {
            id: d1Chat.id,
            senderId: d1Chat.senderId,
            recipientPhone: d1Chat.recipientPhone,
            intent: d1Chat.intent,
            initialMessage: d1Chat.initialMessage,
            status: d1Chat.status as "pending" | "accepted" | "declined",
            senderRevealed: d1Chat.senderRevealed,
            recipientRevealed: d1Chat.recipientRevealed,
            senderToken: d1Chat.senderToken,
            recipientToken: d1Chat.recipientToken,
            createdAt: d1Chat.createdAt,
            expiresAt: d1Chat.expiresAt,
          };
        }
      } catch {
        /* ignore */
      }
    }

    if (!chat) {
      chat = getDevChat(id) || null;
    }

    if (!chat) {
      return NextResponse.json({ error: "Chat room not found." }, { status: 404 });
    }

    const isSender = token === chat.senderToken;
    const isRecipient = token === chat.recipientToken;

    if (!isSender && !isRecipient) {
      return NextResponse.json({ error: "Invalid token." }, { status: 403 });
    }

    const role = isSender ? "sender" : "recipient";

    if (action === "accept" || action === "decline") {
      const newStatus = action === "accept" ? "accepted" : "declined";
      updateDevChatStatus(id, newStatus);
      if (db) {
        try {
          await db.update(anonChats).set({ status: newStatus }).where(eq(anonChats.id, id));
        } catch (e) {
          console.warn("DB update error:", e);
        }
      }
      return NextResponse.json({ success: true, status: newStatus });
    }

    if (action === "disrupt") {
      if (!isSender) {
        return NextResponse.json({ error: "Only the sender can disrupt this conversation." }, { status: 403 });
      }

      const now = Date.now();
      updateDevChatStatus(id, "disrupted", now);
      const systemMsgRecord = {
        id: `am_${generateShareId(12)}`,
        chatId: id,
        senderRole: "system" as const,
        text: "🛑 System Notice: The sender has disrupted and ended this conversation. This chat room will close in 15 seconds.",
        createdAt: now,
      };
      saveDevMessage(systemMsgRecord);

      if (db) {
        try {
          await db.update(anonChats).set({ status: "disrupted", disruptedAt: now }).where(eq(anonChats.id, id));
          await db.insert(anonMessages).values(systemMsgRecord);
        } catch (e) {
          console.warn("DB disrupt update error:", e);
        }
      }
      return NextResponse.json({ success: true, status: "disrupted", disruptedAt: now });
    }

    if (action === "reply") {
      const text = body.text?.trim();
      if (!text) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });

      if (chat.status !== "accepted") {
        return NextResponse.json({ error: "Cannot send reply until recipient accepts the message." }, { status: 400 });
      }

      const msgRecord = {
        id: `am_${generateShareId(12)}`,
        chatId: id,
        senderRole: role as "sender" | "recipient",
        text,
        createdAt: Date.now(),
      };

      saveDevMessage(msgRecord);

      if (db) {
        try {
          await db.insert(anonMessages).values(msgRecord);
        } catch (e) {
          console.warn("DB msg insert error:", e);
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === "reveal") {
      updateDevChatReveal(id, role);
      if (db) {
        try {
          if (isSender) {
            await db.update(anonChats).set({ senderRevealed: 1 }).where(eq(anonChats.id, id));
          } else {
            await db.update(anonChats).set({ recipientRevealed: 1 }).where(eq(anonChats.id, id));
          }
        } catch (e) {
          console.warn("DB reveal update error:", e);
        }
      }

      const updatedChat = getDevChat(id) || chat;
      const bothRevealed = updatedChat.senderRevealed === 1 && updatedChat.recipientRevealed === 1;

      return NextResponse.json({ success: true, bothRevealed });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Error in anon chat action:", error);
    return NextResponse.json({ error: "Operation failed." }, { status: 500 });
  }
}
