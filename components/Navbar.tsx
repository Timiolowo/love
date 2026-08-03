"use client";

import Link from "next/link";

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
  onOpenProfile: () => void;
  navTitle?: string;
}) {
  const displayName = user?.name || user?.email.split("@")[0] || "User";

  return (
    <nav className="site-nav product-nav" aria-label="Primary navigation">
      <Link className="wordmark" href="/" aria-label="Unsaid home">
        <span className="wordmark-seal">U</span>
        <span>Unsaid</span>
      </Link>
      {navTitle && <span className="product-nav-title">{navTitle}</span>}
      <div className="nav-actions-group">
        <Link className="button button-secondary nav-btn-secondary" href="/insights">
          Chat Insights
        </Link>
        <Link className="button button-secondary nav-btn-secondary" href="/message">
          Private Message
        </Link>
        {user ? (
          <button
            type="button"
            className="button button-primary nav-btn-primary"
            onClick={onOpenProfile}
          >
            👤 {displayName} · {user.credits} {user.credits === 1 ? "Credit" : "Credits"}
          </button>
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
    </nav>
  );
}
