import { getDb } from "@/db";
import { users, type User } from "@/db/schema";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "unsaid_session";

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const [key, ...value] = pair.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(value.join("="));
  }
  return cookies;
}

export async function getCurrentUser(request: Request): Promise<User | null> {
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies[COOKIE_NAME];
  if (!sessionToken) return null;

  try {
    const db = getDb();
    if (db) {
      const [user] = await db.select().from(users).where(eq(users.id, sessionToken)).limit(1);
      if (user) return user;
    }
  } catch {
    /* ignore db error for fallback */
  }

  // Fallback user object if sessionToken starts with "usr_"
  if (sessionToken.startsWith("usr_")) {
    return {
      id: sessionToken,
      email: "user@example.com",
      credits: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  return null;
}

export function createSessionCookie(userId: string): string {
  const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
  return `${COOKIE_NAME}=${userId}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`;
}

export function createLogoutCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}
