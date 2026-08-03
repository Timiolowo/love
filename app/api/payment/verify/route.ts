import { NextResponse } from "next/server";
import { verifyPaystackPayment } from "@/lib/paystack";
import { getDb } from "@/db";
import { payments, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const url = new URL(request.url);
  
  // Paystack appends trxref=...&reference=... to callback URLs, causing duplicate 'reference' query parameters.
  // We prioritize our registered 'unsaid_' reference.
  const allRefs = url.searchParams.getAll("reference");
  const reference = allRefs.find((r) => r.startsWith("unsaid_")) || url.searchParams.get("trxref") || allRefs[0];

  if (!reference) {
    return NextResponse.redirect(new URL("/insights?error=missing_reference", request.url));
  }

  try {
    let paystackResult = await verifyPaystackPayment(reference);
    const trxref = url.searchParams.get("trxref");
    if ((!paystackResult.status || !paystackResult.data || paystackResult.data.status !== "success") && trxref && trxref !== reference) {
      console.log("Retrying Paystack verification with trxref fallback:", trxref);
      const fallbackResult = await verifyPaystackPayment(trxref);
      if (fallbackResult.status && fallbackResult.data?.status === "success") {
        paystackResult = fallbackResult;
      }
    }

    console.log("Paystack Verification Response for ref", reference, ":", JSON.stringify(paystackResult));

    const isSuccess = paystackResult.status && paystackResult.data?.status === "success";

    const planType = (
      (paystackResult.data?.metadata?.planType as string) ||
      url.searchParams.get("planType") ||
      (reference.includes("guest") ? "guest_single" : "account_bundle")
    );

    if (isSuccess) {
      // 1. SECURITY: Determine credits to award strictly from Paystack verified response
      const verifiedMetadataCredits = Number(paystackResult.data?.metadata?.creditsCount);
      const amountPaid = paystackResult.data?.amount || 0; // in kobo/cents
      const calculatedCredits = Math.max(1, Math.floor(amountPaid / 50000)); // ₦500 per credit (50,000 kobo)
      
      const creditsToAward = !isNaN(verifiedMetadataCredits) && verifiedMetadataCredits >= 1
        ? verifiedMetadataCredits
        : calculatedCredits;

      const db = getDb();
      if (db) {
        // Fetch payment record FIRST to check status and avoid duplicate credit awards
        const [payment] = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1);

        const targetEmail = (
          payment?.guestEmail ||
          paystackResult.data.metadata?.email ||
          paystackResult.data.customer?.email
        )?.trim().toLowerCase();

        const targetUserId = payment?.userId || paystackResult.data.metadata?.userId;

        if (!payment || payment.status !== "success") {
          if (payment) {
            // Update existing payment record in D1 to success
            await db.update(payments)
              .set({ status: "success" })
              .where(eq(payments.reference, reference));
          } else {
            // REPLAY PROTECTION: Insert new success record so reference cannot be re-used
            try {
              await db.insert(payments).values({
                id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                userId: targetUserId || null,
                guestEmail: targetEmail || null,
                reference,
                planType,
                amount: Math.round(amountPaid / 100),
                status: "success",
                createdAt: Date.now(),
              });
            } catch (e) {
              console.warn("Could not insert success payment record:", e);
            }
          }

          if (planType === "account_bundle") {
            let awarded = false;

            // 1. Try awarding credits by userId
            if (targetUserId) {
              try {
                await db.update(users)
                  .set({
                    credits: sql`${users.credits} + ${creditsToAward}`,
                    updatedAt: Date.now(),
                  })
                  .where(eq(users.id, targetUserId));
                awarded = true;
              } catch (e) {
                console.warn("Could not award credits by userId:", e);
              }
            }

            // 2. If not awarded by userId, award by email match
            if (!awarded && targetEmail) {
              try {
                const [existingUser] = await db.select().from(users).where(eq(users.email, targetEmail)).limit(1);
                if (existingUser) {
                  await db.update(users)
                    .set({
                      credits: sql`${users.credits} + ${creditsToAward}`,
                      updatedAt: Date.now(),
                    })
                    .where(eq(users.id, existingUser.id));
                }
              } catch (e) {
                console.warn("Could not award credits by email:", e);
              }
            }
          }
        }
      }

      const redirectTarget = planType === "account_bundle"
        ? `/profile?payment=success&added=${creditsToAward}`
        : `/insights?payment=success&ref=${encodeURIComponent(reference)}`;
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    } else {
      console.warn("Paystack verification failed response:", paystackResult);
      const reason = paystackResult.data?.status || paystackResult.message || "failed";
      const failureTarget = planType === "account_bundle"
        ? `/profile?error=payment_${encodeURIComponent(reason)}`
        : `/insights?error=payment_${encodeURIComponent(reason)}`;
      return NextResponse.redirect(new URL(failureTarget, request.url));
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    const failureTarget = planType === "account_bundle"
      ? "/profile?error=payment_error"
      : "/insights?error=payment_error";
    return NextResponse.redirect(new URL(failureTarget, request.url));
  }
}
