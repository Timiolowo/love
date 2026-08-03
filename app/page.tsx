"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { UserProfileModal } from "@/components/UserProfileModal";
import { Navbar } from "@/components/Navbar";

type User = {
  id: string;
  email: string;
  name?: string | null;
  credits: number;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

  return (
    <main>
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Private conversations, gently begun</p>
          <h1>Things left unsaid,<br /><em>beautifully brought to light.</em></h1>
          <p className="hero-text">Discover the story inside your chats—or begin the conversation you have been afraid to start. Thoughtful, private and always consent-first.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/insights">
              Analyse a chat
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </Link>
            <Link className="button button-secondary" href="/message">Send a private message</Link>
          </div>
          <div className="trust-line"><span>Encrypted in transit</span><span>AI safety checks</span><span>You stay in control</span></div>
        </div>

        <div className="hero-art" aria-label="A sealed private letter waiting to be opened">
          <span className="orb orb-one" /><span className="orb orb-two" /><div className="envelope-shadow" />
          <div className="envelope"><div className="envelope-flap" /><div className="envelope-fold" /><div className="glass-seal">♡</div></div>
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
          <Link className="choice-card insights-card" href="/insights">
            <span className="choice-number">01</span><div className="story-stack" aria-hidden="true"><i>58</i><i>11:42</i><i>♡</i></div>
            <div className="choice-copy"><span className="choice-label">Chat Insights</span><h3>See the story inside your conversations.</h3><p>Upload a WhatsApp export and receive a beautiful, shareable Wrapped built around your relationship.</p><span className="text-link">Create your Wrapped <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span></div>
          </Link>
          <Link className="choice-card message-card" href="/message">
            <span className="choice-number">02</span><div className="mini-message" aria-hidden="true"><span className="mini-seal">♡</span><p>Private message</p><strong>For their eyes only</strong></div>
            <div className="choice-copy"><span className="choice-label">Anonymous Message</span><h3>Start gently. Stay private until you are ready.</h3><p>Send one intentional message, reply anonymously, and reveal identities only when you both agree.</p><span className="text-link">Begin privately <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span></div>
          </Link>
        </div>
      </section>

      <section className="home-story">
        <div className="overview-copy"><p className="eyebrow"><span /> One emotional beat at a time</p><h2>Lovely enough to feel special. Calm enough to feel trusted.</h2><p>The experience uses warmth for courage—not pressure. Every step explains what happens next and keeps both people in control.</p><div className="home-story-actions"><Link className="button button-primary" href="/insights">Explore Chat Insights</Link><Link className="button button-secondary" href="/message">Explore Private Message</Link></div></div>
        <div className="conversation-preview">
          <div className="conversation-head"><span>Anonymous A</span><small>Private room · 18 min</small></div>
          <div className="safety-notice">♡ Both identities are protected. Reveal only happens when you both agree.</div>
          <p className="bubble">There’s something I have wanted to say without turning it into an argument.</p><p className="bubble bubble-right">I’m listening. Take your time.</p><div className="composer"><span>Write a reply…</span><b>↑</b></div>
        </div>
      </section>

      <section className="safety-section" id="safety">
        <div className="safety-copy"><p className="eyebrow"><span /> Privacy without the anxiety</p><h2>Anonymous should still feel safe.</h2><p>Every conversation has clear boundaries. AI checks messages before delivery, personal details stay hidden, and either person can leave at any time.</p><ul><li><b>01</b>Harassment and threat detection</li><li><b>02</b>Doxxing and personal-detail protection</li><li><b>03</b>Mutual identity reveal—never one-sided</li></ul></div>
        <div className="reveal-card"><div className="avatar-pair"><span>A</span><i>♡</i><span>B</span></div><p className="reveal-kicker">A meaningful moment</p><h3>Anonymous A wants to reveal who they are.</h3><p>Your identity will only become visible if you choose to reveal yours too.</p><button className="button button-primary">Reveal mine too</button><button className="quiet-button">Not yet</button></div>
      </section>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(u) => setUser(u)}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdateUser={(updated) => setUser(updated)}
      />

      <footer><div><span className="wordmark-seal">U</span><strong>Unsaid</strong></div><p>For the conversations people are afraid to start.</p><span>Private by design · Lagos, Nigeria</span></footer>
    </main>
  );
}
