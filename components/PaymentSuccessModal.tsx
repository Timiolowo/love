"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditsAdded: number;
}

export function PaymentSuccessModal({
  isOpen,
  onClose,
  creditsAdded,
}: PaymentSuccessModalProps) {
  const [bubbles, setBubbles] = useState<Array<{ id: number; left: number; size: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    if (isOpen) {
      // Generate celebratory floating bubbles
      const items = Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: Math.random() * 90 + 5,
        size: Math.random() * 24 + 12,
        delay: Math.random() * 0.8,
        duration: Math.random() * 2 + 2.5,
      }));
      setBubbles(items);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay payment-success-overlay" onClick={onClose}>
      <div className="modal-content payment-success-modal" onClick={(e) => e.stopPropagation()}>
        {/* Floating Bubble Particles */}
        <div className="celebration-bubbles-container">
          {bubbles.map((b) => (
            <span
              key={b.id}
              className="celebration-bubble"
              style={{
                left: `${b.left}%`,
                width: `${b.size}px`,
                height: `${b.size}px`,
                animationDelay: `${b.delay}s`,
                animationDuration: `${b.duration}s`,
              }}
            />
          ))}
        </div>

        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="success-badge-icon">
          <div className="sparkle-ring" />
          <span className="wordmark-seal">U</span>
        </div>

        <span className="success-eyebrow">Payment Successful</span>
        <h2>{creditsAdded} {creditsAdded === 1 ? "Credit" : "Credits"} Unlocked!</h2>
        <p>Your account balance has been updated. You can now generate full Unfiltered Chat Wrapped reports or send private anonymous messages.</p>

        <div className="credits-added-highlight">
          <div className="highlight-pill">
            <span className="plus-sign">+</span>
            <span className="big-num">{creditsAdded}</span>
            <span className="unit-label">Wrap {creditsAdded === 1 ? "Credit" : "Credits"} Added</span>
          </div>
        </div>

        <div className="success-modal-actions">
          <Link href="/insights" className="button button-primary button-full action-btn-primary" onClick={onClose}>
            Analyze Chat Now <span>→</span>
          </Link>
          <button type="button" className="button button-secondary button-full" onClick={onClose}>
            Continue to Profile
          </button>
        </div>
      </div>
    </div>
  );
}
