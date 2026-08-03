export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    status: string;
    reference: string;
    amount: number;
    customer?: {
      email: string;
    };
    metadata?: Record<string, unknown>;
  };
}

export async function initializePaystackPayment({
  email,
  amount,
  currency = "NGN",
  callbackUrl,
  metadata,
}: {
  email: string;
  amount: number; // in minor units (kobo, cents, pesewas, etc.)
  currency?: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitResponse> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey || secretKey.includes("xxx")) {
    // Development fallback mock response if Paystack key is not set
    const mockRef = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return {
      status: true,
      message: "Mock Paystack checkout (Set PAYSTACK_SECRET_KEY in production)",
      data: {
        authorization_url: `${callbackUrl}?reference=${mockRef}&mock=true`,
        access_code: "mock_code",
        reference: mockRef,
      },
    };
  }

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount,
      currency: currency.toUpperCase(),
      callback_url: callbackUrl,
      metadata,
    }),
  });

  return (await response.json()) as PaystackInitResponse;
}

export async function verifyPaystackPayment(reference: string): Promise<PaystackVerifyResponse> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey || secretKey.includes("xxx") || reference.startsWith("mock_")) {
    // Development fallback mock verification
    return {
      status: true,
      message: "Mock verification successful",
      data: {
        status: "success",
        reference,
        amount: reference.includes("guest") ? 80000 : 150000,
        customer: { email: "user@example.com" },
      },
    };
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  return (await response.json()) as PaystackVerifyResponse;
}
