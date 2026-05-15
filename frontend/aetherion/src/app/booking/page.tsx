"use client";
import React, { useState, useEffect } from "react";
import {
  Navigation,
  Car,
  MapPin,
  Crosshair,
  Zap,
  Activity,
  Scan,
  Target,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const MOCK_DRIVERS = [
  {
    id: "D-801",
    type: "Cyber SUV",
    eta: "3 mins",
    x: 45,
    y: 20,
    heading: 45,
    price: "12.50",
  },
  {
    id: "D-442",
    type: "Aero Sedan",
    eta: "7 mins",
    x: 85,
    y: 25,
    heading: 120,
    price: "8.20",
  },
  {
    id: "D-99X",
    type: "Hypercar",
    eta: "12 mins",
    x: 65,
    y: 80,
    heading: 270,
    price: "25.00",
  },
];

export default function BookingPage() {
  const { t } = useLanguage();
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDispatch = () => {
    if (!selectedDriver) return;
    setIsDispatching(true);
    setTimeout(() => {
      setIsDispatching(false);
      // Giả lập redirect hoặc dispatch thành công ở đây nếu cần
    }, 2000);
  };

  if (!mounted) return null;

  const selectedData = MOCK_DRIVERS.find((d) => d.id === selectedDriver);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 72px)",
        width: "100vw",
        overflow: "hidden",
        position: "relative",
        background: "var(--cyber-black)",
      }}
      className="md:flex-row"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* BOOT-UP / INTRO ANIMATIONS */
            .hud-slide-in {
              animation: hud-slide 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              opacity: 0;
              transform: translateY(30px);
            }
            @media (min-width: 768px) {
              .hud-slide-in {
                transform: translateX(-50px);
              }
            }
            @keyframes hud-slide {
              to { opacity: 1; transform: translate(0); }
            }

            .map-fade-in {
              animation: map-reveal 1.5s ease-out forwards;
              opacity: 0;
            }
            @keyframes map-reveal {
              to { opacity: 1; }
            }

            .marker-drop {
              animation: drop-bounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
              opacity: 0;
              transform: translateY(-100px);
            }
            @keyframes drop-bounce {
              to { opacity: 1; transform: translateY(0); }
            }

            /* STAGGERED REVEALS FOR HUD ITEMS */
            .reveal-text { opacity: 0; animation: reveal-up 0.8s forwards; }
            @keyframes reveal-up { to { opacity: 1; transform: translateY(0); filter: blur(0); } }
            
            .delay-1 { animation-delay: 0.2s; }
            .delay-2 { animation-delay: 0.3s; }
            .delay-3 { animation-delay: 0.4s; }
            .delay-4 { animation-delay: 0.5s; }
            .delay-5 { animation-delay: 0.6s; }

            /* CONTINUOUS EFFECTS */
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

            @keyframes radar-ping {
              0% { transform: scale(0.5); opacity: 0.8; }
              100% { transform: scale(3.5); opacity: 0; }
            }

            .path-line {
              stroke-dasharray: 10, 10;
              animation: line-flow 1s linear infinite;
            }
            @keyframes line-flow {
              to { stroke-dashoffset: -20; }
            }

            /* HUD SPECIFIC CSS */
            .hud-glass-panel {
              background: var(--cyber-surface-glass-light);
              backdrop-filter: blur(24px);
              -webkit-backdrop-filter: blur(24px);
              border: 1px solid rgba(52, 229, 235, 0.3);
              box-shadow: 0 0 50px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(52, 229, 235, 0.1);
              border-radius: 16px;
            }

            /* DRIVER CARD HOVER FX */
            .driver-card-fx {
              transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
              transform: translateX(0);
            }
            .driver-card-fx:hover {
              transform: translateX(8px);
              box-shadow: -5px 0 20px rgba(52, 229, 235, 0.2);
              border-color: var(--cyber-blue);
            }

            @media (max-width: 767px) {
              .mobile-map-height {
                height: 35vh !important;
                position: relative !important;
                flex-shrink: 0;
              }
              .mobile-hud-panel {
                position: relative !important;
                top: 0 !important;
                left: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: 65vh !important;
                border-radius: 20px 20px 0 0 !important;
                margin-top: -15px;
                padding: 1rem 0.75rem !important;
                overflow-y: auto;
                gap: 0.75rem !important;
              }
              .desktop-only { display: none !important; }
              .responsive-marker-scale { transform: translate(-50%, -50%) scale(0.7) !important; }
              .responsive-target-size { width: 44px !important; height: 44px !important; }
              .responsive-driver-scale { transform: translate(-50%, -50%) scale(0.8) !important; }
            }
          `,
        }}
      />

      {/* =========================================
          MAP AREA (BACKGROUND)
          ========================================= */}
      <main
        className="map-fade-in mobile-map-height"
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
      >
        {/* Deep background color */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--bg-gradient)",
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
            animation: "scanning-laser 5s linear infinite",
            zIndex: 5,
            pointerEvents: "none",
          }}
        />

        {/* Dynamic panning isometric grid */}
        <div
          style={{
            position: "absolute",
            inset: "-50%" /* Mở rộng lưới để khi cuộn/xoay không hở góc */,
            background:
              "linear-gradient(var(--cyber-grid) 1px, transparent 1px), linear-gradient(90deg, var(--cyber-grid) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            animation: "grid-pan 4s linear infinite",
            transform: "perspective(1000px) rotateX(65deg) scale(1)",
            transformOrigin: "center top",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Connection Route Line (Animated SVG SVG Laser) */}
        {selectedData && (
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 15,
              pointerEvents: "none",
            }}
          >
            <line
              x1={typeof window !== 'undefined' && window.innerWidth < 768 ? "50%" : "65%"} /* Điểm Client */
              y1={typeof window !== 'undefined' && window.innerWidth < 768 ? "35%" : "55%"} /* Điểm Client */
              x2={`${selectedData.x}%`} /* Điểm Driver */
              y2={`${selectedData.y}%`} /* Điểm Driver */
              stroke="var(--cyber-yellow)"
              strokeWidth="4"
              className="path-line"
              style={{
                filter: "drop-shadow(0 0 10px rgba(251, 191, 36, 0.8))",
              }}
            />
            {/* Vòng nối tại xe */}
            <circle
              cx={`${selectedData.x}%`}
              cy={`${selectedData.y}%`}
              r="6"
              fill="var(--cyber-yellow)"
            />
          </svg>
        )}

        {/* Client Position Marker */}
        <div
          className="marker-drop"
          style={{
            position: "absolute",
            top: typeof window !== 'undefined' && window.innerWidth < 768 ? "35%" : "55%",
            left: typeof window !== 'undefined' && window.innerWidth < 768 ? "50%" : "65%",
            width: 0,
            height: 0,
            animationDelay: "0.8s",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: "translate(-50%, -50%)",
              width: "150px",
              height: "150px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
            className="responsive-marker-scale"
          >
            {/* Radar Pings */}
            <div
              style={{
                position: "absolute",
                width: "100px",
                height: "100px",
                border: "2px solid var(--cyber-blue)",
                borderRadius: "50%",
                animation:
                  "radar-ping 2.5s cubic-bezier(0.2, 0.8, 0.2, 1) infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: "100px",
                height: "100px",
                border: "2px solid var(--cyber-blue)",
                borderRadius: "50%",
                animation:
                  "radar-ping 2.5s cubic-bezier(0.2, 0.8, 0.2, 1) infinite 1.25s",
              }}
            />

            <div
              style={{
                width: 60,
                height: 60,
                background: "var(--cyber-input-bg)",
                border: "3px solid var(--cyber-blue)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 30px var(--cyber-blue-glow)",
              }}
              className="responsive-target-size"
            >
              <Target size={30} color="var(--cyber-blue)" />
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              top: "40px",
              left: 0,
              transform: "translateX(-50%)",
              width: "100px",
              textAlign: "center",
              padding: "4px 8px",
              background: "var(--cyber-surface-glass)",
              border: "1px solid var(--cyber-blue)",
              color: "var(--cyber-blue)",
              fontSize: "0.75rem",
              fontWeight: "700",
              fontFamily: "var(--font-mono)",
              borderRadius: "4px",
              boxShadow: "0 0 10px rgba(52, 229, 235, 0.4)",
              backdropFilter: "blur(4px)",
            }}
            className="desktop-only"
          >
            {t("booking.youAreHere") as any}
          </div>
        </div>

        {/* DRIVER MARKERS */}
        {MOCK_DRIVERS.map((driver, index) => (
          <div
            key={driver.id}
            className="marker-drop"
            onClick={() => setSelectedDriver(driver.id)}
            style={{
              position: "absolute",
              top: `${driver.y}%`,
              left: `${driver.x}%`,
              width: 0,
              height: 0,
              animationDelay: `${0.9 + index * 0.2}s`,
              zIndex: selectedDriver === driver.id ? 100 : 50,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                transition:
                  "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                transform: `translate(-50%, -50%) ${selectedDriver === driver.id ? "scale(1.2)" : "scale(1)"}`,
              }}
              className="responsive-driver-scale"
            >
              <div
                style={{
                  transform: `rotate(${driver.heading}deg)`,
                  background:
                    selectedDriver === driver.id
                      ? "var(--cyber-yellow)"
                      : "var(--cyber-surface-glass)",
                  padding: "10px",
                  borderRadius: "50%",
                  border: `2px solid ${
                    selectedDriver === driver.id
                      ? "var(--cyber-yellow)"
                      : "rgba(167, 139, 250, 0.5)"
                  }`,
                  boxShadow:
                    selectedDriver === driver.id
                      ? "0 0 25px rgba(251, 191, 36, 0.8)"
                      : "0 0 15px rgba(167, 139, 250, 0.3)",
                  backdropFilter: "blur(4px)",
                  transition: "all 0.3s ease",
                }}
              >
                <Navigation
                  size={24}
                  color={
                    selectedDriver === driver.id
                      ? "var(--cyber-black)"
                      : "var(--cyber-purple)"
                  }
                  fill="currentColor"
                />
              </div>

              <div
                style={{
                  marginTop: "12px",
                  background: "var(--cyber-surface-glass)",
                  backdropFilter: "blur(8px)",
                  border: `1px solid ${
                    selectedDriver === driver.id
                      ? "var(--cyber-yellow)"
                      : "var(--cyber-border)"
                  }`,
                  padding: "4px 12px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  fontFamily: "var(--font-mono)",
                  color:
                    selectedDriver === driver.id
                      ? "var(--cyber-yellow)"
                      : "var(--text-main)",
                  boxShadow: "0 0 15px rgba(0,0,0,0.5)",
                  whiteSpace: "nowrap",
                }}
                className="desktop-only"
              >
                {driver.id} • {driver.eta}
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* =========================================
          FLOATING HUD PANEL
          ========================================= */}
      <aside
        className="hud-glass-panel hud-slide-in mobile-hud-panel"
        style={{
          position: "absolute",
          top: "2rem",
          left: "2rem",
          bottom: "2rem",
          width: "420px",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          zIndex: 200,
        }}
      >
        <div
          className="reveal-text delay-1"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            className="glitch-yellow"
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "1.3rem",
              textShadow: "0 0 20px var(--cyber-yellow-glow)",
            }}
          >
            <Activity size={24} color="var(--cyber-yellow)" />
            <span className="md:inline hidden">
              {t("booking.dispatchCenter" as any)}
            </span>
            <span className="md:hidden inline">
              {t("booking.dispatch" as any)}
            </span>
          </h2>
          <span
            className="status-active"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}
          >
            ● {t("booking.liveTracking" as any)}
          </span>
        </div>

        {/* Pick-up / Drop-off Tracking */}
        <div
          className="edgerunner-card reveal-text delay-2"
          style={{ padding: "1rem", background: "var(--cyber-card-bg)" }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <div
              style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "var(--cyber-blue)",
                  boxShadow: "0 0 10px var(--cyber-blue)",
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  className="module-label"
                  style={{ fontSize: "0.65rem", marginBottom: "2px" }}
                >
                  {t("booking.scannedPickup" as any)}
                </div>
                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "var(--text-main)",
                  }}
                >
                  Downtown, Sector 4
                </div>
              </div>
            </div>

            <div
              style={{
                width: "2px",
                height: "15px",
                background:
                  "linear-gradient(to bottom, var(--cyber-blue), var(--cyber-purple))",
                marginLeft: "4px",
                opacity: 0.6,
              }}
            />

            <div
              style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "var(--cyber-purple)",
                  boxShadow: "0 0 10px var(--cyber-purple)",
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  className="module-label"
                  style={{ fontSize: "0.65rem", marginBottom: "2px" }}
                >
                  {t("booking.targetDestination" as any)}
                </div>
                <input
                  type="text"
                  placeholder={t("booking.dropoffPlaceholder" as any)}
                  style={{
                    background: "var(--cyber-input-bg)",
                    border: "1px solid var(--cyber-border)",
                    outline: "none",
                    color: "var(--text-main)",
                    width: "100%",
                    fontSize: "0.9rem",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    fontFamily: "var(--font-mono)",
                    transition: "all 0.3s ease",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--cyber-blue)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "var(--cyber-border)")
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className="reveal-text delay-3"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginTop: "0px",
          }}
        >
          <Scan size={18} color="var(--cyber-blue)" />
          <h3
            className="module-label"
            style={{
              margin: 0,
              color: "var(--cyber-blue)",
              fontSize: "0.85rem",
              fontWeight: "700",
              letterSpacing: "1px",
            }}
          >
            {t("booking.availableAssets" as any)}
          </h3>
        </div>

        {/* Drivers List */}
        <div
          className="reveal-text delay-4"
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
            paddingRight: "4px",
            minHeight: "150px",
          }}
        >
          {MOCK_DRIVERS.map((driver) => (
            <div
              key={driver.id}
              onClick={() => setSelectedDriver(driver.id)}
              className="edgerunner-card driver-card-fx"
              style={{
                cursor: "pointer",
                padding: "1rem",
                borderRadius: "10px",
                position: "relative",
                overflow: "hidden",
                border:
                  selectedDriver === driver.id
                    ? "2px solid var(--cyber-yellow)"
                    : "1px solid var(--cyber-border)",
                background:
                  selectedDriver === driver.id
                    ? "var(--cyber-yellow-dim)"
                    : "var(--cyber-card-bg)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "10px",
                      background: "var(--cyber-input-bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1px solid ${selectedDriver === driver.id ? "var(--cyber-yellow)" : "transparent"}`,
                    }}
                  >
                    <Car
                      size={24}
                      color={
                        selectedDriver === driver.id
                          ? "var(--cyber-yellow)"
                          : "var(--cyber-blue)"
                      }
                    />
                  </div>
                  <div>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "1rem",
                        color:
                          selectedDriver === driver.id
                            ? "var(--cyber-yellow)"
                            : "var(--text-main)",
                        fontWeight: "700",
                      }}
                    >
                      {driver.type}
                    </h4>
                    <p className="module-label" style={{ margin: 0, fontSize: "0.6rem" }}>
                      {driver.id}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: "800",
                      fontFamily: "var(--font-header)",
                      lineHeight: 1,
                      color:
                        selectedDriver === driver.id
                          ? "var(--cyber-yellow)"
                          : "var(--text-main)",
                    }}
                  >
                    {driver.eta}
                  </div>
                  <div
                    style={{
                      color: "var(--cyber-green)",
                      fontWeight: "600",
                      fontSize: "0.9rem",
                      marginTop: "2px",
                    }}
                  >
                    ${driver.price}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="reveal-text delay-5" style={{ marginTop: "auto" }}>
          <button
            className="cyber-button"
            onClick={handleDispatch}
            disabled={!selectedDriver || isDispatching}
            style={{
              width: "100%",
              padding: "1rem",
              opacity: !selectedDriver ? 0.5 : 1,
              filter: !selectedDriver ? "grayscale(100%)" : "none",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
              fontSize: "0.9rem",
            }}
          >
            {isDispatching ? (
              <>
                <Scan size={18} className="animate-spin" />
                {t("booking.initiating") as any}
              </>
            ) : selectedDriver ? (
              <>
                <Zap size={18} />
                {t("booking.confirmDispatch")} {selectedDriver}
              </>
            ) : (
              (t("booking.selectAsset") as any)
            )}
          </button>
        </div>
      </aside>
    </div>
  );
}
