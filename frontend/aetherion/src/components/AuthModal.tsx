"use client";

import React from "react";
import { ShieldAlert, X, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const { theme } = useTheme();

  if (!isOpen) return null;

  const isLight = theme === "light";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isLight ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: "fade-in 0.3s ease-out forwards",
      }}
      onClick={onClose}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes modal-drop {
              from { transform: translateY(-30px) scale(0.95); opacity: 0; }
              to { transform: translateY(0) scale(1); opacity: 1; }
            }
            @keyframes fade-in {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `,
        }}
      />
      <div
        style={{
          width: "90%",
          maxWidth: "450px",
          padding: "2.5rem",
          borderRadius: "24px",
          background: isLight ? "rgba(255, 255, 255, 0.85)" : "var(--cyber-surface-glass)",
          border: isLight ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid rgba(52, 229, 235, 0.4)",
          boxShadow: isLight 
            ? "0 20px 50px rgba(0, 0, 0, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.5)" 
            : "0 0 50px rgba(0, 0, 0, 0.9), inset 0 0 20px rgba(52, 229, 235, 0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          position: "relative",
          animation: "modal-drop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1.25rem",
            right: "1.25rem",
            background: "transparent",
            border: "none",
            color: isLight ? "#64748b" : "var(--text-muted)",
            cursor: "pointer",
            fontSize: "1.2rem",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cyber-red)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = isLight ? "#64748b" : "var(--text-muted)")}
        >
          <X size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div 
            style={{ 
              width: "56px", 
              height: "56px", 
              borderRadius: "16px", 
              background: isLight ? "rgba(59, 130, 246, 0.1)" : "rgba(251, 191, 36, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: isLight ? "1px solid rgba(59, 130, 246, 0.2)" : "1px solid rgba(251, 191, 36, 0.3)"
            }}
          >
            <ShieldAlert size={32} color={isLight ? "#3b82f6" : "var(--cyber-yellow)"} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "1.6rem",
                fontFamily: "var(--font-header)",
                color: isLight ? "#1e293b" : "var(--cyber-yellow)",
                textShadow: isLight ? "none" : "0 0 15px rgba(251, 191, 36, 0.4)",
                fontWeight: "800",
                letterSpacing: "-0.02em"
              }}
            >
              AUTH REQUIRED
            </h3>
            <p style={{ margin: 0, fontSize: "0.75rem", color: isLight ? "#3b82f6" : "var(--cyber-blue)", fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
              STATUS: ACCESS_DENIED_401
            </p>
          </div>
        </div>

        <p
          style={{
            color: isLight ? "#475569" : "var(--text-secondary)",
            fontSize: "1.05rem",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {t("booking.loginRequired" as any)}
        </p>

        <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
          <button
            onClick={() => {
              onClose();
              router.push("/login");
            }}
            style={{
              flex: 1,
              padding: "1.1rem",
              background: isLight ? "#3b82f6" : "var(--cyber-blue)",
              color: isLight ? "#fff" : "var(--cyber-black)",
              border: "none",
              borderRadius: "12px",
              fontWeight: "800",
              fontSize: "1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              boxShadow: isLight ? "0 10px 20px rgba(59, 130, 246, 0.3)" : "0 0 20px rgba(52, 229, 235, 0.4)",
              transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
              e.currentTarget.style.boxShadow = isLight ? "0 15px 30px rgba(59, 130, 246, 0.4)" : "0 0 30px rgba(52, 229, 235, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = isLight ? "0 10px 20px rgba(59, 130, 246, 0.3)" : "0 0 20px rgba(52, 229, 235, 0.4)";
            }}
          >
            <LogIn size={20} />
            LOG IN NOW
          </button>
        </div>
      </div>
    </div>
  );
}
