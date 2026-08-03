"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <Link className="wordmark" href="/">
            <span className="wordmark-seal">U</span>
            <span>Unfiltered</span>
          </Link>
          <p>For the conversations people are afraid to start.</p>
        </div>

        <div className="footer-links">
          <div className="footer-column">
            <h4>Features</h4>
            <Link href="/insights">Chat Insights</Link>
            <Link href="/message">Private Message</Link>
          </div>

          <div className="footer-column">
            <h4>Trust & Privacy</h4>
            <Link href="/privacy">Privacy Policy</Link>
            <a href="mailto:hello@unfilteredwrap.com">hello@unfilteredwrap.com</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>Private by design · We do not share your data.</span>
        <span>Contact: <a href="mailto:hello@unfilteredwrap.com">hello@unfilteredwrap.com</a></span>
      </div>
    </footer>
  );
}
