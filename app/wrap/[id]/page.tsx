"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";

type InsightsResult = {
  title: string;
  summary: string;
  messageCount: number;
  mostActiveTime: string;
  favoriteWord: string;
  mostUsedEmoji: string;
  lateNightMessages: number;
  loveYouCount: number;
  sorryCount: number;
  estimatedLaughs: number;
  financialRequester: "You" | "Them" | "Both" | "Not enough data";
  memorableMoment: string;
  tone: string;
  topics: string[];
  insights: Array<{ title: string; detail: string }>;
  compatibility: { overall: number; communication: number; humor: number; affection: number; adventure: number };
  dynamicScores?: Array<{ category: string; score: number }>;
  dynamicMetrics?: Array<{ label: string; value: string; comment: string }>;
  relationshipHealth: string;
  loveLanguage: string;
  playfulAwards: Array<{ title: string; winner: "You" | "Them" | "Both"; confidence: number; reason: string }>;
  milestones: Array<{ emoji: string; title: string; when: string; detail: string }>;
  badSide?: {
    youFlaws: Array<{ title: string; detail: string }>;
    themFlaws: Array<{ title: string; detail: string }>;
    relationshipRedFlags: Array<{ title: string; detail: string }>;
  };
  advice?: {
    realityCheck: string;
    adviceForYou: string[];
    adviceForThem: string[];
    verdict: string;
  };
};

type WrapData = {
  shareId: string;
  personName: string;
  viewerName: string;
  connection: string;
  result: InsightsResult;
  isExpired: boolean;
  isDisabled: number;
  createdAt: number;
};

const totalSlides = 8;

