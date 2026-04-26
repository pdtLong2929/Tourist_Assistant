"use client";
import React, { useState, useEffect } from "react";
import {
  Car,
  Sparkles,
  MapPin,
  Cpu,
  Network,
  BrainCircuit,
  Database,
  Fingerprint,
  Activity,
  ShieldCheck,
  Zap,
  Check,
  TrendingUp,
  Gauge,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function RentingSuggestion() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [floatingIcons, setFloatingIcons] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [matchProgress, setMatchProgress] = useState(0);

  const aiIcons = [Cpu, Network, BrainCircuit, Database, Fingerprint, Sparkles];

  useEffect(() => {
    setMounted(true);

    const generatedIcons = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      durationFall: `${Math.random() * 20 + 15}s`,
      delay: `-${Math.random() * 20}s`,
      Icon: aiIcons[Math.floor(Math.random() * aiIcons.length)],
      size: Math.floor(Math.random() * 24) + 14,
    }));
    setFloatingIcons(generatedIcons);
  }, []);

  const handleSearch = () => {
    if (!inputValue.trim()) return;
    setLoading(true);
    setResult(null);
    setMatchProgress(0);

    const progressInterval = setInterval(() => {
      setMatchProgress((prev) =>
        prev >= 95 ? (clearInterval(progressInterval), 95) : prev + 5,
      );
    }, 100);

    setTimeout(() => {
      clearInterval(progressInterval);
      setMatchProgress(100);
      setResult({
        vehicle: "Cyber SUV X",
        category: "Premium All-Terrain",
        reason:
          "Advanced AWD system with terrain response control matches your highland requirements. Vehicle equipped with adaptive suspension for Da Lat's mountainous roads.",
        matchScore: 98,
        features: [
          { label: "Terrain Match", score: 99 },
          { label: "Weather Adapt", score: 95 },
          { label: "Comfort Level", score: 98 },
          { label: "Safety Rating", score: 97 },
        ],
        specs: {
          power: "450 HP",
          range: "500 km",
          seats: "7",
          drivetrain: "Intelligent AWD",
        },
      });
      setLoading(false);
    }, 2500);
  };

  if (!mounted) return null;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes cascade-icons { 0% { top: -10%; transform: rotate(0deg); opacity: 0.08; } 100% { top: 110%; transform: rotate(360deg); opacity: 0; } }
        @keyframes scan-line { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .floating-ai-icons-container { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; overflow: hidden; z-index: 0; pointer-events: none; }
        .cyber-floating-icon { position: absolute; color: var(--cyber-blue); animation: cascade-icons linear infinite; }
        
        /* Giữ lại class reveal cho chữ vì nó hoạt động ổn ( Header, Badges) */
        .reveal-text { opacity: 0; animation: reveal-up 1s forwards; }
        @keyframes reveal-up { to { opacity: 1; transform: translateY(0); filter: blur(0); } }
        
        .scanning-card::after { content: ""; position: absolute; left: 0; width: 100%; height: 3px; background: var(--cyber-blue); box-shadow: 0 0 20px var(--cyber-blue); animation: scan-line 2s linear infinite; z-index: 5; }
        
        @keyframes cyber-pulse {
          0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(251, 191, 36, 0); }
          100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
        }
        .btn-ready { animation: cyber-pulse 2s infinite; }
        .btn-disabled { opacity: 0.5; cursor: not-allowed !important; filter: grayscale(100%); }
      `,
        }}
      />

      <div className="floating-ai-icons-container">
        {floatingIcons.map((item) => (
          <div
            key={item.id}
            className="cyber-floating-icon"
            style={{
              left: item.left,
              animationDuration: item.durationFall,
              animationDelay: item.delay,
            }}
          >
            <item.Icon size={item.size} />
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "4rem 2rem",
          maxWidth: "1100px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* HEADER SECTION - CHỮ THÌ DÙNG CLASS NHƯ CŨ (VÌ ÔN RỒI) */}
        <header
          className="reveal-text"
          style={{
            textAlign: "center",
            marginBottom: "4rem",
            animationDelay: "0.1s",
          }}
        >
          <div className="mb-6">
            <div
              className="inline-flex items-center gap-3 mb-4"
              style={{
                padding: "0.75rem 2rem",
                background: "rgba(52,229,235,0.1)",
                border: "1px solid rgba(52,229,235,0.3)",
                borderRadius: "50px",
              }}
            >
              <BrainCircuit size={28} color="var(--cyber-blue)" />
              <span
                className="font-header text-xl font-bold"
                style={{ color: "var(--cyber-blue)" }}
              >
                {t("renting.aiConcierge") as any}
              </span>
            </div>
          </div>
          <h1
            className="glitch-yellow"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              marginBottom: "1.5rem",
              textShadow: "0 0 40px var(--cyber-yellow-glow)",
              lineHeight: 1.2,
            }}
          >
            {t("renting.titleLine1") as any}
            <br />
            {t("renting.titleLine2") as any}
          </h1>

          {/* MỚI: Đoạn mô tả nhỏ về AI (Reveal sau 0.2s) */}
          <p
            className="reveal-text"
            style={{
              fontSize: "1.2rem",
              color: "var(--text-secondary)",
              maxWidth: "700px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.7,
              animationDelay: "0.2s",
            }}
          >
            {t("renting.subtitle") as any}
          </p>

          {/* BADGES CỦA ÔNG (MÀ ÔNG NÓI HIỆN ĐƯỢC THÌ GIỮ NGUYÊN) - Reveal sau 0.3s */}
          <div
            className="reveal-text"
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "1rem",
              animationDelay: "0.3s",
            }}
          >
            {[
              {
                icon: Activity,
                label: "NEURAL v4.2.0",
                color: "var(--cyber-blue)",
              },
              {
                icon: ShieldCheck,
                label: t("renting.badge2") as any,
                color: "var(--cyber-green)",
              },
              {
                icon: Zap,
                label: t("renting.badge3") as any,
                color: "var(--cyber-yellow)",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: "rgba(30,41,59,0.6)",
                  border: `1px solid ${item.color}40`,
                  borderRadius: "8px",
                  color: "var(--text-secondary)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <item.icon size={16} color={item.color} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </header>

        {/* SEARCH CARD */}
        <div
          className="reveal-text"
          style={{ animationDelay: "0.4s", zIndex: 10, position: "relative" }}
        >
          <div
            className={`edgerunner-card ${loading ? "scanning-card" : ""}`}
            style={{
              padding: "2.5rem",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              className="module-label mb-3"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.85rem",
              }}
            >
              <MapPin size={16} color="var(--cyber-blue)" />{" "}
              {t("renting.describeJourney") as any}
            </div>
            <div
              style={{ display: "flex", gap: "1rem", alignItems: "stretch" }}
            >
              <div style={{ flex: 1, position: "relative" }}>
                <Sparkles
                  size={20}
                  style={{
                    position: "absolute",
                    left: "20px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--cyber-yellow)",
                    opacity: inputValue ? 1 : 0.5,
                  }}
                />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={t("renting.inputPlaceholder") as any}
                  style={{
                    width: "100%",
                    padding: "1.4rem 1.5rem 1.4rem 55px",
                    background: "rgba(15,23,42,0.8)",
                    border: "2px solid var(--cyber-border)",
                    color: "var(--text-main)",
                    borderRadius: "12px",
                    fontSize: "1.1rem",
                    outline: "none",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <button
                className={`cyber-button ${!inputValue.trim() || loading ? "btn-disabled" : "btn-ready"}`}
                onClick={handleSearch}
                disabled={loading || !inputValue.trim()}
                style={{
                  padding: "1.4rem 3rem",
                  fontSize: "1.1rem",
                  minWidth: "200px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.4s ease",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>{t("renting.btnProcessing") as any}</span>
                  </>
                ) : (
                  <>
                    <Cpu
                      size={20}
                      className={inputValue.trim() ? "text-slate-900" : ""}
                    />
                    <span>{t("renting.btnAnalyze") as any}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RESULT CARD */}
        {result && !loading && (
          <div
            className="reveal-text"
            style={{ marginTop: "3rem", animationDelay: "0s" }}
          >
            <div
              className="edgerunner-card"
              style={{
                border: "1px solid var(--cyber-yellow)",
                padding: "2rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "2rem" }}
              >
                {/* Logo container: Thu nhỏ và căn giữa */}
                <div
                  style={{
                    flexShrink: 0,
                    width: "80px",
                    height: "80px",
                    background: "rgba(251,191,36,0.1)",
                    borderRadius: "16px",
                    border: "1px solid var(--cyber-yellow)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 20px var(--cyber-yellow-glow)",
                  }}
                >
                  <Car size={40} color="var(--cyber-yellow)" />
                </div>

                {/* Text Content: Căn chỉnh thẳng hàng với Logo */}
                <div style={{ flex: 1 }}>
                  <div
                    className="module-label"
                    style={{
                      color: "var(--cyber-yellow)",
                      marginBottom: "4px",
                    }}
                  >
                    {t("renting.optimalMatch") as any}
                  </div>
                  <h2
                    style={{
                      fontSize: "2.2rem",
                      color: "white",
                      fontWeight: "bold",
                      margin: 0,
                    }}
                  >
                    {result.vehicle}
                  </h2>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      marginTop: "8px",
                      fontSize: "1.05rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {result.reason}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
