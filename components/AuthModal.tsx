"use client";

import { useState, useEffect } from "react";

export function AuthModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: { id: string; email: string; name?: string | null; credits: number }) => void;
}) {
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const errParam = params.get("error");
      if (errParam) {
        setError(errParam.includes("google") ? "Google sign-in could not be completed. Please try again." : decodeURIComponent(errParam));
      }
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <span className="wordmark-seal">U</span>
        <h2>Sign In to Unfiltered</h2>
        <p>Sign in with your Google account to access your dashboard, claim <strong>1 Free Credit</strong>, and manage sealed private rooms.</p>

        {error && (
          <div
            className="form-error"
            style={{
              background: "rgba(255, 100, 100, 0.15)",
              color: "#ff8888",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginTop: "14px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <div className="google-auth-section" style={{ marginTop: "24px" }}>
          <a href="/api/auth/google" className="button button-primary button-full google-signin-btn">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9z" />
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2l-3.7 2.9C3.7 20.4 7.5 23 12 23z" />
            </svg>
            Continue with Google →
          </a>
        </div>
      </div>
    </div>
  );
}
