import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { wraps } from "@/db/schema";
import { eq } from "drizzle-orm";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const db = getDb();
    if (!db) {
      return new NextResponse("Database unavailable", { status: 503 });
    }

    const [wrap] = await db
      .select()
      .from(wraps)
      .where(eq(wraps.shareId, id))
      .limit(1);

    if (!wrap || wrap.isDisabled === 1) {
      return new NextResponse("Report not found", { status: 404 });
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(wrap.result);
    } catch {
      /* ignore */
    }

    const viewerName = escapeXml(wrap.viewerName || "You");
    const personName = escapeXml(wrap.personName || "Them");
    const connection = escapeXml(wrap.connection || "Relationship");
    const score = parsed?.compatibility?.overall || 85;
    const health = escapeXml(parsed?.relationshipHealth || "Analyzed");
    const verdict = escapeXml(parsed?.advice?.verdict || parsed?.title || "Chat Analysis Completed");
    const msgCount = (parsed?.messageCount || 0).toLocaleString();

    const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#09090b" />
      <stop offset="50%" stop-color="#121118" />
      <stop offset="100%" stop-color="#09090b" />
    </linearGradient>
    <radialGradient id="orbPink" cx="20%" cy="30%" r="50%">
      <stop offset="0%" stop-color="#ec4899" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#ec4899" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="orbPurple" cx="80%" cy="70%" r="55%">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f43f5e" />
      <stop offset="50%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.12)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.03)" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />
  <rect width="1200" height="630" fill="url(#orbPink)" />
  <rect width="1200" height="630" fill="url(#orbPurple)" />

  <!-- Outer Border Frame -->
  <rect x="24" y="24" width="1152" height="582" rx="28" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2" />

  <!-- Top Brand Header -->
  <g transform="translate(60, 75)">
    <rect width="42" height="42" rx="12" fill="url(#scoreGrad)" />
    <text x="21" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" fill="#ffffff" text-anchor="middle">U</text>
    <text x="58" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#ffffff" letter-spacing="2">UNFILTERED</text>
    <text x="210" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#a1a1aa" letter-spacing="3">•  CHAT WRAPPED</text>
  </g>

  <!-- Main Names Title -->
  <text x="60" y="195" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="54" font-weight="900" fill="#ffffff" letter-spacing="-1">
    ${viewerName} <tspan fill="#f43f5e">+</tspan> ${personName}
  </text>
  <text x="60" y="235" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="600" fill="#a1a1aa">
    ${connection} Wrapped  •  ${msgCount} WhatsApp Messages Analyzed
  </text>

  <!-- Central Score Orb Card -->
  <g transform="translate(60, 275)">
    <rect width="1080" height="245" rx="24" fill="url(#badgeGrad)" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />
    
    <!-- Chemistry Circle -->
    <circle cx="130" cy="122" r="75" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="14" />
    <circle cx="130" cy="122" r="75" fill="none" stroke="url(#scoreGrad)" stroke-width="14" stroke-linecap="round" stroke-dasharray="471" stroke-dashoffset="${471 - (471 * Math.min(100, Math.max(10, score))) / 100}" transform="rotate(-90 130 122)" />
    <text x="130" y="115" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="900" fill="#ffffff" text-anchor="middle">${score}%</text>
    <text x="130" y="145" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#9ca3af" text-anchor="middle" letter-spacing="1">CHEMISTRY</text>

    <!-- Details Box -->
    <g transform="translate(250, 45)">
      <rect width="140" height="32" rx="16" fill="rgba(244,63,94,0.18)" stroke="rgba(244,63,94,0.4)" stroke-width="1" />
      <text x="70" y="21" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#fda4af" text-anchor="middle" letter-spacing="1">HEALTH: ${health.toUpperCase()}</text>

      <text x="0" y="72" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#a1a1aa" letter-spacing="1.5">UNFILTERED VERDICT</text>
      <text x="0" y="112" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="800" fill="#ffffff">
        "${verdict.length > 55 ? verdict.slice(0, 52) + "..." : verdict}"
      </text>

      <g transform="translate(0, 140)">
        <rect x="0" y="0" width="170" height="30" rx="15" fill="rgba(255,255,255,0.06)" />
        <text x="85" y="19" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#d4d4d8" text-anchor="middle">🔥 Brutal Red Flags</text>

        <rect x="180" y="0" width="180" height="30" rx="15" fill="rgba(255,255,255,0.06)" />
        <text x="270" y="19" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#d4d4d8" text-anchor="middle">📊 Deep Chat Metrics</text>

        <rect x="370" y="0" width="190" height="30" rx="15" fill="rgba(255,255,255,0.06)" />
        <text x="465" y="19" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#d4d4d8" text-anchor="middle">⚡️ Double Text Ratio</text>
      </g>
    </g>
  </g>

  <!-- Footer Link -->
  <text x="1140" y="580" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#71717a" text-anchor="end">unfiltered.app</text>
</svg>
    `.trim();

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Error generating OG image:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
