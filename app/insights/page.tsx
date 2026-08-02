"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

type FlowStep = "upload" | "questions" | "processing" | "result";

const previewInsights = [
  { title: "Your rhythm", detail: "When you talk most, who starts the gist, and the moments that became marathons." },
  { title: "Your language", detail: "Inside jokes, favourite phrases, recurring themes, and the words that feel like home." },
  { title: "Your support", detail: "How you show up for one another through change, celebration, and difficult days." },
];

const focusOptions = ["The whole story", "How we communicate", "Affection & care", "Our funniest patterns"];
const processingMessages = [
  "Unsealing your conversation…",
  "Finding the rhythm between you…",
  "Noticing words, warmth and little patterns…",
  "Turning your story into beautiful cards…",
];

function getChatPersonName(fileName: string) {
  return fileName.replace(/^WhatsApp Chat\s*-\s*/i, "").replace(/\.(zip|txt)$/i, "").trim();
}

export default function InsightsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<FlowStep>("upload");
  const [personName, setPersonName] = useState("");
  const [viewerName, setViewerName] = useState("");
  const [connectionType, setConnectionType] = useState("Friendship");
  const [customConnection, setCustomConnection] = useState("");
  const [analysisFocus, setAnalysisFocus] = useState(focusOptions[0]);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<InsightsResult | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [activeCard, setActiveCard] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const connectionLabel = connectionType === "Other" ? customConnection.trim() : connectionType;

  useEffect(() => {
    if (step !== "processing") return;
    const timer = window.setInterval(() => setProcessingStage((current) => Math.min(current + 1, processingMessages.length - 1)), 1500);
    return () => window.clearInterval(timer);
  }, [step]);

  function chooseFile(nextFile: File | null) {
    setFile(nextFile);
    setPersonName(nextFile ? getChatPersonName(nextFile.name) : "");
    setResult(null);
    setError("");
  }

  async function analyseChat() {
    if (!file || !connectionLabel || !analysisFocus || !consent) return;
    setIsAnalysing(true);
    setProcessingStage(0);
    setStep("processing");
    setError("");

    try {
      const form = new FormData();
      form.set("chat", file);
      form.set("connectionType", connectionLabel);
      form.set("analysisFocus", analysisFocus);
      form.set("viewerName", viewerName.trim());
      form.set("consent", "true");
      const [response] = await Promise.all([
        fetch("/api/insights", { method: "POST", body: form }),
        new Promise((resolve) => window.setTimeout(resolve, 2600)),
      ]);
      const payload = await response.json() as { result?: InsightsResult; error?: string };
      if (!response.ok || !payload.result) throw new Error(payload.error || "Analysis failed.");
      window.sessionStorage.setItem("unsaid-insights-report", JSON.stringify({ result: payload.result, personName: personName.trim(), viewerName: viewerName.trim(), connectionLabel, createdAt: Date.now() }));
      router.push("/insights/result");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
      setStep("questions");
    } finally {
      setIsAnalysing(false);
    }
  }

  async function copySummary() {
    if (!result) return;
    await navigator.clipboard.writeText(`${result.title}\n\n${result.summary}\n\n${result.messageCount.toLocaleString()} messages · ${result.tone} tone · ${result.mostActiveTime}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const storyCards = result ? [
    { label: "Messages exchanged", value: result.messageCount.toLocaleString(), note: `${connectionLabel} Wrapped` },
    { label: "Your favourite time to talk", value: result.mostActiveTime, note: "When the conversation comes alive" },
    { label: "Your shared energy", value: result.tone, note: result.topics.slice(0, 2).join(" · ") },
  ] : [];
  const currentCard = storyCards[activeCard];
  const displayedInsights = result?.insights || previewInsights;

  return (
    <main className="product-page insights-page">
      <nav className="site-nav product-nav"><Link className="wordmark" href="/"><span className="wordmark-seal">U</span><span>Unsaid</span></Link><span className="product-nav-title">Chat Insights</span><Link className="nav-action" href="/message">Private Message</Link></nav>
      <section className="product-hero">
        <div className="product-intro"><Link className="back-link" href="/">← Back home</Link><p className="eyebrow"><span /> Your conversation, beautifully understood</p><h1>Your chats have<br /><em>a story.</em></h1><p>Upload an exported WhatsApp conversation and turn everyday messages into a thoughtful, shareable relationship Wrapped.</p><div className="product-trust"><span>Server-side Gemini</span><span>Identifiers redacted</span><span>Not stored by Unsaid</span></div></div>
        <div className="wrapped-teaser" aria-hidden="true"><div className="teaser-card teaser-back"><span>11:42 PM</span><small>Your favourite time to gist</small></div><div className="teaser-card teaser-front"><small>Messages exchanged</small><strong>18,642</strong><span>Friendship Wrapped</span></div></div>
      </section>

      <section className={`dedicated-flow insights-experience ${step === "result" ? "reveal-mode" : ""}`}>
        <div className="flow-copy">
          <span className="step-chip">{step === "upload" ? "Step 01 · Upload" : step === "questions" ? "Step 02 · A few questions" : step === "processing" ? "Step 03 · Creating" : "Your Wrapped · Ready"}</span>
          <h2>{step === "upload" ? "Start with your WhatsApp export." : step === "questions" ? "Before I begin…" : step === "processing" ? "Something lovely is taking shape." : `This is you${personName ? ` and ${personName}` : " two"}.`}</h2>
          <p>{step === "upload" ? "Choose Export Chat and select “Without Media.” Upload the ZIP WhatsApp gives you—we will safely extract the conversation." : step === "questions" ? "A little context helps Gemini notice the right things without guessing what this connection means to you." : step === "processing" ? "Your identifiers are being redacted before Gemini looks for patterns. The original chat is not saved by Unsaid." : "A collection of numbers, patterns and small truths from the conversation you share."}</p>
          <ol className="mini-steps"><li className={step !== "upload" ? "is-done" : ""}><b>1</b>Export without media</li><li className={step === "processing" || step === "result" ? "is-done" : ""}><b>2</b>Tell us what matters</li><li className={step === "result" ? "is-done" : ""}><b>3</b>Open your Wrapped</li></ol>
        </div>

        {step === "upload" && <div className="form-card large-form upload-step-card">
          <label className="upload-box"><input type="file" accept=".zip,application/zip,.txt,text/plain" onChange={(event) => chooseFile(event.target.files?.[0] || null)} /><span className="upload-icon">↥</span><strong>{file?.name || "Drop your WhatsApp ZIP here"}</strong><small>{file ? `${(file.size / 1024).toFixed(0)} KB · ${personName ? `Chat with ${personName}` : "Ready to continue"}` : "ZIP or TXT · Without media · ZIP up to 20 MB"}</small></label>
          <div className="upload-reassurance"><span>♡</span><p><strong>Your chat stays private.</strong><small>We process it for this Wrapped and do not add it to a public feed or save the original file.</small></p></div>
          <button className="button button-primary button-full" disabled={!file} onClick={() => setStep("questions")}>Continue with this chat <span>→</span></button>
        </div>}

        {step === "questions" && <div className="form-card large-form question-card">
          <div className="ai-question"><span>✦</span><div><small>UNSAID AI</small><p>I found the conversation. Tell me a little about what it means to you.</p></div></div>
          <label>What is your name in this chat?<input className="text-field" value={viewerName} onChange={(event) => setViewerName(event.target.value)} placeholder="Exactly as it appears in WhatsApp" maxLength={80} /><small>This helps distinguish “You” from “Them” in playful awards. Your name is not sent to Gemini.</small></label>
          <label>Who is this chat with?<input className="text-field" value={personName} onChange={(event) => setPersonName(event.target.value)} placeholder="Their name or nickname" maxLength={40} /><small>This name personalises your cards and is not sent to Gemini.</small></label>
          <label>What kind of connection is this?<select value={connectionType} onChange={(event) => setConnectionType(event.target.value)}><option>Friendship</option><option>Relationship</option><option>Family</option><option>Business partner</option><option>Classmate</option><option>Other</option></select></label>
          {connectionType === "Other" && <label>Describe the connection<input className="text-field" value={customConnection} onChange={(event) => setCustomConnection(event.target.value)} placeholder="For example: mentor, roommate, childhood friend" maxLength={50} /></label>}
          <fieldset><legend>What should I pay special attention to?</legend><div className="focus-grid">{focusOptions.map((focus) => <button type="button" key={focus} aria-pressed={analysisFocus === focus} onClick={() => setAnalysisFocus(focus)}>{analysisFocus === focus ? "♡ " : ""}{focus}</button>)}</div></fieldset>
          <label className="consent-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I understand this chat includes another person’s messages and will be sent to Gemini after common identifiers are redacted.</span></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="question-actions"><button className="quiet-button" onClick={() => setStep("upload")}>← Back</button><button className="button button-primary" disabled={!file || !viewerName.trim() || !personName.trim() || !connectionLabel || !consent || isAnalysing} onClick={analyseChat}>Create our Wrapped <span>✦</span></button></div>
        </div>}

        {step === "processing" && <div className="processing-card" aria-live="polite">
          <div className="processing-orbit"><span className="processing-heart">♡</span><i /><i /><i /></div>
          <span className="processing-kicker">Gemini is reading the rhythm</span>
          <h3>{processingMessages[processingStage]}</h3>
          <div className="processing-progress">{processingMessages.map((message, index) => <span key={message} className={index <= processingStage ? "is-active" : ""} />)}</div>
          <p>{personName ? `Creating a ${connectionLabel.toLowerCase()} story for you and ${personName}.` : `Creating your ${connectionLabel.toLowerCase()} story.`}</p>
          <small>You can stay on this page. This usually takes only a few moments.</small>
        </div>}

        {step === "result" && result && currentCard && <div className="result-experience">
          <div className="story-deck" aria-live="polite">
            <div className="story-card story-card-shadow-one" />
            <div className="story-card story-card-shadow-two" />
            <article className={`story-card story-card-main card-tone-${activeCard}`} key={activeCard}>
              <span className="story-card-number">0{activeCard + 1} / 03</span>
              <small>{currentCard.label}</small>
              <strong>{currentCard.value}</strong>
              <p>{currentCard.note}</p>
              <span className="story-card-mark">U</span>
            </article>
          </div>
          <div className="deck-controls"><button aria-label="Previous card" disabled={activeCard === 0} onClick={() => setActiveCard((card) => card - 1)}>←</button><div>{storyCards.map((card, index) => <span key={card.label} className={index === activeCard ? "is-active" : ""} />)}</div><button aria-label="Next card" disabled={activeCard === storyCards.length - 1} onClick={() => setActiveCard((card) => card + 1)}>→</button></div>

          <article className="analytics-card">
            <div className="analytics-head"><div><small>{connectionLabel} analytics</small><h3>{personName || "Your conversation"}</h3></div><button onClick={copySummary}>{copied ? "Copied ✓" : "Copy summary"}</button></div>
            <p className="analytics-summary">{result.summary}</p>
            <div className="analytics-grid"><div><span>Messages</span><strong>{result.messageCount.toLocaleString()}</strong></div><div><span>Favourite time</span><strong>{result.mostActiveTime}</strong></div><div><span>Most-used emoji</span><strong>{result.mostUsedEmoji}</strong></div><div><span>Favourite word</span><strong>“{result.favoriteWord}”</strong></div><div><span>Overall tone</span><strong>{result.tone}</strong></div><div><span>Recurring topics</span><strong>{result.topics.length}</strong></div></div>
            <div className="analytics-moment"><span>A moment worth noticing</span><p>{result.memorableMoment}</p></div>
            <div className="result-topics">{result.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>
          </article>
          <button className="quiet-button result-reset" onClick={() => { setResult(null); setStep("upload"); setConsent(false); }}>Analyse another chat</button>
        </div>}
      </section>

      <section className="insight-preview-section"><p className="eyebrow"><span /> {result ? "Your deeper story" : "What you will discover"}</p><h2>{result ? result.title : <>More than numbers.<br />A portrait of the connection.</>}</h2><div className="insight-preview-grid">{displayedInsights.map((insight, index) => <article key={insight.title}><span>0{index + 1}</span><strong>{insight.title}</strong><p>{insight.detail}</p></article>)}</div></section>
      <footer><div><span className="wordmark-seal">U</span><strong>Unsaid</strong></div><Link href="/message">Need to start a conversation instead? →</Link><span>Private by design · Lagos, Nigeria</span></footer>
    </main>
  );
}
