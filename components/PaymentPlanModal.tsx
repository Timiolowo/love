"use client";

import { useState } from "react";

type Currency = "NGN" | "USD" | "GHS" | "KES" | "ZAR";

const unitPrices: Record<Currency, { unit: number; symbol: string; prefix: string; suffix: string }> = {
  NGN: { unit: 500, symbol: "₦", prefix: "₦", suffix: "" },
  USD: { unit: 1.0, symbol: "$", prefix: "$", suffix: "" },
  GHS: { unit: 10, symbol: "GH₵", prefix: "GH₵ ", suffix: "" },
  KES: { unit: 100, symbol: "KSh", prefix: "KSh ", suffix: "" },
  ZAR: { unit: 13.33, symbol: "R", prefix: "R ", suffix: "" },
};

const pricingMap: Record<Currency, { guest: string; bundle: string; sub: string }> = {
  NGN: { guest: "₦800", bundle: "₦1,500", sub: "₦500 each" },
  USD: { guest: "$1.50", bundle: "$3.00", sub: "$1.00 each" },
  GHS: { guest: "GH₵ 15", bundle: "GH₵ 30", sub: "GH₵ 10 each" },
  KES: { guest: "KSh 150", bundle: "KSh 300", sub: "KSh 100 each" },
  ZAR: { guest: "R 20", bundle: "R 40", sub: "R 13.33 each" },
};

