// src/components/Header.tsx
"use client";

import { useState, useEffect } from "react";

export default function Header() {
  const [user, setUser] = useState<{ name: string } | null>(null);

  // Kiểm tra xem có dữ liệu user trong trình duyệt không
  useEffect(() => {
    const loggedInUser = localStorage.getItem("cyber_user");
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
    }
  }, []);

  // Hàm Đăng xuất (Bấm vào avatar để đăng xuất)
  const handleLogout = () => {
    localStorage.removeItem("cyber_user");
    setUser(null);
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

        {/* User Section (ĐÃ CẬP NHẬT LOGIC) */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {user ? (
            /* ĐÃ ĐĂNG NHẬP: Hiện Avatar và Tên */
            <div
              className="user-badge"
              onClick={handleLogout}
              title="Click to Logout"
              style={{
                cursor: "pointer",
                border: "1px solid var(--cyber-blue)",
                background: "rgba(52, 229, 235, 0.1)",
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
                {user.name.charAt(0)} {/* Lấy chữ cái đầu làm Avatar */}
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
                  {user.name}
                </div>
              </div>
            </div>
          ) : (
            /* CHƯA ĐĂNG NHẬP: GUEST_MODE click chuyển sang trang /login */
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
