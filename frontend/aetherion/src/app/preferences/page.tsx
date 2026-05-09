"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import {
  CheckCircle,
  Save,
  XCircle,
  MapPin,
  Car,
  Bike,
  User,
} from "lucide-react";

// Loại bỏ thuộc tính label cứng, sẽ dùng t(`location.${value}`) để hiển thị
const LOCATION_PREFERENCES = [
  { value: "market", icon: "🏪" },
  { value: "food", icon: "🍜" },
  { value: "price", icon: "💰" },
  { value: "guide", icon: "🧭" },
  { value: "service", icon: "⭐" },
  { value: "staff", icon: "🤝" },
  { value: "park", icon: "🌳" },
  { value: "space", icon: "🏟️" },
  { value: "view", icon: "🌅" },
  { value: "quality", icon: "🏅" },
  { value: "temple", icon: "⛩️" },
  { value: "air", icon: "💨" },
  { value: "trees", icon: "🌿" },
  { value: "church", icon: "⛪" },
  { value: "shop", icon: "🛍️" },
  { value: "mall", icon: "🏬" },
  { value: "floor", icon: "🏢" },
  { value: "atmosphere", icon: "✨" },
  { value: "city", icon: "🌆" },
  { value: "attitude", icon: "😊" },
  { value: "culture", icon: "🎭" },
  { value: "location", icon: "📍" },
  { value: "markets", icon: "🛒" },
  { value: "life", icon: "🎶" },
  { value: "clothes", icon: "👗" },
  { value: "store", icon: "🏪" },
  { value: "scenery", icon: "🏞️" },
  { value: "goods", icon: "📦" },
  { value: "tea", icon: "🍵" },
  { value: "fun", icon: "🎉" },
];

const CAR_BRANDS = ["MERCEDES", "BMW", "AUDI", "HYUNDAI", "KIA"];
const MOTORBIKE_BRANDS = [
  "HONDA",
  "YAMAHA",
  "SUZUKI",
  "KAWASAKI",
  "VESPA",
  "DUCATI",
  "VINFAST",
  "DAT BIKE",
  "VICTORY",
  "ALPHA",
  "VOLVO",
  "LIFAN",
];

