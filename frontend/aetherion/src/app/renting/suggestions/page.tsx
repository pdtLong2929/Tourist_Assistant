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

const aiIcons = [Cpu, Network, BrainCircuit, Database, Fingerprint, Sparkles];

export default function RentingSuggestion() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any[] | null>(null);
  const [mounted, setMounted] = useState(false);
  const [floatingIcons, setFloatingIcons] = useState<any[]>([]);
  const [journey, setJourney] = useState("");
  const [startPos, setStartPos] = useState("");
  const [endPos, setEndPos] = useState("");
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
          let parsed = [];
          try {
             parsed = JSON.parse(data.result);
          } catch (pe) {
             console.error("Could not parse result json from LLM", pe);
          }
          setResult(Array.isArray(parsed) ? parsed : []);
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
      setMatchProgress((prev) =>
        prev >= 95 ? (clearInterval(progressInterval), 95) : prev + 5,
      );
    }, 100);

    const nginxUrl = process.env.NEXT_PUBLIC_NGINX_URL || 'http://localhost';

    try {
      let startLocation = null;
      let destinationLocation = null;

      // 1. Reuse API Calling backend by querying the /location/:name endpoint for Origin
      if (startPos.trim()) {
        try {
          const res = await fetch(`${nginxUrl}/api/v1/location/${encodeURIComponent(startPos)}`);
          const data = await res.json();
          if (data.status === "success" && data.data) {
            startLocation = data.data;
          }
        } catch (e) {
          console.error("Error fetching location from backend for startPos:", e);
        }
      }

      // 2. Reuse API Calling backend by querying the /location/:name endpoint for Destination
      if (endPos.trim()) {
        try {
          const res = await fetch(`${nginxUrl}/api/v1/location/${encodeURIComponent(endPos)}`);
          const data = await res.json();
          if (data.status === "success" && data.data) {
            destinationLocation = data.data;
          }
        } catch (e) {
          console.error("Error fetching location from backend for endPos:", e);
        }
      }

      // 3. Formulate a complete composite query to retain human-readable context for logs & models
      const combinedQueryPayload = {
        journey: journey,
        start: startLocation ? { name: startPos, address: startLocation.full_address, coords: startLocation.coordinates } : { name: startPos },
        destination: destinationLocation ? { name: endPos, address: destinationLocation.full_address, coords: destinationLocation.coordinates } : { name: endPos }
      };

      // 4. Directly send both resolved location query into api_calling to publish to task-enrichment Pub/Sub
      await fetch(`${nginxUrl}/api/v1/jobs/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        .btn-disabled { opacity: 0.5; cursor: not-allowed !important; filter: grayscale(100%); }
        
        .input-group label { display: block; font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 0.5rem; font-weight: bold; text-transform: uppercase; }
        .cyber-input { width: 100%; padding: 1.2rem 1.5rem; background: rgba(15,23,42,0.8); border: 1px solid var(--cyber-border); color: var(--text-main); borderRadius: 12px; fontSize: 1rem; outline: none; transition: all 0.3s ease; }
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
            INTELLIGENT TRANSIT
            <br />
            RECOMMENDER
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
            Neural routing network dynamically evaluating all logistics via contextual data.
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
                label: "GLOBAL POSITIONING",
                color: "var(--cyber-green)",
              },
              {
                icon: Zap,
                label: "REAL-TIME SYNC",
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
                color: 'var(--cyber-blue)'
              }}
            >
              <MapPin size={16} /> ROUTE CONFIGURATION SYSTEM
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div className="input-group">
                   <label>Starting Origin</label>
                   <div style={{ position: 'relative' }}>
                     <MapPin size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--cyber-blue)' }}/>
                     <input 
                       className="cyber-input"
                       style={{ paddingLeft: '3rem' }}
                       placeholder="Enter start coordinates or node..."
                       value={startPos}
                       onChange={e => setStartPos(e.target.value)}
                     />
                   </div>
                </div>

                <div className="input-group">
                   <label>Final Destination</label>
                   <div style={{ position: 'relative' }}>
                     <TrendingUp size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--cyber-yellow)' }}/>
                     <input 
                       className="cyber-input"
                       style={{ paddingLeft: '3rem' }}
                       placeholder="Enter target destination..."
                       value={endPos}
                       onChange={e => setEndPos(e.target.value)}
                     />
                   </div>
                </div>
              </div>

              <div className="input-group">
                 <label>Journey Narrative & Conditions</label>
                 <div style={{ position: 'relative' }}>
                   <Sparkles size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--cyber-green)' }}/>
                   <input 
                     className="cyber-input"
                     style={{ paddingLeft: '3rem' }}
                     placeholder="e.g. Traveling with luggage in light rain, need maximum luxury..."
                     value={journey}
                     onChange={e => setJourney(e.target.value)}
                   />
                 </div>
              </div>

              <button
                className={`cyber-button ${!journey.trim() || loading ? "btn-disabled" : "btn-ready"}`}
                onClick={handleSearch}
                disabled={loading || !journey.trim()}
                style={{
                  padding: "1.5rem 3rem",
                  fontSize: "1.2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  marginTop: '1rem'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>CALCULATING ROUTES</span>
                  </>
                ) : (
                  <>
                    <Cpu size={22} className={journey.trim() ? "text-slate-900" : ""} />
                    <span>GENERATE RECOMMENDATIONS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RENDER 3 BOXES RESULT GRID */}
        {result && !loading && (
          <div
            className="reveal-text"
            style={{ 
              marginTop: "4rem", 
              animationDelay: "0s",
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2.5rem'
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
                  background: "linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.8) 100%)",
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  borderTop: '3px solid var(--cyber-blue)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px)';
                  e.currentTarget.style.boxShadow = '0 15px 40px rgba(52,229,235,0.15)';
                  e.currentTarget.style.borderColor = 'var(--cyber-blue)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'var(--cyber-border)';
                }}
              >
                {/* Image Header Section */}
                <div style={{ 
                  height: '200px', 
                  position: 'relative', 
                  background: '#000',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    opacity: 0.4,
                    backgroundImage: `url(/transports/${item.type?.toLowerCase()}.png)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(8px)'
                  }} />
                  <img 
                    src={`/transports/${item.type?.toLowerCase()}.png`} 
                    alt={item.type}
                    style={{
                      zIndex: 2,
                      maxHeight: '140px',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 0 20px rgba(52,229,235,0.4))'
                    }}
                    onError={(e) => {
                      // Fallback in case the png path is broken
                      e.currentTarget.src = "https://via.placeholder.com/200x200/0f172a/34e5eb?text=VEHICLE";
                    }}
                  />
                  {/* Match Percentage Overlay */}
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'rgba(0,0,0,0.8)',
                    padding: '0.5rem 0.8rem',
                    borderRadius: '4px',
                    border: '1px solid var(--cyber-green)',
                    zIndex: 3
                  }}>
                    <span style={{ color: 'var(--cyber-green)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                      {item.rating}%
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div style={{ padding: '2rem' }}>
                  <div style={{ 
                    textTransform: 'uppercase', 
                    fontFamily: 'var(--font-mono)', 
                    color: 'var(--cyber-yellow)', 
                    fontSize: '0.8rem',
                    letterSpacing: '2px',
                    marginBottom: '0.5rem'
                  }}>
                    TRANSIT MODULE
                  </div>
                  <h2 style={{ 
                    fontSize: '2rem', 
                    color: '#fff', 
                    fontWeight: '900', 
                    marginBottom: '1.5rem',
                    textTransform: 'capitalize'
                  }}>
                    {item.type}
                  </h2>

                  <div style={{ 
                    padding: '1.5rem', 
                    background: 'rgba(0,0,0,0.3)', 
                    borderRadius: '8px',
                    borderLeft: '3px solid var(--cyber-blue)',
                    minHeight: '150px'
                  }}>
                     <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--cyber-blue)', marginBottom: '0.75rem' }}>
                       <BrainCircuit size={16}/> AI LOGIC ANALYSIS
                     </h3>
                     <p style={{ color: '#cbd5e1', lineHeight: '1.6', fontSize: '0.95rem' }}>
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
