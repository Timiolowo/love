"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, use } from "react";

type ChatDetails = {
  id: string;
  intent: string;
  status: string;
  createdAt: number;
  expiresAt: number;
  isExpired: boolean;
  role: string;
};

export default function ViewAnonMessagePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [chat, setChat] = useState<ChatDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function loadChat() {
      if (!token) {
        setError("Missing access token for this private message.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/message/${resolvedParams.id}?token=${token}`);
        const data = await res.json() as { chat?: ChatDetails; error?: string };
        if (!res.ok || !data.chat) throw new Error(data.error || "Message not found.");
        setChat(data.chat);
        if (data.chat.status === "accepted") {
          router.replace(`/message/room/${resolvedParams.id}?token=${token}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load message.");
      } finally {
        setLoading(false);
      }
    }
    loadChat();
  }, [resolvedParams.id, token, router]);

  async function handleDecision(decision: "accept" | "decline") {
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/message/${resolvedParams.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: decision }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || "Decision failed.");

      if (decision === "accept") {
        router.replace(`/message/room/${resolvedParams.id}?token=${token}`);
      } else {
        setChat((c) => c ? { ...c, status: "declined" } : null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to process decision.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="empty-report">
        <span className="wordmark-seal">U</span>
        <h2>Verifying sealed private message…</h2>
      </main>
    );
  }

  if (error || !chat) {
    return (
      <main className="empty-report">
        <span className="wordmark-seal">🔒</span>
        <h1>{error || "Message Unavailable"}</h1>
        <p>This private invitation may have expired (14-day limit) or invalid token link.</p>
        <Link className="button button-primary" href="/message">Send a Private Message →</Link>
      </main>
    );
  }

  if (chat.status === "declined") {
    return (
      <main className="empty-report">
        <span className="wordmark-seal">✓</span>
        <h1>You declined this invitation.</h1>
        <p>Your privacy was respected. The sender was not given your identity.</p>
        <Link className="button button-primary" href="/">Return Home</Link>
      </main>
    );
  }

  return (
    <main className="product-page message-page">
      <nav className="site-nav product-nav">
        <Link className="wordmark" href="/"><span className="wordmark-seal">U</span><span>Unsaid</span></Link>
        <span className="product-nav-title">Sealed Private Invitation</span>
        <Link className="nav-action" href="/insights">Chat Insights</Link>
      </nav>

      <section className="product-hero message-product-hero">
        <div className="message-invite-card">
          <div className="invite-seal">♡</div>
          <span className="invite-tag">Private Invitation · {chat.intent}</span>
          <h2>Someone sent you a thoughtful anonymous message.</h2>
          <p>The sender paid to deliver this message securely through Unsaid. You can choose whether to open it or decline.</p>

          <div className="invite-privacy-notice">
            <span>🔒 Your decision is private. If you decline, your identity remains protected.</span>
          </div>

          <div className="invite-button-group">
            <button
              className="button button-primary button-full"
              disabled={actionLoading}
              onClick={() => handleDecision("accept")}
            >
              {actionLoading ? "Unsealing message…" : "Accept & Open Message →"}
            </button>
            <button
              className="button button-secondary button-full"
              disabled={actionLoading}
              onClick={() => handleDecision("decline")}
            >
              Decline Invitation
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
