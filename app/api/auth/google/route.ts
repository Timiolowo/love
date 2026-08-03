import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";

export async function GET(request: Request) {
  const clientId = (env as unknown as Record<string, string>)?.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth Client ID is not configured." }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(googleAuthUrl);
}
