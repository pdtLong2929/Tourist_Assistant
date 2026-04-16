"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Scan, ShieldCheck, UserPlus, LogIn } from "lucide-react";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Kích hoạt hiệu ứng boot-up
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      const mockUser = { name: "Agent_V" };
      localStorage.setItem("cyber_user", JSON.stringify(mockUser));
      router.push("/");
      setTimeout(() => window.location.reload(), 100);
    }, 1500);
  };

  if (!mounted) return null;

  const SocialButtons = () => (
    <div style={{ marginTop: "2rem", width: "100%" }}>
      <div style={{ position: "relative", marginBottom: "1.5rem", display: "flex", alignItems: "center" }}>
        <div style={{ flex: 1, borderTop: "1px solid var(--cyber-border)", opacity: 0.5 }}></div>
        <span style={{ padding: "0 1.5rem", fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", background: "transparent" }}>
          OR CONTINUE WITH
        </span>
        <div style={{ flex: 1, borderTop: "1px solid var(--cyber-border)", opacity: 0.5 }}></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <button
          className="social-btn"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
            padding: "0.9rem", borderRadius: "8px", border: "1px solid rgba(52, 229, 235, 0.3)",
            background: "rgba(15, 23, 42, 0.6)", color: "var(--text-main)", cursor: "pointer",
            fontSize: "1.1rem", fontWeight: "600", transition: "all 0.3s ease"
          }}
        >
          <svg style={{ width: "1.2rem", height: "1.2rem" }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </button>
        <button
          className="social-btn"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
            padding: "0.9rem", borderRadius: "8px", border: "1px solid rgba(167, 139, 250, 0.3)",
            background: "rgba(15, 23, 42, 0.6)", color: "var(--text-main)", cursor: "pointer",
            fontSize: "1.1rem", fontWeight: "600", transition: "all 0.3s ease"
          }}
        >
          <svg style={{ width: "1.2rem", height: "1.2rem" }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </button>
      </div>
    </div>
  );

  return (
    <main
      style={{
        height: "calc(100vh - 72px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        position: "relative",
        overflow: "hidden",
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

            /* COMPONENT STYLES */
            .social-btn:hover {
              background: rgba(255, 255, 255, 0.1) !important;
              box-shadow: 0 0 20px rgba(52, 229, 235, 0.2);
              transform: translateY(-2px);
            }

            .cyber-input {
              width: 100%;
              padding: 1.25rem 1.5rem;
              font-size: 1.05rem;
              border-radius: 8px;
              border: 1px solid rgba(251, 191, 36, 0.2);
              background: rgba(15, 23, 42, 0.7);
              color: white;
              outline: none;
              transition: all 0.3s ease;
              box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
            }
            .cyber-input:focus {
              border-color: var(--cyber-yellow);
              box-shadow: 0 0 15px rgba(251, 191, 36, 0.3), inset 0 0 10px rgba(0,0,0,0.5);
              background: rgba(15, 23, 42, 0.9);
            }

            .slider-gradient {
              background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%);
              border-left: 2px solid var(--cyber-blue);
              border-right: 2px solid var(--cyber-blue);
              box-shadow: 0 0 40px rgba(52, 229, 235, 0.3);
            }
          `,
        }}
      />

      {/* =========================================
          BACKGROUND 3D GRID & SCANNER
          ========================================= */}
      <div className="map-fade-in" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {/* Sky / deep gradient */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)", opacity: 0.95 }} />

        {/* Global Laser Scan Line */}
        <div style={{ position: "absolute", left: 0, right: 0, height: "4px", background: "var(--cyber-blue)", boxShadow: "0 0 20px 5px var(--cyber-blue-glow)", animation: "scanning-laser 6s linear infinite", zIndex: 5, pointerEvents: "none" }} />

        {/* Animated 3D Grid */}
        <div style={{ position: "absolute", inset: "-50%", backgroundImage: "linear-gradient(rgba(52, 229, 235, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(52, 229, 235, 0.1) 1px, transparent 1px)", backgroundSize: "80px 80px", animation: "grid-pan 4s linear infinite", transform: "perspective(1000px) rotateX(65deg) scale(1.2)", transformOrigin: "center top", zIndex: 1, pointerEvents: "none" }} />

        {/* Ambient Glows */}
        <div style={{ position: "absolute", top: "25%", left: "-5rem", width: "30rem", height: "30rem", borderRadius: "50%", opacity: 0.2, filter: "blur(80px)", background: "radial-gradient(circle, var(--cyber-blue) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "-5rem", width: "30rem", height: "30rem", borderRadius: "50%", opacity: 0.2, filter: "blur(80px)", background: "radial-gradient(circle, var(--cyber-purple) 0%, transparent 70%)" }} />
      </div>

      {/* =========================================
          AUTHENTICATION CARD SUITE
          ========================================= */}
      <div
        className="card-drop-in"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "1050px",
          height: "750px", // Reduced height for smoother fit, original was 850px
          borderRadius: "1rem",
          overflow: "hidden",
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(52, 229, 235, 0.3)",
          boxShadow: "0 0 60px rgba(0, 0, 0, 0.8)",
          display: "flex",
        }}
      >
        {/* Top Edge Highlight Line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", zIndex: 30, background: "linear-gradient(90deg, var(--cyber-blue), var(--cyber-yellow), var(--cyber-purple))" }} />

        {/* --- FORM 1 : REGISTRATION --- */}
        <div
          style={{
            position: "absolute", top: 0, left: 0, width: "50%", height: "100%",
            display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
            padding: "0 3.5rem", transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            opacity: isSignUp ? 1 : 0,
            transform: isSignUp ? "translateY(0)" : "translateY(20px)",
            zIndex: isSignUp ? 10 : -1,
            pointerEvents: isSignUp ? "auto" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "2rem" }}>
            <Fingerprint size={45} color="var(--cyber-purple)" />
            <h2 className="glitch-yellow" style={{ fontSize: "2.8rem", margin: 0, color: "var(--cyber-purple)", textShadow: "0 0 20px rgba(167, 139, 250, 0.5)" }}>
              REGISTER
            </h2>
          </div>
          
          <form style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.2rem" }} onSubmit={handleAuth}>
            <input type="text" placeholder="Username" className="cyber-input" required />
            <input type="email" placeholder="Email" className="cyber-input" required />
            <input type="password" placeholder="Password" className="cyber-input" required />
            
            <button
              type="submit"
              className="cyber-button"
              disabled={isLoading}
              style={{
                marginTop: "0.5rem", padding: "1.25rem", background: "var(--cyber-purple)", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                boxShadow: "0 0 20px rgba(167, 139, 250, 0.3)"
              }}
            >
              {isLoading ? <Scan className="animate-spin" /> : <UserPlus />}
              {isLoading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            </button>
          </form>
          <SocialButtons />
        </div>

        {/* --- FORM 2 : LOGIN --- */}
        <div
          style={{
            position: "absolute", top: 0, right: 0, width: "50%", height: "100%",
            display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
            padding: "0 3.5rem", transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            opacity: isSignUp ? 0 : 1,
            transform: isSignUp ? "translateY(20px)" : "translateY(0)",
            zIndex: isSignUp ? -1 : 10,
            pointerEvents: isSignUp ? "none" : "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "2rem" }}>
            <ShieldCheck size={45} color="var(--cyber-blue)" />
            <h2 className="glitch-yellow" style={{ fontSize: "2.8rem", margin: 0, color: "var(--cyber-blue)", textShadow: "0 0 20px rgba(52, 229, 235, 0.5)" }}>
              LOGIN
            </h2>
          </div>

          <form style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.2rem" }} onSubmit={handleAuth}>
            <input type="text" placeholder="Username" className="cyber-input" required />
            <input type="password" placeholder="Password" className="cyber-input" required />
            
            <button
              type="submit"
              className="cyber-button"
              disabled={isLoading}
              style={{
                marginTop: "0.5rem", padding: "1.25rem", background: "var(--cyber-blue)", color: "var(--cyber-black)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                boxShadow: "0 0 20px rgba(52, 229, 235, 0.4)"
              }}
            >
              {isLoading ? <Scan className="animate-spin" /> : <LogIn />}
              {isLoading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>
          <SocialButtons />
        </div>

        {/* --- DYNAMIC OVERLAY SLIDER --- */}
        <div
          className="slider-gradient"
          style={{
            position: "absolute", top: 0, left: 0, width: "50%", height: "100%", zIndex: 20,
            transition: "all 0.8s cubic-bezier(0.25, 1, 0.35, 1)", // Premium liding ease
            transform: isSignUp ? "translateX(100%)" : "translateX(0)",
          }}
        >
          {/* Noise / Pattern overlay inside slider */}
          <div style={{ position: "absolute", inset: 0, background: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.05%22/%3E%3C/svg%3E')", pointerEvents: "none" }} />
          
          {/* Welcome Back (Shown when Login is hidden / Slider is on Right) */}
          <div
            style={{
              position: "absolute", width: "100%", height: "100%",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "3rem", textAlign: "center",
              transition: "opacity 0.5s ease-in-out, transform 0.5s ease-in-out",
              opacity: isSignUp ? 1 : 0,
              transform: isSignUp ? "scale(1)" : "scale(0.95)",
              pointerEvents: isSignUp ? "auto" : "none",
            }}
          >
            <h2 className="glitch-yellow" style={{ fontSize: "3.2rem", color: "white", marginBottom: "1rem" }}>
              Welcome Back!
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2.5rem", fontSize: "1.3rem", fontWeight: "500", lineHeight: 1.6 }}>
              Already registered in the network?<br />Access your data center now.
            </p>
            <button
              onClick={() => setIsSignUp(false)}
              style={{
                padding: "1.2rem 4rem", fontSize: "1.05rem", borderRadius: "50px", border: "2px solid var(--cyber-blue)",
                background: "rgba(52, 229, 235, 0.1)", color: "white", fontWeight: "bold",
                cursor: "pointer", transition: "all 0.3s ease", letterSpacing: "2px",
                boxShadow: "0 0 20px rgba(52, 229, 235, 0.2)"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--cyber-blue)"; e.currentTarget.style.color = "var(--cyber-black)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(52, 229, 235, 0.1)"; e.currentTarget.style.color = "white"; }}
            >
              SWITCH TO LOGIN
            </button>
          </div>

          {/* Join Us (Shown when Register is hidden / Slider is on Left) */}
          <div
            style={{
              position: "absolute", width: "100%", height: "100%",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "3rem", textAlign: "center",
              transition: "opacity 0.5s ease-in-out, transform 0.5s ease-in-out",
              opacity: isSignUp ? 0 : 1,
              transform: isSignUp ? "scale(0.95)" : "scale(1)",
              pointerEvents: isSignUp ? "none" : "auto",
            }}
          >
            <h2 className="glitch-yellow" style={{ fontSize: "3.2rem", color: "white", marginBottom: "1rem" }}>
              Hello Traveler!
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2.5rem", fontSize: "1.3rem", fontWeight: "500", lineHeight: 1.6 }}>
              New to the ecosystem?<br />Create a profile to unlock premium routes.
            </p>
            <button
              onClick={() => setIsSignUp(true)}
              style={{
                padding: "1.2rem 4rem", fontSize: "1.05rem", borderRadius: "50px", border: "2px solid var(--cyber-purple)",
                background: "rgba(167, 139, 250, 0.1)", color: "white", fontWeight: "bold",
                cursor: "pointer", transition: "all 0.3s ease", letterSpacing: "2px",
                boxShadow: "0 0 20px rgba(167, 139, 250, 0.2)"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--cyber-purple)"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(167, 139, 250, 0.1)"; e.currentTarget.style.color = "white"; }}
            >
              SWITCH TO REGISTER
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
