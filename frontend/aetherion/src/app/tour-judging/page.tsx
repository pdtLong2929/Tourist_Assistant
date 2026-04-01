"use client";
import { DataRing } from "@/components/ui/DataRing";
import React, { useState, useEffect } from "react";

export default function TourJudging() {
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
    // Tạo 25 lá với các thông số ngẫu nhiên
    const generatedLeaves = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      durationFall: `${Math.random() * 5 + 7}s`, // Tốc độ rơi: 7s - 12s
      durationSway: `${Math.random() * 2 + 2}s`, // Tốc độ lắc lư: 2s - 4s
      delay: `-${Math.random() * 5}s`, // Bắt đầu ở các thời điểm khác nhau
      size: `${Math.random() * 10 + 10}px`, // Kích thước: 10px - 20px
    }));
    setLeaves(generatedLeaves);
  }, []);

  return (
    <>
      {/* Vùng chứa hiệu ứng lá rơi */}
      <div className="falling-leaves-container">
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

      {/* Nội dung chính của giao diện */}
      <div
        style={{
          padding: "2.5rem",
          maxWidth: "1100px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <header style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <h1 className="glitch-yellow">ENVIRONMENTAL FACTOR SCORING</h1>
          <div
            className="cyber-bar"
            style={{ margin: "1rem auto", width: "60%" }}
          ></div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "2rem",
              marginTop: "1rem",
            }}
          >
            <p className="data-display">
              <span style={{ color: "var(--cyber-yellow)" }}>TARGET:</span>{" "}
              ASPEN, COLORADO
            </p>
            <p className="data-display">
              <span style={{ color: "var(--cyber-yellow)" }}>SYS_TIME:</span>{" "}
              14:00 UTC
            </p>
          </div>
        </header>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "4rem",
          }}
        >
          <div className="cyber-gauge-wrapper">
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
          <div className="edgerunner-card">
            <h3 className="module-label">WEATHER_INDEX</h3>
            <h2
              className="stat-number"
              style={{
                color: "var(--cyber-blue)",
                fontSize: "2.5rem",
                margin: "0.5rem 0",
              }}
            >
              92
              <span style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>
                /100
              </span>
            </h2>
            <p className="ready-label">
              &gt; SRC: National Weather API [Clear Skies]
            </p>
          </div>

          <div className="edgerunner-card">
            <h3 className="module-label">TRAFFIC_CONGESTION</h3>
            <h2
              className="stat-number"
              style={{
                color: "var(--cyber-purple)",
                fontSize: "2.5rem",
                margin: "0.5rem 0",
              }}
            >
              75
              <span style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>
                /100
              </span>
            </h2>
            <p className="ready-label">
              &gt; SRC: TomTom API [Light localized]
            </p>
          </div>

          <div className="edgerunner-card">
            <h3 className="module-label">SAFETY_LOCAL_SCORE</h3>
            <h2
              className="stat-number"
              style={{
                color: "var(--cyber-blue)",
                fontSize: "2.5rem",
                margin: "0.5rem 0",
              }}
            >
              95
              <span style={{ fontSize: "1.2rem", color: "var(--text-muted)" }}>
                /100
              </span>
            </h2>
            <p className="ready-label">
              &gt; SRC: Regional Safety DB [High avg]
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
