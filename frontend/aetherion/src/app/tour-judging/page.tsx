"use client";
import { DataRing } from "@/components/ui/DataRing";
import React, { useState, useEffect } from "react";

export default function TourJudging() {
  const [mounted, setMounted] = useState(false);
  const [score, setScore] = useState(87);
  const [leaves, setLeaves] = useState<
    Array<{
      id: number;
      left: string;
      durationFall: string;
      durationSway: string;
      delay: string;
      size: string;
    }>
  >([]);

  useEffect(() => {
    setMounted(true);
    // Vẫn giữ lại leaves normal như yêu cầu
    const generatedLeaves = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      durationFall: `${Math.random() * 5 + 7}s`,
      durationSway: `${Math.random() * 2 + 2}s`,
      delay: `-${Math.random() * 5}s`,
      size: `${Math.random() * 10 + 10}px`,
    }));
    setLeaves(generatedLeaves);
  }, []);

  if (!mounted) return null;

  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        position: "relative",
        overflow: "hidden",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "var(--cyber-black)",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* BOOT SEQUENCE ANIMATIONS */
            .map-fade-in {
              animation: map-reveal 1.5s ease-out forwards;
              opacity: 0;
            }
            @keyframes map-reveal { to { opacity: 1; } }

            .card-drop-in {
              animation: drop-bounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
              opacity: 0;
              transform: translateY(-50px) scale(0.95);
            }
            @keyframes drop-bounce {
              to { opacity: 1; transform: translateY(0) scale(1); }
            }

            .reveal-text {
              opacity: 0;
              animation: reveal-up 0.8s forwards;
            }
            @keyframes reveal-up {
              to { opacity: 1; transform: translateY(0); filter: blur(0); }
            }
            
            .delay-1 { animation-delay: 0.2s; }
            .delay-2 { animation-delay: 0.3s; }
            .delay-3 { animation-delay: 0.4s; }
            .delay-4 { animation-delay: 0.5s; }
            .delay-5 { animation-delay: 0.6s; }

            @keyframes grid-pan {
              from { background-position: 0 0; }
              to { background-position: 0 80px; }
            }

            @keyframes scanning-laser {
              0% { top: -10%; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { top: 110%; opacity: 0; }
            }

            .hud-glass-panel {
              background: rgba(15, 23, 42, 0.65);
              backdrop-filter: blur(24px);
              -webkit-backdrop-filter: blur(24px);
              border: 1px solid rgba(52, 229, 235, 0.3);
              box-shadow: 0 0 50px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(52, 229, 235, 0.1);
              border-radius: 16px;
            }
          `,
        }}
      />

      {/* =========================================
          BACKGROUND 3D GRID & SCANNER
          ========================================= */}
      <div
        className="map-fade-in"
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
      >
        {/* Sky / deep gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
            opacity: 0.95,
          }}
        />

        {/* Global Laser Scan Line */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "4px",
            background: "var(--cyber-blue)",
            boxShadow: "0 0 20px 5px var(--cyber-blue-glow)",
            animation: "scanning-laser 6s linear infinite",
            zIndex: 5,
            pointerEvents: "none",
          }}
        />

        {/* Animated 3D Grid */}
        <div
          style={{
            position: "absolute",
            inset: "-50%",
            backgroundImage:
              "linear-gradient(rgba(52, 229, 235, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(52, 229, 235, 0.1) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            animation: "grid-pan 4s linear infinite",
            transform: "perspective(1000px) rotateX(65deg) scale(1.2)",
            transformOrigin: "center top",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Ambient Glows */}
        <div
          style={{
            position: "absolute",
            top: "25%",
            left: "-5rem",
            width: "30rem",
            height: "30rem",
            borderRadius: "50%",
            opacity: 0.2,
            filter: "blur(80px)",
            background:
              "radial-gradient(circle, var(--cyber-blue) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "-5rem",
            width: "30rem",
            height: "30rem",
            borderRadius: "50%",
            opacity: 0.2,
            filter: "blur(80px)",
            background:
              "radial-gradient(circle, var(--cyber-purple) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* =========================================
          ENVIRONMENTAL FALLING LEAVES LAYER
          ========================================= */}
      <div
        className="falling-leaves-container map-fade-in"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 8,
          pointerEvents: "none",
        }}
      >
        {leaves.map((leaf) => (
          <div
            key={leaf.id}
            className="cyber-leaf"
            style={{
              left: leaf.left,
              width: leaf.size,
              height: leaf.size,
              animationDuration: `${leaf.durationFall}, ${leaf.durationSway}`,
              animationDelay: `${leaf.delay}, ${leaf.delay}`,
            }}
          />
        ))}
      </div>

      {/* =========================================
          MAIN AUTHENTICATION/DATA PANEL
          ========================================= */}
      <div
        className="card-drop-in hud-glass-panel"
        style={{
          padding: "3rem",
          maxWidth: "1100px",
          width: "90%",
          position: "relative",
          zIndex: 10,
          margin: "2rem",
        }}
      >
        <header
          className="reveal-text delay-1"
          style={{ textAlign: "center", marginBottom: "3.5rem" }}
        >
          <h1
            className="glitch-yellow"
            style={{ fontSize: "2.5rem", letterSpacing: "1px" }}
          >
            ENVIRONMENTAL SCORING
          </h1>
          <div
            className="cyber-bar"
            style={{
              margin: "1rem auto",
              width: "40%",
              background: "var(--cyber-blue)",
              height: "2px",
              boxShadow: "0 0 10px var(--cyber-blue-glow)",
            }}
          ></div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "2.5rem",
              marginTop: "1.5rem",
            }}
          >
            <p
              className="data-display"
              style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem" }}
            >
              <span
                style={{ color: "var(--cyber-yellow)", marginRight: "8px" }}
              >
                TARGET AREA:
              </span>
              <span style={{ color: "var(--text-main)", fontWeight: "600" }}>
                ASPEN, COLORADO
              </span>
            </p>
            <p
              className="data-display"
              style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem" }}
            >
              <span
                style={{ color: "var(--cyber-yellow)", marginRight: "8px" }}
              >
                SYS_TIME:
              </span>
              <span style={{ color: "var(--text-main)", fontWeight: "600" }}>
                14:00 UTC
              </span>
            </p>
          </div>
        </header>

        <div
          className="reveal-text delay-2"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "4rem",
          }}
        >
          <div
            className="cyber-gauge-wrapper"
            style={{
              padding: "1.5rem",
              borderRadius: "50%",
              background: "rgba(15, 23, 42, 0.5)",
              border: "1px solid rgba(52, 229, 235, 0.2)",
              boxShadow: "0 0 30px rgba(0,0,0,0.5)",
            }}
          >
            <DataRing score={score} label="AGGREGATED TOUR SCORE" />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2rem",
          }}
        >
          {/* Card 1 */}
          <div
            className="edgerunner-card reveal-text delay-3"
            style={{
              background: "rgba(30, 41, 59, 0.5)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(4px)",
            }}
          >
            <h3 className="module-label" style={{ color: "var(--cyber-blue)" }}>
              WEATHER_INDEX
            </h3>
            <h2
              className="stat-number"
              style={{
                color: "var(--cyber-blue)",
                fontSize: "2.5rem",
                margin: "0.5rem 0",
              }}
            >
              92
              <span
                style={{
                  fontSize: "1.2rem",
                  color: "var(--text-muted)",
                  marginLeft: "4px",
                }}
              >
                /100
              </span>
            </h2>
            <p
              className="ready-label"
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                opacity: 0.8,
              }}
            >
              &gt; SRC: National Weather API [Clear Skies]
            </p>
          </div>

          {/* Card 2 */}
          <div
            className="edgerunner-card reveal-text delay-4"
            style={{
              background: "rgba(30, 41, 59, 0.5)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(4px)",
            }}
          >
            <h3
              className="module-label"
              style={{ color: "var(--cyber-purple)" }}
            >
              TRAFFIC_CONGESTION
            </h3>
            <h2
              className="stat-number"
              style={{
                color: "var(--cyber-purple)",
                fontSize: "2.5rem",
                margin: "0.5rem 0",
              }}
            >
              75
              <span
                style={{
                  fontSize: "1.2rem",
                  color: "var(--text-muted)",
                  marginLeft: "4px",
                }}
              >
                /100
              </span>
            </h2>
            <p
              className="ready-label"
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                opacity: 0.8,
              }}
            >
              &gt; SRC: TomTom API [Light localized]
            </p>
          </div>

          {/* Card 3 */}
          <div
            className="edgerunner-card reveal-text delay-5"
            style={{
              background: "rgba(30, 41, 59, 0.5)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(4px)",
            }}
          >
            <h3 className="module-label" style={{ color: "var(--cyber-blue)" }}>
              SAFETY_LOCAL_SCORE
            </h3>
            <h2
              className="stat-number"
              style={{
                color: "var(--cyber-blue)",
                fontSize: "2.5rem",
                margin: "0.5rem 0",
              }}
            >
              95
              <span
                style={{
                  fontSize: "1.2rem",
                  color: "var(--text-muted)",
                  marginLeft: "4px",
                }}
              >
                /100
              </span>
            </h2>
            <p
              className="ready-label"
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                opacity: 0.8,
              }}
            >
              &gt; SRC: Regional Safety DB [High avg]
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
