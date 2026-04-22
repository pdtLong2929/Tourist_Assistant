"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, LogOut, Shield, Mail, Cpu, CheckCircle } from "lucide-react";

interface CyberUser {
  id: string;
  email: string;
  username: string;
}

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<CyberUser | null>(null);
  const [logoutMessage, setLogoutMessage] = useState("");
  const router = useRouter();

  // Kích hoạt hiệu ứng boot-up và lấy dữ liệu user
  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem("cyber_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse user data", error);
      }
    } else {
      // Nếu chưa đăng nhập, chuyển hướng về login
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    setLogoutMessage("Logging out. See you soon!");
    
    // Giả lập độ trễ logout cho ngầu
    setTimeout(() => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("cyber_user");
      window.dispatchEvent(new Event("userAuthChanged"));
      router.push("/");
    }, 1000);
  };

  if (!mounted || !user) return null;

  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        position: "relative",
        overflow: "hidden",
        background: "var(--cyber-black)",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* BOOT SEQUENCE ANIMATIONS */
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
              margin-top: 2rem;
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
              background: rgba(15, 23, 42, 0.9);
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
          `,
        }}
      />

      {/* =========================================
          BACKGROUND 3D GRID & SCANNER
          ========================================= */}
      <div
        className="profile-fade-in"
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
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
            boxShadow: "0 0 20px 5px var(--cyber-blue-glow)",
            animation: "scanning-laser 8s linear infinite",
            zIndex: 5,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: "-50%",
            backgroundImage:
              "linear-gradient(rgba(52, 229, 235, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(52, 229, 235, 0.05) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            animation: "grid-pan 6s linear infinite",
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
            top: "20%",
            left: "10%",
            width: "30rem",
            height: "30rem",
            borderRadius: "50%",
            opacity: 0.15,
            filter: "blur(80px)",
            background: "radial-gradient(circle, var(--cyber-blue) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "10%",
            width: "30rem",
            height: "30rem",
            borderRadius: "50%",
            opacity: 0.15,
            filter: "blur(80px)",
            background: "radial-gradient(circle, var(--cyber-purple) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* =========================================
          LOGOUT OVERLAY
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
          PROFILE CARD
          ========================================= */}
      <div
        className="card-drop-in edgerunner-card"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "600px",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
          opacity: logoutMessage ? 0.3 : 1, // Làm mờ thẻ khi đang logout
          transition: "opacity 0.3s ease",
        }}
      >
        {/* Header Section */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", borderBottom: "1px solid var(--cyber-border)", paddingBottom: "2rem" }}>
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              background: "rgba(52, 229, 235, 0.1)",
              border: "2px solid var(--cyber-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(52, 229, 235, 0.3)",
            }}
          >
            <UserCircle size={60} color="var(--cyber-blue)" />
          </div>
          <div>
            <h1 className="glitch-yellow" style={{ fontSize: "2.2rem", margin: "0 0 0.5rem 0", color: "var(--text-main)" }}>
              {user.username}
            </h1>
            <div className="ready-label">
              <CheckCircle size={16} color="var(--cyber-green)" />
              <span className="status-active">Online</span>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div>
          <h3 style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.9rem", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            User Information
          </h3>
          
          <div className="info-row">
            <Shield size={24} color="var(--cyber-purple)" style={{ opacity: 0.8 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Username</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-main)" }}>{user.username}</div>
            </div>
          </div>

          <div className="info-row">
            <Mail size={24} color="var(--cyber-blue)" style={{ opacity: 0.8 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Email Address</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-main)" }}>{user.email}</div>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <button onClick={handleLogout} className="logout-btn" disabled={!!logoutMessage}>
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </main>
  );
}
