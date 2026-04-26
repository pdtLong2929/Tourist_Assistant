"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer
      style={{
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(52, 229, 235, 0.3)",
        boxShadow: "0 -20px 50px rgba(0, 0, 0, 0.6), inset 0 20px 20px -20px rgba(52, 229, 235, 0.1)",
        padding: "3rem 2rem 2rem",
        marginTop: "auto",
        position: "relative",
        zIndex: 10,
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
            className="glitch-yellow"
            style={{
              fontSize: "1.5rem",
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
            {t("footer.description" as any)}
          </p>
          <div
            style={{
              marginTop: "1rem",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
            }}
          >
            {t("footer.copyright" as any)}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4
            className="module-label"
            style={{
              color: "var(--cyber-blue)",
              marginBottom: "1rem",
              fontSize: "0.9rem",
            }}
          >
            {t("footer.quickLinks" as any)}
          </h4>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <a href="/about" className="footer-link">
              {t("footer.aboutUs" as any)}
            </a>
            <a href="/features" className="footer-link">
              {t("footer.features" as any)}
            </a>
            <a href="/pricing" className="footer-link">
              {t("footer.pricing" as any)}
            </a>
            <a href="/contact" className="footer-link">
              {t("footer.contact" as any)}
            </a>
          </div>
        </div>

        {/* Legal */}
        <div>
          <h4
            className="module-label"
            style={{
              color: "var(--cyber-purple)",
              marginBottom: "1rem",
              fontSize: "0.9rem",
            }}
          >
            {t("footer.legal" as any)}
          </h4>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <a href="/terms" className="footer-link">
              {t("footer.terms" as any)}
            </a>
            <a href="/privacy" className="footer-link">
              {t("footer.privacy" as any)}
            </a>
            <a href="/cookies" className="footer-link">
              {t("footer.cookies" as any)}
            </a>
          </div>
        </div>

        {/* System Status */}
        <div>
          <h4
            className="module-label"
            style={{
              color: "var(--cyber-yellow)",
              marginBottom: "1rem",
              fontSize: "0.9rem",
            }}
          >
            {t("footer.status" as any)}
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
                {t("footer.operational" as any)}
              </span>
            </div>
            <div style={{ color: "var(--text-muted)" }}>v2.5.0</div>
          </div>
        </div>
      </div>

      {/* Accent Line */}
      <div className="cyber-bar" style={{ margin: "2rem auto 1rem", width: "100%" }} />

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          textAlign: "center",
          fontSize: "0.8rem",
          color: "var(--text-muted)",
        }}
      >
        {t("footer.builtWith" as any)}
      </div>
    </footer>
  );
}
