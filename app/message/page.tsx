"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaymentPlanModal } from "@/components/PaymentPlanModal";
import { AuthModal } from "@/components/AuthModal";
import { UserProfileModal } from "@/components/UserProfileModal";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const intents = ["Confess", "Apologise", "Say thank you", "Clear the air"];

const countryCodes = [
  { code: "+234", flag: "🇳🇬", name: "Nigeria (+234)" },
  { code: "+1", flag: "🇺🇸", name: "USA / Canada (+1)" },
  { code: "+44", flag: "🇬🇧", name: "UK (+44)" },
  { code: "+233", flag: "🇬🇭", name: "Ghana (+233)" },
  { code: "+254", flag: "🇰🇪", name: "Kenya (+254)" },
  { code: "+27", flag: "🇿🇦", name: "South Africa (+27)" },
  { code: "+91", flag: "🇮🇳", name: "India (+91)" },
  { code: "+971", flag: "🇦🇪", name: "UAE (+971)" },
  { code: "+49", flag: "🇩🇪", name: "Germany (+49)" },
  { code: "+33", flag: "🇫🇷", name: "France (+33)" },
  { code: "+39", flag: "🇮🇹", name: "Italy (+39)" },
  { code: "+34", flag: "🇪🇸", name: "Spain (+34)" },
  { code: "+31", flag: "🇳🇱", name: "Netherlands (+31)" },
  { code: "+61", flag: "🇦🇺", name: "Australia (+61)" },
  { code: "+55", flag: "🇧🇷", name: "Brazil (+55)" },
  { code: "+81", flag: "🇯🇵", name: "Japan (+81)" },
  { code: "+86", flag: "🇨🇳", name: "China (+86)" },
  { code: "+255", flag: "🇹🇿", name: "Tanzania (+255)" },
  { code: "+256", flag: "🇺🇬", name: "Uganda (+256)" },
  { code: "+225", flag: "🇨🇮", name: "Côte d'Ivoire (+225)" },
  { code: "+221", flag: "🇸🇳", name: "Senegal (+221)" },
  { code: "+237", flag: "🇨🇲", name: "Cameroon (+237)" },
];

