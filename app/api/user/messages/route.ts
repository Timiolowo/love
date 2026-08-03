import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { anonChats } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ chats: [] });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ chats: [] });
    }

    const userChats = await db
      .select({
        id: anonChats.id,
        intent: anonChats.intent,
        status: anonChats.status,
        recipientName: anonChats.recipientName,
        senderToken: anonChats.senderToken,
        createdAt: anonChats.createdAt,
        initialMessage: anonChats.initialMessage,
      })
      .from(anonChats)
      .where(eq(anonChats.senderId, user.id))
      .orderBy(desc(anonChats.createdAt));

    return NextResponse.json({ chats: userChats });
  } catch (error) {
    console.error("Error fetching user active chats:", error);
    return NextResponse.json({ chats: [] });
  }
}
