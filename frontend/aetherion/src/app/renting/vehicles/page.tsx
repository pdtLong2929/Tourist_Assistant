"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Car, 
  Bike, 
  ArrowLeft, 
  Search, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  Star,
  Loader2,
  Cpu
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function VehicleListPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "car";
  
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [expandedVehId, setExpandedVehId] = useState<string | null>(null);

  const handleSelect = (e: React.MouseEvent, v: any) => {
    e.stopPropagation();
    localStorage.setItem("selected_vehicle", JSON.stringify(v));
    const startPos = localStorage.getItem("renting_start") || "Current Location";
    const endPos = localStorage.getItem("renting_end") || "Destination";
    window.location.href = `/booking?origin=${encodeURIComponent(startPos)}&destination=${encodeURIComponent(endPos)}&vehicleId=${v.veh_id}`;
  };

  const loadingSteps = [
    "ESTABLISHING SECURE CONNECTION TO COGNITIVE CORE...",
    "EXTRACTING ROUTE GEOMETRY & ROAD GRAPH...",
    "CROSS-REFERENCING FORECASTED WEATHER MATRICES...",
    "RETRIEVING VEHICLE ATTRIBUTES FROM CLOUD SQL...",
    "COMPUTING COSINE COMPATIBILITY MATRIX...",
    "RANKING MODULE COMPATIBILITY VIA KNN REGRESSION..."
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cycling the futuristic loading status logs
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % loadingSteps.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!mounted) return;
    
    const data = localStorage.getItem("last_recommendations");
    if (data) {
      const parsed = JSON.parse(data);
      if (type === "car") {
        setVehicles(parsed.cars || []);
      } else {
        setVehicles(parsed.bikes || []);
      }
      setLoading(false);
    } else {
      // Recommendations not fetched yet, wait via WebSocket
      setLoading(true);
      
      const userId = localStorage.getItem("renting_userId");
      if (!userId) {
        setLoading(false);
        return;
      }
      
      const nginxUrl = process.env.NEXT_PUBLIC_NGINX_URL || "http://localhost";
      const wsUrl = nginxUrl.replace(/^http/, "ws") + `/ws?userId=${userId}`;
      console.log("Connecting WebSocket from Vehicle List page for user:", userId);
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const wsData = JSON.parse(event.data);
          console.log("Vehicle List WS Received:", wsData);
          if (wsData.result) {
            const parsed = JSON.parse(wsData.result);
            if (parsed && (parsed.cars || parsed.bikes)) {
              localStorage.setItem('last_recommendations', JSON.stringify(parsed));
              if (type === "car") {
                setVehicles(parsed.cars || []);
              } else {
                setVehicles(parsed.bikes || []);
              }
              setLoading(false);
              ws.close();
            }
          }
        } catch (e) {
          console.error("Error parsing WS message in Vehicle List:", e);
        }
      };

      ws.onerror = (err) => {
        console.error("Vehicle List WS error:", err);
      };

      ws.onclose = () => {
        console.log("Vehicle List WS closed.");
      };

      return () => {
        ws.close();
      };
    }
  }, [type, mounted]);

  if (!mounted) return null;

  const isCar = type === "car";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#f8fafc",
        padding: "4rem 2rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div 
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '600px',
            height: '600px',
            background: isCar ? 'radial-gradient(circle, rgba(52,229,235,0.1) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)',
            filter: 'blur(100px)',
            zIndex: 0
          }}
        />
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: "3rem" }}>
          <button
            onClick={() => window.location.href = "/renting/suggestions"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--cyber-blue)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "bold",
              marginBottom: "1.5rem",
              fontFamily: "var(--font-mono)",
              transition: "transform 0.2s ease"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-5px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
          >
            <ArrowLeft size={20} />
            {t("common.back" as any) || "BACK TO SUGGESTIONS"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div 
              style={{ 
                width: "60px", 
                height: "60px", 
                borderRadius: "12px", 
                background: isCar ? "rgba(52,229,235,0.1)" : "rgba(251,191,36,0.1)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                border: `1px solid ${isCar ? "var(--cyber-blue)" : "var(--cyber-yellow)"}`
              }}
            >
              {isCar ? <Car size={32} color="var(--cyber-blue)" /> : <Bike size={32} color="var(--cyber-yellow)" />}
            </div>
            <div>
              <h1 style={{ fontSize: "2.5rem", fontWeight: "900", textTransform: "uppercase", letterSpacing: "2px" }}>
                Recommended {isCar ? "Cars" : "Motorbikes"}
              </h1>
              <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>
                AI-ranked selection based on your route difficulty, weather forecast, and budget constraints.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic State Selection */}
        {loading ? (
          <div 
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "7rem 2rem",
              background: "rgba(15, 23, 42, 0.4)",
              borderRadius: "24px",
              border: "1px solid rgba(255,255,255,0.05)",
              backdropFilter: "blur(12px)",
              position: "relative",
              overflow: "hidden"
            }}
            className="scanning-card"
          >
            {/* Core Scanner Ring */}
            <div style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              border: `2px solid ${isCar ? "rgba(52,229,235,0.2)" : "rgba(251,191,36,0.2)"}`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
              marginBottom: "2.5rem",
              boxShadow: `0 0 30px ${isCar ? "rgba(52,229,235,0.1)" : "rgba(251,191,36,0.1)"}`
            }}>
              {/* Spinning scanning arc */}
              <div style={{
                position: "absolute",
                inset: "-6px",
                borderRadius: "50%",
                border: "2px solid transparent",
                borderTopColor: isCar ? "var(--cyber-blue)" : "var(--cyber-yellow)",
                animation: "spin-custom 1s linear infinite"
              }} />
              
              {isCar ? (
                <Car size={48} className="animate-pulse" color="var(--cyber-blue)" />
              ) : (
                <Bike size={48} className="animate-pulse" color="var(--cyber-yellow)" />
              )}
            </div>

            <h2 style={{
              fontSize: "1.6rem",
              fontWeight: "900",
              textTransform: "uppercase",
              letterSpacing: "3px",
              marginBottom: "0.75rem",
              color: "#fff"
            }}>
              Syncing AI Recommendations
            </h2>

            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              color: isCar ? "var(--cyber-blue)" : "var(--cyber-yellow)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              letterSpacing: "1px",
              textShadow: `0 0 10px ${isCar ? "rgba(52,229,235,0.3)" : "rgba(251,191,36,0.3)"}`,
              minHeight: "20px"
            }}>
              <Cpu size={14} className="animate-spin-custom" />
              {loadingSteps[loadingStep]}
            </div>
          </div>
        ) : vehicles.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
            {vehicles.map((v, idx) => {
              const isExpanded = expandedVehId === v.veh_id;
              return (
                <div
                  key={v.veh_id}
                  onClick={() => setExpandedVehId(isExpanded ? null : v.veh_id)}
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: isExpanded 
                      ? `1px solid ${isCar ? "var(--cyber-blue)" : "var(--cyber-yellow)"}` 
                      : "1px solid rgba(255,255,255,0.05)",
                    borderRadius: "16px",
                    padding: "2rem",
                    display: "grid",
                    gridTemplateColumns: "1fr 2fr 1fr",
                    gap: "2rem",
                    alignItems: "center",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    cursor: "pointer",
                    backdropFilter: "blur(10px)",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: isExpanded 
                      ? `0 0 25px ${isCar ? "rgba(52,229,235,0.15)" : "rgba(251,191,36,0.15)"}` 
                      : "none"
                  }}
                  onMouseEnter={e => {
                    if (!isExpanded) {
                      e.currentTarget.style.borderColor = isCar ? "rgba(52,229,235,0.3)" : "rgba(251,191,36,0.3)";
                      e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
                      e.currentTarget.style.transform = "scale(1.01)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isExpanded) {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                      e.currentTarget.style.background = "rgba(15, 23, 42, 0.6)";
                      e.currentTarget.style.transform = "scale(1)";
                    }
                  }}
                >
                  {/* Ranking Badge */}
                  <div style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    padding: "4px 12px",
                    background: isCar ? "var(--cyber-blue)" : "var(--cyber-yellow)",
                    color: "#000",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    fontFamily: "var(--font-mono)",
                    borderBottomRightRadius: "8px"
                  }}>
                    RANK #{idx + 1}
                  </div>

                  {/* Left Column: Image/Visual */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                     <div style={{ 
                        width: "100%", 
                        height: "140px", 
                        background: "#000", 
                        borderRadius: "12px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        position: "relative"
                     }}>
                        <img 
                          src={`/transports/${type}.png`} 
                          alt={v.model} 
                          style={{ maxHeight: "100px", objectFit: "contain", filter: `drop-shadow(0 0 15px ${isCar ? 'rgba(52,229,235,0.4)' : 'rgba(251,191,36,0.4)'})` }} 
                          onError={e => e.currentTarget.src = "https://via.placeholder.com/150/0f172a/34e5eb?text=VEHICLE"}
                        />
                     </div>
                     <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                        <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", padding: "8px", borderRadius: "8px", textAlign: "center" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", textTransform: "uppercase" }}>Color</span>
                          <span style={{ fontWeight: "bold" }}>{v.color || "Default"}</span>
                        </div>
                        <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", padding: "8px", borderRadius: "8px", textAlign: "center" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", textTransform: "uppercase" }}>Price</span>
                          <span style={{ fontWeight: "bold", color: "var(--cyber-green)" }}>${v.price || "0"}/day</span>
                        </div>
                     </div>
                  </div>

                  {/* Middle Column: Details */}
                  <div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "1rem" }}>
                      {v.company_name && (
                        <span style={{ 
                          fontSize: "0.8rem", 
                          color: isCar ? "var(--cyber-blue)" : "var(--cyber-yellow)", 
                          textTransform: "uppercase", 
                          letterSpacing: "2px", 
                          fontWeight: "bold" 
                        }}>
                          {v.company_name}
                        </span>
                      )}
                      <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#fff", textTransform: "capitalize" }}>
                        {v.car_name || v.make_model || v.model || "Advanced Transit Module"}
                      </h2>
                    </div>

                    {/* Stats Stacked Vertically with Visual Progress Indicators */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", margin: "1rem 0" }}>
                      {/* Reliability */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255,255,255,0.7)" }}>
                            <ShieldCheck size={16} color="var(--cyber-blue)" />
                            <span>Reliability</span>
                          </div>
                          <b style={{ color: "var(--cyber-blue)", fontFamily: "var(--font-mono)" }}>
                            {Math.round((v.rating || 0) * 10) / 10}/10
                          </b>
                        </div>
                        <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${((v.rating || 0) / 10) * 100}%`, height: "100%", background: "var(--cyber-blue)", transition: "width 0.5s ease" }} />
                        </div>
                      </div>

                      {/* Performance */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255,255,255,0.7)" }}>
                            <TrendingUp size={16} color="var(--cyber-yellow)" />
                            <span>Performance</span>
                          </div>
                          <b style={{ color: "var(--cyber-yellow)", fontFamily: "var(--font-mono)" }}>
                            {Math.round((v.final_score || 0) * 100)}%
                          </b>
                        </div>
                        <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.round((v.final_score || 0) * 100)}%`, height: "100%", background: "var(--cyber-yellow)", transition: "width 0.5s ease" }} />
                        </div>
                      </div>

                      {/* Match Compatibility */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255,255,255,0.7)" }}>
                            <Star size={16} color="var(--cyber-green)" />
                            <span>Compatibility</span>
                          </div>
                          <b style={{ color: "var(--cyber-green)", fontFamily: "var(--font-mono)" }}>
                            {Math.round((v.compatibility || 0) * 100)}%
                          </b>
                        </div>
                        <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.round((v.compatibility || 0) * 100)}%`, height: "100%", background: "var(--cyber-green)", transition: "width 0.5s ease" }} />
                        </div>
                      </div>

                      {/* ID */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255,255,255,0.7)" }}>
                          <Zap size={16} color="#ec4899" />
                          <span>Module ID</span>
                        </div>
                        <b style={{ color: "#ec4899", fontFamily: "var(--font-mono)" }}>{v.veh_id}</b>
                      </div>
                    </div>

                    {/* Explanation and Tech Badges (Toggled on box click) */}
                    {!isExpanded ? (
                      <div style={{ 
                        fontSize: "0.8rem", 
                        color: isCar ? "var(--cyber-blue)" : "var(--cyber-yellow)", 
                        marginTop: "1rem",
                        opacity: 0.8,
                        fontFamily: "var(--font-mono)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        <span className="animate-pulse">▶</span> CLICK CARD TO EXPAND DETAILS &amp; TECH SPECIFICATIONS
                      </div>
                    ) : (
                      <div style={{ 
                        marginTop: "1rem", 
                        borderTop: "1px dashed rgba(255,255,255,0.1)", 
                        paddingTop: "1rem",
                        animation: "fadeIn 0.3s ease" 
                      }}>
                        {/* Technical Specifications Badges */}
                        <div style={{ 
                          display: "flex", 
                          flexWrap: "wrap", 
                          gap: "8px",
                          marginBottom: "1rem"
                        }}>
                          {isCar ? (
                            <>
                              {v.engine && (
                                <div style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "4px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                                  Engine: <b>{v.engine}</b>
                                </div>
                              )}
                              {v.horsepower && (
                                <div style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "4px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                                  HP: <b>{v.horsepower}</b>
                                </div>
                              )}
                              {v.seats && (
                                <div style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "4px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                                  Seats: <b>{v.seats}</b>
                                </div>
                              )}
                              {v.fuel_type && (
                                <div style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "4px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                                  Fuel: <b>{v.fuel_type}</b>
                                </div>
                              )}
                              {v.torque && (
                                <div style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "4px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                                  Torque: <b>{v.torque}</b>
                                </div>
                              )}
                              {v.battery_capacity && (
                                <div style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "4px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                                  Capacity: <b>{v.battery_capacity}</b>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {v.power && (
                                <div style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "4px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                                  Power: <b>{v.power}</b>
                                </div>
                              )}
                              {v.fuel_type && (
                                <div style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "4px 8px", borderRadius: "6px", color: "#cbd5e1" }}>
                                  Fuel: <b>{v.fuel_type}</b>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        
                        {/* Explanation */}
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", lineHeight: "1.6", margin: 0 }}>
                          {isCar 
                            ? `This premium ${v.company_name || ""} vehicle features a robust ${v.engine || "high-efficiency"} engine delivering ${v.horsepower || "impressive"} horsepower. Designed for safety and control with ${v.torque || "outstanding"} torque, ${v.performance ? `sprinting 0-100 km/h in ${v.performance}` : ""} and running on ${v.fuel_type || "clean fuel"}.`
                            : `A high-performance ${v.company_name || ""} model powered by a ${v.power || "highly responsive"} engine. Perfect for dynamic maneuvers, running efficiently on ${v.fuel_type || "standard fuel"}.`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: CTA */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ textAlign: "right", marginBottom: "1rem" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Total Score</span>
                      <span style={{ fontSize: "2rem", fontWeight: "900", color: isCar ? "var(--cyber-blue)" : "var(--cyber-yellow)" }}>
                        {Math.round(v.final_score * 100)}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => handleSelect(e, v)}
                      style={{
                        padding: "12px",
                        background: isCar ? "var(--cyber-blue)" : "var(--cyber-yellow)",
                        color: "#000",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: `0 0 15px ${isCar ? 'rgba(52,229,235,0.3)' : 'rgba(251,191,36,0.3)'}`
                      }}
                    >
                      Select Vehicle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ 
            textAlign: "center", 
            padding: "5rem", 
            background: "rgba(255,255,255,0.02)", 
            borderRadius: "24px",
            border: "1px dashed rgba(255,255,255,0.1)"
          }}>
            <Search size={48} color="var(--text-muted)" style={{ margin: "0 auto 1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>No Recommendations Found</h2>
            <p style={{ color: "var(--text-muted)" }}>
              We couldn&apos;t find any specific {type} recommendations for this trip. 
              Please try a different search or narrative.
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin-custom {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-custom {
          animation: spin-custom 2s linear infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .scanning-card::after {
          content: "";
          position: absolute;
          left: 0;
          width: 100%;
          height: 3px;
          background: ${isCar ? "var(--cyber-blue)" : "var(--cyber-yellow)"};
          box-shadow: 0 0 20px ${isCar ? "var(--cyber-blue)" : "var(--cyber-yellow)"};
          animation: scan-line 2.5s linear infinite;
          z-index: 5;
        }
        @keyframes scan-line {
          0% { top: 0%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
