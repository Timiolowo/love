"use client";

import { useState } from "react";

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; email: string; credits: number }) => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json() as { user?: { id: string; email: string; credits: number }; error?: string };
      if (!res.ok || !data.user) throw new Error(data.error || "Login failed");

      onSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <span className="wordmark-seal">U</span>
        <h2>Sign In or Create Account</h2>
        <p>Create an account today to claim <strong>1 Free Credit</strong> for a free trial, plus Dashboard storage and 14-day shareable links.</p>

        <div className="google-auth-section">
          <a href="/api/auth/google" className="button button-secondary button-full google-signin-btn">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/><path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9z"/><path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2l-3.7 2.9C3.7 20.4 7.5 23 12 23z"/></svg>
            Continue with Google
          </a>
        </div>

        <div className="auth-divider"><span>or with email</span></div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="form-error">{error}</div>}
          <label>
            Email Address
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          <button type="submit" className="button button-primary button-full" disabled={loading}>
            {loading ? "Signing in…" : "Continue with Email →"}
          </button>
        </form>
      </div>
    </div>
  );
}
