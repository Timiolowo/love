import type { Metadata } from "next";
import { getDb } from "@/db";
import { wraps } from "@/db/schema";
import { eq } from "drizzle-orm";
import SharedWrapClient from "./SharedWrapClient";

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  try {
    const db = getDb();
    if (!db) return {};

    const [wrap] = await db
      .select()
      .from(wraps)
      .where(eq(wraps.shareId, id))
      .limit(1);

    if (!wrap || wrap.isDisabled === 1) return {};

    let parsed: any = {};
    try {
      parsed = JSON.parse(wrap.result);
    } catch {
      /* ignore */
    }

    const title = `${wrap.viewerName || "You"} + ${wrap.personName || "Them"} — ${parsed?.compatibility?.overall || 85}% ${wrap.connection || "Chat"} Wrapped`;
    const description = parsed?.advice?.verdict || parsed?.title || `${wrap.viewerName} & ${wrap.personName}'s WhatsApp Chat Wrapped. Exposing red flags, communication habits, and unvarnished relationship insights.`;
    const ogImage = `/api/wraps/${id}/og`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return {};
  }
}

export default async function SharedWrapPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <SharedWrapClient id={id} />;
}
