"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";
import { UserProfileModal } from "@/components/UserProfileModal";

type User = {
  id: string;
  email: string;
  name?: string | null;
  credits: number;
};

export default function PrivacyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    async function checkUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = (await res.json()) as { user?: User };
        if (data.user) setUser(data.user);
      } catch {
        /* ignore */
      }
    }
    checkUser();
  }, []);

  return (
    <main className="product-page privacy-page">
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <section className="privacy-hero">
        <Link className="back-link" href="/">
          ← Back home
        </Link>
        <p className="eyebrow">
          <span /> Privacy First & Always
        </p>
        <h1>
          We do not share <br />
          <em>any of your data.</em>
        </h1>
        <p className="privacy-intro">
          At Unsaid, your trust is everything. We built our product around a single non-negotiable principle: your personal chats, anonymous messages, and private data belong exclusively to you.
        </p>
      </section>

      <section className="privacy-content">
        <div className="privacy-card">
          <h2>1. We Never Share or Sell Your Data</h2>
          <p>
            We do not sell, trade, rent, or share your personal information or chat content with advertisers, data brokers, or external third parties. Period.
          </p>
        </div>

        <div className="privacy-card">
          <h2>2. How Chat Insights Data is Processed</h2>
          <p>
            When you upload a WhatsApp export to generate Chat Insights (Wrapped):
          </p>
          <ul>
            <li><strong>Redaction First:</strong> Phone numbers, names, and contact identifiers are stripped before AI processing.</li>
            <li><strong>Ephemeral Memory:</strong> Analysis is computed entirely in temporary server memory. Raw exported chat files are not stored on disk or used for AI training.</li>
            <li><strong>Private Output:</strong> Only you receive the generated statistics and Wrapped deck.</li>
          </ul>
        </div>

        <div className="privacy-card">
          <h2>3. Anonymous Messages & Mutual Consent</h2>
          <p>
            For private messages sent through Unsaid:
          </p>
          <ul>
            <li><strong>Mutual Reveal Only:</strong> Your real identity is never exposed unless both conversation participants explicitly agree to reveal themselves.</li>
            <li><strong>Safety Monitoring:</strong> Automated AI safety checks operate in transit to block harassment, threats, or doxxing while keeping your identity protected.</li>
          </ul>
        </div>

        <div className="privacy-card">
          <h2>4. Cookies & Security</h2>
          <p>
            We use secure, HTTP-only session cookies to manage user logins safely. All data transmitted between your browser and Unsaid is encrypted over TLS (HTTPS).
          </p>
        </div>

        <div className="privacy-card">
          <h2>5. Your Rights & Data Deletion</h2>
          <p>
            You have full control over your account. You can request account deletion or data purge at any time by reaching out to us at:
          </p>
          <a className="contact-email-btn" href="mailto:hello@unfilteredwrap.com">
            hello@unfilteredwrap.com
          </a>
        </div>
      </section>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(u) => setUser(u)}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdateUser={(updated) => setUser(updated)}
      />

      <Footer />
    </main>
  );
}
