"use client";

import { useState } from "react";
import Link from "next/link";

type User = {
  id: string;
  email: string;
  name?: string | null;
  credits: number;
  createdAt?: number;
};

export function UserProfileModal({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onOpenBuyCredits,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdateUser?: (updated: User) => void;
  onOpenBuyCredits?: () => void;
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (!isOpen || !user) return null;

  const displayName = user.name || user.email.split("@")[0] || "User";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  async function handleSaveName() {
    if (!nameInput.trim()) return;
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      const data = await res.json() as { user?: User; error?: string };
      if (!res.ok || !data.user) throw new Error(data.error || "Failed to update profile name");

      if (onUpdateUser) onUpdateUser(data.user);
      setIsEditingName(false);
      setMessage("Profile name updated!");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error saving name");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      window.location.reload();
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        {/* Profile Card Header */}
        <div className="profile-header-box">
          <div className="profile-avatar-seal">{avatarLetter}</div>
          <div className="profile-identity">
            {!isEditingName ? (
              <div className="name-display-row">
                <h3>{displayName}</h3>
                <button
                  type="button"
                  className="edit-name-btn"
                  onClick={() => {
                    setNameInput(user.name || displayName);
                    setIsEditingName(true);
                  }}
                  title="Edit Display Name"
                >
                  ✎ Edit
                </button>
              </div>
            ) : (
              <div className="name-edit-row">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter your name"
                  autoFocus
                />
                <button type="button" className="button button-primary button-sm" disabled={saving} onClick={handleSaveName}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button type="button" className="quiet-button" onClick={() => setIsEditingName(false)}>
                  Cancel
                </button>
              </div>
            )}
            <span className="profile-email">{user.email}</span>
          </div>
        </div>

        {message && <div className="form-info-message">{message}</div>}

        {/* Credits & Status Banner */}
        <div className="profile-credits-card">
          <div className="credits-info">
            <span className="credits-label">AVAILABLE WRAP CREDITS</span>
            <div className="credits-value">
              <strong>{user.credits}</strong>
              <small>{user.credits === 1 ? "Credit" : "Credits"} available</small>
            </div>
          </div>
          {onOpenBuyCredits && (
            <button
              type="button"
              className="button button-primary button-sm"
              onClick={() => {
                onClose();
                onOpenBuyCredits();
              }}
            >
              + Buy Credits
            </button>
          )}
        </div>

        {/* Account Details & Quick Actions */}
        <div className="profile-quick-stats">
          <div className="stat-pill">
            <span>Account Type</span>
            <strong>{user.credits > 0 ? "Active Member" : "Free Tier"}</strong>
          </div>
          <div className="stat-pill">
            <span>Dashboard</span>
            <strong>Saved Wraps & Links</strong>
          </div>
        </div>

        <div className="profile-actions-list">
          <Link href="/dashboard" className="button button-secondary button-full profile-action-btn" onClick={onClose}>
            <span>📁</span> Open My Dashboard →
          </Link>

          <button type="button" className="button button-secondary button-full profile-action-btn signout-btn" onClick={handleSignOut}>
            <span>🚪</span> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
