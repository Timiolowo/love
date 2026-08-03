"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { PaymentPlanModal } from "@/components/PaymentPlanModal";
import { UserProfileModal } from "@/components/UserProfileModal";
import { Navbar } from "@/components/Navbar";

type User = {
  id: string;
  email: string;
  name?: string | null;
  credits: number;
};

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
  dynamicScores: Array<{ category: string; score: number }>;
  dynamicMetrics: Array<{ label: string; value: string; comment: string }>;
  relationshipHealth: string;
  loveLanguage: string;
  playfulAwards: Array<{ title: string; winner: "You" | "Them" | "Both"; confidence: number; reason: string }>;
  milestones: Array<{ emoji: string; title: string; when: string; detail: string }>;
  badSide: {
    youFlaws: Array<{ title: string; detail: string }>;
    themFlaws: Array<{ title: string; detail: string }>;
    relationshipRedFlags: Array<{ title: string; detail: string }>;
  };
  advice: {
    realityCheck: string;
    adviceForYou: string[];
    adviceForThem: string[];
    verdict: string;
  };
};

type FlowStep = "upload" | "questions" | "processing";

const previewInsights = [
  { title: "Your rhythm", detail: "When you talk most, who starts the gist, and the moments that became marathons." },
  { title: "Your bad side", detail: "Brutally honest red flags, toxic communication habits, and hidden flaws exposed." },
  { title: "Unvarnished advice", detail: "A real reality check on where you stand and direct action steps for both of you." },
];

const processingMessages = [
  "Unsealing your conversation…",
  "Analyzing bad habits, red flags & chat rhythm…",
  "Computing dynamic metrics and brutal truths…",
  "Turning your story into dynamic cards…",
];

function getChatPersonName(fileName: string): string {
  if (!fileName) return "";
  return fileName
    .replace(/\.(zip|txt)$/i, "")
    .replace(/^WhatsApp Chat\s*(?:-|–|with)\s*/i, "")
    .trim();
}

async function detectParticipants(file: File): Promise<{ detected: string[]; defaultPartner: string }> {
  let text = "";
  if (file.name.toLowerCase().endsWith(".txt")) {
    try { text = await file.text(); } catch { /* ignore */ }
  } else if (file.name.toLowerCase().endsWith(".zip")) {
    try {
      const JSZip = (await import("jszip")).default;
      const archive = await JSZip.loadAsync(await file.arrayBuffer());
      const txtFile = Object.values(archive.files).find((f) => !f.dir && f.name.toLowerCase().endsWith(".txt"));
      if (txtFile) {
        text = await txtFile.async("string");
      }
    } catch { /* ignore */ }
  }

  const cleanText = text.replace(/[\u200e\u200f\u202a-\u202e\u200b\uFEFF]/g, "");
  const sendersMap = new Map<string, number>();
  const lines = cleanText.split(/\r?\n/).slice(0, 1200);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(/^\[?\d{1,4}[/.\-]\d{1,2}[/.\-]\d{2,4},?\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?\]?\s*(?:-|–)?\s*([^:\n]{1,80}):/i);
    if (match && match[1]) {
      let sender = match[1].trim();
      sender = sender.replace(/^[\s,.\-\]]+/, "").replace(/[\s,.\-\[]+$/, "").trim();

      if (
        sender.length > 0 &&
        sender.length < 50 &&
        !/^\d+$/.test(sender) &&
        !/^,\s*\d+$/.test(sender) &&
        !/messages and calls are end-to-end encrypted|whatsapp|system|security code|omitted|joined using|left|added|changed/i.test(sender)
      ) {
        sendersMap.set(sender, (sendersMap.get(sender) || 0) + 1);
      }
    }
  }

  const sortedSenders = [...sendersMap.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  let partner = "";
  if (file.name) {
    partner = file.name.replace(/\.(zip|txt)$/i, "").replace(/^WhatsApp Chat\s*(?:-|–|with)\s*/i, "").trim();
  }

  return {
    detected: sortedSenders,
    defaultPartner: partner || (sortedSenders[1] || sortedSenders[0] || ""),
  };
}

