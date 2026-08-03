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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function fetchRoomState() {
    if (!token) return;
    try {
      const res = await fetch(`/api/message/${resolvedParams.id}?token=${token}`);
      const data = await res.json() as { chat?: ChatRoom; messages?: MessageItem[] };
      if (res.ok && data.chat && data.messages) {
        setChat(data.chat);
        setMessages(data.messages);
      }
    } catch { /* ignore polling errors */ }
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

  async function handleRevealIdentity() {
    if (!token) return;
    if (!confirm("Are you sure you want to reveal your identity? Your partner will only see it if they also reveal theirs.")) return;
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
        <p>This room has expired or the token is invalid.</p>
        <Link className="button button-primary" href="/message">Send a Message →</Link>
      </main>
    );
  }

  return (
    <main className="product-page anon-room-page">
      <nav className="site-nav product-nav">
        <Link className="wordmark" href="/"><span className="wordmark-seal">U</span><span>Unsaid</span></Link>
        <span className="product-nav-title">Anonymous Room · {chat.intent}</span>
        <button
          className={`button ${chat.myRevealed ? "button-secondary" : "button-primary"}`}
          onClick={handleRevealIdentity}
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
        </div>
      )}

      <section className="chat-room-container">
        <div className="chat-messages-scroll">
          {messages.map((msg) => {
            const isMe = msg.senderRole === chat.role;
            return (
              <div key={msg.id} className={`chat-bubble-row ${isMe ? "bubble-mine" : "bubble-theirs"}`}>
                <div className="chat-bubble">
                  <small>{isMe ? "You" : chat.bothRevealed ? (chat.role === "sender" ? "Recipient" : "Sender") : "Anonymous"}</small>
                  <p>{msg.text}</p>
                  <span className="chat-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendReply} className="chat-reply-bar">
          <input
            type="text"
            placeholder="Type your anonymous reply…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={sending}
          />
          <button type="submit" className="button button-primary" disabled={!replyText.trim() || sending}>
            {sending ? "Sending…" : "Send →"}
          </button>
        </form>
      </section>
    </main>
  );
}