function formatPhoneNumber(val: string) {
  const cleaned = val.replace(/\D/g, "").slice(0, 11);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
}

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
  const [countryCode, setCountryCode] = useState("+234");
  const [recipientName, setRecipientName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderCountryCode, setSenderCountryCode] = useState("+234");
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
        const data = (await res.json()) as { user?: User };
        if (data.user) setUser(data.user);
      } catch {
        /* ignore */
      }
    }
    checkUser();
  }, []);

  async function handleSoftenedRewrite() {
    if (!message.trim()) return;
    setIsRewriting(true);
    setAiError("");

    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, intent }),
      });
      const data = (await res.json()) as { softened?: string; result?: { rewritten?: string }; error?: string };
      const text = data.softened || data.result?.rewritten;
      if (!res.ok || !text) {
        throw new Error(data.error || "Failed to rewrite message.");
      }
      setMessage(text);
    } catch (caught) {
      setAiError(caught instanceof Error ? caught.message : "Rewrite failed.");
    } finally {
      setIsRewriting(false);
    }
  }

  async function handleCreateAnonChat() {
    if (!message.trim() || !phone.trim()) return;
    setIsSending(true);

    const fullPhone = `${countryCode}${phone.replace(/[^0-9]/g, "")}`;
    const fullSenderPhone = senderPhone.trim() ? `${senderCountryCode}${senderPhone.replace(/[^0-9]/g, "")}` : "";

    try {
      const res = await fetch("/api/message/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          message: message.trim(),
          phone: fullPhone,
          senderPhone: fullSenderPhone,
          recipientName: recipientName.trim(),
        }),
      });

      const data = (await res.json()) as CreatedRoomData & { remainingCredits?: number; error?: string };
      if (!res.ok || !data.inviteLink) throw new Error(data.error || "Failed to create anonymous room.");

      setCreatedRoom(data);
      if (typeof data.remainingCredits === "number" && user) {
        setUser({ ...user, credits: data.remainingCredits });
      }
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = (await meRes.json()) as { user?: User };
        if (meData.user) setUser(meData.user);
      } catch {
        /* ignore */
      }
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

  async function handleSelectPlan(planType: "guest_single" | "account_bundle", guestEmail?: string, currency: string = "NGN", creditsCount?: number) {
    setIsPlanModalOpen(false);
    try {
      const res = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType, currency, email: guestEmail || user?.email, userId: user?.id, creditsCount }),
      });
      const data = (await res.json()) as { authorizationUrl?: string; error?: string };
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

  return (
    <main className="product-page message-page">
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <section className="product-hero message-product-hero">
        <div className="product-intro">
          <p className="eyebrow"><span /> Private conversations, gently begun</p>
          <h1>Say what matters.<br /><em>Stay private.</em></h1>
          <p>The recipient chooses whether to open your message. Your identity remains protected until you both agree to reveal it.</p>
          {user && (
            <div style={{ marginTop: "1.25rem", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link href="/dashboard" className="button button-secondary button-sm">
                💬 Open Your Messages &amp; Conversations →
              </Link>
            </div>
          )}
        </div>

        <div className="message-invite-preview">
          <div className="invite-seal">♡</div>
          <span>Private invitation</span>
          <h3>{recipientName.trim() ? `Hey ${recipientName.trim()}, someone has sent you a message.` : "Someone has sent you a thoughtful anonymous message."}</h3>
          <p>You can choose to read it or decline. Your decision stays private.</p>
          <div>
            <button type="button">Open message</button>
            <button type="button">Decline</button>
          </div>
        </div>
      </section>

      <section className="dedicated-flow message-dedicated-flow">
        <div className="flow-copy">
          <span className="step-chip">Step 01 · Compose</span>
          <h2>What would you say if fear was not in the way?</h2>
          <p>Write naturally. Unfiltered AI can help soften the wording while preserving your meaning, and refuses to assist threatening, coercive, or privacy-violating messages.</p>
          <div className="recipient-preview">
            <span>What they receive first</span>
            <p>{recipientName.trim() ? `Hey ${recipientName.trim()}, you have received a private anonymous message. Delivered securely through Unfiltered.` : "You have received a private anonymous message. The sender delivered it securely through Unfiltered. You can choose to read it or decline."}</p>
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

              <button type="button" className="button button-secondary button-full" onClick={copyInviteLink}>
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
              <span>Recipient’s name *</span>
              <input
                type="text"
                placeholder="e.g. Sarah, Tobi"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="text-field"
                maxLength={40}
                required
              />
            </label>

            <label>
              <span>Recipient’s WhatsApp number *</span>
              <div className="phone-field">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="country-select"
                  aria-label="Select Country Code"
                >
                  {countryCodes.map((c) => (
                    <option key={c.code + c.name} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  inputMode="tel"
                  placeholder="801 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  required
                />
              </div>
            </label>

            <label>
              <span>Your phone number (optional — for identity reveal)</span>
              <div className="phone-field">
                <select
                  value={senderCountryCode}
                  onChange={(e) => setSenderCountryCode(e.target.value)}
                  className="country-select"
                  aria-label="Select Your Country Code"
                >
                  {countryCodes.map((c) => (
                    <option key={c.code + c.name} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  inputMode="tel"
                  placeholder="801 234 5678"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(formatPhoneNumber(e.target.value))}
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
              <span>Your message</span>
              <textarea
                placeholder="Say what has been on your mind..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={2000}
              />
            </label>

            <button
              type="button"
              className="ai-button"
              disabled={!message.trim() || isRewriting}
              onClick={handleSoftenedRewrite}
            >
              ✦ {isRewriting ? "Rewriting with Unfiltered AI..." : "Help me say this more gently"}
            </button>

            {aiError && <p className="form-error" role="alert">{aiError}</p>}

            <button
              type="button"
              className="button button-primary button-full"
              disabled={!message.trim() || !phone.trim() || !recipientName.trim()}
              onClick={() => setReady(true)}
            >
              Continue to delivery <span>→</span>
            </button>
          </div>
        ) : (
          <div className="form-card large-form">
            <span className="result-tag">Ready for secure delivery</span>
            <h3>Your message feels thoughtful and safe to send.</h3>
            <p>The recipient will see the invitation first. Your message remains sealed until they accept.</p>
            <blockquote>{message}</blockquote>
            <button
              type="button"
              className="button button-primary button-full"
              disabled={isSending}
              onClick={handlePaymentOrSend}
            >
              {isSending ? "Sealing room…" : user && user.credits > 0 ? "Use 1 Credit & Deliver" : "Unlock & Deliver Message →"}
            </button>
            <button type="button" className="quiet-button" onClick={() => setReady(false)}>Edit message</button>
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

      <Footer />
    </main>
  );
}
