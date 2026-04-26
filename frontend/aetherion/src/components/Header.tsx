// src/components/Header.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function Header() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();

  // Kiểm tra xem có dữ liệu user trong trình duyệt không
  useEffect(() => {
    const checkLoginStatus = () => {
      const loggedInUser = localStorage.getItem("cyber_user");
      if (loggedInUser) {
        setUser(JSON.parse(loggedInUser));
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
        {/* Logo (Giữ nguyên) */}
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

        {/* Navigation (Giữ nguyên) */}
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
          {/* Language Selector */}
          <div style={{ position: "relative" }}>
            <div
              className="user-badge"
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              style={{
                cursor: "pointer",
                border: "1px solid var(--cyber-purple)",
                background: "rgba(168, 85, 247, 0.1)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.9rem",
                  color: "var(--cyber-purple)",
                  fontWeight: "700",
                }}
              >
                {language === "en" ? "EN" : "VI"} ▼
              </div>
            </div>

            {isLangDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "130%",
                  right: 0,
                  background: "#0f172a",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  borderRadius: "8px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  minWidth: "120px",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
                  zIndex: 200,
                }}
              >
                <button
                  onClick={() => {
                    setLanguage("en");
                    setIsLangDropdownOpen(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    background: language === "en" ? "rgba(168, 85, 247, 0.2)" : "transparent",
                    color: "white",
                    border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = language === "en" ? "rgba(168, 85, 247, 0.2)" : "transparent")}
                >
                  English
                </button>
                <button
                  onClick={() => {
                    setLanguage("vi");
                    setIsLangDropdownOpen(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    background: language === "vi" ? "rgba(168, 85, 247, 0.2)" : "transparent",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = language === "vi" ? "rgba(168, 85, 247, 0.2)" : "transparent")}
                >
                  Tiếng Việt
                </button>
              </div>
            )}
          </div>
          {user ? (
            /* ĐÃ ĐĂNG NHẬP */
            <div style={{ position: "relative" }}>
              <div
                className="user-badge"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
                  {user.name.charAt(0).toUpperCase()}
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
                    {user.name} ▼
                  </div>
                </div>
              </div>

              {/* Menu thả xuống */}
              {isDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "130%" /* Đẩy xuống thấp một chút cho đỡ dính */,
                    right: 0,
                    background: "#0f172a",
                    border: "1px solid rgba(52, 229, 235, 0.3)",
                    borderRadius: "12px" /* Bo góc to hơn */,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    minWidth:
                      "220px" /* CHỈNH Ở ĐÂY: Chiều rộng menu to ra (cũ là 160px) */,
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
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
