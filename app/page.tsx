"use client";

import { useRef, useState } from "react";

type View = "home" | "insights" | "message";

const intents = ["Confess", "Apologise", "Say thank you", "Clear the air"];

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [intent, setIntent] = useState("Apologise");
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [wrapped, setWrapped] = useState(false);
  const [deliveryReady, setDeliveryReady] = useState(false);
  const experienceRef = useRef<HTMLElement>(null);

  function openView(next: View) {
    setView(next);
    requestAnimationFrame(() => experienceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function suggestWording() {
    setMessage("I’ve been thinking about what happened, and I’m sorry for the part I played. I wanted to say this without putting you under pressure to respond immediately.");
  }

  return (
    <main>
      <nav className="site-nav" aria-label="Primary navigation">
        <button className="wordmark" onClick={() => openView("home")} aria-label="Unsaid home">
          <span className="wordmark-seal">U</span>
          <span>Unsaid</span>
        </button>
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#safety">Safety</a>
        </div>
        <button className="nav-action" onClick={() => openView("message")}>Start privately</button>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Private conversations, gently begun</p>
          <h1>Things left unsaid,<br /><em>beautifully brought to light.</em></h1>
          <p className="hero-text">
            Discover the story inside your chats—or begin the conversation you have been afraid to start. Thoughtful, private and always consent-first.
          </p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => openView("insights")}>Analyse a chat <span>↗</span></button>
            <button className="button button-secondary" onClick={() => openView("message")}>Send a private message</button>
          </div>
          <div className="trust-line"><span>Encrypted in transit</span><span>AI safety checks</span><span>You stay in control</span></div>
        </div>

        <div className="hero-art" aria-label="A sealed private letter waiting to be opened">
          <span className="orb orb-one" />
          <span className="orb orb-two" />
          <div className="envelope-shadow" />
          <div className="envelope">
            <div className="envelope-flap" />
            <div className="envelope-fold" />
            <div className="glass-seal">♡</div>
          </div>
          <div className="floating-note note-one">Something meaningful is waiting.</div>
          <div className="floating-note note-two"><span>♡</span> Consent first</div>
        </div>
      </section>

      <section className="choice-section" id="how-it-works">
        <div className="section-heading">
          <div><p className="eyebrow"><span /> Two ways to begin</p><h2>What do you need today?</h2></div>
          <p>One place for the conversations you already have—and the one you still need to start.</p>
        </div>
        <div className="choice-grid">
          <button className="choice-card insights-card" onClick={() => openView("insights") }>
            <span className="choice-number">01</span>
            <div className="story-stack" aria-hidden="true"><i>58</i><i>11:42</i><i>♡</i></div>
            <div className="choice-copy"><span className="choice-label">Chat Insights</span><h3>See the story inside your conversations.</h3><p>Upload a WhatsApp export and receive a beautiful, shareable Wrapped built around your relationship.</p><span className="text-link">Create your Wrapped →</span></div>
          </button>
          <button className="choice-card message-card" onClick={() => openView("message") }>
            <span className="choice-number">02</span>
            <div className="mini-message" aria-hidden="true"><span className="mini-seal">♡</span><p>Private message</p><strong>For their eyes only</strong></div>
            <div className="choice-copy"><span className="choice-label">Anonymous Message</span><h3>Start gently. Stay private until you are ready.</h3><p>Send one intentional message, reply anonymously, and reveal identities only when you both agree.</p><span className="text-link">Begin privately →</span></div>
          </button>
        </div>
      </section>

      <section className="experience" ref={experienceRef} aria-live="polite">
        <div className="experience-tabs" role="tablist" aria-label="Choose an experience">
          <button role="tab" aria-selected={view === "home"} onClick={() => setView("home")}>Overview</button>
          <button role="tab" aria-selected={view === "insights"} onClick={() => setView("insights")}>Chat Insights</button>
          <button role="tab" aria-selected={view === "message"} onClick={() => setView("message")}>Private Message</button>
        </div>

        {view === "home" && <Overview />}
        {view === "insights" && (
          <InsightsPanel
            fileName={fileName}
            wrapped={wrapped}
            onFile={(name) => { setFileName(name); setWrapped(false); }}
            onCreate={() => setWrapped(true)}
          />
        )}
        {view === "message" && (
          <MessagePanel
            intent={intent}
            message={message}
            ready={deliveryReady}
            setIntent={setIntent}
            setMessage={setMessage}
            suggestWording={suggestWording}
            onContinue={() => setDeliveryReady(true)}
          />
        )}
      </section>

      <section className="safety-section" id="safety">
        <div className="safety-copy">
          <p className="eyebrow"><span /> Privacy without the anxiety</p>
          <h2>Anonymous should still feel safe.</h2>
          <p>Every conversation has clear boundaries. AI checks messages before delivery, personal details stay hidden, and either person can leave at any time.</p>
          <ul><li><b>01</b>Harassment and threat detection</li><li><b>02</b>Doxxing and personal-detail protection</li><li><b>03</b>Mutual identity reveal—never one-sided</li></ul>
        </div>
        <div className="reveal-card">
          <div className="avatar-pair"><span>A</span><i>♡</i><span>B</span></div>
          <p className="reveal-kicker">A meaningful moment</p>
          <h3>Anonymous A wants to reveal who they are.</h3>
          <p>Your identity will only become visible if you choose to reveal yours too.</p>
          <button className="button button-primary">Reveal mine too</button>
          <button className="quiet-button">Not yet</button>
        </div>
      </section>

      <footer>
        <div><span className="wordmark-seal">U</span><strong>Unsaid</strong></div>
        <p>For the conversations people are afraid to start.</p>
        <span>Private by design · Lagos, Nigeria</span>
      </footer>
    </main>
  );
}

