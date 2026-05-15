"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Fingerprint,
  Scan,
  ShieldCheck,
  UserPlus,
  LogIn,
  ShieldAlert,
  CheckCircle,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function LoginPage() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 1. Thêm State để lưu dữ liệu nhập từ bàn phím
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // States cho Forgot Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // States cho hiệu ứng Shake
  const [shakeFields, setShakeFields] = useState<string[]>([]);

  // Kích hoạt hiệu ứng boot-up
  useEffect(() => {
    setMounted(true);
  }, []);

  const validateEmail = (emailStr: string) => {
    return String(emailStr)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      );
  };

  // 2. Hàm xử lý Đăng nhập / Đăng ký thực tế
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Kiểm tra tính hợp lệ và thêm hiệu ứng rung
    const newShakeFields: string[] = [];
    let errorMsg = "";

    if (isSignUp && !name.trim()) {
      newShakeFields.push("register-name");
      if (!errorMsg)
        errorMsg =
          t("login.pleaseEnterName" as any) || "Vui lòng nhập tên của bạn";
    }

    if (!email.trim()) {
      newShakeFields.push(isSignUp ? "register-email" : "login-email");
      if (!errorMsg) errorMsg = "Vui lòng nhập email / Please enter email";
    } else if (!validateEmail(email)) {
      newShakeFields.push(isSignUp ? "register-email" : "login-email");
      if (!errorMsg) errorMsg = "Email không hợp lệ / Invalid email format";
    }

    if (!password.trim()) {
      newShakeFields.push(isSignUp ? "register-password" : "login-password");
      if (!errorMsg)
        errorMsg = "Vui lòng nhập mật khẩu / Please enter password";
    }

    if (newShakeFields.length > 0) {
      setShakeFields(newShakeFields);
      setTimeout(() => setShakeFields([]), 500);
      setErrorMessage(errorMsg);
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isSignUp
        ? "http://localhost:80/register"
        : "http://localhost:80/login";
      const payload = isSignUp
        ? { name, email, password }
        : { email, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("accessToken", data.accessToken);
        if (data.user) {
          localStorage.setItem("cyber_user", JSON.stringify(data.user));
        } else if (isSignUp) {
          // Nếu đăng ký thành công mà server không trả về user, ta tự tạo object từ form
          localStorage.setItem(
            "cyber_user",
            JSON.stringify({
              name: name,
              email: email,
              id: "temp_" + Date.now(), // ID tạm thời nếu cần
            }),
          );
        }

        // Luôn xóa thông tin cũ để bắt đầu phiên mới
        localStorage.removeItem("cyber_user_nickname");
        localStorage.removeItem("cyber_user_age");

        //Phát tín hiệu báo đã đăng nhập thành công
        window.dispatchEvent(new Event("userAuthChanged"));

        setSuccessMessage(
          isSignUp
            ? "Registration successful. Welcome!"
            : "Login successful. Redirecting...",
        );

        setTimeout(() => {
          const userId = data.user?.id || "guest";
          if (
            localStorage.getItem("hidePreferencesForm_" + userId) === "true"
          ) {
            router.push("/");
          } else {
            router.push("/preferences");
          }
        }, 800);
      } else {
        setErrorMessage(data.message || "Authentication Failed!");
        setTimeout(() => setErrorMessage(""), 3000);
      }
    } catch (error) {
      setErrorMessage("SYSTEM OFFLINE: CHECK GATEWAY CONNECTION");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerForgotPassword = () => {
    setShowForgotModal(true);
    setForgotMessage("");
    setForgotEmail(email); // Tự động điền email nếu đã nhập ở màn hình login
  };

  const submitForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setShakeFields(["forgot-email"]);
      setTimeout(() => setShakeFields([]), 500);
      setForgotMessage("Vui lòng nhập email / Please enter email");
      return;
    }
    if (!validateEmail(forgotEmail)) {
      setShakeFields(["forgot-email"]);
      setTimeout(() => setShakeFields([]), 500);
      setForgotMessage("Email không hợp lệ / Invalid email format");
      return;
    }

    setForgotLoading(true);
    setForgotMessage("");
    try {
      const res = await fetch("http://localhost:80/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      setForgotMessage(data.message || "Đã gửi yêu cầu khôi phục mật khẩu!");
      if (res.ok) {
        setTimeout(() => setShowForgotModal(false), 3000);
      }
    } catch (err) {
      setForgotMessage("Lỗi khi kết nối với máy chủ.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    alert("Chức năng Google Login đang được phát triển. Vui lòng thử lại sau!");
    // TODO: Chèn logic OAuth thực tế vào đây sau.
  };

  if (!mounted) return null;

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
          style={{
            flex: 1,
            borderTop: "1px solid var(--cyber-border)",
            opacity: 0.5,
          }}
        ></div>
        <span
          style={{
            padding: "0 1.5rem",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            background: "transparent",
          }}
        >
          {t("login.orContinueWith" as any)}
        </span>
        <div
          style={{
            flex: 1,
            borderTop: "1px solid var(--cyber-border)",
            opacity: 0.5,
          }}
        ></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="social-btn"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            padding: "0.9rem",
            borderRadius: "8px",
            border: "1px solid rgba(52, 229, 235, 0.3)",
            background: "var(--cyber-card-bg)",
            color: "var(--text-main)",
            cursor: "pointer",
            fontSize: "1.1rem",
            fontWeight: "600",
            transition: "all 0.3s ease",
          }}
        >
          <svg
            style={{ width: "1.2rem", height: "1.2rem" }}
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
      </div>
    </div>
  );

  if (!mounted) return null;

  return (
    <main
      className="boot-sequence"
      style={{
        minHeight: "100vh",
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
              background: var(--cyber-input-bg);
              color: var(--text-main);
              outline: none;
              transition: all 0.3s ease;
              box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
            }
            .cyber-input:focus {
              border-color: var(--cyber-yellow);
              box-shadow: 0 0 15px rgba(251, 191, 36, 0.3), inset 0 0 10px rgba(0,0,0,0.5);
              background: var(--cyber-input-bg);
            }

            .slider-gradient {
              background: var(--cyber-surface-glass);
              border-left: 2px solid var(--cyber-blue);
              border-right: 2px solid var(--cyber-blue);
              box-shadow: 0 0 40px rgba(52, 229, 235, 0.3);
            }

            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              20%, 60% { transform: translateX(-5px); border-color: var(--cyber-red); box-shadow: 0 0 15px rgba(248, 113, 113, 0.4); }
              40%, 80% { transform: translateX(5px); border-color: var(--cyber-red); box-shadow: 0 0 15px rgba(248, 113, 113, 0.4); }
            }
            .shake-animation {
              animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
            }
            /* NOTIFICATION SYSTEM - CYBERPUNK STYLE */
            .message-box {
              width: 100%;
              padding: 12px 16px;
              margin-bottom: 1.6rem;
              border-radius: 8px;
              font-family: var(--font-mono);
              font-size: 0.95rem;
              display: flex;
              align-items: center;
              gap: 12px;
              animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              backdrop-filter: blur(10px);
            }

            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }

            .message-error {
              background: var(--cyber-surface-glass);
              border: 1px solid rgba(248, 113, 113, 0.2);
              border-left: 4px solid var(--cyber-red);
              color: var(--text-main);
              box-shadow: 0 0 15px rgba(248, 113, 113, 0.15);
            }

            .message-success {
              background: var(--cyber-surface-glass);
              border: 1px solid rgba(52, 229, 235, 0.2);
              border-left: 4px solid var(--cyber-blue);
              color: var(--text-main);
              box-shadow: 0 0 15px rgba(52, 229, 235, 0.15);
            }

            .overlay-panel {
              position: absolute;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
              padding: 0 40px;
              text-align: center;
              top: 0;
              height: 100%;
              width: 50%;
              transform: translateX(0);
              transition: transform 0.6s ease-in-out;
              overflow: hidden;
            }

            .panel-image-bg {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              opacity: 0.2;
              filter: blur(3px);
              pointer-events: none;
              z-index: 0;
              background-size: cover;
              background-position: center;
              transition: all 0.5s ease;
              background-image: url("/images/bg4.jpg");
            }
          `,
        }}
      />

      {/* =========================================
          BACKGROUND 3D GRID & SCANNER
          ========================================= */}
      <div
        className="map-fade-in"
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
      >
        {/* Sky / deep gradient */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--bg-gradient)",
            opacity: 0.95,
          }}
        />

        {/* Global Laser Scan Line */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "4px",
            background: "var(--cyber-blue)",
            boxShadow: "0 0 20px 5px var(--cyber-blue-glow)",
            animation: "scanning-laser 6s linear infinite",
            zIndex: 5,
            pointerEvents: "none",
          }}
        />

        {/* Animated 3D Grid */}
        <div
          style={{
            position: "absolute",
            inset: "-50%",
            backgroundImage:
              "linear-gradient(rgba(52, 229, 235, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(52, 229, 235, 0.1) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            animation: "grid-pan 4s linear infinite",
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
            top: "25%",
            left: "-5rem",
            width: "30rem",
            height: "30rem",
            borderRadius: "50%",
            opacity: 0.2,
            filter: "blur(80px)",
            background:
              "radial-gradient(circle, var(--cyber-blue) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "-5rem",
            width: "30rem",
            height: "30rem",
            borderRadius: "50%",
            opacity: 0.2,
            filter: "blur(80px)",
            background:
              "radial-gradient(circle, var(--cyber-purple) 0%, transparent 70%)",
          }}
        />
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
          background: "var(--cyber-surface-glass)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(52, 229, 235, 0.3)",
          boxShadow: "0 0 60px rgba(0, 0, 0, 0.8)",
          display: "flex",
        }}
      >
        {/* Top Edge Highlight Line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            zIndex: 30,
            background:
              "linear-gradient(90deg, var(--cyber-blue), var(--cyber-yellow), var(--cyber-purple))",
          }}
        />

        {/* --- FORM 1 : REGISTRATION --- */}
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
            padding: "0 3.5rem",
            transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            opacity: isSignUp ? 1 : 0,
            transform: isSignUp ? "translateY(0)" : "translateY(20px)",
            zIndex: isSignUp ? 10 : -1,
            pointerEvents: isSignUp ? "auto" : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              marginBottom: "2rem",
            }}
          >
            <Fingerprint size={45} color="var(--cyber-purple)" />
            <h2
              className="glitch-yellow"
              style={{
                fontSize: "2.8rem",
                margin: 0,
                color: "var(--cyber-purple)",
                textShadow: "0 0 20px rgba(167, 139, 250, 0.5)",
              }}
            >
              {t("login.registerTitle") as any}
            </h2>
          </div>
          <div style={{ width: "100%" }}>
            {errorMessage && (
              <div className="message-box message-error">
                <ShieldAlert
                  size={20}
                  color="var(--cyber-red)"
                  style={{ flexShrink: 0 }}
                />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="message-box message-success">
                <CheckCircle
                  size={20}
                  color="var(--cyber-blue)"
                  style={{ flexShrink: 0 }}
                />
                <span>{successMessage}</span>
              </div>
            )}
          </div>
          <form
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "1.2rem",
            }}
            onSubmit={handleLogin}
          >
            <input
              type="text"
              placeholder={t("login.usernamePlaceholder") as any}
              className={`cyber-input ${shakeFields.includes("register-name") ? "shake-animation" : ""}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Email"
              className={`cyber-input ${shakeFields.includes("register-email") ? "shake-animation" : ""}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder={t("login.passwordPlaceholder") as any}
              className={`cyber-input ${shakeFields.includes("register-password") ? "shake-animation" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="submit"
              className="cyber-button"
              disabled={isLoading}
              style={{
                marginTop: "0.5rem",
                padding: "1.25rem",
                background: "var(--cyber-purple)",
                color: "var(--cyber-surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 0 20px rgba(167, 139, 250, 0.3)",
              }}
            >
              {isLoading ? <Scan className="animate-spin" /> : <UserPlus />}
              {isLoading
                ? (t("login.creatingAcc") as any)
                : (t("login.createAccountBtn") as any)}
            </button>
          </form>
          <SocialButtons />
        </div>

        {/* --- FORM 2 : LOGIN --- */}
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
            padding: "0 3.5rem",
            transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            opacity: isSignUp ? 0 : 1,
            transform: isSignUp ? "translateY(20px)" : "translateY(0)",
            zIndex: isSignUp ? -1 : 10,
            pointerEvents: isSignUp ? "none" : "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              marginBottom: "2rem",
            }}
          >
            <ShieldCheck size={45} color="var(--cyber-blue)" />
            <h2
              className="glitch-yellow"
              style={{
                fontSize: "2.8rem",
                margin: 0,
                color: "var(--cyber-blue)",
                textShadow: "0 0 20px rgba(52, 229, 235, 0.5)",
              }}
            >
              {t("login.loginTitle") as any}
            </h2>
          </div>

          <div style={{ width: "100%" }}>
            {errorMessage && (
              <div className="message-box message-error">
                <ShieldAlert
                  size={20}
                  color="var(--cyber-red)"
                  style={{ flexShrink: 0 }}
                />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="message-box message-success">
                <CheckCircle
                  size={20}
                  color="var(--cyber-blue)"
                  style={{ flexShrink: 0 }}
                />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          <form
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "1.2rem",
            }}
            onSubmit={handleLogin}
          >
            <input
              type="text"
              placeholder="Email"
              className={`cyber-input ${shakeFields.includes("login-email") ? "shake-animation" : ""}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)} // Cập nhật state
            />
            <input
              type="password"
              placeholder={t("login.passwordPlaceholder") as any}
              className={`cyber-input ${shakeFields.includes("login-password") ? "shake-animation" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)} // Cập nhật state
            />
            <div style={{ textAlign: "right", marginTop: "-0.5rem" }}>
              <button
                type="button"
                onClick={triggerForgotPassword}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--cyber-blue)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  textDecoration: "underline",
                }}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="cyber-button"
              disabled={isLoading}
              style={{
                marginTop: "0.5rem",
                padding: "1.25rem",
                background: "var(--cyber-blue)",
                color: "var(--cyber-black)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 0 20px rgba(52, 229, 235, 0.4)",
              }}
            >
              {isLoading ? <Scan className="animate-spin" /> : <LogIn />}
              {isLoading
                ? (t("login.signingIn") as any)
                : (t("login.signInBtn") as any)}
            </button>
          </form>
          <SocialButtons />
        </div>

        {/* --- DYNAMIC OVERLAY SLIDER --- */}
        <div
          className="slider-gradient"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "50%",
            height: "100%",
            zIndex: 20,
            transition: "all 0.8s cubic-bezier(0.25, 1, 0.35, 1)", // Premium liding ease
            transform: isSignUp ? "translateX(100%)" : "translateX(0)",
          }}
        >
          {/* Noise / Pattern overlay inside slider */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.05%22/%3E%3C/svg%3E')",
              pointerEvents: "none",
            }}
          />

          {/* Welcome Back (Shown when Login is hidden / Slider is on Right) */}
          <div
            className="overlay-panel overlay-left"
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "3rem",
              textAlign: "center",
              transition:
                "opacity 0.5s ease-in-out, transform 0.5s ease-in-out",
              opacity: isSignUp ? 1 : 0,
              transform: isSignUp ? "scale(1)" : "scale(0.95)",
              pointerEvents: isSignUp ? "auto" : "none",
            }}
          >
            <div className="panel-image-bg" />
            <h2
              className="glitch-yellow"
              style={{
                fontSize: "3.2rem",
                color: "var(--text-main)",
                marginBottom: "1rem",
              }}
            >
              {t("login.welcomeBack") as any}
            </h2>
            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: "2.5rem",
                fontSize: "1.3rem",
                fontWeight: "500",
                lineHeight: 1.6,
                whiteSpace: "pre-line",
              }}
            >
              {t("login.welcomeDesc")}
            </p>
            <button
              onClick={() => setIsSignUp(false)}
              style={{
                padding: "1.2rem 4rem",
                fontSize: "1.05rem",
                borderRadius: "50px",
                border: "2px solid var(--cyber-blue)",
                background: "rgba(52, 229, 235, 0.1)",
                color: "var(--text-main)",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.3s ease",
                letterSpacing: "2px",
                boxShadow: "0 0 20px rgba(52, 229, 235, 0.2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--cyber-blue)";
                e.currentTarget.style.color = "var(--cyber-surface)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(52, 229, 235, 0.1)";
                e.currentTarget.style.color = "var(--text-main)";
              }}
            >
              {t("login.switchToLogin") as any}
            </button>
          </div>

          {/* Join Us (Shown when Register is hidden / Slider is on Left) */}
          <div
            className="overlay-panel overlay-right"
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "3rem",
              textAlign: "center",
              transition:
                "opacity 0.5s ease-in-out, transform 0.5s ease-in-out",
              opacity: isSignUp ? 0 : 1,
              transform: isSignUp ? "scale(0.95)" : "scale(1)",
              pointerEvents: isSignUp ? "none" : "auto",
            }}
          >
            <div className="panel-image-bg" />
            <h2
              className="glitch-yellow"
              style={{
                fontSize: "3.2rem",
                color: "var(--text-main)",
                marginBottom: "1rem",
              }}
            >
              {t("login.helloTraveler") as any}
            </h2>
            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: "2.5rem",
                fontSize: "1.3rem",
                fontWeight: "500",
                lineHeight: 1.6,
                whiteSpace: "pre-line",
              }}
            >
              {t("login.helloDesc") as any}
            </p>
            <button
              onClick={() => setIsSignUp(true)}
              style={{
                padding: "1.2rem 4rem",
                fontSize: "1.05rem",
                borderRadius: "50px",
                border: "2px solid var(--cyber-purple)",
                background: "rgba(167, 139, 250, 0.1)",
                color: "var(--text-main)",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.3s ease",
                letterSpacing: "2px",
                boxShadow: "0 0 20px rgba(167, 139, 250, 0.2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--cyber-purple)";
                e.currentTarget.style.color = "var(--cyber-surface)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(167, 139, 250, 0.1)";
                e.currentTarget.style.color = "var(--text-main)";
              }}
            >
              {t("login.switchToRegister") as any}
            </button>
          </div>
        </div>
      </div>

      {/* =========================================
          FORGOT PASSWORD MODAL
          ========================================= */}
      {showForgotModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--cyber-surface-glass)",
            backdropFilter: "blur(5px)",
            animation: "map-reveal 0.3s ease-out",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "450px",
              padding: "2.5rem",
              borderRadius: "16px",
              background: "var(--cyber-surface-glass)",
              border: "1px solid rgba(52, 229, 235, 0.4)",
              boxShadow:
                "0 0 40px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(52, 229, 235, 0.1)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowForgotModal(false)}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "1.5rem",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--cyber-red)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              ✕
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ShieldAlert size={30} color="var(--cyber-yellow)" />
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.8rem",
                  color: "var(--cyber-yellow)",
                  textShadow: "0 0 10px rgba(251, 191, 36, 0.4)",
                }}
              >
                Reset Password
              </h3>
            </div>

            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.95rem",
                lineHeight: 1.5,
              }}
            >
              Nhập email của bạn để nhận liên kết khôi phục mật khẩu.
            </p>

            {forgotMessage && (
              <div
                className={`message-box ${forgotMessage.includes("Lỗi") || forgotMessage.includes("không hợp lệ") || forgotMessage.includes("invalid") ? "message-error" : "message-success"}`}
                style={{ marginBottom: "0.5rem" }}
              >
                <span>{forgotMessage}</span>
              </div>
            )}

            <form
              onSubmit={submitForgotPassword}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.2rem",
              }}
            >
              <input
                type="text"
                placeholder="Nhập email của bạn"
                className={`cyber-input ${shakeFields.includes("forgot-email") ? "shake-animation" : ""}`}
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
              <button
                type="submit"
                className="cyber-button"
                disabled={forgotLoading}
                style={{
                  padding: "1.25rem",
                  background: "var(--cyber-yellow)",
                  color: "var(--cyber-black)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  fontWeight: "bold",
                  fontSize: "1.05rem",
                  boxShadow: "0 0 20px rgba(251, 191, 36, 0.4)",
                  border: "none",
                  borderRadius: "8px",
                  cursor: forgotLoading ? "not-allowed" : "pointer",
                }}
              >
                {forgotLoading ? (
                  <Scan className="animate-spin" />
                ) : (
                  "Gửi liên kết khôi phục"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
