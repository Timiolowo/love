"use client";

import Link from "next/link";
import { useState } from "react";

export default function InsightsPage() {
  const [fileName, setFileName] = useState("");
  const [wrapped, setWrapped] = useState(false);

  return (
    <main className="product-page insights-page">
      <nav className="site-nav product-nav"><Link className="wordmark" href="/"><span className="wordmark-seal">U</span><span>Unsaid</span></Link><span className="product-nav-title">Chat Insights</span><Link className="nav-action" href="/message">Private Message</Link></nav>
      <section className="product-hero">
        <div className="product-intro"><Link className="back-link" href="/">← Back home</Link><p className="eyebrow"><span /> Your conversation, beautifully understood</p><h1>Your chats have<br /><em>a story.</em></h1><p>Upload an exported WhatsApp conversation and turn everyday messages into a thoughtful, shareable relationship Wrapped.</p><div className="product-trust"><span>Private processing</span><span>No media required</span><span>Delete anytime</span></div></div>
        <div className="wrapped-teaser" aria-hidden="true"><div className="teaser-card teaser-back"><span>11:42 PM</span><small>Your favourite time to gist</small></div><div className="teaser-card teaser-front"><small>Messages exchanged</small><strong>18,642</strong><span>Friendship Wrapped</span></div></div>
      </section>

      <section className="dedicated-flow">
        <div className="flow-copy"><span className="step-chip">Step 01 · Upload</span><h2>Start with your WhatsApp export.</h2><p>Open the chat in WhatsApp, choose Export Chat, then select “Without Media.” Your file stays private and is used only to create this analysis.</p><ol className="mini-steps"><li><b>1</b>Export without media</li><li><b>2</b>Choose the connection type</li><li><b>3</b>Receive your Wrapped</li></ol></div>
        {!wrapped ? <div className="form-card large-form">
          <label className="upload-box"><input type="file" accept=".txt,.zip" onChange={(event) => { setFileName(event.target.files?.[0]?.name ?? ""); setWrapped(false); }} /><span className="upload-icon">↥</span><strong>{fileName || "Drop your WhatsApp export here"}</strong><small>{fileName ? "Ready to analyse" : "TXT or ZIP · Without media · Up to 20 MB"}</small></label>
          <label>What kind of connection is this?<select defaultValue="Friendship"><option>Friendship</option><option>Relationship</option><option>Family</option><option>Business partner</option></select></label>
          <label className="consent-check"><input type="checkbox" /> <span>I understand this analysis may include messages from another person.</span></label>
          <button className="button button-primary button-full" disabled={!fileName} onClick={() => setWrapped(true)}>Create my Wrapped</button>
        </div> : <div className="wrapped-result dedicated-result"><span className="result-tag">Friendship Wrapped · 2026</span><h3>You two made ordinary days feel memorable.</h3><div className="result-stat"><small>Messages exchanged</small><strong>18,642</strong><span>Most active at 11:42 PM</span></div><div className="result-quote">“One quick gist” became 96 messages.</div><button className="button button-light">Share this moment</button></div>}
      </section>

      <section className="insight-preview-section"><p className="eyebrow"><span /> What you will discover</p><h2>More than numbers.<br />A portrait of the connection.</h2><div className="insight-preview-grid"><article><span>01</span><strong>Your rhythm</strong><p>When you talk most, who starts the gist, and the moments that became marathons.</p></article><article><span>02</span><strong>Your language</strong><p>Inside jokes, favourite phrases, recurring themes, and the words that feel like home.</p></article><article><span>03</span><strong>Your support</strong><p>How you show up for one another through change, celebration, and difficult days.</p></article></div></section>
      <footer><div><span className="wordmark-seal">U</span><strong>Unsaid</strong></div><Link href="/message">Need to start a conversation instead? →</Link><span>Private by design · Lagos, Nigeria</span></footer>
    </main>
  );
}
