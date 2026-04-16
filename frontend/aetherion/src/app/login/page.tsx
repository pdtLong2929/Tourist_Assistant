"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const nginxURL = process.env.NEXT_PUBLIC_NGINX_URL || "http://localhost:80"
      const res = await fetch(`${nginxURL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      // Store the access token
      localStorage.setItem("accessToken", data.accessToken);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      // Redirect to home
      window.location.href = "/";
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "calc(100vh - 200px)",
        padding: "2rem",
      }}
    >
      <div
        className="edgerunner-card"
        style={{
          maxWidth: "460px",
          width: "100%",
          padding: "3rem",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            className="glitch-yellow"
            style={{
              fontSize: "2rem",
              marginBottom: "0.75rem",
              lineHeight: 1.2,
            }}
          >
            Welcome Back
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.95rem",
              margin: 0,
            }}
          >
            Sign in to access your AI travel companion
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: "rgba(248, 113, 113, 0.15)",
              border: "1px solid rgba(248, 113, 113, 0.4)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1.5rem",
              color: "var(--cyber-red)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          {/* Email Field */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label
              htmlFor="login-email"
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.5rem",
                fontWeight: 600,
              }}
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@example.com"
              style={{
                width: "100%",
                padding: "0.85rem 1rem",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid var(--cyber-border)",
                borderRadius: "8px",
                color: "var(--text-main)",
                fontFamily: "var(--font-body)",
                fontSize: "0.95rem",
                outline: "none",
                transition: "border-color 0.3s ease, box-shadow 0.3s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--cyber-yellow)";
                e.currentTarget.style.boxShadow =
                  "0 0 15px var(--cyber-yellow-dim)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--cyber-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: "1.75rem" }}>
            <label
              htmlFor="login-password"
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "0.5rem",
                fontWeight: 600,
              }}
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "0.85rem 1rem",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid var(--cyber-border)",
                borderRadius: "8px",
                color: "var(--text-main)",
                fontFamily: "var(--font-body)",
                fontSize: "0.95rem",
                outline: "none",
                transition: "border-color 0.3s ease, box-shadow 0.3s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--cyber-yellow)";
                e.currentTarget.style.boxShadow =
                  "0 0 15px var(--cyber-yellow-dim)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--cyber-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="cyber-button"
            disabled={loading}
            style={{
              width: "100%",
              fontSize: "1rem",
              padding: "1rem",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            margin: "2rem 0",
          }}
        >
          <div
            className="accent-line"
            style={{ flex: 1, height: "1px" }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Or
          </span>
          <div
            className="accent-line"
            style={{ flex: 1, height: "1px" }}
          />
        </div>

        {/* Register Link */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              margin: "0 0 0.5rem",
            }}
          >
            Don&apos;t have an account?{" "}
            <a
              href="/register"
              style={{
                color: "var(--cyber-yellow)",
                fontWeight: 600,
                textDecoration: "none",
                transition: "text-shadow 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textShadow =
                  "0 0 10px var(--cyber-yellow-glow)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textShadow = "none";
              }}
            >
              Register
            </a>
          </p>
          <a
            href="/forgot-password"
            style={{
              color: "var(--text-muted)",
              fontSize: "0.8rem",
              textDecoration: "none",
              transition: "color 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--cyber-blue)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            Forgot password?
          </a>
        </div>

        {/* System Info */}
        <div
          style={{
            marginTop: "2rem",
            padding: "0.75rem 1rem",
            background: "rgba(15, 23, 42, 0.4)",
            borderRadius: "6px",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--cyber-green)",
              animation: "soft-pulse 2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              letterSpacing: "0.05em",
            }}
          >
            AUTH_SERVICE :: ONLINE • SECURE CONNECTION
          </span>
        </div>
      </div>
    </main>
  );
}
