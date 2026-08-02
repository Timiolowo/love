import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", base).toString();

  return {
    metadataBase: base,
    title: "Unsaid — Private conversations, gently begun",
    description: "Discover the story inside your chats or begin a thoughtful, consent-first anonymous conversation.",
    openGraph: {
      title: "Things left unsaid, beautifully brought to light.",
      description: "Chat Insights and consent-first anonymous conversations, together in one thoughtful place.",
      images: [{ url: socialImage, width: 1536, height: 1024, alt: "A private letter sealed with a pink glass heart" }],
    },
    twitter: { card: "summary_large_image", images: [socialImage] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
