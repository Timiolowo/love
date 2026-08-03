import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSessionCookie } from "@/lib/auth";
import { generateShareId } from "@/lib/share";

// Fallback in-memory store for local dev if D1 binding is initializing
const memoryUsers = new Map<string, { id: string; email: string; credits: number; createdAt: number; updatedAt: number }>();

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    let user: { id: string; email: string; credits: number; createdAt: number; updatedAt: number } | null = null;
    let isNewUser = false;

    try {
      const db = getDb();
      if (db) {
        const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existing) {
          user = existing;
        } else {
          isNewUser = true;
          const newUserId = `usr_${generateShareId(12)}`;
          const now = Date.now();
          await db.insert(users).values({
            id: newUserId,
            email,
            credits: 1, // 1 free credit on sign up for free trial!
            createdAt: now,
            updatedAt: now,
          });
          const [inserted] = await db.select().from(users).where(eq(users.id, newUserId)).limit(1);
          user = inserted || { id: newUserId, email, credits: 1, createdAt: now, updatedAt: now };
        }
      }
    } catch (dbError) {
      console.warn("D1 database query failed, falling back to session store:", dbError);
    }

    if (!user) {
      let memUser = memoryUsers.get(email);
      if (!memUser) {
        isNewUser = true;
        memUser = {
          id: `usr_${generateShareId(12)}`,
          email,
          credits: 1, // 1 free credit on sign up for free trial!
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        memoryUsers.set(email, memUser);
      }
      user = memUser;
    }

    return NextResponse.json(
      { success: true, user, isNewUser },
      {
        headers: {
          "Set-Cookie": createSessionCookie(user.id),
        },
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    const message = error instanceof Error ? error.message : "Failed to sign in. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
