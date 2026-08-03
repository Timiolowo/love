import { NextResponse } from "next/server";
import { createLogoutCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": createLogoutCookie(),
      },
    }
  );
  try {
    response.cookies.set("unsaid_session", "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });
  } catch {
    /* ignore */
  }
  return response;
}
