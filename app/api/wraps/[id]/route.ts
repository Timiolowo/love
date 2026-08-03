import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { wraps } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }

    // Look up by shareId or primary id
    const [wrap] = await db.select()
      .from(wraps)
      .where(eq(wraps.shareId, id))
      .limit(1);

    if (!wrap) {
      return NextResponse.json({ error: "Wrapped report not found." }, { status: 404 });
    }

    if (wrap.isDisabled === 1) {
      return NextResponse.json({ error: "This share link has been disabled by the creator." }, { status: 403 });
    }

    const isExpired = Date.now() > wrap.expiresAt;
    let parsedResult = {};
    try {
      parsedResult = JSON.parse(wrap.result);
    } catch {
      /* ignore JSON parse error */
    }

    return NextResponse.json({
      wrap: {
        ...wrap,
        result: parsedResult,
        isExpired,
      },
    });
  } catch (error) {
    console.error("Error fetching wrap:", error);
    return NextResponse.json({ error: "Failed to load report." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }

    const [wrap] = await db.select()
      .from(wraps)
      .where(and(eq(wraps.shareId, id), eq(wraps.userId, user.id)))
      .limit(1);

    if (!wrap) {
      return NextResponse.json({ error: "Wrap not found or forbidden." }, { status: 404 });
    }

    await db.delete(wraps).where(eq(wraps.id, wrap.id));

    return NextResponse.json({ success: true, message: "Wrap permanently deleted." });
  } catch (error) {
    console.error("Error deleting wrap:", error);
    return NextResponse.json({ error: "Failed to delete wrap." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  // Claim guest wrap to logged-in account
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Sign in required to claim wrap to your account." }, { status: 401 });
    }

    const { id } = await props.params;
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }

    const [wrap] = await db.select()
      .from(wraps)
      .where(eq(wraps.shareId, id))
      .limit(1);

    if (!wrap) {
      return NextResponse.json({ error: "Wrap not found." }, { status: 404 });
    }

    if (wrap.userId && wrap.userId !== user.id) {
      return NextResponse.json({ error: "This wrap is already owned by another account." }, { status: 403 });
    }

    // Attach user_id to wrap
    await db.update(wraps)
      .set({ userId: user.id })
      .where(eq(wraps.id, wrap.id));

    return NextResponse.json({ success: true, shareId: wrap.shareId });
  } catch (error) {
    console.error("Error claiming wrap:", error);
    return NextResponse.json({ error: "Failed to claim wrap." }, { status: 500 });
  }
}
