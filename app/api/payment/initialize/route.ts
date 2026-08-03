import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { initializePaystackPayment } from "@/lib/paystack";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { generateShareId } from "@/lib/share";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    const body = (await request.json()) as { planType?: string; email?: string; currency?: string; creditsCount?: number; userId?: string };

    const planType = body.planType === "guest_single" ? "guest_single" : "account_bundle";
    const currency = (body.currency || "NGN").toUpperCase();
    const email = user?.email || body.email?.trim().toLowerCase();
    const targetUserId = user?.id || body.userId || null;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required for payment." }, { status: 400 });
    }

    const requestedCredits = Math.max(3, Math.floor(Number(body.creditsCount) || 3));
    const creditsCount = planType === "guest_single" ? 1 : requestedCredits;

    // Amounts per credit / unit in minor units (kobo, cents, etc.)
    const ratePerUnitByCurrency: Record<string, { guest: number; perCredit: number }> = {
      NGN: { guest: 80000, perCredit: 50000 },
      USD: { guest: 150, perCredit: 100 },
      GHS: { guest: 1500, perCredit: 1000 },
      KES: { guest: 15000, perCredit: 10000 },
      ZAR: { guest: 2000, perCredit: 1333 },
    };

    const rates = ratePerUnitByCurrency[currency] || ratePerUnitByCurrency.NGN;
    const amount = planType === "guest_single" ? rates.guest : rates.perCredit * creditsCount;
    const reference = `unsaid_${planType}_${Date.now()}_${generateShareId(6)}`;

    const origin = request.headers.get("origin") || request.headers.get("referer") || "http://localhost:3000";
    const callbackUrl = `${new URL(origin).origin}/api/payment/verify?reference=${encodeURIComponent(reference)}&planType=${planType}&credits=${creditsCount}`;

    const paystackRes = await initializePaystackPayment({
      email,
      amount,
      currency,
      callbackUrl,
      metadata: {
        userId: targetUserId,
        planType,
        creditsCount,
        currency,
        email,
      },
    });

    if (!paystackRes.status || !paystackRes.data) {
      return NextResponse.json({ error: paystackRes.message || "Could not initialize payment." }, { status: 400 });
    }

    // Save pending payment record in D1
    try {
      const db = getDb();
      await db.insert(payments).values({
        id: `pay_${generateShareId(12)}`,
        userId: targetUserId,
        guestEmail: email,
        reference,
        planType,
        amount,
        status: "pending",
        createdAt: Date.now(),
      });
    } catch (dbError) {
      console.warn("Could not record pending payment to D1:", dbError);
    }

    return NextResponse.json({
      authorizationUrl: paystackRes.data.authorization_url,
      reference,
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    return NextResponse.json({ error: "Failed to initialize payment." }, { status: 500 });
  }
}
