"use client";

import Link from "next/link";
import { useState } from "react";

const intents = ["Confess", "Apologise", "Say thank you", "Clear the air"];

export default function MessagePage() {
  const [intent, setIntent] = useState("Apologise");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [aiError, setAiError] = useState("");

  async function suggestWording() {
    if (message.trim().length < 3) return;
    setIsRewriting(true);
    setAiError("");

    try {
      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, intent }),
      });
      const payload = await response.json() as { result?: { safe: boolean; issue: string; rewritten: string }; error?: string };
      if (!response.ok || !payload.result) throw new Error(payload.error || "Rewrite failed.");
      if (!payload.result.safe) throw new Error(payload.result.issue || "This message cannot be rewritten safely.");
      setMessage(payload.result.rewritten);
    } catch (caught) {
      setAiError(caught instanceof Error ? caught.message : "Rewrite failed.");
    } finally {
      setIsRewriting(false);
    }
  }

  return (
    <main className="product-page message-page">
      <nav className="site-nav product-nav"><Link className="wordmark" href="/"><span className="wordmark-seal">U</span><span>Unsaid</span></Link><span className="product-nav-title">Private Message</span><Link className="nav-action" href="/insights">Chat Insights</Link></nav>
      <section className="product-hero message-product-hero">
        <div className="product-intro"><Link className="back-link" href="/">← Back home</Link><p className="eyebrow"><span /> Private conversations, gently begun</p><h1>Say what matters.<br /><em>Stay private.</em></h1><p>The recipient chooses whether to open your message. Your identity remains protected until you both agree to reveal it.</p><div className="product-trust"><span>Consent first</span><span>Unsaid AI wording assistance</span><span>₦1,500 secure delivery</span></div></div>
        <div className="message-invite-preview"><div className="invite-seal">♡</div><span>Private invitation</span><h3>Someone has sent you a thoughtful anonymous message.</h3><p>You can choose to read it or decline. Your decision stays private.</p><div><button>Open message</button><button>Decline</button></div></div>
      </section>

      <section className="dedicated-flow message-dedicated-flow">
        <div className="flow-copy"><span className="step-chip">Step 01 · Compose</span><h2>What would you say if fear was not in the way?</h2><p>Write naturally. Unsaid AI can help soften the wording while preserving your meaning, and refuses to assist threatening, coercive, or privacy-violating messages.</p><div className="recipient-preview"><span>What they receive first</span><p>You have received a private anonymous message. The sender paid to deliver it securely. You can choose to read it or decline.</p><small>Open message →</small></div></div>
        {!ready ? <div className="form-card large-form">
          <label>Recipient’s WhatsApp number<div className="phone-field"><span>🇳🇬 +234</span><input inputMode="tel" placeholder="801 234 5678" /></div></label>
          <fieldset><legend>What do you want to do?</legend><div className="intent-grid">{intents.map((item) => <button key={item} type="button" aria-pressed={intent === item} onClick={() => setIntent(item)}>{item}</button>)}</div></fieldset>
          <label>Your message<textarea value={message} onChange={(event) => { setMessage(event.target.value); setAiError(""); }} placeholder="Say what has been on your mind…" rows={6} maxLength={4000} /></label>
          <button className="ai-button" type="button" disabled={message.trim().length < 3 || isRewriting} onClick={suggestWording}>✦ {isRewriting ? "Unsaid AI is rewriting…" : "Help me say this more gently"}</button>
          {aiError && <p className="form-error" role="alert">{aiError}</p>}
          <div className="payment-row"><span><small>Secure delivery</small><strong>₦1,500</strong></span><button className="button button-primary" disabled={!message.trim()} onClick={() => setReady(true)}>Continue to payment</button></div>
        </div> : <div className="delivery-ready"><div className="ready-seal">✓</div><span className="result-tag">Ready for secure delivery</span><h3>Your message feels thoughtful and safe to send.</h3><p>The recipient will see the invitation first. Your message remains sealed until they accept.</p><blockquote>{message}</blockquote><button className="button button-primary button-full">Pay ₦1,500 and send securely</button><button className="quiet-button" onClick={() => setReady(false)}>Edit message</button></div>}
      </section>

      <section className="message-steps"><p className="eyebrow"><span /> What happens next</p><div className="message-step-grid"><article><b>01</b><h3>They choose</h3><p>The recipient accepts or declines before seeing your message.</p></article><article><b>02</b><h3>You can talk</h3><p>If they accept, both people can reply inside a protected anonymous room.</p></article><article><b>03</b><h3>You both decide</h3><p>Identity reveal only happens when each person independently agrees.</p></article></div></section>
      <footer><div><span className="wordmark-seal">U</span><strong>Unsaid</strong></div><Link href="/insights">Want to analyse an existing chat? →</Link><span>Private by design · Lagos, Nigeria</span></footer>
    </main>
  );
}
