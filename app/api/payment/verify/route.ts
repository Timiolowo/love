import { NextResponse } from "next/server";
import { verifyPaystackPayment } from "@/lib/paystack";
import { getDb } from "@/db";
import { payments, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  const planType = url.searchParams.get("planType") || "account_bundle";

  if (!reference) {
    return NextResponse.redirect(new URL("/insights?error=missing_reference", request.url));
  }

  try {
    const paystackResult = await verifyPaystackPayment(reference);

    if (paystackResult.status && paystackResult.data?.status === "success") {
      const db = getDb();
      if (db) {
        // Fetch payment record FIRST to check status and avoid duplicate credit awards
        const [payment] = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);

        if (payment && payment.status !== "success") {
          // Update payment record in D1
          await db.update(payments)
            .set({ status: "success" })
            .where(eq(payments.reference, reference));

          if (payment.userId && planType === "account_bundle") {
            // Add 3 wrap credits to user
            await db.update(users)
              .set({
                credits: sql`${users.credits} + 3`,
                updatedAt: Date.now(),
              })
              .where(eq(users.id, payment.userId));
          } else if (payment.guestEmail && planType === "account_bundle") {
            // If account bundle bought by email, give credits to user by email
            const [existingUser] = await db.select().from(users).where(eq(users.email, payment.guestEmail)).limit(1);
            if (existingUser) {
              await db.update(users)
                .set({
                  credits: sql`${users.credits} + 3`,
                  updatedAt: Date.now(),
                })
                .where(eq(users.id, existingUser.id));
            }
          }
        }
      }

      const redirectTarget = planType === "account_bundle" ? "/dashboard?payment=success" : "/insights?payment=success&ref=" + encodeURIComponent(reference);
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    } else {
      return NextResponse.redirect(new URL("/insights?error=payment_failed", request.url));
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.redirect(new URL("/insights?error=payment_error", request.url));
  }
}
