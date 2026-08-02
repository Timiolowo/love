"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  relationshipHealth: string;
  loveLanguage: string;
  playfulAwards: Array<{ title: string; winner: "You" | "Them" | "Both"; confidence: number; reason: string }>;
  milestones: Array<{ emoji: string; title: string; when: string; detail: string }>;
};

type StoredReport = {
  result: InsightsResult;
  personName: string;
  viewerName: string;
  connectionLabel: string;
  createdAt: number;
};

const totalSlides = 7;

export default function InsightsResultPage() {
  const [report, setReport] = useState<StoredReport | null>(null);
  const [slide, setSlide] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("unsaid-insights-report");
    if (!stored) return;
    try { setReport(JSON.parse(stored) as StoredReport); } catch { window.sessionStorage.removeItem("unsaid-insights-report"); }
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") setSlide((current) => Math.min(totalSlides - 1, current + 1));
      if (event.key === "ArrowLeft") setSlide((current) => Math.max(0, current - 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!report) {
    return <main className="empty-report"><span className="wordmark-seal">U</span><h1>Your Wrapped is waiting to be made.</h1><p>Upload a WhatsApp export first, then your private report will appear here.</p><Link className="button button-primary" href="/insights">Create my Wrapped</Link></main>;
  }

  const { result, personName, viewerName, connectionLabel } = report;
  const winner = (value: "You" | "Them" | "Both" | "Not enough data") => value === "You" ? viewerName || "You" : value === "Them" ? personName || "Them" : value;
  const scores = [
    ["Communication", result.compatibility.communication],
    ["Humor", result.compatibility.humor],
    ["Affection", result.compatibility.affection],
    ["Adventure", result.compatibility.adventure],
  ] as const;
  const metrics = [
    ["Messages", result.messageCount.toLocaleString()],
    ["Most-used emoji", result.mostUsedEmoji],
    ["Favourite word", `“${result.favoriteWord}”`],
    ["Messages after midnight", result.lateNightMessages.toLocaleString()],
    ["“Love you” count", result.loveYouCount.toLocaleString()],
    ["Apologies spotted", result.sorryCount.toLocaleString()],
    ["Estimated laughs", result.estimatedLaughs.toLocaleString()],
    ["Money SOS champion", winner(result.financialRequester)],
  ];

  async function shareReport() {
    const text = `${viewerName} + ${personName}: ${result.compatibility.overall}% ${connectionLabel} compatibility ✦ ${result.messageCount.toLocaleString()} messages ✦ ${result.tone} energy — made with Unsaid`;
    try {
      if (navigator.share) await navigator.share({ title: "Our Story, Quantified", text });
      else await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* The user can cancel the native share sheet. */ }
  }

  return (
    <main className={`wrapped-report-page wrapped-slide-${slide}`}>
      <header className="wrapped-report-nav"><Link className="wordmark" href="/"><span className="wordmark-seal">U</span><span>Unsaid</span></Link><span>{connectionLabel} Wrapped</span><Link href="/insights">Close</Link></header>
      <div className="wrapped-progress" aria-label={`Chapter ${slide + 1} of ${totalSlides}`}>{Array.from({ length: totalSlides }, (_, index) => <button key={index} aria-label={`Go to chapter ${index + 1}`} className={index <= slide ? "is-active" : ""} onClick={() => setSlide(index)} />)}</div>

      <section className="wrapped-chapter" key={slide}>
        {slide === 0 && <div className="chapter-intro"><p className="wrapped-kicker">Our story, quantified</p><h1>{viewerName}<span>+</span>{personName}</h1><p>{result.title}</p><div className="compatibility-orb"><small>Compatibility</small><strong>{result.compatibility.overall}%</strong><span>just for fun</span></div></div>}

        {slide === 1 && <div className="chapter-scores"><div><p className="wrapped-kicker">Your relationship DNA</p><h2>{result.relationshipHealth}<br /><em>looks good on you.</em></h2><p>{result.summary}</p></div><div className="score-card"><div className="score-main"><span>Overall chemistry</span><strong>{result.compatibility.overall}%</strong></div>{scores.map(([label, score]) => <div className="score-row" key={label}><span>{label}</span><div><i style={{ width: `${score}%` }} /></div><strong>{score}%</strong></div>)}<small>Entertainment based on chat patterns—not a scientific assessment.</small></div></div>}

        {slide === 2 && <div className="chapter-numbers"><p className="wrapped-kicker">You two, in numbers</p><h2>{result.messageCount.toLocaleString()} messages.<br /><em>One unmistakable rhythm.</em></h2><div className="numbers-grid">{metrics.map(([label, value], index) => <article key={label}><span>0{index + 1}</span><small>{label}</small><strong>{value}</strong></article>)}</div></div>}

        {slide === 3 && <div className="chapter-awards"><p className="wrapped-kicker">And the award goes to…</p><h2>Your unofficial<br /><em>superlatives.</em></h2><div className="award-grid">{result.playfulAwards.map((award, index) => <article key={award.title}><span>{["💘", "😂", "🫶", "✨"][index]}</span><small>{award.title}</small><strong>{winner(award.winner)}</strong><p>{award.reason}</p><i>{award.confidence}% just-for-fun confidence</i></article>)}</div></div>}

        {slide === 4 && <div className="chapter-magic"><p className="wrapped-kicker">Things hiding in plain sight</p><h2>The little patterns<br /><em>that feel like magic.</em></h2><div className="magic-stack">{result.insights.map((insight, index) => <article key={insight.title}><span>0{index + 1}</span><div><strong>{insight.title}</strong><p>{insight.detail}</p></div></article>)}</div><blockquote>“{result.memorableMoment}”</blockquote></div>}

        {slide === 5 && <div className="chapter-timeline"><p className="wrapped-kicker">Your story so far</p><h2>A timeline made<br /><em>from your messages.</em></h2><div className="timeline-list">{result.milestones.map((milestone) => <article key={`${milestone.title}-${milestone.when}`}><span>{milestone.emoji}</span><div><small>{milestone.when}</small><strong>{milestone.title}</strong><p>{milestone.detail}</p></div></article>)}</div></div>}

        {slide === 6 && <div className="chapter-finale"><div className="finale-card"><span className="finale-mark">U</span><small>{connectionLabel} Wrapped · 2026</small><h2>{result.title}</h2><p>{viewerName} + {personName}</p><div><span>{result.messageCount.toLocaleString()} messages</span><span>{result.tone} energy</span><span>{result.loveLanguage}</span></div></div><div className="finale-copy"><p className="wrapped-kicker">That’s your story</p><h2>Some things deserve<br /><em>to be shared.</em></h2><p>Your report stays in this browser tab. Share the summary—or keep this little universe to yourselves.</p><button className="button button-light" onClick={shareReport}>{copied ? "Shared or copied ✓" : "Share our Wrapped ↗"}</button><Link href="/insights">Analyse another chat</Link></div></div>}
      </section>

      <footer className="wrapped-controls"><button disabled={slide === 0} onClick={() => setSlide((current) => current - 1)}>← Previous</button><span>{String(slide + 1).padStart(2, "0")} / {String(totalSlides).padStart(2, "0")}</span><button disabled={slide === totalSlides - 1} onClick={() => setSlide((current) => current + 1)}>Next →</button></footer>
    </main>
  );
}
