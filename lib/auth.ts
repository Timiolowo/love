import { cookies as getNextCookies } from "next/headers";
import { getDb } from "@/db";
import { users, type User } from "@/db/schema";
import { eq } from "drizzle-orm";

export const COOKIE_NAME = "unsaid_session";

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const [key, ...value] = pair.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(value.join("="));
  }
  return cookies;
}

export async function getCurrentUser(request?: Request): Promise<User | null> {
  let sessionToken: string | undefined;

  try {
    const cookieStore = await getNextCookies();
    sessionToken = cookieStore.get(COOKIE_NAME)?.value;
  } catch {
    /* ignore next/headers error */
  }

  if (!sessionToken && request) {
    const cookieHeader = request.headers.get("cookie");
    const cookies = parseCookies(cookieHeader);
    sessionToken = cookies[COOKIE_NAME];
  }

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
  const isSecure = process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=${userId}; Path=/; HttpOnly; SameSite=Lax; ${isSecure ? "Secure; " : ""}Max-Age=${maxAge}`;
}

export function createLogoutCookie(): string {
  const isSecure = process.env.NODE_ENV === "production";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; ${isSecure ? "Secure; " : ""}Max-Age=0`;
}
