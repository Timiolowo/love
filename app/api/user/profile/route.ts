import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as { name?: string };
    const name = body.name?.trim();

    if (!name || name.length > 60) {
      return NextResponse.json({ error: "Please enter a valid display name." }, { status: 400 });
    }

    try {
      const db = getDb();
      await db.update(users).set({ name, updatedAt: Date.now() }).where(eq(users.id, user.id));
    } catch {
      /* fallback if D1 update fails */
    }

    const updatedUser = { ...user, name };
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