export default function PreferencesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCars, setSelectedCars] = useState<string[]>([]);
  const [selectedMotorbikes, setSelectedMotorbikes] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    try {
      const userStr = localStorage.getItem("cyber_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.name) setNickname(user.name);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  if (!mounted) return null;

  const toggleSelection = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    item: string,
  ) => {
    setter((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const handleSkip = (hideForever: boolean) => {
    if (hideForever) {
      try {
        const userStr = localStorage.getItem("cyber_user");
        if (userStr) {
          const user = JSON.parse(userStr);
          localStorage.setItem("hidePreferencesForm_" + user.id, "true");
        }
      } catch (e) {}
    }
    router.push("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (nickname) {
      localStorage.setItem("cyber_user_nickname", nickname);
    }
    if (age) {
      localStorage.setItem("cyber_user_age", age);
    }

    const payload = {
      nickname,
      age: parseInt(age) || null,
      locations: selectedLocations,
      cars: selectedCars,
      motorbikes: selectedMotorbikes,
    };

    console.log("=== GỬI DỮ LIỆU ĐIỀN FORM TỚI LINKTEST ===");
    console.log(payload);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      try {
        const userStr = localStorage.getItem("cyber_user");
        if (userStr) {
          const user = JSON.parse(userStr);
          localStorage.setItem("hidePreferencesForm_" + user.id, "true");
        }
      } catch (e) {}

      router.push("/");
    } catch (error) {
      console.error("Lỗi:", error);
      alert(t("preferences.errorMsg" as any));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        background: "var(--cyber-black)",
        padding: "3rem 1rem",
        display: "flex",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* LIGHT DYNAMIC ANIMATED BACKGROUND */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: "linear-gradient(-45deg, #0f172a, #1e293b, #000000, #0f172a)",
          backgroundSize: "400% 400%",
          animation: "gradientBG 15s ease infinite",
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes floatOrb1 {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(20px, -30px) scale(1.05); }
            100% { transform: translate(0, 0) scale(1); }
          }
          @keyframes floatOrb2 {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-20px, 30px) scale(1.1); }
            100% { transform: translate(0, 0) scale(1); }
          }
        `}} />
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "5%",
            width: "40vw",
            height: "40vw",
            borderRadius: "50%",
            opacity: 0.1,
            filter: "blur(90px)",
            background: "var(--cyber-blue)",
            animation: "floatOrb1 15s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "5%",
            width: "35vw",
            height: "35vw",
            borderRadius: "50%",
            opacity: 0.1,
            filter: "blur(100px)",
            background: "var(--cyber-purple)",
            animation: "floatOrb2 18s ease-in-out infinite",
          }}
        />
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          background: "rgba(15, 23, 42, 0.85)",
          border: "1px solid rgba(52, 229, 235, 0.3)",
          borderRadius: "16px",
          boxShadow: "0 0 50px rgba(0,0,0,0.6)",
          backdropFilter: "blur(20px)",
          padding: "3rem",
          position: "relative",
          zIndex: 10,
          animation: "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1
            className="glitch-yellow"
            style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}
          >
            {t("preferences.title" as any)}
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "1.1rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            {t("preferences.subtitle" as any)}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}
        >
          {/* Section 1: Thông tin cá nhân */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "1rem",
                color: "var(--cyber-yellow)",
              }}
            >
              <User size={24} />
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.4rem",
                  fontFamily: "var(--font-header)",
                }}
              >
                {t("preferences.personalInfo" as any)}
              </h2>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    color: "var(--text-muted)",
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem",
                    textTransform: "uppercase",
                  }}
                >
                  {t("preferences.nickname" as any)}
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t("preferences.nicknamePlaceholder" as any)}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    borderRadius: "8px",
                    color: "white",
                    outline: "none",
                    fontSize: "1rem",
                    transition: "border 0.3s",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--cyber-yellow)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(251, 191, 36, 0.3)")
                  }
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    color: "var(--text-muted)",
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem",
                    textTransform: "uppercase",
                  }}
                >
                  {t("preferences.age" as any)}
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder={t("preferences.agePlaceholder" as any)}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    borderRadius: "8px",
                    color: "white",
                    outline: "none",
                    fontSize: "1rem",
                    transition: "border 0.3s",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--cyber-yellow)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(251, 191, 36, 0.3)")
                  }
                />
              </div>
            </div>
          </section>

          {/* Section 2: Sở thích địa điểm */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "1rem",
                color: "var(--cyber-blue)",
              }}
            >
              <MapPin size={24} />
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.4rem",
                  fontFamily: "var(--font-header)",
                }}
              >
                {t("preferences.locationInfo" as any)}
              </h2>
            </div>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                marginBottom: "1rem",
              }}
            >
              {t("preferences.locationDesc" as any)} (
              {t("preferences.selected" as any)}: {selectedLocations.length})
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {LOCATION_PREFERENCES.map((pref) => {
                const isSelected = selectedLocations.includes(pref.value);
                return (
                  <button
                    key={pref.value}
                    type="button"
                    onClick={() =>
                      toggleSelection(setSelectedLocations, pref.value)
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 16px",
                      borderRadius: "50px",
                      border: `1px solid ${isSelected ? "var(--cyber-blue)" : "rgba(255,255,255,0.1)"}`,
                      background: isSelected
                        ? "rgba(52, 229, 235, 0.15)"
                        : "rgba(0,0,0,0.3)",
                      color: isSelected ? "white" : "var(--text-muted)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      fontSize: "0.95rem",
                    }}
                  >
                    <span>{pref.icon}</span>{" "}
                    {t(`location.${pref.value}` as any)}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 3: Xe Hơi */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "1rem",
                color: "var(--cyber-purple)",
              }}
            >
              <Car size={24} />
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.4rem",
                  fontFamily: "var(--font-header)",
                }}
              >
                {t("preferences.carInfo" as any)}
              </h2>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {CAR_BRANDS.map((car) => {
                const isSelected = selectedCars.includes(car);
                return (
                  <button
                    key={car}
                    type="button"
                    onClick={() => toggleSelection(setSelectedCars, car)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      border: `1px solid ${isSelected ? "var(--cyber-purple)" : "rgba(255,255,255,0.1)"}`,
                      background: isSelected
                        ? "rgba(167, 139, 250, 0.2)"
                        : "rgba(0,0,0,0.3)",
                      color: isSelected ? "white" : "var(--text-muted)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      fontWeight: "bold",
                      letterSpacing: "1px",
                    }}
                  >
                    {car}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 4: Xe Máy */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "1rem",
                color: "#4ade80",
              }}
            >
              <Bike size={24} />
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.4rem",
                  fontFamily: "var(--font-header)",
                }}
              >
                {t("preferences.bikeInfo" as any)}
              </h2>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {MOTORBIKE_BRANDS.map((bike) => {
                const isSelected = selectedMotorbikes.includes(bike);
                return (
                  <button
                    key={bike}
                    type="button"
                    onClick={() => toggleSelection(setSelectedMotorbikes, bike)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      border: `1px solid ${isSelected ? "#4ade80" : "rgba(255,255,255,0.1)"}`,
                      background: isSelected
                        ? "rgba(74, 222, 128, 0.2)"
                        : "rgba(0,0,0,0.3)",
                      color: isSelected ? "white" : "var(--text-muted)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      fontWeight: "bold",
                      letterSpacing: "1px",
                    }}
                  >
                    {bike}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Action Buttons */}
          <div
            style={{
              marginTop: "2rem",
              paddingTop: "2rem",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={() => handleSkip(false)}
                style={{
                  padding: "0.9rem 1.5rem",
                  background: "transparent",
                  color: "var(--text-muted)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  fontSize: "0.95rem",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--text-muted)")
                }
              >
                {t("preferences.skip" as any)}
              </button>
              <button
                type="button"
                onClick={() => handleSkip(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "0.9rem 1.5rem",
                  background: "rgba(248, 113, 113, 0.1)",
                  color: "#fca5a5",
                  border: "1px solid rgba(248, 113, 113, 0.3)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  fontSize: "0.95rem",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(248, 113, 113, 0.2)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(248, 113, 113, 0.1)")
                }
              >
                <XCircle size={18} /> {t("preferences.neverShow" as any)}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "1rem 2.5rem",
                background: "var(--cyber-blue)",
                color: "black",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "1.05rem",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                boxShadow: "0 0 20px rgba(52, 229, 235, 0.4)",
                transition: "all 0.3s",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting
                ? t("preferences.submitting" as any)
                : t("preferences.submit" as any)}
              {!isSubmitting && <CheckCircle size={20} />}
            </button>
          </div>
        </form>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `,
        }}
      />
    </main>
  );
}
