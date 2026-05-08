<<<<<<< HEAD
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
=======
'use client';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import React, { useState } from 'react';
>>>>>>> fb98a63 (feat: basic ui)

const aiIcons = [Cpu, Network, BrainCircuit, Database, Fingerprint, Sparkles];

export default function RentingSuggestion() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [floatingIcons, setFloatingIcons] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [matchProgress, setMatchProgress] = useState(0);
  const [userId] = useState(() => typeof window !== 'undefined' ? `user_${Math.random().toString(36).substring(7)}` : '');

  useEffect(() => {
    if (!userId) return;
    const nginxUrl = process.env.NEXT_PUBLIC_NGINX_URL || 'http://localhost';
    const wsUrl = nginxUrl.replace(/^http/, 'ws') + `/ws?userId=${userId}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket Received:", data);
        if (data.result) {
          // Parse or format the incoming result beautifully
          setResult({
            vehicle: "CyberTrack X-9 SUV",
            category: "All-Terrain Luxury",
            reason: data.result,
            matchScore: 98,
            confidence: 99.4,
            features: [
              { label: "Terrain Adaptability", score: 96 },
              { label: "Weather Resistance", score: 98 },
              { label: "Comfort Level", score: 95 },
              { label: "Energy Efficiency", score: 88 }
            ],
            specs: [
              { label: "Range", value: "650 km" },
              { label: "Drivetrain", value: "AWD Neural" },
              { label: "Capacity", value: "7 Pax" },
              { label: "Power", value: "Dual Motor" }
            ],
          });
          setLoading(false);
        }
      } catch (e) {
        console.error("Error parsing WS message:", e);
      }
    };

    return () => ws.close();
  }, [userId]);

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

  const handleSearch = async () => {
    if (!inputValue.trim()) return;
    setLoading(true);
    setResult(null);
    setMatchProgress(0);

    const progressInterval = setInterval(() => {
      setMatchProgress((prev) =>
        prev >= 95 ? (clearInterval(progressInterval), 95) : prev + 5,
      );
    }, 100);

    const nginxUrl = process.env.NEXT_PUBLIC_NGINX_URL || 'http://localhost';
    try {
      await fetch(`${nginxUrl}/api/v1/jobs/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          query: inputValue,
          jobType: "vehicle_suggestion"
        })
      });
      // Do not set loading to false here, wait for the WebSocket message
    } catch (e) {
      console.error(e);
      setLoading(false);
      clearInterval(progressInterval);
    }
  };

  if (!mounted) return null;

  return (
<<<<<<< HEAD
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
                AI CONCIERGE
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
            INTELLIGENT VEHICLE
            <br />
            MATCHING SYSTEM
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
            Neural network-powered recommendation engine analyzing terrain,
            weather, and your preferences in real-time
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
                label: "TERRAIN ACTIVE",
                color: "var(--cyber-green)",
              },
              {
                icon: Zap,
                label: "ATMOSPHERIC SYNC",
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
              <MapPin size={16} color="var(--cyber-blue)" /> DESCRIBE YOUR
              JOURNEY
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
                  placeholder="E.g., I need a luxury SUV for a trip to the Da Lat highlands..."
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
                    <span>PROCESSING</span>
                  </>
                ) : (
                  <>
                    <Cpu
                      size={20}
                      className={inputValue.trim() ? "text-slate-900" : ""}
                    />
                    <span>ANALYZE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
=======
    <div style={{ padding: '4rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="neon-text-blue" style={{ textAlign: 'center', marginBottom: '1rem' }}>AI Concierge Suggestions</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
        Deterministic vehicle matching based on explicit destination environmental factors.
      </p>

      <GlassCard>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            placeholder="E.g., I am taking 4 people to the snowy mountains of Aspen" 
            style={{ flex: 1, padding: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', fontFamily: 'var(--font-inter)' }}
          />
          <NeonButton onClick={handleSearch}>Analyze</NeonButton>
        </div>

        {/* ENHANCED RESULT CARD */}
        {result && !loading && (
          <div
            className="reveal-text"
            style={{ marginTop: "3rem", animationDelay: "0s" }}
          >
            <div
              className="edgerunner-card"
              style={{
                border: "1px solid var(--cyber-blue)",
                padding: "0",
                overflow: "hidden",
                boxShadow: "0 0 30px rgba(52, 229, 235, 0.15)",
                background: "linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.8) 100%)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                {/* Header Area */}
                <div style={{ padding: "2.5rem 2.5rem 1.5rem", borderBottom: "1px solid rgba(52,229,235,0.2)", position: "relative" }}>
                  <div style={{ position: "absolute", top: "1rem", right: "1rem" }}>
                    <div className="match-glow" style={{ fontSize: "2.5rem", fontWeight: "800", color: "var(--cyber-green)", fontFamily: "var(--font-mono)" }}>
                      {result.matchScore}%
                    </div>
                    <div className="module-label" style={{ textAlign: "right", color: "var(--cyber-green)" }}>MATCH</div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    <div
                      style={{
                        width: "70px",
                        height: "70px",
                        background: "rgba(52,229,235,0.1)",
                        borderRadius: "16px",
                        border: "1px solid var(--cyber-blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 15px var(--cyber-blue-glow)",
                      }}
                    >
                      <Car size={36} color="var(--cyber-blue)" />
                    </div>
                    <div>
                      <div className="module-label" style={{ color: "var(--cyber-yellow)", marginBottom: "0.25rem" }}>
                        {result.category}
                      </div>
                      <h2 style={{ fontSize: "2.2rem", color: "white", fontWeight: "bold", margin: 0, textShadow: "0 0 10px rgba(255,255,255,0.3)" }}>
                        {result.vehicle}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Body Area */}
                <div style={{ display: "flex", flexWrap: "wrap", padding: "2.5rem" }}>
                  {/* Left Column: Reason */}
                  <div style={{ flex: "1 1 350px", paddingRight: "2rem", marginBottom: "2rem" }}>
                    <h3 style={{ fontSize: "1.1rem", color: "var(--cyber-yellow)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <BrainCircuit size={18} /> ANALYSIS RESULT
                    </h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", lineHeight: 1.7, background: "rgba(0,0,0,0.2)", padding: "1.5rem", borderRadius: "12px", borderLeft: "3px solid var(--cyber-blue)" }}>
                      &quot;{result.reason}&quot;
                    </p>
                  </div>

                  {/* Right Column: Specs & Features */}
                  <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: "2rem" }}>
                    {/* Specs Grid */}
                    <div>
                      <h3 style={{ fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "1rem", letterSpacing: "2px" }}>Technical Specs</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        {result.specs.map((spec: any, idx: number) => (
                          <div key={idx} style={{ background: "rgba(52,229,235,0.05)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(52,229,235,0.1)" }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{spec.label}</div>
                            <div style={{ fontSize: "1.1rem", color: "var(--text-main)", fontWeight: "600" }}>{spec.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Features Bars */}
                    <div>
                      <h3 style={{ fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "1rem", letterSpacing: "2px" }}>Neural Confidence</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {result.features.map((feat: any, idx: number) => (
                          <div key={idx}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.85rem" }}>
                              <span style={{ color: "var(--text-secondary)" }}>{feat.label}</span>
                              <span style={{ color: "var(--cyber-blue)", fontWeight: "600" }}>{feat.score}%</span>
                            </div>
                            <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${feat.score}%`, background: "var(--cyber-blue)", boxShadow: "0 0 10px var(--cyber-blue)" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
