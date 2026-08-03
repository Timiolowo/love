import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSessionCookie } from "@/lib/auth";
import { generateShareId } from "@/lib/share";
import { env } from "cloudflare:workers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=google_auth_failed`);
  }

  const workerEnv = (env as unknown as Record<string, string>) || {};
  const clientId = workerEnv.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = workerEnv.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json() as { access_token?: string; id_token?: string };
    if (!tokenData.access_token) {
      throw new Error("Failed to exchange code for token.");
    }

    // Fetch user info from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json() as { email?: string; name?: string };

    const email = googleUser.email?.trim().toLowerCase();
    if (!email) throw new Error("No email found in Google profile.");

    let user: { id: string; email: string; credits: number; createdAt: number; updatedAt: number } | null = null;

    try {
      const db = getDb();
      if (db) {
        const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existing) {
          user = existing;
        } else {
          const newUserId = `usr_${generateShareId(12)}`;
          const now = Date.now();
          await db.insert(users).values({
            id: newUserId,
            email,
            credits: 1, // 1 free credit for sign up!
            createdAt: now,
            updatedAt: now,
          });
          const [inserted] = await db.select().from(users).where(eq(users.id, newUserId)).limit(1);
          user = inserted || { id: newUserId, email, credits: 1, createdAt: now, updatedAt: now };
        }
      }
    } catch {
      /* ignore db error */
    }

    if (!user) {
      user = {
        id: `usr_${generateShareId(12)}`,
        email,
        credits: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    return NextResponse.redirect(`${origin}/dashboard?auth=success`, {
      headers: {
        "Set-Cookie": createSessionCookie(user.id),
      },
    });
  } catch (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(`${origin}/?error=google_login_failed`);
  }
}
