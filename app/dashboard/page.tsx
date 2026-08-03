"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaymentPlanModal } from "@/components/PaymentPlanModal";
import { UserProfileModal } from "@/components/UserProfileModal";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type User = {
  id: string;
  email: string;
  name?: string | null;
  credits: number;
};

type Wrap = {
  id: string;
  shareId: string;
  personName: string;
  viewerName: string;
  connection: string;
  isDisabled: number;
  expiresAt: number;
  createdAt: number;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [wraps, setWraps] = useState<Wrap[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [nowTimestamp] = useState<number>(() => Date.now());

  useEffect(() => {
    let ignore = false;
    async function loadDashboardData() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = (await meRes.json()) as { user?: User };
        if (ignore) return;
        let activeUser = meData.user;

        if (!activeUser && typeof window !== "undefined") {
          const stored = localStorage.getItem("unsaid_user");
          if (stored) {
            try {
              activeUser = JSON.parse(stored) as User;
            } catch {
              /* ignore */
            }
          }
        }

        if (activeUser) {
          setUser(activeUser);
          if (typeof window !== "undefined") {
            localStorage.setItem("unsaid_user", JSON.stringify(activeUser));
          }
          const wrapsRes = await fetch("/api/wraps");
          const wrapsData = (await wrapsRes.json()) as { wraps?: Wrap[]; credits?: number };
          if (ignore) return;
          if (wrapsData.wraps) setWraps(wrapsData.wraps);
          if (typeof wrapsData.credits === "number") {
            setUser((u) => (u ? { ...u, credits: wrapsData.credits! } : null));
          }
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadDashboardData();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleDelete(shareId: string) {
    if (!confirm("Are you sure you want to permanently delete this Wrapped report?")) return;
    try {
      const res = await fetch(`/api/wraps/${shareId}`, { method: "DELETE" });
      if (res.ok) {
        setWraps((prev) => prev.filter((w) => w.shareId !== shareId));
      } else {
        alert("Failed to delete wrap.");
      }
    } catch {
      alert("Error deleting wrap.");
    }
  }

  function copyShareLink(shareId: string) {
    const url = `${window.location.origin}/wrap/${shareId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleSelectPlan(planType: "guest_single" | "account_bundle", guestEmail?: string, currency?: string) {
    setIsPlanModalOpen(false);
    try {
      fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType, email: guestEmail || user?.email, currency: currency || "NGN" }),
      })
        .then((res) => res.json() as Promise<{ authorizationUrl?: string; error?: string }>)
        .then((data) => {
          if (data.authorizationUrl) {
            window.location.href = data.authorizationUrl;
          } else {
            alert(data.error || "Failed to initialize payment.");
          }
        });
    } catch {
      alert("Payment initialization failed.");
    }
  }

  if (loading) {
    return (
      <main className="product-page dashboard-page">
        <nav className="site-nav product-nav">
          <Link className="wordmark" href="/"><span className="wordmark-seal">U</span><span>Unfiltered</span></Link>
          <span className="product-nav-title">My Dashboard</span>
        </nav>
        <section className="dashboard-content"><p>Loading your dashboard...</p></section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="product-page dashboard-page">
        <nav className="site-nav product-nav">
          <Link className="wordmark" href="/"><span className="wordmark-seal">U</span><span>Unfiltered</span></Link>
          <span className="product-nav-title">My Dashboard</span>
        </nav>
        <section className="dashboard-content">
          <h2>Sign in required</h2>
          <p>Please sign in to view your saved chat wraps and credit balance.</p>
          <Link className="button button-primary" href="/insights">Go to Insights →</Link>
        </section>
      </main>
    );
  }

  const displayName = user.name || user.email.split("@")[0];

  return (
    <main className="product-page dashboard-page">
      <Navbar
        user={user}
        navTitle="My Dashboard"
        onOpenAuth={() => {}}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">Welcome back</span>
            <h1>{displayName}</h1>
            <p className="user-email-subtitle">{user.email}</p>
          </div>
          <div className="credits-card">
            <div>
              <small>Available Credits</small>
              <strong>{user.credits} {user.credits === 1 ? "Wrap Credit" : "Wrap Credits"}</strong>
            </div>
            <button className="button button-secondary" onClick={() => setIsPlanModalOpen(true)}>+ Buy Credits</button>
          </div>
        </header>

        <h2>Your Saved Wraps</h2>
        {wraps.length === 0 ? (
          <div className="empty-dashboard">
            <p>You haven&apos;t saved any Wrapped reports yet.</p>
            <Link className="button button-primary" href="/insights">Create a Wrapped →</Link>
          </div>
        ) : (
          <div className="wraps-list">
            {wraps.map((wrap) => {
              const daysLeft = nowTimestamp > 0 ? Math.max(0, Math.ceil((wrap.expiresAt - nowTimestamp) / (1000 * 60 * 60 * 24))) : 14;
              return (
                <div key={wrap.id} className="wrap-item-card">
                  <div className="wrap-item-info">
                    <h3>{wrap.viewerName} &amp; {wrap.personName}</h3>
                    <div className="wrap-meta">
                      <span>{wrap.connection}</span>
                      <span>·</span>
                      <span>{daysLeft} {daysLeft === 1 ? "day" : "days"} remaining</span>
                    </div>
                  </div>
                  <div className="wrap-item-actions">
                    <button className="button button-secondary" onClick={() => copyShareLink(wrap.shareId)}>
                      {copiedId === wrap.shareId ? "✓ Link Copied!" : "🔗 Share Link"}
                    </button>
                    <Link className="button button-secondary" href={`/wrap/${wrap.shareId}`}>View</Link>
                    <button className="button button-danger" onClick={() => handleDelete(wrap.shareId)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <PaymentPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSelectPlan={handleSelectPlan}
        userEmail={user.email}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdateUser={(updated) => setUser(updated)}
        onOpenBuyCredits={() => setIsPlanModalOpen(true)}
      />

      <Footer />
    </main>
  );
}
