// src/components/Header.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

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
            { name: "Explore", href: "/tour-judging" },
            { name: "Ask AI", href: "/renting/suggestions" },
            { name: "Book Ride", href: "/booking" },
          ].map((link) => (
            <a key={link.name} href={link.href} className="nav-link">
              {link.name}
            </a>
          ))}
        </nav>

        {/* User Section */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            position: "relative",
          }}
        >
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
                      padding:
                        "16px 20px" /* CHỈNH Ở ĐÂY: Đệm dày hơn (cũ là 12px 16px) */,
                      fontSize: "1.05rem" /* CHỈNH Ở ĐÂY: Chữ to hơn */,
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
                    PROFILE
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      padding: "16px 20px" /* Đệm dày hơn */,
                      fontSize: "1.05rem" /* Chữ to hơn */,
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
                    LOG OUT
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
                    GUEST_MODE
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
