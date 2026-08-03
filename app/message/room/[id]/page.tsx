"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, use } from "react";
import { AuthModal } from "@/components/AuthModal";

type ChatRoom = {
  id: string;
  intent: string;
  status: string;
  role: "sender" | "recipient";
  myRevealed: boolean;
  theirRevealed: boolean;
  bothRevealed: boolean;
  senderEmail: string | null;
  senderName?: string | null;
  senderPhone?: string | null;
  recipientName?: string | null;
  isExpired: boolean;
  disruptedAt?: number | null;
};

type MessageItem = {
  id: string;
  chatId: string;
  senderRole: "sender" | "recipient" | "system";
  text: string;
  createdAt: number;
};

type UserChatSummary = {
  id: string;
  intent: string;
  status: string;
  recipientName?: string | null;
  senderToken: string;
  createdAt: number;
  initialMessage: string;
};

export default function AnonChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [chat, setChat] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [userChats, setUserChats] = useState<UserChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [disrupting, setDisrupting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDisruptModal, setShowDisruptModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { user?: { id: string; email: string } | null }) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  async function fetchRoomState() {
    if (!token) return;
    try {
      const res = await fetch(`/api/message/${resolvedParams.id}?token=${token}`);
      const data = (await res.json()) as { chat?: ChatRoom; messages?: MessageItem[] };
      if (res.ok && data.chat && data.messages) {
        setChat(data.chat);
        setMessages(data.messages);
        if (data.chat.status === "disrupted") {
          const sysMsg = data.messages.find((m) => m.senderRole === "system");
          const disTimestamp = data.chat.disruptedAt || sysMsg?.createdAt || Date.now();
          const elapsed = Math.floor((Date.now() - disTimestamp) / 1000);
          const remaining = Math.max(0, 15 - elapsed);
          setCountdown(remaining);
        }
      }
    } catch {
      /* ignore polling errors */
    }
  }

  useEffect(() => {
    fetchRoomState().finally(() => setLoading(false));
    if (chat?.status === "disrupted" && countdown === 0) {
      return;
    }
    const interval = setInterval(fetchRoomState, 3000);
    return () => clearInterval(interval);
  }, [resolvedParams.id, token, chat?.status, countdown]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    async function loadUserChats() {
      try {
        const res = await fetch("/api/user/messages");
        const data = (await res.json()) as { chats?: UserChatSummary[] };
        if (data.chats) setUserChats(data.chats);
      } catch {
        /* ignore */
      }
    }
    loadUserChats();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function executeDisrupt() {
    if (!token) return;
    setShowDisruptModal(false);
    setDisrupting(true);
    try {
      const res = await fetch(`/api/message/${resolvedParams.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "disrupt" }),
      });
      if (res.ok) {
        setCountdown(15);
        await fetchRoomState();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to disrupt chat.");
    } finally {
      setDisrupting(false);
    }
  }

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

  const currentChatSummary: UserChatSummary = {
    id: chat.id,
    intent: chat.intent,
    status: chat.status,
    recipientName: chat.recipientName || (chat.role === "sender" ? "Anonymous Partner" : "Anonymous Sender"),
    senderToken: token || "",
    createdAt: chat.createdAt,
    initialMessage: messages[0]?.text || "Sealed message...",
  };

  const hasCurrent = userChats.some((c) => c.id === chat.id);
  const displayChats = hasCurrent ? userChats : [currentChatSummary, ...userChats];

  return (
    <main className="product-page anon-room-page">
      <nav className="site-nav product-nav">
        <Link className="wordmark" href="/">
          <span className="wordmark-seal">U</span>
          <span>Unfiltered</span>
        </Link>
        <span className="product-nav-title">Anonymous Room · {chat.intent}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className={`button ${chat.myRevealed ? "button-secondary" : "button-primary"}`}
            onClick={() => setShowConfirmModal(true)}
            disabled={revealing || chat.myRevealed || chat.status === "disrupted"}
          >
            {chat.bothRevealed
              ? "✓ Identities Revealed"
              : chat.myRevealed
              ? "Waiting for partner reveal…"
              : "Reveal My Identity ✦"}
          </button>
          {chat.role === "sender" && chat.status !== "disrupted" && (
            <button
              type="button"
              className="button button-danger button-sm"
              onClick={() => setShowDisruptModal(true)}
              disabled={disrupting}
            >
              🛑 Disrupt &amp; End
            </button>
          )}
        </div>
      </nav>

      {chat.bothRevealed && (
        <div className="reveal-banner">
          <span className="banner-badge">✦ Identity Unsealed</span>
          <div className="reveal-info-grid">
            <p>Sender Name: <strong>{chat.senderName || "Anonymous Sender"}</strong></p>
            <p>Email: <strong>{chat.senderEmail || "Private / Hidden"}</strong></p>
          </div>
        </div>
      )}

      <div className={`anon-room-layout ${!user ? "is-single-view" : ""}`}>
        {user && (
          <aside className="chat-sidebar">
            <div className="sidebar-top-header">
              <h3>Conversations</h3>
              <Link href="/message" className="new-chat-icon-btn" title="Send new private message">+</Link>
            </div>
            <div className="sidebar-chats-list">
              {displayChats.map((c) => (
                <Link
                  key={c.id}
                  href={`/message/room/${c.id}?token=${c.senderToken}`}
                  className={`sidebar-chat-item ${c.id === resolvedParams.id ? "is-active" : ""}`}
                >
                  <div className="sidebar-item-header">
                    <span className="sidebar-recipient-name">{c.recipientName || "Anonymous Chat"}</span>
                    <small className="sidebar-intent-tag">{c.intent}</small>
                  </div>
                  <p className="sidebar-preview-text">{c.initialMessage}</p>
                  <span className={`status-pill status-${c.status}`}>{c.status}</span>
                </Link>
              ))}
            </div>
          </aside>
        )}

        <section className="chat-room-container">
          {chat.status === "disrupted" && (
            <div className="disrupt-system-banner">
              <span className="disrupt-icon">🛑</span>
              <div>
                <strong>System Notice: The sender has disrupted and ended this conversation.</strong>
                <p>
                  {countdown !== null && countdown > 0
                    ? `This chat room will permanently close in ${countdown}s...`
                    : "This chat room is permanently closed."}
                </p>
              </div>
            </div>
          )}

          {!user && chat.status !== "disrupted" && (
            <div className="guest-history-banner">
              <span>💡 <strong>Save your chat history:</strong> Sign in to track ongoing conversations, monitor replies, and manage all your private rooms in one place.</span>
              <button type="button" className="button button-secondary button-sm" onClick={() => setIsAuthOpen(true)}>
                Sign In to Save →
              </button>
            </div>
          )}

          <div className="chat-room-header">
            <h2>{chat.role === "sender" ? (chat.recipientName ? `Chat with ${chat.recipientName}` : "Anonymous A") : "Anonymous B"}</h2>
            <span className="chat-room-meta">Private room · {chat.intent}</span>
          </div>

          <div className="chat-protection-notice">
            <span>♡ Both identities are protected. Reveal only happens when you both agree.</span>
          </div>

          <div className="chat-messages-scroll">
            {messages.map((msg) => {
              if (msg.senderRole === "system") {
                return (
                  <div key={msg.id} className="chat-bubble-row bubble-system">
                    <div className="chat-bubble system-bubble">
                      <p>{msg.text}</p>
                    </div>
                  </div>
                );
              }
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
              placeholder={
                chat.status === "disrupted"
                  ? "This conversation has been ended by the sender."
                  : "Write a reply…"
              }
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={sending || chat.status === "disrupted" || (countdown !== null && countdown <= 0)}
            />
            <button
              type="submit"
              className="send-circle-btn"
              disabled={!replyText.trim() || sending || chat.status === "disrupted" || (countdown !== null && countdown <= 0)}
              aria-label="Send reply"
            >
              ↑
            </button>
          </form>
        </section>
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          setIsAuthOpen(false);
        }}
      />

      {/* Disrupt Confirmation Modal */}
      {showDisruptModal && (
        <div className="modal-overlay" onClick={() => setShowDisruptModal(false)}>
          <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowDisruptModal(false)}>
              ×
            </button>
            <span className="wordmark-seal" style={{ color: "#ff5252" }}>🛑</span>
            <h2>End &amp; Disrupt Conversation?</h2>
            <p>
              Are you sure you want to end this conversation? The recipient will receive a system message that the sender has ended the chat, and the room will close permanently in <strong>15 seconds</strong>.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
              <button
                type="button"
                className="button button-danger button-full"
                disabled={disrupting}
                onClick={executeDisrupt}
              >
                {disrupting ? "Disrupting..." : "Yes, Disrupt & End Chat 🛑"}
              </button>
              <button
                type="button"
                className="button button-secondary button-full"
                onClick={() => setShowDisruptModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
