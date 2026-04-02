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
} from "lucide-react";

export default function RentingSuggestion() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // State lưu trữ các icon rơi
  const [floatingIcons, setFloatingIcons] = useState<
    Array<{
      id: number;
      left: string;
      durationFall: string;
      delay: string;
      Icon: any;
      size: number;
    }>
  >([]);

  // Danh sách các logo/icon liên quan đến AI
  const aiIcons = [Cpu, Network, BrainCircuit, Database, Fingerprint, Sparkles];

  useEffect(() => {
    // Tạo 20 icon ngẫu nhiên trên client
    const generatedIcons = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      durationFall: `${Math.random() * 15 + 10}s`, // Tốc độ rơi chậm: 10s-25s
      delay: `-${Math.random() * 15}s`,
      Icon: aiIcons[Math.floor(Math.random() * aiIcons.length)], // Chọn icon ngẫu nhiên
      size: Math.floor(Math.random() * 20) + 16, // Kích thước ngẫu nhiên: 16px - 36px
    }));
    setFloatingIcons(generatedIcons);
  }, []);

  const handleSearch = () => {
    setLoading(true);
    setTimeout(() => {
      setResult({
        vehicle: "Cyber SUV X",
        reason:
          "AWD capabilities strictly match the required terrain for Snowy Aspen based on the safety requirements.",
        matchScore: 98,
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <>
      <style>
        {`
          @keyframes cascade-icons {
            0% { top: -10%; transform: rotate(0deg); }
            100% { top: 110%; transform: rotate(360deg); }
          }
          .floating-ai-icons-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            z-index: 0;
            pointer-events: none;
          }
          .cyber-floating-icon {
            position: absolute;
            color: var(--cyber-blue, #34e5eb);
            opacity: 0.12;
            animation-name: cascade-icons;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }
        `}
      </style>

      {/* Vùng chứa logo/icon rơi */}
      <div className="floating-ai-icons-container">
        {floatingIcons.map((item) => {
          const IconComponent = item.Icon;
          return (
            <div
              key={item.id}
              className="cyber-floating-icon"
              style={{
                left: item.left,
                animationDuration: item.durationFall,
                animationDelay: item.delay,
              }}
            >
              <IconComponent size={item.size} />
            </div>
          );
        })}
      </div>

      {/* Nội dung chính của giao diện */}
      <div
        style={{
          padding: "3rem 2rem",
          maxWidth: "900px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <h1
          className="glitch-yellow"
          style={{
            textAlign: "center",
            fontSize: "2.8rem",
            marginBottom: "0.5rem",
            textShadow: "0 0 30px var(--cyber-yellow-glow)",
          }}
        >
          AI CONCIERGE
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: "1.1rem",
            marginBottom: "3rem",
          }}
        >
          Deterministic vehicle matching • Real-time terrain &amp; weather
          analysis
        </p>

        <div className="edgerunner-card" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <MapPin
                size={20}
                style={{
                  position: "absolute",
                  left: "18px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--cyber-blue)",
                }}
              />
              <input
                type="text"
                placeholder="E.g., I am taking 4 people to the snowy mountains of Aspen"
                style={{
                  width: "100%",
                  padding: "1rem 1rem 1rem 52px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--cyber-border)",
                  color: "var(--text-main)",
                  borderRadius: "12px",
                  fontSize: "1.05rem",
                  outline: "none",
                }}
              />
            </div>
            <button
              className="cyber-button"
              onClick={handleSearch}
              disabled={loading}
              style={{
                padding: "1rem 2.5rem",
                fontSize: "1.1rem",
                whiteSpace: "nowrap",
              }}
            >
              {loading ? "ANALYZING..." : "ANALYZE"}
            </button>
          </div>
        </div>

        {loading && (
          <div
            className="edgerunner-card"
            style={{
              marginTop: "2.5rem",
              textAlign: "center",
              padding: "2rem",
            }}
          >
            <Sparkles
              size={28}
              className="status-active"
              style={{ marginBottom: "1rem" }}
            />
            <p
              className="module-label"
              style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}
            >
              AI MATCHING IN PROGRESS
            </p>
            <p style={{ color: "var(--text-secondary)" }}>
              Analyzing terrain • Weather • Safety requirements • Vehicle
              database...
            </p>
          </div>
        )}

        {result && !loading && (
          /* Bọc toàn bộ vào một thẻ div có position relative để nhãn absolute không bị cắt */
          <div style={{ position: "relative", marginTop: "2.5rem" }}>
            {/* Nhãn đưa ra khỏi thẻ edgerunner-card */}
            <div
              style={{
                position: "absolute",
                top: "-14px",
                left: "2rem",
                background: "var(--cyber-yellow)",
                color: "var(--cyber-black)",
                padding: "4px 20px",
                borderRadius: "9999px",
                fontFamily: "var(--font-header)",
                fontSize: "0.95rem",
                fontWeight: "700",
                boxShadow: "0 0 25px var(--cyber-yellow-glow)",
                zIndex: 10,
              }}
            >
              TOP MATCH • {result.matchScore}%
            </div>

            <div className="edgerunner-card">
              <div
                style={{
                  display: "flex",
                  gap: "2rem",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 110,
                    height: 110,
                    background: "rgba(251,191,36,0.15)",
                    borderRadius: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 40px var(--cyber-yellow-glow)",
                    flexShrink: 0,
                  }}
                >
                  <Car size={64} color="var(--cyber-yellow)" />
                </div>

                <div style={{ flex: 1 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "2rem",
                      color: "var(--cyber-yellow)",
                    }}
                  >
                    {result.vehicle}
                  </h2>
                  <p className="module-label" style={{ marginTop: "4px" }}>
                    RECOMMENDED BY AI CONCIERGE
                  </p>

                  <div
                    style={{
                      marginTop: "1.5rem",
                      padding: "1.25rem",
                      background: "rgba(52,229,235,0.08)",
                      borderRadius: "12px",
                      borderLeft: "4px solid var(--cyber-blue)",
                    }}
                  >
                    <div
                      className="module-label"
                      style={{ marginBottom: "8px" }}
                    >
                      WHY THIS VEHICLE?
                    </div>
                    <p
                      style={{
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {result.reason}
                    </p>
                  </div>
                </div>
              </div>

              <button
                className="cyber-button"
                style={{ width: "100%", marginTop: "2rem" }}
              >
                BOOK THIS VEHICLE NOW
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
