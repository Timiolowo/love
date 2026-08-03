import { NextResponse } from "next/server";
import { getCurrentUser, createLogoutCookie } from "@/lib/auth";
import { getDb } from "@/db";
import { users, claimedTrials } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    if (db) {
      // 1. Record email in claimedTrials to prevent re-claiming free trial credits upon re-registering
      try {
        await db.insert(claimedTrials).values({
          email: user.email.toLowerCase(),
          claimedAt: Date.now(),
        });
      } catch {
        /* ignore duplicate key error if already recorded */
      }

      // 2. Delete user row from database
      await db.delete(users).where(eq(users.id, user.id));
    }

    // 3. Clear session cookie
    const response = NextResponse.json({ success: true, message: "Account deleted successfully." });
    response.headers.set("Set-Cookie", createLogoutCookie());
    return response;
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
