// src/components/Header.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { Settings, Moon, Sun, Menu, X } from "lucide-react";
import AuthModal from "./AuthModal";

export default function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email?: string;
    phone?: string;
  } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Kiểm tra xem có dữ liệu user trong trình duyệt không
  useEffect(() => {
    const checkLoginStatus = () => {
      const loggedInUser = localStorage.getItem("cyber_user");
      if (loggedInUser) {
        try {
          const userObj = JSON.parse(loggedInUser);
          const nickname = localStorage.getItem("cyber_user_nickname");
          const phone = localStorage.getItem("cyber_user_phone");
          if (nickname) {
            userObj.name = nickname;
          }
          if (phone) {
            userObj.phone = phone;
          }
          setUser(userObj);
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    checkLoginStatus();
    window.addEventListener("userAuthChanged", checkLoginStatus);
    return () => window.removeEventListener("userAuthChanged", checkLoginStatus);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("cyber_user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("cyber_user_nickname");
    localStorage.removeItem("cyber_user_phone");
    setUser(null);
    setIsDropdownOpen(false);
    window.location.reload();
  };

  const navLinks = [
    { name: t("header.explore" as any), href: "/tour-judging" },
    { name: t("header.askAi" as any), href: "/renting/suggestions" },
    { name: t("header.bookRide" as any), href: "/booking" },
  ];

  return (
    <header
      className="surface"
      style={{
        borderBottom: "1px solid var(--cyber-border)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div
        className="header-container"
        style={{
          padding: "0.75rem 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* Left: Mobile Menu Button & Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            className="mobile-menu-btn md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-main)",
              cursor: "pointer",
              padding: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <a
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "linear-gradient(135deg, var(--cyber-yellow) 0%, var(--cyber-blue) 100%)",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-header)",
                fontWeight: "800",
                fontSize: "1rem",
                color: "var(--cyber-black)",
                boxShadow: "0 0 10px var(--cyber-yellow-dim)",
              }}
            >
              T
            </div>
            <div style={{ lineHeight: 1.1 }} className="hidden sm:block">
              <div
                style={{
                  fontFamily: "var(--font-header)",
                  fontSize: "1rem",
                  fontWeight: "700",
                  color: "var(--text-main)",
                  letterSpacing: "-0.02em",
                }}
              >
                Tourist <span style={{ color: "var(--cyber-yellow)" }}>AI</span>
              </div>
            </div>
          </a>
        </div>

        {/* Center: Desktop Navigation */}
        <nav 
          className="nav-container"
          style={{ 
            display: typeof window !== 'undefined' && window.innerWidth >= 768 ? 'flex' : 'none',
            alignItems: 'center'
          }}
        >
          {navLinks.map((link) => (
            <button 
              key={link.name} 
              onClick={() => {
                if (!user) {
                  setIsAuthModalOpen(true);
                } else {
                  router.push(link.href);
                }
              }} 
              className="nav-link"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                outline: "none"
              }}
            >
              {link.name}
            </button>
          ))}
          <style jsx global>{`
            @media (min-width: 768px) {
              .nav-container { display: flex !important; }
            }
            @media (max-width: 767px) {
              .nav-container { display: none !important; }
            }
          `}</style>
        </nav>

        {/* Right Section: Settings & User */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          {/* Settings */}
          <div style={{ position: "relative" }}>
            <button
              className="user-badge"
              onClick={() => {
                setIsSettingsOpen(!isSettingsOpen);
                setIsDropdownOpen(false);
                setIsMobileMenuOpen(false);
              }}
              style={{
                cursor: "pointer",
                border: "1px solid var(--cyber-yellow)",
                background: "rgba(251, 191, 36, 0.1)",
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              <Settings size={18} color="var(--cyber-yellow)" style={{ transition: "transform 0.3s", transform: isSettingsOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
            </button>

            {isSettingsOpen && (
              <div
                className="hud-glass-panel"
                style={{
                  position: "absolute",
                  top: "130%",
                  right: 0,
                  background: "var(--cyber-black)",
                  border: "1px solid var(--cyber-border)",
                  borderRadius: "12px",
                  minWidth: "200px",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
                  zIndex: 200,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-main)", fontSize: "0.9rem", fontWeight: "700" }}>{t("header.language" as any) || "Language"}</span>
                  <div 
                    onClick={() => setLanguage(language === "en" ? "vi" : "en")}
                    style={{
                      width: "60px",
                      height: "30px",
                      background: "rgba(0,0,0,0.4)",
                      borderRadius: "15px",
                      position: "relative",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid var(--cyber-border)",
                    }}
                  >
                    <div style={{
                      position: "absolute",
                      left: language === "en" ? "2px" : "32px",
                      width: "26px",
                      height: "26px",
                      background: "var(--cyber-yellow)",
                      borderRadius: "50%",
                      transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 0 10px var(--cyber-yellow-glow)",
                      zIndex: 1,
                    }} />
                    <span style={{ position: "absolute", left: "8px", fontSize: "0.7rem", fontWeight: "800", color: "var(--text-main)", zIndex: 0 }}>EN</span>
                    <span style={{ position: "absolute", right: "8px", fontSize: "0.7rem", fontWeight: "800", color: "var(--text-main)", zIndex: 0 }}>VI</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-main)", fontSize: "0.9rem", fontWeight: "700" }}>{t("header.theme" as any) || "Theme"}</span>
                  <div 
                    onClick={toggleTheme}
                    style={{
                      width: "60px",
                      height: "30px",
                      background: "rgba(0,0,0,0.4)",
                      borderRadius: "15px",
                      position: "relative",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid var(--cyber-border)",
                    }}
                  >
                    <div style={{
                      position: "absolute",
                      left: theme === "light" ? "32px" : "2px",
                      width: "26px",
                      height: "26px",
                      background: theme === "light" ? "var(--cyber-blue)" : "var(--cyber-purple)",
                      borderRadius: "50%",
                      transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: theme === "light" ? "0 0 10px var(--cyber-blue-glow)" : "0 0 10px rgba(168, 139, 250, 0.5)",
                      zIndex: 1,
                    }} />
                    <span style={{ position: "absolute", left: "8px", display: "flex", alignItems: "center", zIndex: 0 }}>
                      <Moon size={14} color="var(--text-main)" />
                    </span>
                    <span style={{ position: "absolute", right: "8px", display: "flex", alignItems: "center", zIndex: 0 }}>
                      <Sun size={14} color="var(--text-main)" />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User */}
          {user ? (
            <div style={{ position: "relative" }}>
              <button
                className="user-badge"
                onClick={() => {
                  setIsDropdownOpen(!isDropdownOpen);
                  setIsSettingsOpen(false);
                  setIsMobileMenuOpen(false);
                }}
                style={{
                  cursor: "pointer",
                  border: "1px solid var(--cyber-blue)",
                  background: "rgba(52, 229, 235, 0.1)",
                  padding: "0.4rem 0.6rem",
                  gap: "0.5rem",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "var(--cyber-blue)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--cyber-black)",
                    fontWeight: "bold",
                    fontSize: "0.75rem",
                  }}
                >
                  {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block" style={{ fontSize: "0.85rem", color: "var(--cyber-blue)", fontWeight: "700" }}>
                  {user?.name || "User"}
                </span>
              </button>

              {isDropdownOpen && (
                <div
                  className="hud-glass-panel"
                  style={{
                    position: "absolute",
                    top: "130%",
                    right: 0,
                    background: "var(--cyber-black)",
                    border: "1px solid var(--cyber-border)",
                    borderRadius: "12px",
                    minWidth: "180px",
                    overflow: "hidden",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
                    zIndex: 200,
                  }}
                >
                  <button
                    onClick={() => { router.push("/profile"); setIsDropdownOpen(false); }}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      textAlign: "left",
                      background: "transparent",
                      color: "var(--text-main)",
                      border: "none",
                      borderBottom: "1px solid var(--cyber-border)",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "0.95rem",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {t("header.profile" as any)}
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      textAlign: "left",
                      background: "transparent",
                      color: "#ef4444",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontSize: "0.95rem",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {t("header.logout" as any)}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a href="/login" style={{ textDecoration: "none" }}>
              <div className="user-badge" style={{ padding: "0.4rem 0.8rem", color: "var(--cyber-yellow)", fontWeight: "bold", fontSize: "0.85rem" }}>
                {t("header.guestMode" as any)}
              </div>
            </a>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--cyber-black)",
            borderBottom: "1px solid var(--cyber-border)",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            zIndex: 90,
            boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
          }}
        >
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (!user) {
                  setIsAuthModalOpen(true);
                } else {
                  router.push(link.href);
                }
              }}
              style={{
                padding: "1rem",
                borderRadius: "8px",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-header)",
                fontSize: "0.9rem",
                fontWeight: "600",
                textTransform: "uppercase",
                background: "rgba(255,255,255,0.03)",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                width: "100%"
              }}
            >
              {link.name}
            </button>
          ))}
        </div>
      )}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  );
}
