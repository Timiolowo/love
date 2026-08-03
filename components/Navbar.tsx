"use client";

import Link from "next/link";
import { useState } from "react";

type User = {
  id: string;
  email: string;
  name?: string | null;
  credits: number;
};

export function Navbar({
  user,
  onOpenAuth,
  onOpenProfile,
  navTitle,
}: {
  user: User | null;
  onOpenAuth: () => void;
  onOpenProfile?: () => void;
  navTitle?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const rawName = user?.name || user?.email.split("@")[0] || "User";
  const firstName = rawName.trim().split(" ")[0];
  const initial = (firstName[0] || "U").toUpperCase();

  return (
    <nav className="site-nav product-nav" aria-label="Primary navigation">
      <Link className="wordmark" href="/" aria-label="Unfiltered home">
        <span className="wordmark-seal">U</span>
        <span>Unfiltered</span>
      </Link>

      {navTitle && <span className="product-nav-title">{navTitle}</span>}

      {/* Desktop Navigation Group */}
      <div className="nav-actions-group desktop-nav-actions">
        <Link className="button button-secondary nav-btn-secondary" href="/insights">
          Chat Insights
        </Link>
        <Link className="button button-secondary nav-btn-secondary" href="/message">
          Private Message
        </Link>
        {user ? (
          <Link
            className="button button-primary nav-btn-primary"
            href="/profile"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{firstName} · {user.credits} {user.credits === 1 ? "Credit" : "Credits"}</span>
          </Link>
        ) : (
          <button
            type="button"
            className="button button-primary nav-btn-primary"
            onClick={onOpenAuth}
          >
            Sign In
          </button>
        )}
      </div>

      {/* Mobile Navigation Controls */}
      <div className="mobile-nav-controls">
        {user ? (
          <Link
            className="button button-primary nav-btn-primary mobile-user-btn"
            href="/profile"
          >
            <span>{initial} · {user.credits}</span>
          </Link>
        ) : (
          <button
            type="button"
            className="button button-primary nav-btn-primary mobile-signin-btn"
            onClick={onOpenAuth}
          >
            Sign In
          </button>
        )}

        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Navigation Menu"
        >
          {mobileOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileOpen && (
        <div className="mobile-nav-drawer" onClick={() => setMobileOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <Link className="mobile-drawer-link" href="/insights" onClick={() => setMobileOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Chat Insights</span>
            </Link>
            <Link className="mobile-drawer-link" href="/message" onClick={() => setMobileOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>Private Message</span>
            </Link>
            {user && (
              <Link className="mobile-drawer-link" href="/dashboard" onClick={() => setMobileOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <span>My Dashboard</span>
              </Link>
            )}
            {user ? (
              <Link
                className="mobile-drawer-link"
                href="/profile"
                onClick={() => setMobileOpen(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>My Profile ({firstName} · {user.credits} {user.credits === 1 ? "credit" : "credits"})</span>
              </Link>
            ) : (
              <button
                type="button"
                className="mobile-drawer-btn primary-drawer-btn"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAuth();
                }}
              >
                Sign In / Create Free Account
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
