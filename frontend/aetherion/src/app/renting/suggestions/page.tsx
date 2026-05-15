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

const aiIcons = [Cpu, Network, BrainCircuit, Database, Fingerprint, Sparkles];

export default function RentingSuggestion() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any[] | null>(null);
  const [mounted, setMounted] = useState(false);
  const [floatingIcons, setFloatingIcons] = useState<any[]>([]);
  const [journey, setJourney] = useState("");
  const [startPos, setStartPos] = useState("");
  const [endPos, setEndPos] = useState("");
  const [matchProgress, setMatchProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  const statusMessages =
    language === "vi"
      ? [
          "ĐANG KHỞI TẠO LIÊN KẾT THẦN KINH...",
          "TRUY CẬP CƠ SỞ KIẾN THỨC RAG...",
          "TRUY XUẤT VECTƠ VẬN TẢI...",
          "PHÂN TÍCH RÀNG BUỘC NGỮ CẢNH...",
          "ĐANG TẠO LẬP LÝ LUẬN GEMINI...",
          "ĐANG HOÀN TẤT GỢI Ý...",
        ]
      : [
          "INITIALIZING NEURAL UPLINK...",
          "ACCESSING RAG KNOWLEDGE BASE...",
          "RETRIEVING TRANSPORT VECTORS...",
          "ANALYZING CONTEXTUAL CONSTRAINTS...",
          "GENERATING GEMINI REASONING...",
          "FINALIZING RECOMMENDATIONS...",
        ];

  const [userId] = useState(() =>
    typeof window !== "undefined"
      ? `user_${Math.random().toString(36).substring(7)}`
      : "",
  );

  useEffect(() => {
    if (!userId) return;
    const nginxUrl = process.env.NEXT_PUBLIC_NGINX_URL || "http://localhost";
    const wsUrl = nginxUrl.replace(/^http/, "ws") + `/ws?userId=${userId}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket Received:", data);
        if (data.result) {
          let parsed = [];
          try {
            parsed = JSON.parse(data.result);
          } catch (pe) {
            console.error("Could not parse result json from LLM", pe);
          }
          if (Array.isArray(parsed)) {
            parsed.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            setResult(parsed);
          } else {
            setResult([]);
          }
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
    if (!journey.trim()) return;
    setLoading(true);
    setResult(null);
    setMatchProgress(0);

    const progressInterval = setInterval(() => {
      setMatchProgress((prev) => {
        if (prev >= 98) {
          clearInterval(progressInterval);
          return 98;
        }
        const increment = prev < 60 ? 4 : prev < 85 ? 1 : 0.2;
        return Math.min(prev + increment, 98);
      });
    }, 200);

    const statusInterval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 1000);

    const nginxUrl = process.env.NEXT_PUBLIC_NGINX_URL || "http://localhost";

    try {
      let startLocation: any = null;
      let destinationLocation: any = null;

      // Fetch both location contexts in parallel to slash overall response latency in half
      const fetchTasks = [];

      if (startPos.trim()) {
        fetchTasks.push(
          fetch(`${nginxUrl}/api/v1/location/${encodeURIComponent(startPos)}`)
            .then(res => res.json())
            .then(data => {
              if (data.status === "success" && data.data) {
                startLocation = data.data;
              }
            })
            .catch(e => console.error("Error fetching location from backend for startPos:", e))
        );
      }

      if (endPos.trim()) {
        fetchTasks.push(
          fetch(`${nginxUrl}/api/v1/location/${encodeURIComponent(endPos)}`)
            .then(res => res.json())
            .then(data => {
              if (data.status === "success" && data.data) {
                destinationLocation = data.data;
              }
            })
            .catch(e => console.error("Error fetching location from backend for endPos:", e))
        );
      }

      // Execute parallel fetches synchronously
      if (fetchTasks.length > 0) {
        await Promise.all(fetchTasks);
      }

      // 3. Formulate a complete composite query to retain human-readable context for logs & models
      const combinedQueryPayload = {
        journey: journey,
        start: startLocation ? { name: startPos, address: startLocation.full_address, coords: startLocation.coordinates } : { name: startPos },
        destination: destinationLocation ? { name: endPos, address: destinationLocation.full_address, coords: destinationLocation.coordinates } : { name: endPos }
      };

      // 4. Directly send both resolved location query into api_calling to publish to task-enrichment Pub/Sub
      await fetch(`${nginxUrl}/api/v1/jobs/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          query: JSON.stringify(combinedQueryPayload),
          jobType: "vehicle_suggestion",
          destination: destinationLocation
        })
      });
    } catch (e) {
      console.error(e);
      setLoading(false);
      clearInterval(progressInterval);
      clearInterval(statusInterval);
    }
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
        
        .reveal-text { opacity: 0; animation: reveal-up 1s forwards; }
        @keyframes reveal-up { to { opacity: 1; transform: translateY(0); filter: blur(0); } }
        
        .scanning-card::after { content: ""; position: absolute; left: 0; width: 100%; height: 3px; background: var(--cyber-blue); box-shadow: 0 0 20px var(--cyber-blue); animation: scan-line 2s linear infinite; z-index: 5; }
        
        @keyframes cyber-pulse {
          0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(251, 191, 36, 0); }
          100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
        }
        .btn-ready { animation: cyber-pulse 2s infinite; }
        .btn-loading { background: var(--cyber-blue) !important; color: #000 !important; box-shadow: 0 0 30px var(--cyber-blue); }
        .btn-disabled { opacity: 0.5; cursor: not-allowed !important; filter: grayscale(100%); }
        
        @keyframes spin-custom {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-custom { animation: spin-custom 1s linear infinite; }
        
        @keyframes progress-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .progress-bar-fill {
          background: linear-gradient(90deg, var(--cyber-blue), var(--cyber-green), var(--cyber-blue));
          background-size: 200% 100%;
          animation: progress-shimmer 2s infinite linear;
        }
        
        .input-group label { display: block; font-family: var(--font-mono); font-size: 1rem; letter-spacing: 1px; color: var(--cyber-yellow); margin-bottom: 0.75rem; font-weight: bold; text-transform: uppercase; text-shadow: 0 0 10px rgba(251, 191, 36, 0.3); }
        .cyber-input { width: 100%; padding: 1.4rem 1.6rem; background: var(--cyber-input-bg); border: 1px solid var(--cyber-border); color: var(--text-main); border-radius: 12px; font-size: 1.4rem; outline: none; transition: all 0.3s ease; }
        .cyber-input:focus { border-color: var(--cyber-blue); box-shadow: 0 0 15px rgba(52, 229, 235, 0.2); }
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
          maxWidth: "1200px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}
      >
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
              className="inline-flex items-center gap-3 mb-4 ai-concierge-badge"
              style={{
                padding: "0.75rem 2rem",
                background: "var(--ai-badge-bg)",
                border: "1px solid var(--ai-badge-border)",
                borderRadius: "50px",
              }}
            >
              <BrainCircuit size={28} color="var(--ai-badge-color)" />
              <span
                className="font-header text-xl font-bold"
                style={{ color: "var(--ai-badge-color)" }}
              >
                {t("renting.aiConcierge" as any)}
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
            {t("renting.titleLine1" as any)}
            <br />
            {t("renting.titleLine2" as any)}
          </h1>

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
            {t("renting.subtitle" as any)}
          </p>

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
                label: "RAG-VECTOR ACTIVE",
                color: "var(--cyber-blue)",
              },
              {
                icon: ShieldCheck,
                label: t("renting.badge2" as any),
                color: "var(--cyber-green)",
              },
              {
                icon: Zap,
                label: t("renting.badge3" as any),
                color: "var(--cyber-yellow)",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="status-chip"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: "var(--cyber-card-bg)",
                  border: `1px solid ${item.color}60`,
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
              padding: "3rem",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              className="module-label mb-6"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.9rem",
                color: "var(--cyber-blue)",
              }}
            >
              <MapPin size={16} /> {t("renting.describeJourney" as any)}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "2rem",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "2rem",
                }}
              >
                <div className="input-group">
                  <label>{t("renting.startOrigin" as any)}</label>
                  <div style={{ position: "relative" }}>
                    <MapPin
                      size={18}
                      style={{
                        position: "absolute",
                        left: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--cyber-blue)",
                      }}
                    />
                    <input
                      className="cyber-input"
                      style={{ paddingLeft: "3rem" }}
                      placeholder={t("renting.placeholderOrigin" as any)}
                      value={startPos}
                      onChange={(e) => setStartPos(e.target.value)}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>{t("renting.finalDestination" as any)}</label>
                  <div style={{ position: "relative" }}>
                    <TrendingUp
                      size={18}
                      style={{
                        position: "absolute",
                        left: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--cyber-yellow)",
                      }}
                    />
                    <input
                      className="cyber-input"
                      style={{ paddingLeft: "3rem" }}
                      placeholder={t("renting.placeholderDestination" as any)}
                      value={endPos}
                      onChange={(e) => setEndPos(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label>{t("renting.journeyNarrative" as any)}</label>
                <div style={{ position: "relative" }}>
                  <Sparkles
                    size={18}
                    style={{
                      position: "absolute",
                      left: "1rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--cyber-green)",
                    }}
                  />
                  <input
                    className="cyber-input"
                    style={{ paddingLeft: "3rem" }}
                    placeholder={t("renting.inputPlaceholder" as any)}
                    value={journey}
                    onChange={(e) => setJourney(e.target.value)}
                  />
                </div>
              </div>

              <button
                className={`cyber-button ${!journey.trim() ? "btn-disabled" : loading ? "btn-loading" : "btn-ready"}`}
                onClick={handleSearch}
                disabled={loading || !journey.trim()}
                style={{
                  padding: "1.5rem 3rem",
                  fontSize: "1.2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "15px",
                  marginTop: "1rem",
                  position: "relative",
                  overflow: "hidden",
                  minHeight: "80px",
                }}
              >
                {loading ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <Loader2
                        className="animate-spin-custom"
                        size={28}
                        strokeWidth={3}
                      />
                      <span className="font-bold tracking-widest text-xl">
                        {t("renting.btnProcessing" as any)}...
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        opacity: 0.8,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {statusMessages[statusIndex]}
                    </span>
                  </div>
                ) : (
                  <>
                    <Cpu
                      size={26}
                      className={journey.trim() ? "text-slate-900" : ""}
                    />
                    <span className="font-bold">
                      {t("renting.btnAnalyze" as any)}
                    </span>
                  </>
                )}
              </button>

              {loading && (
                <div style={{ marginTop: "2rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--cyber-blue)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontWeight: "bold",
                      }}
                    >
                      <Activity size={16} className="animate-pulse" />
                      {t("renting.neuralProcessing" as any)}
                    </span>
                    <span
                      style={{
                        color: "var(--cyber-yellow)",
                        fontWeight: "bold",
                      }}
                    >
                      {Math.floor(matchProgress)}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: "8px",
                      background: "var(--cyber-card-bg)",
                      borderRadius: "4px",
                      overflow: "hidden",
                      border: "1px solid rgba(52,229,235,0.1)",
                    }}
                  >
                    <div
                      className="progress-bar-fill"
                      style={{
                        height: "100%",
                        width: `${matchProgress}%`,
                        transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: "0 0 15px var(--cyber-blue)",
                      }}
                    />
                  </div>
                  <p
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                      marginTop: "1rem",
                      fontStyle: "italic",
                    }}
                  >
                    {t("renting.aiNote" as any)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RESULT SECTION */}
        {result && !loading && (
          <div
            className="reveal-text"
            style={{
              marginTop: "4rem",
              animationDelay: "0s",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "2.5rem",
            }}
          >
            {result.map((item, idx) => (
              <div
                key={idx}
                className="edgerunner-card"
                style={{
                  border: "1px solid var(--cyber-border)",
                  padding: "0",
                  overflow: "hidden",
                  background: "var(--cyber-surface-glass)",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  cursor: "pointer",
                  position: "relative",
                  borderTop: "3px solid var(--cyber-blue)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-10px)";
                  e.currentTarget.style.boxShadow =
                    "0 15px 40px rgba(52,229,235,0.15)";
                  e.currentTarget.style.borderColor = "var(--cyber-blue)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "var(--cyber-border)";
                }}
              >
                {/* Image Header Section */}
                <div
                  style={{
                    height: "200px",
                    position: "relative",
                    background: "#000",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0.4,
                      backgroundImage: `url(/transports/${item.type?.toLowerCase()}.png)`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      filter: "blur(8px)",
                    }}
                  />
                  <img
                    src={`/transports/${item.type?.toLowerCase()}.png`}
                    alt={item.type}
                    style={{
                      zIndex: 2,
                      maxHeight: "140px",
                      objectFit: "contain",
                      filter: "drop-shadow(0 0 20px rgba(52,229,235,0.4))",
                    }}
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/200x200/0f172a/34e5eb?text=VEHICLE";
                    }}
                  />
                  {/* Match Percentage Overlay */}
                  <div
                    style={{
                      position: "absolute",
                      top: "1rem",
                      right: "1rem",
                      background: "var(--cyber-surface-glass)",
                      backdropFilter: "blur(8px)",
                      padding: "0.5rem 0.8rem",
                      borderRadius: "4px",
                      border: "1px solid var(--cyber-green)",
                      zIndex: 3,
                    }}
                  >
                    <span
                      style={{
                        color: "var(--cyber-green)",
                        fontWeight: "bold",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {item.rating}%
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div style={{ padding: "2rem" }}>
                  <div
                    style={{
                      textTransform: "uppercase",
                      fontFamily: "var(--font-mono)",
                      color: "var(--cyber-yellow)",
                      fontSize: "0.8rem",
                      letterSpacing: "2px",
                      marginBottom: "0.5rem",
                    }}
                  >
                    TRANSIT MODULE
                  </div>
                  <h2
                    style={{
                      fontSize: "2rem",
                      color: "var(--text-main)",
                      fontWeight: "900",
                      marginBottom: "1.5rem",
                      textTransform: "capitalize",
                    }}
                  >
                    {item.type}
                  </h2>

                  <div
                    style={{
                      padding: "1.5rem",
                      background: "var(--cyber-card-bg)",
                      borderRadius: "8px",
                      borderLeft: "3px solid var(--cyber-blue)",
                      minHeight: "150px",
                    }}
                  >
                    <h3
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "0.9rem",
                        color: "var(--cyber-blue)",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <BrainCircuit size={16} /> AI LOGIC ANALYSIS
                    </h3>
                    <p
                      style={{
                        color: "#cbd5e1",
                        lineHeight: "1.6",
                        fontSize: "0.95rem",
                      }}
                    >
                      {item.explanation}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
