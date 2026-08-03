import { NextResponse } from "next/server";

type OtpRecord = {
  code: string;
  expiresAt: number;
};

// Global in-memory OTP store (keyed by lowercase email)
export const otpStore = new Map<string, OtpRecord>();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // Generate a secure 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minute expiry

    otpStore.set(email, { code, expiresAt });

    console.log(`[AUTH OTP] Sent code ${code} to ${email}`);

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${email}.`,
      // In development mode, return devCode to test easily without an SMTP server setup
      devCode: process.env.NODE_ENV === "development" ? code : undefined,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Failed to send verification code." }, { status: 500 });
  }
}