function Overview() {
  return (
    <div className="overview-panel">
      <div className="overview-copy"><p className="eyebrow"><span /> One emotional beat at a time</p><h2>Lovely enough to feel special. Calm enough to feel trusted.</h2><p>The experience uses warmth for courage—not pressure. Every step explains what happens next and keeps both people in control.</p></div>
      <div className="conversation-preview">
        <div className="conversation-head"><span>Anonymous A</span><small>Private room · 18 min</small></div>
        <div className="safety-notice">♡ Both identities are protected. Reveal only happens when you both agree.</div>
        <p className="bubble">There’s something I have wanted to say without turning it into an argument.</p>
        <p className="bubble bubble-right">I’m listening. Take your time.</p>
        <div className="composer"><span>Write a reply…</span><b>↑</b></div>
      </div>
    </div>
  );
}

function InsightsPanel({ fileName, wrapped, onFile, onCreate }: { fileName: string; wrapped: boolean; onFile: (name: string) => void; onCreate: () => void; }) {
  return (
    <div className="flow-panel insights-flow">
      <div className="flow-copy"><span className="step-chip">Chat Insights</span><h2>Your conversations have a story.</h2><p>Export a WhatsApp chat without media. We analyse patterns, memorable moments, and the tone of the relationship—then turn it into something beautiful.</p><div className="privacy-callout">Your upload is used only to create this Wrapped. You can delete the result whenever you like.</div></div>
      {!wrapped ? (
        <div className="form-card">
          <label className="upload-box">
            <input type="file" accept=".txt,.zip" onChange={(event) => onFile(event.target.files?.[0]?.name ?? "")} />
            <span className="upload-icon">↥</span><strong>{fileName || "Drop your WhatsApp export here"}</strong><small>{fileName ? "Ready to analyse" : "TXT or ZIP · Without media · Up to 20 MB"}</small>
          </label>
          <label>What kind of connection is this?<select defaultValue="Friendship"><option>Friendship</option><option>Relationship</option><option>Family</option><option>Business partner</option></select></label>
          <button className="button button-primary button-full" disabled={!fileName} onClick={onCreate}>Create my Wrapped</button>
        </div>
      ) : (
        <div className="wrapped-result">
          <span className="result-tag">Friendship Wrapped · 2026</span><h3>You two made ordinary days feel memorable.</h3>
          <div className="result-stat"><small>Messages exchanged</small><strong>18,642</strong><span>Most active at 11:42 PM</span></div>
          <div className="result-quote">“One quick gist” became 96 messages.</div>
          <button className="button button-light">Share this moment</button>
        </div>
      )}
    </div>
  );
}

function MessagePanel({ intent, message, ready, setIntent, setMessage, suggestWording, onContinue }: { intent: string; message: string; ready: boolean; setIntent: (value: string) => void; setMessage: (value: string) => void; suggestWording: () => void; onContinue: () => void; }) {
  return (
    <div className="flow-panel message-flow">
      <div className="flow-copy"><span className="step-chip">Private Message</span><h2>What would you say if fear was not in the way?</h2><p>The recipient receives a calm invitation first. They choose whether to open your message. Your identity stays protected unless you both decide otherwise.</p><div className="recipient-preview"><span>WhatsApp preview</span><p>You have received a private anonymous message. The sender paid to deliver it securely. You can choose to read it or decline.</p><small>Open message →</small></div></div>
      {!ready ? (
        <div className="form-card">
          <label>Recipient’s WhatsApp number<div className="phone-field"><span>🇳🇬 +234</span><input inputMode="tel" placeholder="801 234 5678" /></div></label>
          <fieldset><legend>What do you want to do?</legend><div className="intent-grid">{intents.map((item) => <button key={item} type="button" aria-pressed={intent === item} onClick={() => setIntent(item)}>{item}</button>)}</div></fieldset>
          <label>Your message<textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Say what has been on your mind…" rows={5} /></label>
          <button className="ai-button" type="button" onClick={suggestWording}>✦ Help me say this more gently</button>
          <div className="payment-row"><span><small>Secure delivery</small><strong>₦300</strong></span><button className="button button-primary" disabled={!message.trim()} onClick={onContinue}>Continue to payment</button></div>
        </div>
      ) : (
        <div className="delivery-ready">
          <div className="ready-seal">✓</div><span className="result-tag">Ready for secure delivery</span><h3>Your message feels thoughtful and safe to send.</h3><p>The recipient will see the invitation first. Your message remains sealed until they accept.</p>
          <blockquote>{message}</blockquote>
          <button className="button button-primary button-full">Pay ₦300 and send securely</button>
          <button className="quiet-button" onClick={() => window.location.reload()}>Edit message</button>
        </div>
      )}
    </div>
  );
}
