"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";
import { PaymentPlanModal } from "@/components/PaymentPlanModal";
import { WelcomeGiftModal } from "@/components/WelcomeGiftModal";

type User = {
  id: string;
  email: string;
  name?: string | null;
  credits: number;
};

function ProfileContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isGiftOpen, setIsGiftOpen] = useState(false);

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = (await res.json()) as { user?: User };
        if (data.user) {
          setUser(data.user);
          setName(data.user.name || "");
          if (typeof window !== "undefined") {
            localStorage.setItem("unsaid_user", JSON.stringify(data.user));
          }
          return;
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }

      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("unsaid_user");
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as User;
            setUser(parsed);
            setName(parsed.name || "");
          } catch {
            /* ignore */
          }
        }
      }
    }
    loadUser();

    if (searchParams.get("welcome") === "true") {
      setIsGiftOpen(true);
    }
  }, [searchParams]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json()) as { user?: User; error?: string };
      if (data.user) {
        setUser(data.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("unsaid_user", JSON.stringify(data.user));
        }
        setMessage("Profile updated successfully!");
      } else {
        setMessage(data.error || "Failed to update profile.");
      }
    } catch {
      setMessage("Error saving changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("unsaid_user");
    }
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
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

  const rawName = user?.name || user?.email.split("@")[0] || "Friend";
  const firstName = rawName.trim().split(" ")[0];

  return (
    <main className="product-page profile-page">
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => {}}
      />

      <section className="profile-hero">
        <Link className="back-link" href="/dashboard">
          ← Back to Dashboard
        </Link>
        <div className="profile-header-meta">
          <div className="profile-avatar-circle">{firstName.charAt(0).toUpperCase()}</div>
          <div>
            <p className="eyebrow">
              <span /> Your Account
            </p>
            <h1>
              Welcome back, <br />
              <em>{firstName}.</em>
            </h1>
            {user && (
              <div className="profile-hero-credits-bar" style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span className="pill-badge" style={{ background: "rgba(246, 155, 192, 0.15)", color: "#f69bc0", border: "1px solid rgba(246, 155, 192, 0.3)", padding: "6px 14px", borderRadius: "100px", fontSize: "14px", fontWeight: "600" }}>
                  ✦ {user.credits} {user.credits === 1 ? "Credit" : "Credits"} Available
                </span>
                <button
                  type="button"
                  className="button button-primary button-sm"
                  onClick={() => setIsPlanModalOpen(true)}
                  style={{ height: "36px", padding: "0 16px", fontSize: "13px" }}
                >
                  + Add Credits
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="profile-grid-container">
        {!user && !loading ? (
          <div className="profile-card not-logged-in-card">
            <h2>Please Sign In</h2>
            <p>You need to sign in to access your profile and credits.</p>
            <button
              type="button"
              className="button button-primary"
              onClick={() => setIsAuthOpen(true)}
            >
              Sign In to Unfiltered
            </button>
          </div>
        ) : (
          <>
            {/* Account Details Card */}
            <div className="profile-card">
              <h2>Account Details</h2>
              <form onSubmit={handleSaveName} className="profile-form">
                <label>
                  <span>First & Last Name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Timi Oladipupo"
                    className="text-field"
                    maxLength={60}
                  />
                </label>

                <label>
                  <span>Email Address</span>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="text-field disabled-field"
                  />
                </label>

                {message && <p className="status-msg">{message}</p>}

                <button
                  type="submit"
                  className="button button-primary save-profile-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>

            {/* Credits & Subscription Card */}
            <div className="profile-card credits-profile-card">
              <div className="credits-badge-header">
                <span className="credits-star">✦</span>
                <div>
                  <h3>Your Credit Balance</h3>
                  <p className="credits-count-big">
                    {user?.credits || 0} {user?.credits === 1 ? "Credit" : "Credits"}
                  </p>
                </div>
              </div>
              <p className="credits-desc">
                1 Credit = 1 Chat Insights Analysis or 1 Private Anonymous Message.
              </p>
              <button
                type="button"
                className="button button-primary buy-more-credits-btn"
                onClick={() => setIsPlanModalOpen(true)}
              >
                + Get More Credits
              </button>
            </div>

            {/* Security & Logout Card */}
            <div className="profile-card danger-profile-card">
              <h2>Session & Security</h2>
              <p>Your session is protected over TLS with secure HTTP-only cookies.</p>
              <button
                type="button"
                className="button button-secondary logout-btn"
                onClick={handleLogout}
              >
                Sign Out of Account
              </button>
            </div>
          </>
        )}
      </section>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(u) => setUser(u)}
      />

      <PaymentPlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSelectPlan={handleSelectPlan}
        userEmail={user?.email}
      />

      <WelcomeGiftModal
        isOpen={isGiftOpen}
        onClose={() => setIsGiftOpen(false)}
      />

      <Footer />
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="product-page profile-page"><p className="loading-text">Loading profile...</p></div>}>
      <ProfileContent />
    </Suspense>
  );
}
