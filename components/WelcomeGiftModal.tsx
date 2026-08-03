"use client";

import { useEffect, useState } from "react";

export function WelcomeGiftModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [unveiled, setUnveiled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setUnveiled(true);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setUnveiled(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop welcome-backdrop" onClick={onClose}>
      <div className="modal-card welcome-gift-card" onClick={(e) => e.stopPropagation()}>
        <div className="confetti-burst" aria-hidden="true">
          <span className="particle p1">✨</span>
          <span className="particle p2">🎉</span>
          <span className="particle p3">💖</span>
          <span className="particle p4">⭐</span>
          <span className="particle p5">🎁</span>
          <span className="particle p6">✨</span>
        </div>

        <div className="gift-header">
          <span className="gift-badge">Welcome Gift Unveiled!</span>
          <h2>Congratulations! 🎉</h2>
          <p>Your Unfiltered account is ready.</p>
        </div>

        <div className={`gift-box-wrapper ${unveiled ? "is-unveiled" : "is-opening"}`}>
          <div className="gift-glow-aura" />
          <div className="gift-icon-container">
            {unveiled ? (
              <div className="credit-reward-reveal">
                <span className="reward-star">✦</span>
                <span className="reward-number">1</span>
                <span className="reward-label">FREE CREDIT</span>
              </div>
            ) : (
              <div className="gift-box-animated">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12" />
                  <rect x="2" y="7" width="20" height="5" />
                  <line x1="12" y1="22" x2="12" y2="7" />
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="gift-copy">
          {unveiled ? (
            <p className="claim-text">
              We added <strong>1 Free Credit</strong> to your balance to analyse your first chat or send a private message!
            </p>
          ) : (
            <p className="opening-text">Unveiling your surprise welcome reward...</p>
          )}
        </div>

        <button
          type="button"
          className="button button-primary claim-gift-btn"
          onClick={onClose}
        >
          {unveiled ? "Claim My Free Credit ✦" : "Opening..."}
        </button>
      </div>
    </div>
  );
}
