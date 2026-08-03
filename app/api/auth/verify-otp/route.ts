import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSessionCookie } from "@/lib/auth";
import { generateShareId } from "@/lib/share";
import { otpStore } from "../send-otp/route";

// Fallback in-memory store for local dev
const memoryUsers = new Map<string, { id: string; email: string; credits: number; createdAt: number; updatedAt: number }>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; code?: string };
    const email = body.email?.trim().toLowerCase();
    const code = body.code?.trim();

    if (!email || !code) {
      return NextResponse.json({ error: "Please enter your email and 6-digit verification code." }, { status: 400 });
    }

    const record = otpStore.get(email);

    if (!record) {
      return NextResponse.json({ error: "Verification code not found. Please request a new code." }, { status: 400 });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return NextResponse.json({ error: "Verification code has expired. Please request a new code." }, { status: 400 });
    }

    if (record.code !== code) {
      return NextResponse.json({ error: "Invalid 6-digit verification code. Please check and try again." }, { status: 400 });
    }

    // Code verified! Delete OTP record to prevent reuse
    otpStore.delete(email);

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
            credits: 1, // 1 free credit on sign up!
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
          credits: 1,
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
    console.error("Verify OTP error:", error);
    return NextResponse.json({ error: "Failed to verify code." }, { status: 500 });
  }
}
