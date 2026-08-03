import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { wraps } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ wraps: [], credits: user.credits });
    }

    const userWraps = await db.select()
      .from(wraps)
      .where(eq(wraps.userId, user.id))
      .orderBy(desc(wraps.createdAt));

    const parsedWraps = userWraps.map((w) => {
      let parsed = {};
      try {
        parsed = JSON.parse(w.result);
      } catch {
        /* ignore json parse error */
      }
      return {
        ...w,
        result: parsed,
      };
    });

    return NextResponse.json({ wraps: parsedWraps, credits: user.credits });
  } catch (error) {
    console.error("Error fetching user wraps:", error);
    return NextResponse.json({ wraps: [], credits: 0, error: "Failed to fetch wraps" });
  }
}
