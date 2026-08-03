"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthModal } from "@/components/AuthModal";


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

type StoredReport = {
  result: InsightsResult;
  personName: string;
  viewerName: string;
  connectionLabel: string;
  shareId?: string;
  isGuest?: boolean;
  createdAt: number;
};

const totalSlides = 9;

export default function InsightsResultPage() {
  const [mounted, setMounted] = useState(false);
  const [report, setReport] = useState<StoredReport | null>(null);
  const [slide, setSlide] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  function handleClaimSuccess() {
    setIsAuthOpen(false);
  }

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem("unsaid-insights-report");
      if (stored) {
        try {
          setReport(JSON.parse(stored) as StoredReport);
        } catch {
          window.sessionStorage.removeItem("unsaid-insights-report");
        }
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") setSlide((current) => Math.min(totalSlides - 1, current + 1));
      if (event.key === "ArrowLeft") setSlide((current) => Math.max(0, current - 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!mounted) {
    return (
      <main className="empty-report">
        <span className="wordmark-seal">U</span>
        <p>Loading your Wrapped report...</p>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="empty-report">
        <span className="wordmark-seal">U</span>
        <h1>Your Wrapped is waiting to be made.</h1>
        <p>Upload a WhatsApp export first, then your private report will appear here.</p>
        <Link className="button button-primary" href="/insights">Create my Wrapped</Link>
      </main>
    );
  }

  const { result, personName, viewerName, connectionLabel, shareId, isGuest } = report;

  function shareReport() {
    if (!shareId || isGuest) {
      setIsAuthOpen(true);
      return;
    }
    const link = `${window.location.origin}/wrap/${shareId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleClaimSuccess() {
    if (!shareId) return;
    setClaiming(true);
    try {
      const res = await fetch(`/api/wraps/${shareId}`, { method: "POST" });
      if (res.ok) {
        const link = `${window.location.origin}/wrap/${shareId}`;
        await navigator.clipboard.writeText(link);
        alert("✓ Wrapped saved to your account! 14-day share link copied to clipboard.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClaiming(false);
    }
  }

  const winner = (value: "You" | "Them" | "Both" | "Not enough data") => value === "You" ? viewerName || "You" : value === "Them" ? personName || "Them" : value;

  const scores = result.dynamicScores && result.dynamicScores.length > 0
    ? result.dynamicScores.map((ds) => [ds.category, ds.score] as const)
    : [
        ["Communication", result.compatibility.communication],
        ["Humor", result.compatibility.humor],
        ["Affection", result.compatibility.affection],
        ["Adventure", result.compatibility.adventure],
      ] as const;

  const dynamicMetricsList = result.dynamicMetrics && result.dynamicMetrics.length > 0
    ? result.dynamicMetrics
    : [
        { label: "Total Messages", value: result.messageCount.toLocaleString(), comment: "Messages exchanged" },
        { label: "Most-Used Emoji", value: result.mostUsedEmoji, comment: "Top emoji" },
        { label: "Favourite Word", value: `“${result.favoriteWord}”`, comment: "Most frequent word" },
        { label: "Midnight Messages", value: result.lateNightMessages.toLocaleString(), comment: "Sent after 12 AM" },
        { label: "Apologies Spotted", value: result.sorryCount.toLocaleString(), comment: "Times sorry was said" },
        { label: "Estimated Laughs", value: result.estimatedLaughs.toLocaleString(), comment: "Laughs shared" },
      ];

  const youFlaws = result.badSide?.youFlaws || [
    { title: "Left On Read Tendency", detail: "Has a habit of disappearing mid-conversation without context." },
    { title: "Selective Response", detail: "Only replies quickly to topic changes that interest them." }
  ];
  const themFlaws = result.badSide?.themFlaws || [
    { title: "Dry One-Word Replies", detail: "Often responds with 'K', 'lol', or 'ok' after detailed messages." },
    { title: "Passive Aggressive Hints", detail: "Drops cryptic statements instead of saying what is directly on their mind." }
  ];
  const redFlags = result.badSide?.relationshipRedFlags || [
    { title: "Unbalanced Effort", detail: "One person carries 70% of the conversation starter energy." },
    { title: "Unresolved Friction", detail: "Difficult topics get swept under the rug instead of resolved." }
  ];

  const adviceData = result.advice || {
    realityCheck: "This chat displays high emotional energy but frequent miscommunication gaps that create unnecessary tension.",
    adviceForYou: [`Stop waiting for ${personName} to read between the lines—be direct.`, "Don't double text when they go quiet."],
    adviceForThem: ["Put more effort into initiating conversations.", "Acknowledge feelings before changing the topic."],
    verdict: "Needs direct communication and equal effort.",
  };

  async function shareReport() {
    const text = `${viewerName} + ${personName}: ${result.compatibility.overall}% ${connectionLabel} compatibility ✦ ${result.messageCount.toLocaleString()} messages ✦ Verdict: ${adviceData.verdict} — made with Unfiltered`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `${viewerName} + ${personName} Wrapped`, text, url: window.location.href });
      } catch {
        // Fallback to clipboard if share was cancelled or failed
      }
    } else {
      navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      alert("Wrapped summary copied to clipboard!");
    }
  }

  return (
    <main className={`product-page wrapped-report-page wrapped-slide-${slide}`}>
      <header className="wrapped-report-nav"><Link className="wordmark" href="/"><span className="wordmark-seal">U</span><span>Unfiltered</span></Link><span>{connectionLabel} Wrapped</span><Link href="/insights">Close</Link></header>
      <div className="wrapped-progress" aria-label={`Chapter ${slide + 1} of ${totalSlides}`}>{Array.from({ length: totalSlides }, (_, index) => <button key={index} aria-label={`Go to chapter ${index + 1}`} className={index <= slide ? "is-active" : ""} onClick={() => setSlide(index)} />)}</div>

      <section className="wrapped-chapter" key={slide}>
        {/* Slide 0: Overview */}
        {slide === 0 && <div className="chapter-intro"><p className="wrapped-kicker">Our story, quantified & unfiltered</p><h1>{viewerName}<span>+</span>{personName}</h1><p>{result.title}</p><div className="compatibility-orb"><small>Chemistry</small><strong>{result.compatibility.overall}%</strong><span>{result.relationshipHealth}</span></div></div>}

        {/* Slide 1: Dynamic DNA */}
        {slide === 1 && <div className="chapter-scores"><div><p className="wrapped-kicker">Dynamic Relationship DNA</p><h2>{result.relationshipHealth}<br /><em>is the honest verdict.</em></h2><p>{result.summary}</p></div><div className="score-card"><div className="score-main"><span>Overall chemistry</span><strong>{result.compatibility.overall}%</strong></div>{scores.map(([label, score]) => <div className="score-row" key={label}><span>{label}</span><div><i style={{ width: `${score}%` }} /></div><strong>{score}%</strong></div>)}<small>Custom dynamic scores generated specifically from your chat patterns.</small></div></div>}

        {/* Slide 2: Dynamic Metrics */}
        {slide === 2 && <div className="chapter-numbers"><p className="wrapped-kicker">Dynamic Chat Metrics</p><h2>{result.metricsHeadline || `${result.messageCount.toLocaleString()} messages exchanged.`}</h2><div className="numbers-grid">{dynamicMetricsList.map((item, index) => <article key={item.label}><span>0{index + 1}</span><small>{item.label}</small><strong>{item.value}</strong><p className="metric-comment">{item.comment}</p></article>)}</div></div>}

        {/* Slide 3: Awards */}
        {slide === 3 && <div className="chapter-awards"><p className="wrapped-kicker">And the award goes to…</p><h2>Unfiltered<br /><em>superlatives.</em></h2><div className="award-grid">{result.playfulAwards.map((award, index) => <article key={award.title}><span>{["🔥", "🎯", "⚡️", "✨"][index]}</span><small>{award.title}</small><strong>{winner(award.winner)}</strong><p>{award.reason}</p><i>{award.confidence}% honest assessment</i></article>)}</div></div>}

        {/* Slide 4: The Bad Side & Red Flags (NEW) */}
        {slide === 4 && <div className="chapter-bad-side"><p className="wrapped-kicker">The Unfiltered Expose</p><h2>The bad side.<br /><em>Let’s stop pretending.</em></h2><div className="bad-side-grid">
          <div className="flaw-card">
            <span className="flaw-badge">Flaws of {viewerName || "You"}</span>
            {youFlaws.map((f) => <div className="flaw-item" key={f.title}><strong>{f.title}</strong><p>{f.detail}</p></div>)}
          </div>
          <div className="flaw-card">
            <span className="flaw-badge flaw-them">Flaws of {personName || "Them"}</span>
            {themFlaws.map((f) => <div className="flaw-item" key={f.title}><strong>{f.title}</strong><p>{f.detail}</p></div>)}
          </div>
          <div className="flaw-card">
            <span className="flaw-badge flaw-flags">Chat Red Flags</span>
            {redFlags.map((f) => <div className="flaw-item" key={f.title}><strong>{f.title}</strong><p>{f.detail}</p></div>)}
          </div>
        </div></div>}

        {/* Slide 5: Insights & Memorable Moment */}
        {slide === 5 && <div className="chapter-magic"><p className="wrapped-kicker">Things hiding in plain sight</p><h2>The little patterns<br /><em>that define your chat.</em></h2><div className="magic-stack">{result.insights.map((insight, index) => <article key={insight.title}><span>0{index + 1}</span><div><strong>{insight.title}</strong><p>{insight.detail}</p></div></article>)}</div><blockquote>“{result.memorableMoment}”</blockquote></div>}

        {/* Slide 6: Timeline */}
        {slide === 6 && <div className="chapter-timeline"><p className="wrapped-kicker">Your story so far</p><h2>A timeline made<br /><em>from your messages.</em></h2><div className="timeline-list">{result.milestones.map((milestone) => <article key={`${milestone.title}-${milestone.when}`}><span>{milestone.emoji}</span><div><small>{milestone.when}</small><strong>{milestone.title}</strong><p>{milestone.detail}</p></div></article>)}</div></div>}

        {/* Slide 7: Brutally Honest Advice (NEW) */}
        {slide === 7 && <div className="chapter-advice"><p className="wrapped-kicker">The Reality Check</p><h2>Where you go from here.<br /><em>Unvarnished advice.</em></h2><div className="advice-grid">
          <div className="reality-card">
            <small>Reality Check</small>
            <p>{adviceData.realityCheck}</p>
            <div className="verdict-tag"><span>Verdict</span><strong>{adviceData.verdict}</strong></div>
          </div>
          <div className="advice-column">
            <span className="advice-header">Direct Advice for {viewerName || "You"}</span>
            <ul>{adviceData.adviceForYou.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </div>
          <div className="advice-column">
            <span className="advice-header advice-them">Direct Advice for {personName || "Them"}</span>
            <ul>{adviceData.adviceForThem.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </div>
        </div></div>}

        {/* Slide 8: Finale */}
        {slide === 8 && <div className="chapter-finale"><div className="finale-card"><span className="finale-mark">U</span><small>{connectionLabel} Wrapped · 2026</small><h2>{result.title}</h2><p>{viewerName} + {personName}</p><div><span>{result.messageCount.toLocaleString()} messages</span><span>Verdict: {adviceData.verdict}</span><span>{result.loveLanguage}</span></div></div><div className="finale-copy"><p className="wrapped-kicker">That’s your story</p><h2>Some things deserve<br /><em>to be shared.</em></h2><p>14-day shareable links are stored safely for your connection.</p><button className="button button-light" onClick={shareReport}>{copied ? "✓ 14-Day Share Link Copied!" : "Share our Wrapped (14 Days) ↗"}</button><Link href="/insights">Analyse another chat</Link></div></div>}
      </section>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleClaimSuccess}
      />


      <footer className="wrapped-controls">
        <button className="wrapped-nav-btn wrapped-nav-prev" disabled={slide === 0} onClick={() => setSlide((current) => current - 1)}>
          <span>←</span> Previous
        </button>
        <div className="wrapped-counter-pill">
          <span>{String(slide + 1).padStart(2, "0")} / {String(totalSlides).padStart(2, "0")}</span>
        </div>
        <button className="wrapped-nav-btn wrapped-nav-next" disabled={slide === totalSlides - 1} onClick={() => setSlide((current) => current + 1)}>
          Next <span>→</span>
        </button>
      </footer>
    </main>
  );
}
