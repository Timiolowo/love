"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaymentPlanModal } from "@/components/PaymentPlanModal";
import { AuthModal } from "@/components/AuthModal";
import { UserProfileModal } from "@/components/UserProfileModal";
import { Navbar } from "@/components/Navbar";

const intents = ["Confess", "Apologise", "Say thank you", "Clear the air"];

type User = {
  id: string;
  email: string;
  name?: string | null;
  credits: number;
};

type CreatedRoomData = {
  chatId: string;
  senderToken: string;
  recipientToken: string;
  inviteLink: string;
  senderLink: string;
  whatsappUrl: string;
};

export default function MessagePage() {
  const [intent, setIntent] = useState("Apologise");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [ready, setReady] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [aiError, setAiError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [createdRoom, setCreatedRoom] = useState<CreatedRoomData | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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

  async function handleCreateAnonChat() {
    if (!message.trim()) return;
    setIsSending(true);

    try {
      const res = await fetch("/api/message/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          message: message.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json() as CreatedRoomData & { error?: string };
      if (!res.ok || !data.inviteLink) throw new Error(data.error || "Failed to create anonymous room.");

      setCreatedRoom(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create private message.");
    } finally {
      setIsSending(false);
    }
  }

  function handlePaymentOrSend() {
    if (user && user.credits > 0) {
      handleCreateAnonChat();
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
        alert(data.error || "Payment initialization failed.");
      }
    } catch {
      alert("Payment initialization failed.");
    }
  }

  function copyInviteLink() {
    if (!createdRoom) return;
    navigator.clipboard.writeText(createdRoom.inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const displayName = user?.name || user?.email.split("@")[0] || "User";

  return (
    <main className="product-page message-page">
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <section className="product-hero message-product-hero">
        <div className="product-intro">
          <Link className="back-link" href="/">← Back home</Link>
          <p className="eyebrow"><span /> Private conversations, gently begun</p>
          <h1>Say what matters.<br /><em>Stay private.</em></h1>
          <p>The recipient chooses whether to open your message. Your identity remains protected until you both agree to reveal it.</p>
          <div className="product-trust">
            <span>Consent first</span>
            <span>Unsaid AI wording assistance</span>
            <span>Protected Anonymous Room</span>
          </div>
        </div>

        <div className="message-invite-preview">
          <div className="invite-seal">♡</div>
          <span>Private invitation</span>
          <h3>Someone has sent you a thoughtful anonymous message.</h3>
          <p>You can choose to read it or decline. Your decision stays private.</p>
          <div>
            <button>Open message</button>
            <button>Decline</button>
          </div>
        </div>
      </section>

      <section className="dedicated-flow message-dedicated-flow">
        <div className="flow-copy">
          <span className="step-chip">Step 01 · Compose</span>
          <h2>What would you say if fear was not in the way?</h2>
          <p>Write naturally. Unsaid AI can help soften the wording while preserving your meaning, and refuses to assist threatening, coercive, or privacy-violating messages.</p>
          <div className="recipient-preview">
            <span>What they receive first</span>
            <p>You have received a private anonymous message. The sender delivered it securely through Unsaid. You can choose to read it or decline.</p>
            <small>Open message →</small>
          </div>
        </div>

        {createdRoom ? (
          <div className="delivery-ready anon-created-box">
            <div className="ready-seal">✓</div>
            <span className="result-tag">Anonymous Room Sealed &amp; Ready</span>
            <h3>Your message is sealed and ready for delivery.</h3>
            <p>Send the private invitation link directly or share it on WhatsApp. You can enter your side of the chat room anytime.</p>

            <div className="share-actions-stack">
              <a
                href={createdRoom.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="button button-primary button-full whatsapp-share-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.142 4.166 4.285-1.123z"/></svg>
                Share on WhatsApp
              </a>

              <button className="button button-secondary button-full" onClick={copyInviteLink}>
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Invitation Link Copied!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    Copy Private Invitation Link
                  </>
                )}
              </button>

              <Link
                href={`/message/room/${createdRoom.chatId}?token=${createdRoom.senderToken}`}
                className="button button-light button-full"
              >
                Enter Anonymous Chat Room
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>
          </div>
        ) : !ready ? (
          <div className="form-card large-form">
            <label>
              Recipient’s WhatsApp number (optional)
              <div className="phone-field">
                <span>+234</span>
                <input
                  inputMode="tel"
                  placeholder="801 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </label>

            <fieldset>
              <legend>What do you want to do?</legend>
              <div className="intent-grid">
                {intents.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={intent === item}
                    onClick={() => setIntent(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>

            <label>
              Your message
              <textarea
                value={message}
                onChange={(event) => { setMessage(event.target.value); setAiError(""); }}
                placeholder="Say what has been on your mind…"
                rows={6}
                maxLength={4000}
              />
            </label>

            <button
              className="ai-button"
              type="button"
              disabled={message.trim().length < 3 || isRewriting}
              onClick={suggestWording}
            >
              ✦ {isRewriting ? "Unsaid AI is rewriting…" : "Help me say this more gently"}
            </button>

            {aiError && <p className="form-error" role="alert">{aiError}</p>}

            <div className="payment-row">
              <button
                className="button button-primary button-full"
                disabled={!message.trim()}
                onClick={() => {
                  if (!user) {
                    setIsAuthOpen(true);
                  } else {
                    setReady(true);
                  }
                }}
              >
                Continue to delivery
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="delivery-ready">
            <div className="ready-seal">✓</div>
            <span className="result-tag">Ready for secure delivery</span>
            <h3>Your message feels thoughtful and safe to send.</h3>
            <p>The recipient will see the invitation first. Your message remains sealed until they accept.</p>
            <blockquote>{message}</blockquote>
            <button
              className="button button-primary button-full"
              disabled={isSending}
              onClick={handlePaymentOrSend}
            >
              {isSending ? "Sealing room…" : user && user.credits > 0 ? "Use 1 Credit & Deliver" : "Unlock & Deliver Message →"}
            </button>
            <button className="quiet-button" onClick={() => setReady(false)}>Edit message</button>
          </div>
        )}
      </section>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          setReady(true);
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

      <section className="message-steps">
        <p className="eyebrow"><span /> What happens next</p>
        <div className="message-step-grid">
          <article>
            <b>01</b>
            <h3>They choose</h3>
            <p>The recipient accepts or declines before seeing your message.</p>
          </article>
          <article>
            <b>02</b>
            <h3>You can talk</h3>
            <p>If they accept, both people can reply inside a protected anonymous room.</p>
          </article>
          <article>
            <b>03</b>
            <h3>You both decide</h3>
            <p>Identity reveal only happens when each person independently agrees.</p>
          </article>
        </div>
      </section>

      <footer>
        <div><span className="wordmark-seal">U</span><strong>Unsaid</strong></div>
        <Link href="/insights">Want to analyse an existing chat? →</Link>
        <span>Private by design · Lagos, Nigeria</span>
      </footer>
    </main>
  );
}