export default function SharedWrapPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [wrap, setWrap] = useState<WrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    async function loadWrap() {
      try {
        const res = await fetch(`/api/wraps/${resolvedParams.id}`);
        const data = await res.json() as { wrap?: WrapData; error?: string };
        if (!res.ok || !data.wrap) throw new Error(data.error || "Report not found.");
        setWrap(data.wrap);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report.");
      } finally {
        setLoading(false);
      }
    }
    loadWrap();
  }, [resolvedParams.id]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") setSlide((current) => Math.min(totalSlides - 1, current + 1));
      if (event.key === "ArrowLeft") setSlide((current) => Math.max(0, current - 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (loading) {
    return (
      <main className="empty-report">
        <span className="wordmark-seal">U</span>
        <h2>Unsealing shared Wrapped…</h2>
      </main>
    );
  }

  if (error || !wrap) {
    return (
      <main className="empty-report">
        <span className="wordmark-seal">U</span>
        <h1>{error || "Report Not Found"}</h1>
        <p>This share link may have expired (14-day limit) or been disabled by its owner.</p>
        <Link className="button button-primary" href="/insights">Create your own Wrapped →</Link>
      </main>
    );
  }

  if (wrap.isExpired) {
    return (
      <main className="empty-report">
        <span className="wordmark-seal">⌛</span>
        <h1>This Wrapped link has expired.</h1>
        <p>Shared links automatically expire after 14 days to preserve chat privacy.</p>
        <Link className="button button-primary" href="/insights">Create your own Wrapped →</Link>
      </main>
    );
  }

  const { result, personName, viewerName, connection } = wrap;

  const winner = (value: "You" | "Them" | "Both" | "Not enough data") =>
    value === "You" ? viewerName || "You" : value === "Them" ? personName || "Them" : value;

  const scores = result.dynamicScores && result.dynamicScores.length > 0
    ? result.dynamicScores.map((ds) => [ds.category, ds.score] as const)
    : [
        ["Communication", result.compatibility.communication],
        ["Humor", result.compatibility.humor],
        ["Affection", result.compatibility.affection],
        ["Adventure", result.compatibility.adventure],
      ] as const;

  return (
    <main className="insights-result-page">
      <nav className="site-nav product-nav">
        <Link className="wordmark" href="/"><span className="wordmark-seal">U</span><span>Unsaid</span></Link>
        <span className="product-nav-title">{connection} Wrapped · {viewerName} & {personName}</span>
        <Link className="nav-action button button-primary" href="/insights">Create Yours</Link>
      </nav>

      <section className="slides-container">
        <div className="slide-progress">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              className={`progress-bar ${index === slide ? "is-active" : index < slide ? "is-complete" : ""}`}
              onClick={() => setSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Slide 0: Cover */}
        {slide === 0 && (
          <article className="result-slide cover-slide">
            <span className="eyebrow">{connection} Wrapped</span>
            <h1>{result.title}</h1>
            <p className="summary">{result.summary}</p>
            <div className="participants-pill">
              <span>{viewerName}</span>
              <small>&amp;</small>
              <span>{personName}</span>
            </div>
          </article>
        )}

        {/* Slide 1: Highlights */}
        {slide === 1 && (
          <article className="result-slide">
            <span className="eyebrow">Highlights</span>
            <h2>Inside the conversation</h2>
            <div className="metrics-grid">
              {(result.dynamicMetrics || []).slice(0, 6).map((m, idx) => (
                <div key={idx} className="metric-card">
                  <small>{m.label}</small>
                  <strong>{m.value}</strong>
                  <span>{m.comment}</span>
                </div>
              ))}
            </div>
          </article>
        )}

        {/* Slide 2: Category Scores */}
        {slide === 2 && (
          <article className="result-slide">
            <span className="eyebrow">Relationship Scores</span>
            <h2>Overall Score: {result.compatibility.overall}%</h2>
            <div className="compatibility-bars">
              {scores.map(([label, value]) => (
                <div key={label} className="bar-row">
                  <div className="bar-label"><span>{label}</span><strong>{value}%</strong></div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${value}%` }} /></div>
                </div>
              ))}
            </div>
          </article>
        )}

        {/* Slide 3: Awards */}
        {slide === 3 && (
          <article className="result-slide">
            <span className="eyebrow">Superlatives</span>
            <h2>Chat Awards</h2>
            <div className="awards-grid">
              {result.playfulAwards.map((award, index) => (
                <div key={index} className="award-card">
                  <span className="award-winner">{winner(award.winner)}</span>
                  <h3>{award.title}</h3>
                  <p>{award.reason}</p>
                </div>
              ))}
            </div>
          </article>
        )}

        {/* Slide 4: Flaws */}
        {slide === 4 && (
          <article className="result-slide">
            <span className="eyebrow">The Bad Side</span>
            <h2>Hidden Flaws Exposed</h2>
            <div className="flaws-sections">
              <div className="flaws-group">
                <h3>{viewerName}'s Flaws</h3>
                {(result.badSide?.youFlaws || []).map((f, i) => (
                  <div key={i} className="flaw-item"><strong>{f.title}</strong><p>{f.detail}</p></div>
                ))}
              </div>
              <div className="flaws-group">
                <h3>{personName}'s Flaws</h3>
                {(result.badSide?.themFlaws || []).map((f, i) => (
                  <div key={i} className="flaw-item"><strong>{f.title}</strong><p>{f.detail}</p></div>
                ))}
              </div>
            </div>
          </article>
        )}

        {/* Slide 5: Red Flags */}
        {slide === 5 && (
          <article className="result-slide">
            <span className="eyebrow">Caution</span>
            <h2>Relationship Red Flags</h2>
            <div className="insights-list">
              {(result.badSide?.relationshipRedFlags || []).map((rf, i) => (
                <div key={i} className="insight-card redflag-card">
                  <h3>🚩 {rf.title}</h3>
                  <p>{rf.detail}</p>
                </div>
              ))}
            </div>
          </article>
        )}

        {/* Slide 6: Advice */}
        {slide === 6 && (
          <article className="result-slide">
            <span className="eyebrow">Unvarnished Advice</span>
            <h2>Reality Check</h2>
            <p className="summary">{result.advice?.realityCheck}</p>
            <div className="verdict-box">
              <small>THE VERDICT</small>
              <strong>{result.advice?.verdict}</strong>
            </div>
          </article>
        )}

        {/* Slide 7: CTA */}
        {slide === 7 && (
          <article className="result-slide cta-slide">
            <span className="eyebrow">Unsaid AI</span>
            <h2>Discover the story inside your chats</h2>
            <p>Export your WhatsApp conversation and turn everyday messages into your own relationship Wrapped.</p>
            <Link className="button button-primary" href="/insights">Create your own Wrapped →</Link>
          </article>
        )}

        <div className="slide-nav">
          <button className="button button-secondary" disabled={slide === 0} onClick={() => setSlide((s) => s - 1)}>← Previous</button>
          <span>{slide + 1} / {totalSlides}</span>
          <button className="button button-primary" disabled={slide === totalSlides - 1} onClick={() => setSlide((s) => s + 1)}>Next →</button>
        </div>
      </section>
    </main>
  );
}