export default function InsightsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<FlowStep>("upload");
  const [personName, setPersonName] = useState("");
  const [viewerName, setViewerName] = useState("");
  const [detectedSenders, setDetectedSenders] = useState<string[]>([]);
  const [connectionType, setConnectionType] = useState("Friendship");
  const [customConnection, setCustomConnection] = useState("");
  const [consent, setConsent] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const connectionLabel = connectionType === "Other" ? customConnection.trim() : connectionType;

  useEffect(() => {
    async function checkUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json() as { user?: User };
        if (data.user) setUser(data.user);
      } catch { /* ignore */ }
    }
    checkUser();
  }, []);

  useEffect(() => {
    if (step !== "processing") return;
    const timer = window.setInterval(() => setProcessingStage((current) => Math.min(current + 1, processingMessages.length - 1)), 1500);
    return () => window.clearInterval(timer);
  }, [step]);

  async function chooseFile(nextFile: File | null) {
    setFile(nextFile);
    setError("");
    if (nextFile) {
      const fallbackPartner = getChatPersonName(nextFile.name);
      setPersonName(fallbackPartner);
      const { detected, defaultPartner } = await detectParticipants(nextFile);
      setDetectedSenders(detected);
      if (detected.length >= 2) {
        setViewerName(detected[0]);
        setPersonName(detected[1]);
      } else if (detected.length === 1) {
        setViewerName(detected[0]);
        if (defaultPartner && defaultPartner !== detected[0]) setPersonName(defaultPartner);
      }
    } else {
      setDetectedSenders([]);
      setPersonName("");
      setViewerName("");
    }
  }

  async function startAnalysisExecution() {
    if (!file || !connectionLabel || !consent) return;
    setIsAnalysing(true);
    setProcessingStage(0);
    setStep("processing");
    setError("");

    try {
      const form = new FormData();
      form.set("chat", file);
      form.set("connectionType", connectionLabel);
      form.set("analysisFocus", "Comprehensive analysis covering red flags, communication habits, affection, funny patterns & brutal honesty");
      form.set("viewerName", viewerName.trim());
      form.set("personName", personName.trim());
      form.set("consent", "true");
      const [response] = await Promise.all([
        fetch("/api/insights", { method: "POST", body: form }),
        new Promise((resolve) => window.setTimeout(resolve, 2600)),
      ]);
      const payload = await response.json() as { result?: InsightsResult; shareId?: string; isGuest?: boolean; error?: string };
      if (!response.ok || !payload.result) throw new Error(payload.error || "Analysis failed.");
      window.sessionStorage.setItem("unsaid-insights-report", JSON.stringify({
        result: payload.result,
        personName: personName.trim(),
        viewerName: viewerName.trim(),
        connectionLabel,
        shareId: payload.shareId,
        isGuest: payload.isGuest,
        createdAt: Date.now()
      }));
      router.push("/insights/result");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
      setStep("questions");
    } finally {
      setIsAnalysing(false);
    }
  }

  function handleCreateClick() {
    if (!file || !connectionLabel || !consent) return;
    if (user && user.credits > 0) {
      startAnalysisExecution();
    } else {
      setIsPlanModalOpen(true);
    }
  }

  async function handleSelectPlan(planType: "guest_single" | "account_bundle", guestEmail?: string, currency: string = "NGN") {
    setIsPlanModalOpen(false);
    try {
      const res = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType, currency, email: guestEmail || user?.email }),
      });
      const data = await res.json() as { authorizationUrl?: string; error?: string };
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setError(data.error || "Payment initialization failed.");
      }
    } catch {
      setError("Payment initialization failed.");
    }
  }

  return (
    <main className="product-page insights-page">
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <section className="product-hero">
        <div className="product-intro"><Link className="back-link" href="/">← Back home</Link><p className="eyebrow"><span /> Your conversation, beautifully understood</p><h1>Your chats have<br /><em>a story.</em></h1><p>Upload an exported WhatsApp conversation and turn everyday messages into a thoughtful, shareable relationship Wrapped.</p><div className="product-trust"><span>Server-side Unsaid AI</span><span>Identifiers redacted</span><span>Not stored by Unsaid</span></div></div>
        <div className="wrapped-teaser" aria-hidden="true"><div className="teaser-card teaser-back"><span>11:42 PM</span><small>Your favourite time to gist</small></div><div className="teaser-card teaser-front"><small>Messages exchanged</small><strong>18,642</strong><span>Friendship Wrapped</span></div></div>
      </section>

      <section className="dedicated-flow insights-experience">
        <div className="flow-copy">
          <span className="step-chip">{step === "upload" ? "Step 01 · Upload" : step === "questions" ? "Step 02 · A few questions" : "Step 03 · Creating"}</span>
          <h2>{step === "upload" ? "Start with your WhatsApp export." : step === "questions" ? "Before I begin…" : "Something lovely is taking shape."}</h2>
          <p>{step === "upload" ? "Choose Export Chat and select “Without Media.” Upload the ZIP WhatsApp gives you—we will safely extract the conversation." : step === "questions" ? "A little context helps Unsaid AI notice the right things without guessing what this connection means to you." : "Your identifiers are being redacted before Unsaid AI looks for patterns. The original chat is not saved by Unsaid."}</p>
          <ol className="mini-steps"><li className={step !== "upload" ? "is-done" : ""}><b>1</b>Export without media</li><li className={step === "processing" ? "is-done" : ""}><b>2</b>Tell us what matters</li><li><b>3</b>Open your Wrapped</li></ol>
        </div>

        {step === "upload" && <div className="form-card large-form upload-step-card">
          <label className="upload-box"><input type="file" accept=".zip,application/zip,.txt,text/plain" onChange={(event) => chooseFile(event.target.files?.[0] || null)} /><span className="upload-icon">↥</span><strong>{file?.name || "Drop your WhatsApp ZIP here"}</strong><small>{file ? `${(file.size / 1024).toFixed(0)} KB · ${personName ? `Chat with ${personName}` : "Ready to continue"}` : "ZIP or TXT · Without media · ZIP up to 20 MB"}</small></label>
          <div className="upload-reassurance"><span>♡</span><p><strong>Your chat stays private.</strong><small>We process it for this Wrapped and do not add it to a public feed or save the original file.</small></p></div>
          <button className="button button-primary button-full" disabled={!file} onClick={() => setStep("questions")}>Continue with this chat <span>→</span></button>
        </div>}

        {step === "questions" && <div className="form-card large-form question-card">
          <div className="ai-question"><span>✦</span><div><small>UNSAID AI</small><p>I found the conversation. Select who you are so I can address you directly by name with raw, unvarnished insights.</p></div></div>
          {detectedSenders.length > 0 ? (
            <label>Which of these names is YOU in the chat?
              <select value={viewerName} onChange={(event) => {
                const selected = event.target.value;
                setViewerName(selected);
                const partner = detectedSenders.find((s) => s !== selected);
                if (partner) setPersonName(partner);
              }}>
                <option value="">Select your name</option>
                {detectedSenders.map((sender) => <option key={sender} value={sender}>{sender}</option>)}
              </select>
              <small>Detected senders from your WhatsApp messages.</small>
            </label>
          ) : (
            <label>What is your name in this chat?<input className="text-field" value={viewerName} onChange={(event) => setViewerName(event.target.value)} placeholder="Exactly as it appears in WhatsApp" maxLength={80} /><small>This helps address you directly by name in the report.</small></label>
          )}
          <label>Who is this chat with?<input className="text-field" value={personName} onChange={(event) => setPersonName(event.target.value)} placeholder="Their name or nickname" maxLength={40} /><small>This name personalises your cards and is used by Unsaid AI.</small></label>
          <label>What kind of connection is this?<select value={connectionType} onChange={(event) => setConnectionType(event.target.value)}><option>Friendship</option><option>Relationship</option><option>Family</option><option>Business partner</option><option>Classmate</option><option>Other</option></select></label>
          {connectionType === "Other" && <label>Describe the connection<input className="text-field" value={customConnection} onChange={(event) => setCustomConnection(event.target.value)} placeholder="For example: mentor, roommate, childhood friend" maxLength={50} /></label>}
          <label className="consent-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I understand this chat will be analyzed with Unsaid AI using the actual participant names.</span></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="question-actions"><button className="quiet-button" onClick={() => setStep("upload")}>← Back</button><button className="button button-primary" disabled={!file || !viewerName.trim() || !personName.trim() || !connectionLabel || !consent || isAnalysing} onClick={handleCreateClick}>Create our Wrapped <span>✦</span></button></div>
        </div>}

        {step === "processing" && <div className="processing-card" aria-live="polite">
          <div className="processing-orbit"><span className="processing-heart">♡</span><i /><i /><i /></div>
          <span className="processing-kicker">Unsaid AI is reading the rhythm</span>
          <h3>{processingMessages[processingStage]}</h3>
          <div className="processing-progress">{processingMessages.map((message, index) => <span key={message} className={index <= processingStage ? "is-active" : ""} />)}</div>
          <p>{personName ? `Creating a ${connectionLabel.toLowerCase()} story for you and ${personName}.` : `Creating your ${connectionLabel.toLowerCase()} story.`}</p>
          <small>You can stay on this page. This usually takes only a few moments.</small>
        </div>}

      </section>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          if (u.credits > 0) startAnalysisExecution();
        }}
      />

      <PaymentPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSelectPlan={handleSelectPlan}
        userEmail={user?.email}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdateUser={(updated) => setUser(updated)}
        onOpenBuyCredits={() => setIsPlanModalOpen(true)}
      />

      <section className="insight-preview-section"><p className="eyebrow"><span /> What you will discover</p><h2>More than numbers.<br />A portrait of the connection.</h2><div className="insight-preview-grid">{previewInsights.map((insight, index) => <article key={insight.title}><span>0{index + 1}</span><strong>{insight.title}</strong><p>{insight.detail}</p></article>)}</div></section>
      <footer><div><span className="wordmark-seal">U</span><strong>Unsaid</strong></div><Link href="/message">Need to start a conversation instead? →</Link><span>Private by design · Lagos, Nigeria</span></footer>
    </main>
  );
}