export function PaymentPlanModal({
  isOpen,
  onClose,
  onSelectPlan,
  userEmail,
  onOpenAuth,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planType: "guest_single" | "account_bundle", guestEmail?: string, currency?: Currency, creditsCount?: number) => void;
  userEmail?: string;
  onOpenAuth?: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(userEmail ? 2 : 1);
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [selectedCredits, setSelectedCredits] = useState<number>(3);
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function handleContinueToPayment() {
    const activeEmail = userEmail || emailInput.trim();
    if (!activeEmail || !activeEmail.includes("@")) {
      setError("Please enter a valid email address to proceed to payment options.");
      return;
    }
    setError("");
    setStep(2);
  }

  function handleCreateAccountFreeTrial() {
    onClose();
    if (onOpenAuth) onOpenAuth();
  }

  function handleChooseGuest() {
    onSelectPlan("guest_single", userEmail || emailInput.trim(), currency, 1);
  }

  function handleChooseBundle(count?: number) {
    const activeEmail = userEmail || emailInput.trim();
    if (!activeEmail || !activeEmail.includes("@")) {
      setError("Please enter a valid email address to attach your bundle.");
      setStep(1);
      return;
    }
    onSelectPlan("account_bundle", activeEmail, currency, count || selectedCredits);
  }

  const prices = pricingMap[currency];
  const unitInfo = unitPrices[currency];
  const activeEmail = userEmail || emailInput.trim();

  function formatTotalPrice(count: number): string {
    const total = unitInfo.unit * count;
    if (currency === "USD" || currency === "ZAR") {
      return `${unitInfo.prefix}${total.toFixed(2)}${unitInfo.suffix}`;
    }
    return `${unitInfo.prefix}${Math.round(total).toLocaleString()}${unitInfo.suffix}`;
  }

  const isAuthUser = !!userEmail;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content plan-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <span className="wordmark-seal">U</span>

        {step === 1 && !isAuthUser ? (
          /* STEP 1: Account / Email & Free Trial (For Guests) */
          <div className="modal-step-container">
            <h2>Unlock your Wrapped</h2>
            <p className="step-subtitle">Choose how you would like to proceed</p>

            <div className="step-options-wrapper">
              {/* Option A: Free Trial Card */}
              <div className="option-card trial-option-card">
                <div className="option-header">
                  <span className="trial-badge">FREE TRIAL</span>
                  <h3>Get 1 Free Credit</h3>
                </div>
                <p className="option-desc">Create a free account to claim 1 free credit and analyze your chat instantly.</p>
                {onOpenAuth && (
                  <button
                    type="button"
                    className="button button-primary button-full"
                    onClick={handleCreateAccountFreeTrial}
                  >
                    ✦ Create Account & Get 1 Free Credit
                  </button>
                )}
              </div>

              <div className="auth-divider"><span>OR CONTINUE TO PAYMENT</span></div>

              {/* Option B: Continue as Guest */}
              <div className="option-card guest-option-card">
                <h3>Pay per analysis</h3>
                <p className="option-desc">Enter your email address to view single pass or bundle pricing.</p>

                {error && <div className="form-error">{error}</div>}

                <div className="email-prompt-box">
                  <label>Your Email Address
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        setError("");
                      }}
                    />
                  </label>
                </div>

                <button
                  type="button"
                  className="button button-secondary button-full"
                  onClick={handleContinueToPayment}
                >
                  Continue to Payment Options →
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: Choose Payment Plan & Pay */
          <div className="modal-step-container">
            {!isAuthUser && (
              <button type="button" className="quiet-button back-step-btn" onClick={() => setStep(1)}>
                ← Back to email / account
              </button>
            )}

            <h2>{isAuthUser ? "Buy Wrap Credits" : "Choose your payment plan"}</h2>
            <p>
              {isAuthUser
                ? `Purchasing credits for ${activeEmail}`
                : `Select your currency and preferred plan for ${activeEmail}`}
            </p>

            <div className="currency-selector">
              <label>Select Currency</label>
              <div className="currency-buttons">
                {(["NGN", "USD", "GHS", "KES", "ZAR"] as Currency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`currency-btn ${currency === c ? "is-selected" : ""}`}
                    onClick={() => setCurrency(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            {isAuthUser ? (
              /* Authenticated User Flow: Compact Dynamic Credit Quantity Selector (Min 3) */
              <div className="auth-credits-plan-wrapper">
                <div className="plan-card bundle-plan featured-plan auth-credits-card">
                  <div className="auth-card-top-row">
                    <div>
                      <h3>Select Credits</h3>
                      <p className="min-credits-note">Minimum purchase is 3 credits</p>
                    </div>
                    <span className="compact-price-tag">{prices.sub}</span>
                  </div>

                  {/* Quantity Controls Row */}
                  <div className="compact-controls-row">
                    <span className="stepper-label">Number of Credits:</span>
                    <div className="stepper-box">
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => setSelectedCredits((prev) => Math.max(3, prev - 1))}
                        disabled={selectedCredits <= 3}
                      >
                        -
                      </button>
                      <span className="stepper-value">{selectedCredits}</span>
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => setSelectedCredits((prev) => prev + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Compact Price Summary */}
                  <div className="compact-price-summary">
                    <div className="summary-total-price">
                      {formatTotalPrice(selectedCredits)}
                    </div>
                    <span className="summary-subtext">
                      for {selectedCredits} Wrap Credits ({formatTotalPrice(1)} each)
                    </span>
                  </div>

                  <button
                    type="button"
                    className="button button-primary button-full unlock-credits-btn"
                    onClick={() => handleChooseBundle(selectedCredits)}
                  >
                    Unlock {selectedCredits} Credits for {formatTotalPrice(selectedCredits)}
                  </button>
                </div>
              </div>
            ) : (
              /* Unauthenticated Guest Flow: Guest Pass vs 3-Wrap Bundle */
              <div className="plan-grid">
                <div className="plan-card guest-plan" onClick={handleChooseGuest}>
                  <div className="plan-header">
                    <h3>Guest Pass</h3>
                    <div className="plan-price">{prices.guest} <span>/ single wrap</span></div>
                  </div>
                  <ul className="plan-features">
                    <li>✓ Instant 1-time chat analysis</li>
                    <li>✓ View results directly in browser</li>
                    <li>✕ No dashboard storage</li>
                    <li>✕ Cannot share link immediately</li>
                  </ul>
                  <button className="button button-secondary button-full">Pay {prices.guest} as Guest</button>
                </div>

                <div className="plan-card bundle-plan featured-plan" onClick={() => handleChooseBundle(3)}>
                  <div className="plan-badge">BEST VALUE</div>
                  <div className="plan-header">
                    <h3>3-Wrap Bundle</h3>
                    <div className="plan-price">{prices.bundle} <span>for 3 wraps ({prices.sub})</span></div>
                  </div>
                  <ul className="plan-features">
                    <li>✓ 3 full Wrapped analysis credits</li>
                    <li>✓ Save & manage in your Dashboard</li>
                    <li>✓ 14-day shareable links for friends</li>
                    <li>✓ Delete or disable links anytime</li>
                  </ul>
                  <button className="button button-primary button-full">Unlock 3 Wraps for {prices.bundle}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
