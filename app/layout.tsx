import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", base).toString();

  return {
    metadataBase: base,
    title: "Unfiltered — WhatsApp Chat Analysis & Relationship Wrapped",
    description: "Uncover the raw, unvarnished truth inside your WhatsApp chats. Red flag exposure, compatibility scores, dynamic chat metrics, and brutal honesty.",
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/logo.svg", type: "image/svg+xml" },
      ],
      shortcut: "/favicon.svg",
      apple: "/favicon.svg",
    },
    openGraph: {
      title: "Unfiltered — WhatsApp Chat Analysis & Relationship Wrapped",
      description: "Discover the raw truth inside your WhatsApp chats. Red flag exposure, compatibility scores, and brutal honesty.",
      url: base.toString(),
      siteName: "Unfiltered",
      images: [
        {
          url: socialImage,
          width: 1536,
          height: 1024,
          alt: "Unfiltered WhatsApp Chat Analysis & Relationship Wrapped",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Unfiltered — WhatsApp Chat Analysis & Relationship Wrapped",
      description: "Uncover red flags, double-texting stats, compatibility scores, and brutal honesty from your WhatsApp chat export.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
