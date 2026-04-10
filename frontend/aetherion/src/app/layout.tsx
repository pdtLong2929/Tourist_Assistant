import "./globals.css";
import React from "react";
import Header from "@/components/Header";

export const metadata = {
  title: "Tourist AI - Smart Travel Assistant",
  description: "AI-powered travel planning and navigation platform.",
};

function Footer() {
  return (
    <footer
      style={{
        background: "var(--cyber-surface)",
        borderTop: "1px solid var(--cyber-border)",
        padding: "3rem 2rem 2rem",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "3rem",
        }}
      >
        {/* Brand Info */}
        <div style={{ maxWidth: "300px" }}>
          <div
            style={{
              fontFamily: "var(--font-header)",
              fontSize: "1.1rem",
              fontWeight: "700",
              color: "var(--cyber-yellow)",
              marginBottom: "0.75rem",
            }}
          >
            Tourist AI
          </div>
          <p
            style={{
              fontSize: "0.9rem",
              lineHeight: "1.6",
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            AI travel assistants help you discover, plan, and navigate your
            perfect itinerary.
          </p>
          <div
            style={{
              marginTop: "1rem",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
            }}
          >
            © 2024 Tourist AI. All rights reserved.
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4
            style={{
              fontFamily: "var(--font-header)",
              fontSize: "0.9rem",
              fontWeight: "700",
              color: "var(--text-main)",
              marginBottom: "1rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Quick Links
          </h4>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <a href="/about" className="footer-link">
              About Us
            </a>
            <a href="/features" className="footer-link">
              Features
            </a>
            <a href="/pricing" className="footer-link">
              Pricing
            </a>
            <a href="/contact" className="footer-link">
              Contact
            </a>
          </div>
        </div>

        {/* Legal */}
        <div>
          <h4
            style={{
              fontFamily: "var(--font-header)",
              fontSize: "0.9rem",
              fontWeight: "700",
              color: "var(--text-main)",
              marginBottom: "1rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Legal
          </h4>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <a href="/terms" className="footer-link">
              Terms of Service
            </a>
            <a href="/privacy" className="footer-link">
              Privacy Policy
            </a>
            <a href="/cookies" className="footer-link">
              Cookie Policy
            </a>
          </div>
        </div>

        {/* System Status */}
        <div>
          <h4
            style={{
              fontFamily: "var(--font-header)",
              fontSize: "0.9rem",
              fontWeight: "700",
              color: "var(--text-main)",
              marginBottom: "1rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Status
          </h4>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <div
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--cyber-green)",
                }}
              />
              <span style={{ color: "var(--text-secondary)" }}>
                All Systems Operational
              </span>
            </div>
            <div style={{ color: "var(--text-muted)" }}>v2.5.0</div>
          </div>
        </div>
      </div>

      {/* Accent Line */}
      <div className="accent-line" style={{ margin: "2rem 0 1rem" }} />

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          textAlign: "center",
          fontSize: "0.8rem",
          color: "var(--text-muted)",
        }}
      >
        Built with AI • Designed for Travelers
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <Header />
        <main style={{ flex: 1, position: "relative", zIndex: 1 }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
