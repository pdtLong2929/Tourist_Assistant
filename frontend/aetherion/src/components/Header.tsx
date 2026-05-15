// src/components/Header.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { Settings, Moon, Sun } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<{
    name: string;
    email?: string;
    phone?: string;
  } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

    // Chạy lần đầu khi load trang
    checkLoginStatus();

    // Lắng nghe tín hiệu từ trang Login
    window.addEventListener("userAuthChanged", checkLoginStatus);

    // Dọn dẹp sự kiện khi component bị hủy
    return () =>
      window.removeEventListener("userAuthChanged", checkLoginStatus);
  }, []);

  // Hàm Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("cyber_user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("cyber_user_nickname");
    localStorage.removeItem("cyber_user_phone");
    setUser(null);
    setIsDropdownOpen(false);
    window.location.reload();
  };

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
        style={{
          padding: "0.75rem 2rem",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* Logo */}
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            textDecoration: "none",
            width: "fit-content",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              background:
                "linear-gradient(135deg, var(--cyber-yellow) 0%, var(--cyber-blue) 100%)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-header)",
              fontWeight: "800",
              fontSize: "1.1rem",
              color: "var(--cyber-black)",
              boxShadow: "0 0 15px var(--cyber-yellow-dim)",
            }}
          >
            T
          </div>
          <div style={{ lineHeight: 1.1 }}>
            <div
              style={{
                fontFamily: "var(--font-header)",
                fontSize: "1.1rem",
                fontWeight: "700",
                color: "var(--text-main)",
                letterSpacing: "-0.02em",
              }}
            >
              Tourist <span style={{ color: "var(--cyber-yellow)" }}>AI</span>
            </div>
          </div>
        </a>

        {/* Navigation */}
        <nav className="nav-container">
          {[
            { name: t("header.explore" as any), href: "/tour-judging" },
            { name: t("header.askAi" as any), href: "/renting/suggestions" },
            { name: t("header.bookRide" as any), href: "/booking" },
          ].map((link) => (
            <a key={link.name} href={link.href} className="nav-link">
              {link.name}
            </a>
          ))}
        </nav>

        {/* Right Section: Language & User */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "1.5rem",
          }}
        >
          {/* Settings Menu */}
          <div style={{ position: "relative" }}>
            <div
              className="user-badge"
              onClick={() => {
                setIsSettingsOpen(!isSettingsOpen);
                setIsDropdownOpen(false);
              }}
              style={{
                cursor: "pointer",
                border: "1px solid var(--cyber-yellow)",
                background: "rgba(251, 191, 36, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "42px",
                height: "42px",
                borderRadius: "8px",
                padding: 0,
              }}
            >
              <Settings size={20} color="var(--cyber-yellow)" style={{ transition: "transform 0.3s", transform: isSettingsOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
            </div>

            {isSettingsOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "130%",
                  right: 0,
                  background: "var(--cyber-black)",
                  border: "1px solid var(--cyber-border)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  minWidth: "220px",
                  padding: "16px",
                  gap: "16px",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
                  zIndex: 200,
                }}
              >
                {/* Language Toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-main)", fontSize: "0.95rem", fontWeight: "600" }}>{t("header.language" as any) || "Language"}</span>
                  <div 
                    onClick={() => setLanguage(language === "en" ? "vi" : "en")}
                    style={{
                      width: "64px",
                      height: "32px",
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: "16px",
                      position: "relative",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid var(--cyber-border)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div style={{
                      position: "absolute",
                      left: language === "en" ? "4px" : "34px",
                      width: "24px",
                      height: "24px",
                      background: "var(--cyber-yellow)",
                      borderRadius: "50%",
                      transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 0 10px var(--cyber-yellow-glow)",
                      zIndex: 1,
                    }} />
                    <span style={{ position: "absolute", left: "8px", fontSize: "0.65rem", fontWeight: "bold", color: "var(--text-muted)", zIndex: 0 }}>EN</span>
                    <span style={{ position: "absolute", right: "8px", fontSize: "0.65rem", fontWeight: "bold", color: "var(--text-muted)", zIndex: 0 }}>VI</span>
                  </div>
                </div>

                {/* Theme Toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-main)", fontSize: "0.95rem", fontWeight: "600" }}>{t("header.theme" as any) || "Theme"}</span>
                  <div 
                    onClick={toggleTheme}
                    style={{
                      width: "64px",
                      height: "32px",
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: "16px",
                      position: "relative",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid var(--cyber-border)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div style={{
                      position: "absolute",
                      left: theme === "light" ? "34px" : "4px",
                      width: "24px",
                      height: "24px",
                      background: theme === "light" ? "var(--cyber-blue)" : "var(--cyber-purple)",
                      borderRadius: "50%",
                      transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: theme === "light" ? "0 0 10px var(--cyber-blue-glow)" : "0 0 10px rgba(168, 139, 250, 0.5)",
                      zIndex: 1,
                    }} />
                    <span style={{ position: "absolute", left: "8px", display: "flex", alignItems: "center", zIndex: 0 }}>
                      <Moon size={14} color="var(--text-muted)" />
                    </span>
                    <span style={{ position: "absolute", right: "8px", display: "flex", alignItems: "center", zIndex: 0 }}>
                      <Sun size={14} color="var(--text-muted)" />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {user ? (
            /* ĐÃ ĐĂNG NHẬP */
            <div style={{ position: "relative" }}>
              <div
                className="user-badge"
                onClick={() => {
                  setIsDropdownOpen(!isDropdownOpen);
                  setIsSettingsOpen(false);
                }}
                style={{
                  cursor: "pointer",
                  border: "1px solid var(--cyber-blue)",
                  background: "rgba(52, 229, 235, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "var(--cyber-blue)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--cyber-black)",
                    fontWeight: "bold",
                    fontFamily: "var(--font-header)",
                  }}
                >
                  {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.95rem",
                      color: "var(--cyber-blue)",
                      fontWeight: "700",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {user?.name || user?.email?.split("@")[0] || "Traveler"} ▼
                  </div>
                </div>
              </div>

              {/* Menu thả xuống */}
              {isDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "130%",
                    right: 0,
                    background: "#0f172a",
                    border: "1px solid rgba(52, 229, 235, 0.3)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    minWidth: "220px",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
                    zIndex: 200,
                  }}
                >
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      router.push("/profile");
                    }}
                    style={{
                      padding: "16px 20px",
                      fontSize: "1.05rem",
                      textAlign: "left",
                      background: "transparent",
                      color: "white",
                      border: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      cursor: "pointer",
                      fontFamily: "system-ui, sans-serif",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {t("header.profile" as any)}
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      padding: "16px 20px",
                      fontSize: "1.05rem",
                      textAlign: "left",
                      background: "transparent",
                      color: "#ef4444",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "system-ui, sans-serif",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(239, 68, 68, 0.1)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {t("header.logout" as any)}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* CHƯA ĐĂNG NHẬP */
            <a href="/login" style={{ textDecoration: "none" }}>
              <div
                className="user-badge cursor-hover"
                style={{ cursor: "pointer", transition: "all 0.3s" }}
              >
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "1rem",
                      color: "var(--cyber-yellow)",
                      fontWeight: "900",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {t("header.guestMode" as any)}
                  </div>
                </div>
              </div>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
