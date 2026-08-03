"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { AuthModal } from "@/components/AuthModal";
import { PaymentPlanModal } from "@/components/PaymentPlanModal";
import { WelcomeGiftModal } from "@/components/WelcomeGiftModal";
import { PaymentSuccessModal } from "@/components/PaymentSuccessModal";

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
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [creditsAdded, setCreditsAdded] = useState(3);

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

    if (searchParams.get("payment") === "success") {
      const added = Number(searchParams.get("added")) || 3;
      setCreditsAdded(added);
      setIsSuccessModalOpen(true);
      const successMsg = `✦ Payment Successful! ${added} Wrap Credits have been added to your account.`;
      setMessage(successMsg);

      // Optimistically update localStorage & state
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("unsaid_user");
        let currentCredits = 0;
        let parsed: Partial<User> = {};
        if (stored) {
          try {
            parsed = JSON.parse(stored);
            currentCredits = parsed.credits || 0;
          } catch {
            /* ignore */
          }
        }
        const updatedCredits = currentCredits + added;
        const updatedUser = { ...parsed, id: parsed.id || `usr_${Date.now()}`, email: parsed.email || "", credits: updatedCredits } as User;
        setUser(updatedUser);
        localStorage.setItem("unsaid_user", JSON.stringify(updatedUser));

        // Sync with server DB without downgrading local credits
        fetch("/api/auth/me")
          .then((res) => res.json() as Promise<{ user?: User }>)
          .then((data) => {
            if (data.user) {
              const maxCredits = Math.max(data.user.credits || 0, updatedCredits);
              const syncedUser = { ...data.user, credits: maxCredits };
              setUser(syncedUser);
            }
          })
          .catch(() => {});
      }
    }

    const errParam = searchParams.get("error");
    if (errParam) {
      if (errParam.includes("abandoned")) {
        setMessage("Payment was cancelled or abandoned before completion.");
      } else {
        setMessage("Payment verification failed or was not completed. Please try again.");
      }
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

  async function handleDeleteAccount() {
    if (!confirm("Are you sure you want to delete your account? This will permanently delete your account profile.")) {
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("unsaid_user");
    }
    try {
      await fetch("/api/user/delete", { method: "DELETE" });
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  }

  function handleSelectPlan(planType: "guest_single" | "account_bundle", guestEmail?: string, currency?: string, creditsCount?: number) {
    setIsPlanModalOpen(false);
    try {
      fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType, email: guestEmail || user?.email, userId: user?.id, currency: currency || "NGN", creditsCount }),
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

      {message && (
        <div className="global-profile-alert-banner">
          <div className="alert-banner-content">
            <span className="banner-icon">✦</span>
            <span>{message}</span>
            <button type="button" onClick={() => setMessage(null)} className="banner-close-btn">×</button>
          </div>
        </div>
      )}

      <section className="profile-hero">
        <div className="profile-header-meta">
          <div className="profile-avatar-circle">{firstName.charAt(0).toUpperCase()}</div>
          <div>
            <p className="eyebrow">
              <span /> Your Account
            </p>
            <h1>
              Welcome back, <em>{firstName}.</em>
            </h1>
            {user && (
              <div className="profile-hero-credits-bar">
                <span className="pill-badge credits-badge">
                  ✦ {user.credits} {user.credits === 1 ? "Credit" : "Credits"}
                </span>
                <button
                  type="button"
                  className="button button-primary button-sm"
                  onClick={() => setIsPlanModalOpen(true)}
                >
                  + Add Credits
                </button>
                <Link
                  href="/dashboard"
                  className="button button-secondary button-sm profile-dashboard-nav-btn"
                >
                  📁 Go to Dashboard →
                </Link>
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
              <div className="profile-danger-actions">
                <button
                  type="button"
                  className="button button-secondary logout-btn"
                  onClick={handleLogout}
                >
                  Sign Out of Account
                </button>
                <button
                  type="button"
                  className="quiet-button delete-account-btn"
                  onClick={handleDeleteAccount}
                >
                  Delete Account
                </button>
              </div>
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

      <PaymentSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        creditsAdded={creditsAdded}
      />
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
