"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserCircle,
  LogOut,
  Shield,
  Mail,
  Cpu,
  CheckCircle,
  Phone,
  MapPin,
  Car,
  Bike,
  Settings,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface CyberUser {
  id: string | number;
  email: string;
  name: string;
  phone?: string;
  preferencesData?: {
    nickname?: string;
    phone?: string | null;
    locations?: string[];
    cars?: string[];
    motorbikes?: string[];
    skipped?: boolean;
  };
}

const LOCATION_ICONS: Record<string, string> = {
  market: "🏪",
  food: "🍜",
  price: "💰",
  guide: "🧭",
  service: "⭐",
  staff: "🤝",
  park: "🌳",
  space: "🏟️",
  view: "🌅",
  quality: "🏅",
  temple: "⛩️",
  air: "💨",
  trees: "🌿",
  church: "⛪",
  shop: "🛍️",
  mall: "🏬",
  floor: "🏢",
  atmosphere: "✨",
  city: "🌆",
  attitude: "😊",
  culture: "🎭",
  location: "📍",
  markets: "🛒",
  life: "🎶",
  clothes: "👗",
  store: "🏪",
  scenery: "🏞️",
  goods: "📦",
  tea: "🍵",
  fun: "🎉",
};

export default function ProfilePage() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<CyberUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutMessage, setLogoutMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const fetchProfile = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const nginxUrl = process.env.NEXT_PUBLIC_NGINX_URL || "http://localhost";
        const response = await fetch(`${nginxUrl}/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Failed to fetch user profile", err);
        // Fallback to localStorage if offline
        const storedUser = localStorage.getItem("cyber_user");
        if (storedUser) {
          try {
            const userObj = JSON.parse(storedUser);
            const nickname = localStorage.getItem("cyber_user_nickname");
            const phone = localStorage.getItem("cyber_user_phone");
            if (nickname) userObj.name = nickname;
            if (phone) userObj.phone = phone;
            setUser(userObj);
          } catch (e) {}
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleLogout = () => {
    setLogoutMessage(t("profile.loggingOut" as any) || "SIGNING OUT...");

    setTimeout(() => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("cyber_user");
      localStorage.removeItem("cyber_user_nickname");
      localStorage.removeItem("cyber_user_phone");
      window.dispatchEvent(new Event("userAuthChanged"));
      router.push("/");
    }, 1000);
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <main
        style={{
          minHeight: "calc(100vh - 72px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--cyber-black)",
        }}
      >
        <Cpu className="animate-pulse" size={60} color="var(--cyber-blue)" />
      </main>
    );
  }

  if (!user) return null;

  const hasPreferences = user.preferencesData && 
    !user.preferencesData.skipped &&
    (
      (user.preferencesData.locations && user.preferencesData.locations.length > 0) ||
      (user.preferencesData.cars && user.preferencesData.cars.length > 0) ||
      (user.preferencesData.motorbikes && user.preferencesData.motorbikes.length > 0)
    );

  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        position: "relative",
        overflowX: "hidden",
        background: "var(--cyber-black)",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .profile-fade-in {
              animation: profile-reveal 1s ease-out forwards;
              opacity: 0;
            }
            @keyframes profile-reveal { to { opacity: 1; } }

            .card-drop-in {
              animation: drop-bounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
              opacity: 0;
              transform: translateY(-30px) scale(0.98);
            }
            @keyframes drop-bounce {
              to { opacity: 1; transform: translateY(0) scale(1); }
            }

            @keyframes center-drop-bounce {
              from { opacity: 0; transform: translate(-50%, -60%) scale(0.95); }
              to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
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

            .info-row {
              display: flex;
              align-items: center;
              gap: 1rem;
              padding: 1rem;
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 8px;
              margin-bottom: 1rem;
              transition: all 0.3s ease;
            }

            .info-row:hover {
              border-color: rgba(52, 229, 235, 0.3);
              background: rgba(52, 229, 235, 0.05);
              transform: translateX(5px);
            }

            .pref-tag {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 8px 16px;
              border-radius: 50px;
              background: rgba(255, 255, 255, 0.04);
              border: 1px solid rgba(255, 255, 255, 0.08);
              color: var(--text-main);
              font-size: 0.9rem;
              font-family: var(--font-mono);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .pref-tag:hover {
              transform: translateY(-3px);
              background: rgba(52, 229, 235, 0.08);
              border-color: var(--cyber-blue);
              box-shadow: 0 4px 12px rgba(52, 229, 235, 0.2);
            }

            .logout-btn {
              background: rgba(248, 113, 113, 0.1);
              color: var(--cyber-red);
              border: 1px solid var(--cyber-red);
              padding: 1rem 2rem;
              border-radius: 8px;
              font-family: var(--font-header);
              font-weight: 700;
              font-size: 0.95rem;
              letter-spacing: 0.05em;
              text-transform: uppercase;
              cursor: pointer;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              justifyContent: center;
              gap: 10px;
              width: 100%;
              margin-top: auto;
            }

            .logout-btn:hover {
              background: var(--cyber-red);
              color: white;
              box-shadow: 0 0 20px rgba(248, 113, 113, 0.4);
              transform: translateY(-2px);
            }
            
            .logout-message {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: var(--cyber-surface-glass);
              backdrop-filter: blur(20px);
              border: 1px solid var(--cyber-blue);
              padding: 2rem 3rem;
              border-radius: 12px;
              z-index: 100;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1rem;
              box-shadow: 0 0 50px rgba(52, 229, 235, 0.3);
              animation: center-drop-bounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }

            .pref-section {
              background: rgba(0, 0, 0, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 12px;
              padding: 1.5rem;
              margin-bottom: 1.5rem;
            }

            .section-title {
              display: flex;
              align-items: center;
              gap: 10px;
              margin: 0 0 1rem 0;
              font-size: 1.1rem;
              font-family: var(--font-header);
            }
          `,
        }}
      />

      {/* =========================================
          BACKGROUND EFFECTS
          ========================================= */}
      <div className="profile-fade-in" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, #070b13 0%, #111827 100%)",
            opacity: 0.95,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "4px",
            background: "var(--cyber-blue)",
            boxShadow: "0 0 25px 6px var(--cyber-blue-glow)",
            animation: "scanning-laser 9s linear infinite",
            zIndex: 5,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: "-50%",
            backgroundImage:
              "linear-gradient(rgba(52, 229, 235, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(52, 229, 235, 0.03) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            animation: "grid-pan 7s linear infinite",
            transform: "perspective(1000px) rotateX(65deg) scale(1.2)",
            transformOrigin: "center top",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Light Ambient Gradients */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "15%",
            width: "35vw",
            height: "35vw",
            borderRadius: "50%",
            opacity: 0.1,
            filter: "blur(100px)",
            background: "radial-gradient(circle, var(--cyber-blue) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            right: "15%",
            width: "35vw",
            height: "35vw",
            borderRadius: "50%",
            opacity: 0.1,
            filter: "blur(100px)",
            background: "radial-gradient(circle, var(--cyber-purple) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* =========================================
          OVERLAYS
          ========================================= */}
      {logoutMessage && (
        <div className="logout-message">
          <Cpu className="animate-pulse" size={40} color="var(--cyber-blue)" />
          <h3 className="glitch-yellow" style={{ fontSize: "1.5rem", margin: 0, color: "var(--cyber-blue)" }}>
            {logoutMessage}
          </h3>
        </div>
      )}

      {/* =========================================
          CORE PROFILE LAYOUT (2 COLUMN)
          ========================================= */}
      <div
        className="card-drop-in edgerunner-card"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "1000px",
          background: "var(--cyber-surface-glass)",
          backdropFilter: "blur(25px)",
          border: "1px solid rgba(52, 229, 235, 0.25)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          borderRadius: "16px",
          padding: "2.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "3rem",
          opacity: logoutMessage ? 0.2 : 1,
          transition: "opacity 0.3s ease",
        }}
      >
        {/* Edge glow accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, var(--cyber-blue), var(--cyber-purple))",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
          }}
        />

        {/* --- LEFT COLUMN: ACCOUNT CREDENTIALS --- */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Profile Pic & Banner */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem" }}>
            <div
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background: "rgba(52, 229, 235, 0.1)",
                border: "2px solid var(--cyber-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 25px rgba(52, 229, 235, 0.25)",
              }}
            >
              <UserCircle size={55} color="var(--cyber-blue)" />
            </div>
            <div>
              <h1
                className="glitch-yellow"
                style={{
                  fontSize: "2rem",
                  margin: "0 0 0.3rem 0",
                  color: "var(--text-main)",
                  textShadow: "0 0 15px rgba(52,229,235,0.3)"
                }}
              >
                {user.preferencesData?.nickname || user.name}
              </h1>
              <div className="ready-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle size={15} color="var(--cyber-green)" />
                <span style={{ color: "var(--cyber-green)", fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: "bold" }}>
                  {t("profile.online" as any) || "OPERATIONAL"}
                </span>
              </div>
            </div>
          </div>

          {/* User Account Info Data Rows */}
          <div style={{ flex: 1 }}>
            <h3
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                letterSpacing: "0.15em",
                marginBottom: "1.2rem",
                textTransform: "uppercase"
              }}
            >
              {t("profile.info" as any) || "System Access Profile"}
            </h3>

            {/* Username */}
            <div className="info-row">
              <Shield size={22} color="var(--cyber-purple)" style={{ opacity: 0.85 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                  {t("profile.username" as any) || "User Tag"}
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-main)" }}>
                  {user.name}
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="info-row">
              <Mail size={22} color="var(--cyber-blue)" style={{ opacity: 0.85 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                  {t("profile.email" as any) || "Digital Comms"}
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-main)", wordBreak: "break-all" }}>
                  {user.email}
                </div>
              </div>
            </div>

            {/* Phone (Fallback or Database) */}
            {(user.phone || user.preferencesData?.phone) && (
              <div className="info-row">
                <Phone size={22} color="#4ade80" style={{ opacity: 0.85 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                    {t("profile.phone" as any) || "Relay Line"}
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-main)" }}>
                    {user.preferencesData?.phone || user.phone}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sign Out Section */}
          <div style={{ marginTop: "2rem" }}>
            <button onClick={handleLogout} className="logout-btn" disabled={!!logoutMessage}>
              <LogOut size={20} />
              {t("profile.logout" as any) || "Terminate Session"}
            </button>
          </div>
        </div>

        {/* --- RIGHT COLUMN: USER PREFERENCES --- */}
        <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid rgba(255,255,255,0.05)", paddingLeft: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2
              style={{
                color: "var(--cyber-yellow)",
                fontSize: "1.4rem",
                margin: 0,
                fontFamily: "var(--font-header)",
                textTransform: "uppercase",
                letterSpacing: "1px"
              }}
            >
              {t("preferences.title" as any) || "AI Core Preferences"}
            </h2>
            <button
              onClick={() => router.push("/preferences")}
              style={{
                background: "none",
                border: "none",
                color: "var(--cyber-blue)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontFamily: "var(--font-mono)",
                fontWeight: "bold",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--cyber-blue)")}
            >
              <Settings size={16} />
              {t("preferences.edit" as any) || "RECONFIG"}
            </button>
          </div>

          {hasPreferences ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "400px", overflowY: "auto", paddingRight: "8px" }}>
              
              {/* 1. Locations preferences */}
              {user.preferencesData?.locations && user.preferencesData.locations.length > 0 && (
                <div className="pref-section" style={{ borderLeft: "3px solid var(--cyber-blue)" }}>
                  <h4 className="section-title" style={{ color: "var(--cyber-blue)" }}>
                    <MapPin size={18} />
                    {t("preferences.locationInfo" as any) || "Prime Destinations"}
                  </h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {user.preferencesData.locations.map((loc) => (
                      <div key={loc} className="pref-tag">
                        <span>{LOCATION_ICONS[loc] || "📍"}</span>
                        <span>{t(`location.${loc}` as any) || loc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Cars preferences */}
              {user.preferencesData?.cars && user.preferencesData.cars.length > 0 && (
                <div className="pref-section" style={{ borderLeft: "3px solid var(--cyber-purple)" }}>
                  <h4 className="section-title" style={{ color: "var(--cyber-purple)" }}>
                    <Car size={18} />
                    {t("preferences.carInfo" as any) || "Car Fleet"}
                  </h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {user.preferencesData.cars.map((car) => (
                      <div key={car} className="pref-tag" style={{ fontWeight: "bold" }}>
                        {car}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Motorbikes preferences */}
              {user.preferencesData?.motorbikes && user.preferencesData.motorbikes.length > 0 && (
                <div className="pref-section" style={{ borderLeft: "3px solid #4ade80" }}>
                  <h4 className="section-title" style={{ color: "#4ade80" }}>
                    <Bike size={18} />
                    {t("preferences.bikeInfo" as any) || "Grid Cycles"}
                  </h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {user.preferencesData.motorbikes.map((bike) => (
                      <div key={bike} className="pref-tag" style={{ fontWeight: "bold" }}>
                        {bike}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty state when no preferences saved */
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px dashed rgba(255,255,255,0.1)",
                borderRadius: "12px",
                padding: "2rem",
                textAlign: "center"
              }}
            >
              <Cpu size={45} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: "1rem" }} />
              <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--text-main)", fontSize: "1.1rem" }}>
                {t("preferences.emptyTitle" as any) || "AI Profile Incomplete"}
              </h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "280px", margin: "0 0 1.5rem 0", lineHeight: 1.5 }}>
                {t("preferences.emptyDesc" as any) || "Configure your travel and transit parameters for tailored recommendations."}
              </p>
              <button
                onClick={() => router.push("/preferences")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "0.8rem 1.5rem",
                  background: "var(--cyber-blue)",
                  color: "var(--cyber-black)",
                  fontWeight: "bold",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  fontFamily: "var(--font-header)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 0 15px rgba(52, 229, 235, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {t("preferences.initialize" as any) || "Initialize Link"}
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
