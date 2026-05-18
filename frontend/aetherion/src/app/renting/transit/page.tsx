"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bus,
  Train,
  MapPin,
  Loader2,
  BrainCircuit,
  Database,
  Milestone,
  Clock,
  Activity,
  Compass,
  Sparkles
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

function TransitSuggestionsContent() {
  const searchParams = useSearchParams();
  const origin = searchParams.get("origin") || "";
  const destination = searchParams.get("destination") || "";
  
  const [transitRecommendations, setTransitRecommendations] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing neural uplink...");
  const [mounted, setMounted] = useState(false);

  const [userId] = useState(() => {
    if (typeof window !== "undefined") {
      let id = localStorage.getItem("renting_userId");
      if (!id) {
        id = `user_${Math.random().toString(36).substring(7)}`;
        localStorage.setItem("renting_userId", id);
      }
      return id;
    }
    return "";
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !origin || !destination || !userId) return;

    setLoading(true);
    setStatusMessage("CONNECTING TO PUBLIC TRANSPORT DATABASE...");
    
    // Connect WebSocket
    const nginxUrl = process.env.NEXT_PUBLIC_NGINX_URL || "http://localhost";
    const wsUrl = nginxUrl.replace(/^http/, "ws") + `/ws?userId=${userId}`;
    console.log("Transit Page: Connecting WebSocket for user:", userId);
    
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Transit Page: WebSocket Received:", data);
        if (data.result) {
          let parsed: any = null;
          try {
            parsed = JSON.parse(data.result);
          } catch (pe) {
            console.warn("Transit Page: non-JSON result:", data.result);
          }
          if (parsed && parsed.recommendations) {
            setTransitRecommendations(parsed.recommendations);
            setLoading(false);
            ws.close(); // Clean close once loaded
          }
        }
      } catch (e) {
        console.error("Transit Page: Error parsing WS message:", e);
      }
    };

    // Trigger Transit Suggestions Job
    setStatusMessage("SEEKING MULTI-MODAL GTFS PATHS...");
    fetch(`${nginxUrl}/api/v1/jobs/transit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: origin,
        destination: destination,
        date: 5,
        userId: userId,
      }),
    })
    .then(res => res.json())
    .then(data => {
      console.log("Transit Page: Job queued successfully:", data);
      setStatusMessage("RESOLVING STOPS & CALCULATING OPTIMAL TRANSFERS...");
    })
    .catch(e => {
      console.error("Transit Page: Failed job trigger:", e);
      setLoading(false);
    });

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [mounted, origin, destination, userId]);

  if (!mounted) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-custom {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-custom { animation: spin-custom 1s linear infinite; }
        
        .edgerunner-card {
          position: relative;
          background: var(--cyber-surface-glass);
          border: 1px solid var(--cyber-border);
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .edgerunner-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 12px;
          padding: 1px;
          background: linear-gradient(to bottom, rgba(52, 229, 235, 0.2), rgba(0, 0, 0, 0));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .edgerunner-card:hover {
          border-color: var(--cyber-green);
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.1);
          transform: translateY(-2px);
        }
      `}} />

      <div style={{ padding: "4rem 2rem", maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* Navigation back */}
        <div style={{ marginBottom: "2rem" }}>
          <button
            onClick={() => window.location.href = "/renting/suggestions"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--cyber-border)",
              color: "var(--text-secondary)",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontFamily: "var(--font-mono)",
              fontWeight: "bold",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(52, 229, 235, 0.05)";
              e.currentTarget.style.color = "var(--cyber-blue)";
              e.currentTarget.style.borderColor = "var(--cyber-blue)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.borderColor = "var(--cyber-border)";
            }}
          >
            <ArrowLeft size={16} /> BACK TO RECOMMENDATIONS
          </button>
        </div>

        {/* Header Block */}
        <header style={{ marginBottom: "4rem" }}>
          <div style={{ textTransform: "uppercase", fontFamily: "var(--font-mono)", color: "var(--cyber-green)", fontSize: "0.85rem", letterSpacing: "3px", marginBottom: "0.5rem" }}>
            Network Infrastructure Leg
          </div>
          <h1 style={{ fontSize: "3rem", fontWeight: "900", color: "var(--text-main)", letterSpacing: "-0.5px", marginBottom: "1rem" }}>
            TRANSIT PATHWAYS <span style={{ color: "var(--cyber-green)" }}>ANALYSIS</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: "700px" }}>
            Real-time public transit transfer optimizer computing walks, coordinates, bus and subway schedules.
          </p>
        </header>

        {/* Route context detail */}
        <div style={{ background: "rgba(15, 23, 42, 0.4)", border: "1px solid var(--cyber-border)", borderRadius: "12px", padding: "2rem", marginBottom: "3rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            <div>
              <div style={{ textTransform: "uppercase", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--cyber-blue)", marginBottom: "0.5rem" }}>Origin Point</div>
              <div style={{ fontSize: "1.1rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                <MapPin size={16} style={{ color: "var(--cyber-blue)" }} /> {origin}
              </div>
            </div>
            <div>
              <div style={{ textTransform: "uppercase", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--cyber-yellow)", marginBottom: "0.5rem" }}>Final Destination</div>
              <div style={{ fontSize: "1.1rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                <MapPin size={16} style={{ color: "var(--cyber-yellow)" }} /> {destination}
              </div>
            </div>
          </div>
        </div>

        {/* LOADING SCREEN */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6rem 0", gap: "1.5rem" }}>
            <Loader2 className="animate-spin-custom" size={64} style={{ color: "var(--cyber-green)", filter: "drop-shadow(0 0 10px var(--cyber-green))" }} />
            <div style={{ color: "var(--cyber-green)", fontFamily: "var(--font-mono)", fontSize: "1.2rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center" }}>
              {statusMessage}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              Searching SQLite GTFS timetables and executing Law of Cosines stop matching
            </div>
          </div>
        )}

        {/* RECOMMENDATIONS RESULTS */}
        {!loading && transitRecommendations && transitRecommendations.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "3rem" }}>
            {transitRecommendations.map((route, routeIdx) => (
              <div
                key={routeIdx}
                className="edgerunner-card"
                style={{ padding: "3rem", borderTop: "3px solid var(--cyber-green)" }}
              >
                {/* Route statistics */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem", borderBottom: "1px dashed var(--cyber-border)", paddingBottom: "1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ background: "var(--cyber-green)", color: "#000", padding: "6px 14px", borderRadius: "4px", fontWeight: "bold", fontFamily: "var(--font-mono)", fontSize: "0.95rem" }}>
                      OPTION #{routeIdx + 1}
                    </span>
                    <span style={{ color: "var(--cyber-yellow)", fontFamily: "var(--font-mono)", fontWeight: "bold", fontSize: "1.1rem" }}>
                      Score: {Math.round(route.score * 100)}%
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "2rem", color: "var(--text-secondary)", fontSize: "1.05rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Milestone size={16} /> Distance: <strong style={{ color: "var(--text-main)" }}>{route.total_distance_km} km</strong>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Clock size={16} /> Duration: <strong style={{ color: "var(--text-main)" }}>{route.total_duration_min} mins</strong>
                    </span>
                  </div>
                </div>

                {/* Timeline display */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem", position: "relative", paddingLeft: "1.5rem" }}>
                  <div style={{ position: "absolute", left: "6px", top: "10px", bottom: "10px", width: "2px", background: "rgba(16, 185, 129, 0.2)" }} />

                  {route.legs?.map((leg: any, legIdx: number) => (
                    <div key={legIdx} style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: "-23px", top: "8px", width: "10px", height: "10px", borderRadius: "50%", background: "var(--cyber-green)", boxShadow: "0 0 10px var(--cyber-green)" }} />
                      
                      {leg.segments?.map((seg: any, segIdx: number) => (
                        <div key={segIdx} style={{ marginBottom: "1.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem" }}>
                            {seg.transit_type?.toLowerCase() === 'metro' ? (
                              <Train size={16} style={{ color: "#ef4444" }} />
                            ) : (
                              <Bus size={16} style={{ color: "#3b82f6" }} />
                            )}
                            <span style={{
                              textTransform: "uppercase",
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                              fontFamily: "var(--font-mono)",
                              padding: "2px 8px",
                              borderRadius: "3px",
                              background: seg.transit_type?.toLowerCase() === 'metro' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                              color: seg.transit_type?.toLowerCase() === 'metro' ? '#f87171' : '#60a5fa',
                              border: seg.transit_type?.toLowerCase() === 'metro' ? '1px solid #ef4444' : '1px solid #3b82f6'
                            }}>
                              {seg.transit_type}
                            </span>
                            <strong style={{ color: "var(--text-main)", fontSize: "1.1rem" }}>
                              {seg.route_long_name || seg.route_name || `Route ${seg.route_short_name || seg.route_id}`}
                            </strong>
                          </div>

                          <div style={{ padding: "1.5rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--cyber-border)", borderRadius: "8px", borderLeft: "4px solid rgba(16, 185, 129, 0.6)", fontSize: "0.95rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "0.75rem", color: "var(--text-secondary)" }}>
                              <span>
                                Board Stop: <strong style={{ color: "var(--text-main)" }}>{seg.board_stop?.stop_name}</strong>
                              </span>
                              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                Walk to stop: {Math.round(seg.board_stop?.distance_m)}m
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", color: "var(--text-secondary)" }}>
                              <span>
                                Alight Stop: <strong style={{ color: "var(--text-main)" }}>{seg.alight_stop?.stop_name}</strong>
                              </span>
                              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                Walk to dest: {Math.round(leg.walk_to_target_m)}m
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FALLBACK FOR NO ROUTES */}
        {!loading && (!transitRecommendations || transitRecommendations.length === 0) && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6rem 0", gap: "1rem", background: "rgba(255,255,255,0.01)", border: "1px dashed var(--cyber-border)", borderRadius: "12px" }}>
            <Compass size={48} style={{ color: "var(--cyber-yellow)" }} />
            <h3 style={{ fontSize: "1.3rem", fontWeight: "bold", color: "var(--text-main)" }}>NO TRANSIT ROUTES FOUND</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", textAlign: "center", maxWidth: "450px" }}>
              There are no available GTFS static routes linking these locations within walking range.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default function TransitSuggestionsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#000", color: "var(--cyber-green)" }}>
        <Loader2 className="animate-spin-custom" size={48} />
      </div>
    }>
      <TransitSuggestionsContent />
    </Suspense>
  );
}
