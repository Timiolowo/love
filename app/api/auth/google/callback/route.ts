import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, claimedTrials } from "@/db/schema";
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
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

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

    const tokenData = (await tokenRes.json()) as { access_token?: string; id_token?: string };
    if (!tokenData.access_token) {
      throw new Error("Failed to exchange code for token.");
    }

    // Fetch user info from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = (await userRes.json()) as { email?: string; name?: string; given_name?: string };

    const email = googleUser.email?.trim().toLowerCase();
    if (!email) throw new Error("No email found in Google profile.");

    const googleName = googleUser.name || googleUser.given_name || email.split("@")[0];
    let isNewUser = false;
    let user: { id: string; email: string; name?: string | null; credits: number; createdAt: number; updatedAt: number } | null = null;

    try {
      const db = getDb();
      if (db) {
        const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existing) {
          user = existing;
          // Update name if missing
          if (!existing.name && googleName) {
            await db.update(users).set({ name: googleName, updatedAt: Date.now() }).where(eq(users.id, existing.id));
            user.name = googleName;
          }
        } else {
          isNewUser = true;
          const newUserId = `usr_${generateShareId(12)}`;
          const now = Date.now();

          // Check if email has previously claimed a trial
          let initialCredits = 1;
          try {
            const [claimed] = await db.select().from(claimedTrials).where(eq(claimedTrials.email, email)).limit(1);
            if (claimed) {
              initialCredits = 0;
            } else {
              await db.insert(claimedTrials).values({ email, claimedAt: now });
            }
          } catch {
            /* ignore trial check error */
          }

          await db.insert(users).values({
            id: newUserId,
            email,
            name: googleName,
            credits: initialCredits,
            createdAt: now,
            updatedAt: now,
          });
          const [inserted] = await db.select().from(users).where(eq(users.id, newUserId)).limit(1);
          user = inserted || { id: newUserId, email, name: googleName, credits: initialCredits, createdAt: now, updatedAt: now };
        }
      }
    } catch {
      /* ignore db error */
    }

    if (!user) {
      user = {
        id: `usr_${generateShareId(12)}`,
        email,
        name: googleName,
        credits: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }

    const redirectUrl = isNewUser ? `${origin}/profile?welcome=true` : `${origin}/profile?auth=success`;

    const response = NextResponse.redirect(redirectUrl);
    response.headers.set("Set-Cookie", createSessionCookie(user.id));
    try {
      response.cookies.set("unsaid_session", user.id, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60,
      });
    } catch {
      /* ignore if cookies.set unavailable */
    }

    return response;
  } catch (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(`${origin}/?error=google_login_failed`);
  }
}
