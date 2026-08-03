"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, use } from "react";

type ChatRoom = {
  id: string;
  intent: string;
  status: string;
  role: "sender" | "recipient";
  myRevealed: boolean;
  theirRevealed: boolean;
  bothRevealed: boolean;
  senderEmail: string | null;
  senderPhone?: string | null;
  recipientName?: string | null;
  isExpired: boolean;
};

type MessageItem = {
  id: string;
  chatId: string;
  senderRole: "sender" | "recipient";
  text: string;
  createdAt: number;
};

export default function AnonChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [chat, setChat] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function fetchRoomState() {
    if (!token) return;
    try {
      const res = await fetch(`/api/message/${resolvedParams.id}?token=${token}`);
      const data = (await res.json()) as { chat?: ChatRoom; messages?: MessageItem[] };
      if (res.ok && data.chat && data.messages) {
        setChat(data.chat);
        setMessages(data.messages);
      }
    } catch {
      /* ignore polling errors */
    }
  }

  useEffect(() => {
    fetchRoomState().finally(() => setLoading(false));
    const interval = setInterval(fetchRoomState, 3000);
    return () => clearInterval(interval);
  }, [resolvedParams.id, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !token) return;
    setSending(true);
    try {
      const res = await fetch(`/api/message/${resolvedParams.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "reply", text: replyText.trim() }),
      });
      if (res.ok) {
        setReplyText("");
        await fetchRoomState();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  async function executeReveal() {
    if (!token) return;
    setShowConfirmModal(false);
    setRevealing(true);
    try {
      const res = await fetch(`/api/message/${resolvedParams.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "reveal" }),
      });
      if (res.ok) {
        await fetchRoomState();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reveal identity.");
    } finally {
      setRevealing(false);
    }
  }

  if (loading) {
    return (
      <main className="empty-report">
        <span className="wordmark-seal">U</span>
        <h2>Entering encrypted chat room…</h2>
      </main>
    );
  }

  if (!chat) {
    return (
      <main className="empty-report">
        <span className="wordmark-seal">🔒</span>
        <h1>Room Unavailable</h1>
        <p>This room has expired or the token link is invalid.</p>
        <Link className="button button-primary" href="/message">
          Send a Message →
        </Link>
      </main>
    );
  }

  return (
    <main className="product-page anon-room-page">
      <nav className="site-nav product-nav">
        <Link className="wordmark" href="/">
          <span className="wordmark-seal">U</span>
          <span>Unfiltered</span>
        </Link>
        <span className="product-nav-title">Anonymous Room · {chat.intent}</span>
        <button
          type="button"
          className={`button ${chat.myRevealed ? "button-secondary" : "button-primary"}`}
          onClick={() => setShowConfirmModal(true)}
          disabled={revealing || chat.myRevealed}
        >
          {chat.bothRevealed
            ? "✓ Identities Revealed"
            : chat.myRevealed
            ? "Waiting for partner reveal…"
            : "Reveal My Identity ✦"}
        </button>
      </nav>

      {chat.bothRevealed && (
        <div className="reveal-banner">
          <span>🎉 Both participants agreed to reveal their identities!</span>
          {chat.senderEmail && <small>Sender Email: {chat.senderEmail}</small>}
          {chat.senderPhone && <small>Sender Contact: {chat.senderPhone}</small>}
          {chat.recipientName && <small>Recipient: {chat.recipientName}</small>}
        </div>
      )}

      <section className="chat-room-container">
        <div className="chat-room-header">
          <h2>{chat.role === "sender" ? "Anonymous A" : "Anonymous B"}</h2>
          <span className="chat-room-meta">Private room · 18 min</span>
        </div>

        <div className="chat-protection-notice">
          <span>♡ Both identities are protected. Reveal only happens when you both agree.</span>
        </div>

        <div className="chat-messages-scroll">
          {messages.map((msg) => {
            const isMe = msg.senderRole === chat.role;
            return (
              <div key={msg.id} className={`chat-bubble-row ${isMe ? "bubble-mine" : "bubble-theirs"}`}>
                <div className="chat-bubble">
                  <p>{msg.text}</p>
                  <span className="chat-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendReply} className="chat-reply-composer">
          <input
            type="text"
            placeholder="Write a reply…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={sending}
          />
          <button type="submit" className="send-circle-btn" disabled={!replyText.trim() || sending} aria-label="Send reply">
            ↑
          </button>
        </form>
      </section>

      {/* Identity Reveal Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowConfirmModal(false)}>
              ×
            </button>
            <span className="wordmark-seal">✦</span>
            <h2>Are you sure you want to reveal your identity?</h2>
            <p>
              Your partner will <strong>ONLY</strong> see your identity if they also independently agree to reveal theirs. Once both participants reveal, your contact details will be shown.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
              <button
                type="button"
                className="button button-primary button-full"
                disabled={revealing}
                onClick={executeReveal}
              >
                {revealing ? "Revealing..." : "Yes, Reveal My Identity ✦"}
              </button>
              <button
                type="button"
                className="button button-secondary button-full"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
