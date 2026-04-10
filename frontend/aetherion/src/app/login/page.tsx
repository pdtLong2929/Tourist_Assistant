// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleLogin = () => {
    const mockUser = { name: "Edgerunner_2077" };
    localStorage.setItem("cyber_user", JSON.stringify(mockUser));
    router.push("/");
    setTimeout(() => window.location.reload(), 100);
  };

  // Component Social Buttons dùng style trực tiếp để đảm bảo không bị xấu
  const SocialButtons = () => (
    <div style={{ marginTop: "2rem", width: "100%" }}>
      <div
        style={{
          position: "relative",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{ flex: 1, borderTop: "1px solid var(--cyber-border)" }}
        ></div>
        <span
          style={{
            padding: "0 1rem",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            background: "rgb(30, 41, 59)",
          }}
        >
          OR CONTINUE WITH
        </span>
        <div
          style={{ flex: 1, borderTop: "1px solid var(--cyber-border)" }}
        ></div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
        }}
      >
        <button
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.7rem",
            borderRadius: "8px",
            border: "1px solid var(--cyber-border)",
            background: "rgba(255,255,255,0.05)",
            color: "white",
            cursor: "pointer",
          }}
        >
          <svg
            style={{ width: "1.25rem", height: "1.25rem" }}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </button>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.7rem",
            borderRadius: "8px",
            border: "1px solid var(--cyber-border)",
            background: "rgba(255,255,255,0.05)",
            color: "white",
            cursor: "pointer",
          }}
        >
          <svg
            style={{ width: "1.25rem", height: "1.25rem" }}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
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
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background (Trả lại đủ cho ông đây) */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.2,
            backgroundImage:
              "linear-gradient(rgba(251, 191, 36, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
            animation: "grid-move 20s linear infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "25%",
            left: "-5rem",
            width: "24rem",
            height: "24rem",
            borderRadius: "50%",
            opacity: 0.2,
            filter: "blur(60px)",
            background:
              "radial-gradient(circle, var(--cyber-blue) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "25%",
            right: "-5rem",
            width: "24rem",
            height: "24rem",
            borderRadius: "50%",
            opacity: 0.2,
            filter: "blur(60px)",
            background:
              "radial-gradient(circle, var(--cyber-purple) 0%, transparent 70%)",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "900px",
        }}
      >
        <div
          style={{
            position: "relative",
            height: "650px",
            borderRadius: "1rem",
            overflow: "hidden",
            background: "rgba(30, 41, 59, 0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--cyber-border)",
            boxShadow: "0 0 60px rgba(167, 139, 250, 0.2)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              zIndex: 30,
              background:
                "linear-gradient(90deg, var(--cyber-blue), var(--cyber-yellow), var(--cyber-purple))",
            }}
          />

          {/* FORM REGISTER */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "50%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "0 3rem",
              transition: "all 0.7s",
              opacity: isSignUp ? 1 : 0,
              zIndex: isSignUp ? 10 : -1,
              pointerEvents: isSignUp ? "auto" : "none",
            }}
          >
            <h2
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                marginBottom: "1.5rem",
                color: "var(--cyber-purple)",
              }}
            >
              Registration
            </h2>
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <input
                type="text"
                placeholder="Username"
                style={{
                  padding: "0.8rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid var(--cyber-border)",
                  background: "rgba(15, 23, 42, 0.8)",
                  color: "white",
                  outline: "none",
                }}
              />
              <input
                type="email"
                placeholder="Email"
                style={{
                  padding: "0.8rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid var(--cyber-border)",
                  background: "rgba(15, 23, 42, 0.8)",
                  color: "white",
                  outline: "none",
                }}
              />
              <input
                type="password"
                placeholder="Password"
                style={{
                  padding: "0.8rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid var(--cyber-border)",
                  background: "rgba(15, 23, 42, 0.8)",
                  color: "white",
                  outline: "none",
                }}
              />
              <button
                style={{
                  padding: "0.9rem",
                  borderRadius: "8px",
                  background: "var(--cyber-purple)",
                  color: "white",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(167, 139, 250, 0.4)",
                }}
              >
                CREATE ACCOUNT
              </button>
            </div>
            <SocialButtons />
          </div>

          {/* FORM LOGIN */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "50%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "0 3rem",
              transition: "all 0.7s",
              opacity: isSignUp ? 0 : 1,
              zIndex: isSignUp ? -1 : 10,
              pointerEvents: isSignUp ? "none" : "auto",
            }}
          >
            <h2
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                marginBottom: "1.5rem",
                color: "var(--cyber-blue)",
              }}
            >
              Login
            </h2>
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <input
                type="text"
                placeholder="Username"
                style={{
                  padding: "0.8rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid var(--cyber-border)",
                  background: "rgba(15, 23, 42, 0.8)",
                  color: "white",
                  outline: "none",
                }}
              />
              <input
                type="password"
                placeholder="Password"
                style={{
                  padding: "0.8rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid var(--cyber-border)",
                  background: "rgba(15, 23, 42, 0.8)",
                  color: "white",
                  outline: "none",
                }}
              />
              <button
                onClick={handleLogin}
                style={{
                  padding: "0.9rem",
                  borderRadius: "8px",
                  background: "var(--cyber-blue)",
                  color: "var(--cyber-black)",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(52, 229, 235, 0.4)",
                }}
              >
                SIGN IN
              </button>
            </div>
            <SocialButtons />
          </div>

          {/* SLIDING OVERLAY (Ép nút phải to và bấm được) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "50%",
              height: "100%",
              zIndex: 20,
              transition: "all 0.7s",
              transform: isSignUp ? "translateX(100%)" : "translateX(0)",
              background:
                "linear-gradient(135deg, var(--cyber-purple) 0%, var(--cyber-blue) 100%)",
              boxShadow: "0 0 60px rgba(167, 139, 250, 0.5)",
              borderRadius: isSignUp ? "80px 0 0 80px" : "0 80px 80px 0",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem",
                textAlign: "center",
                transition: "opacity 0.7s",
                opacity: isSignUp ? 0 : 1,
                pointerEvents: isSignUp ? "none" : "auto",
              }}
            >
              <h2
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "bold",
                  color: "white",
                  marginBottom: "1rem",
                }}
              >
                Hello!
              </h2>
              <p style={{ color: "white", marginBottom: "2rem" }}>
                New here? Join us now.
              </p>
              <button
                onClick={() => setIsSignUp(true)}
                style={{
                  padding: "0.8rem 3rem",
                  borderRadius: "50px",
                  border: "2px solid white",
                  background: "transparent",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "0.3s",
                }}
              >
                REGISTER
              </button>
            </div>

            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem",
                textAlign: "center",
                transition: "opacity 0.7s",
                opacity: isSignUp ? 1 : 0,
                pointerEvents: isSignUp ? "auto" : "none",
              }}
            >
              <h2
                style={{
                  fontSize: "2.5rem",
                  fontWeight: "bold",
                  color: "white",
                  marginBottom: "1rem",
                }}
              >
                Welcome Back!
              </h2>
              <p style={{ color: "white", marginBottom: "2rem" }}>
                Already have an account?
              </p>
              <button
                onClick={() => setIsSignUp(false)}
                style={{
                  padding: "0.8rem 3rem",
                  borderRadius: "50px",
                  border: "2px solid white",
                  background: "transparent",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "0.3s",
                }}
              >
                LOGIN
              </button>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes grid-move {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 50px 50px;
          }
        }
      `}</style>
    </main>
  );
}
