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

// Bản đồ hình ảnh theo chủ đề
const THEME_IMAGES: Record<string, string> = {
  // Locations
  market: "/images/cho.jpg",
  food: "/images/bg6.jpg",
  park: "/images/bg11.jpg",
  view: "/images/bg3.jpg",
  city: "/images/hanoi.jpg",
  floor: "/images/landmark.jpg",
  church: "/images/church.jpg",
  temple: "/images/bg14.jpeg",
  mall: "/images/mall.jpg",
  atmosphere: "/images/atmosphere.jpg",
  price: "/images/price.jpg",
  guide: "/images/bg8.JPG",
  service: "/images/service.jpg",
  staff: "/images/bg10.jpeg",
  quality: "/images/quality.jpg",
  shop: "/images/retail.jpg",
  air: "/images/freshair.jpg",
  space: "/images/bg12.jpeg",
  culture: "/images/culture.jpg",
  trees: "/images/manytree.jpg",
  attitude: "/images/Attitude.jpg",
  location: "/images/location.jpg",
  markets: "/images/market.jpg",
  life: "/images/life.jpg",
  clothes: "/images/fashion.jpg",
  store: "/images/diverse.jpg",
  scenery: "/images/natural.jpg",
  goods: "/images/goods.jpg",
  tea: "/images/drink.jpg",
  fun: "/images/fun.jpg",

  // Brands
  MERCEDES: "/images/mercedes.jpg",
  BMW: "/images/bmw.jpeg",
  AUDI: "/images/audi.jpg",
  HYUNDAI: "/images/hyundai.jpg",
  KIA: "/images/kia.jpg",
  HONDA: "/images/honda.png",
  YAMAHA: "/images/yamaha.jpg",
  VINFAST: "/images/vinfast.jpg",
  SUZUKI: "/images/suzuki.jpeg",
  KAWASAKI: "/images/kawasaki.jpg",
  VESPA: "/images/vespa.jpg",
  DUCATI: "/images/ducati.jpg",
  "DAT BIKE": "/images/datbike.jpg",
  VICTORY: "/images/victory.png",
  ALPHA: "/images/alpha.jpg",
  VOLVO: "/images/volvo.jpg",
  LIFAN: "/images/lifan.jpg",
};

export default function PreferencesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCars, setSelectedCars] = useState<string[]>([]);
  const [selectedMotorbikes, setSelectedMotorbikes] = useState<string[]>([]);
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);
  const [bgInfo, setBgInfo] = useState({
    imageA: "",
    imageB: "",
    showA: true,
  });
  const [activeVisual, setActiveVisual] = useState<string | null>(null);

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

  useEffect(() => {
    if (activeVisual) {
      const newImg =
        THEME_IMAGES[activeVisual] ||
        `https://source.unsplash.com/featured/?${activeVisual.toLowerCase()}`;
      setBgInfo((prev) => {
        if (prev.showA) {
          return { ...prev, imageB: newImg, showA: false };
        } else {
          return { ...prev, imageA: newImg, showA: true };
        }
      });
    }
  }, [activeVisual]);

  if (!mounted) return null;

  const toggleSelection = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    item: string,
  ) => {
    setter((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const handleSkip = async (hideForever: boolean) => {
    if (hideForever) {
      try {
        const token = localStorage.getItem("accessToken");
        const nginxUrl = process.env.NEXT_PUBLIC_NGINX_URL || "http://localhost";
        
        await fetch(`${nginxUrl}/preferences`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ skipped: true }),
        });

        const userStr = localStorage.getItem("cyber_user");
        if (userStr) {
          const user = JSON.parse(userStr);
          user.hidePreferencesForm = true;
          localStorage.setItem("cyber_user", JSON.stringify(user));
        }
      } catch (e) {
        console.error("Error setting forever skip", e);
      }
    }
    router.push("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (nickname) {
      localStorage.setItem("cyber_user_nickname", nickname);
    }
    if (phone) {
      localStorage.setItem("cyber_user_phone", phone);
    }

    const payload = {
      nickname,
      phone: phone || null,
      locations: selectedLocations,
      cars: selectedCars,
      motorbikes: selectedMotorbikes,
    };

    try {
      const token = localStorage.getItem("accessToken");
      const nginxUrl = process.env.NEXT_PUBLIC_NGINX_URL || "http://localhost";

      const response = await fetch(`${nginxUrl}/preferences`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error("API error");

      try {
        const userStr = localStorage.getItem("cyber_user");
        if (userStr) {
          const user = JSON.parse(userStr);
          user.hidePreferencesForm = true;
          localStorage.setItem("cyber_user", JSON.stringify(user));
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
          background: "var(--bg-gradient)",
          backgroundSize: "400% 400%",
          animation: "gradientBG 15s ease infinite",
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
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
        `,
          }}
        />
        <div
          className="ambient-orb"
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
          className="ambient-orb"
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

      {/* Dynamic Thematic Background Cross-fade */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          transition: "opacity 1s ease-in-out",
          opacity: bgInfo.showA ? 0.3 : 0,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundImage: `url('${bgInfo.imageA}')`,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          transition: "opacity 1s ease-in-out",
          opacity: !bgInfo.showA ? 0.3 : 0,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundImage: `url('${bgInfo.imageB}')`,
        }}
      />

      {/* Vignette Layer */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          background:
            "radial-gradient(circle at center, transparent 0%, var(--cyber-black) 100%)",
          opacity: hoveredBrand ? 0.8 : 0,
          transition: "opacity 1s ease-in-out",
          pointerEvents: "none",
        }}
      />

      {/* Vignette Layer */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          background:
            "radial-gradient(circle at center, transparent 0%, var(--cyber-black) 100%)",
          opacity: activeVisual ? 0.4 : 0,
          transition: "opacity 1s ease-in-out",
          pointerEvents: "none",
        }}
      />

      {/* --- MAIN LAYOUT CONTAINER --- */}
      <div
        className="main-layout"
        style={{
          display: "flex",
          width: "100%",
          maxWidth: "1400px",
          height: "85vh",
          gap: "2rem",
          position: "relative",
          zIndex: 10,
          padding: "0 1rem",
        }}
      >
        {/* LEFT SIDE: SCROLLABLE FORM */}
        <div
          className="form-column"
          style={{
            flex: "1 1 60%",
            background: "var(--cyber-surface-glass)",
            border: "1px solid rgba(52, 229, 235, 0.3)",
            borderRadius: "16px",
            boxShadow: "0 0 50px rgba(0,0,0,0.6)",
            backdropFilter: "blur(20px)",
            padding: "2.5rem",
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "var(--cyber-blue) transparent",
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
                      background: "var(--cyber-input-bg)",
                      border: "1px solid rgba(251, 191, 36, 0.3)",
                      borderRadius: "8px",
                      color: "var(--text-main)",
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
                    {t("preferences.phone" as any)}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("preferences.phonePlaceholder" as any)}
                    style={{
                      width: "100%",
                      padding: "1rem",
                      background: "var(--cyber-input-bg)",
                      border: "1px solid rgba(251, 191, 36, 0.3)",
                      borderRadius: "8px",
                      color: "var(--text-main)",
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
                      onClick={() => {
                        toggleSelection(setSelectedLocations, pref.value);
                        setActiveVisual(pref.value);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 16px",
                        borderRadius: "50px",
                        border: `1px solid ${isSelected ? "var(--cyber-blue)" : "var(--cyber-grid)"}`,
                        background: isSelected
                          ? "rgba(52, 229, 235, 0.15)"
                          : "var(--cyber-input-bg)",
                        color: isSelected
                          ? "var(--text-main)"
                          : "var(--text-muted)",
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
                {CAR_BRANDS.map((brand) => {
                  const isSelected = selectedCars.includes(brand);
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => {
                        toggleSelection(setSelectedCars, brand);
                        setActiveVisual(brand);
                      }}
                      style={{
                        padding: "10px 20px",
                        borderRadius: "8px",
                        border: `1px solid ${isSelected ? "var(--cyber-purple)" : "var(--cyber-grid)"}`,
                        background: isSelected
                          ? "rgba(167, 139, 250, 0.2)"
                          : "var(--cyber-input-bg)",
                        color: isSelected
                          ? "var(--text-main)"
                          : "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        fontWeight: "bold",
                        letterSpacing: "1px",
                      }}
                    >
                      {brand}
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
                {MOTORBIKE_BRANDS.map((brand) => {
                  const isSelected = selectedMotorbikes.includes(brand);
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => {
                        toggleSelection(setSelectedMotorbikes, brand);
                        setActiveVisual(brand);
                      }}
                      style={{
                        padding: "10px 20px",
                        borderRadius: "8px",
                        border: `1px solid ${isSelected ? "#4ade80" : "var(--cyber-grid)"}`,
                        background: isSelected
                          ? "rgba(74, 222, 128, 0.2)"
                          : "var(--cyber-input-bg)",
                        color: isSelected
                          ? "var(--text-main)"
                          : "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        fontWeight: "bold",
                        letterSpacing: "1px",
                      }}
                    >
                      {brand}
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
                    border: "1px solid var(--cyber-grid)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    fontSize: "0.95rem",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--text-main)")
                  }
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
                    fontWeight: "700",
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
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  fontSize: "1.05rem",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  boxShadow: "0 0 20px var(--cyber-blue-glow)",
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

        {/* RIGHT SIDE: VISUAL INTELLIGENCE PANEL */}
        <div
          className="visual-panel"
          style={{
            flex: "1 1 40%",
            background: "var(--cyber-surface-glass-light)",
            border: "1px solid var(--cyber-grid)",
            borderRadius: "16px",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "2rem",
            animation:
              "slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          {/* Animated Scanning Frame */}
          <div className="scanning-frame" />

          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid var(--cyber-grid)",
            }}
          >
            {/* Cross-fade images inside panel */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                transition: "opacity 1s ease-in-out",
                opacity: bgInfo.showA ? 1 : 0,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundImage: `url('${bgInfo.imageA}')`,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                transition: "opacity 1s ease-in-out",
                opacity: !bgInfo.showA ? 1 : 0,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundImage: `url('${bgInfo.imageB}')`,
              }}
            />

            {/* Fallback pattern if no image */}
            {!activeVisual && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0,0,0,0.4)",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--cyber-blue)",
                    opacity: 0.5,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8rem",
                    }}
                  >
                    WAITING FOR SELECTION...
                  </p>
                  <p style={{ fontSize: "2rem" }}>🛰️</p>
                </div>
              </div>
            )}
          </div>

          {/* Decorative Info Overlay */}
          {activeVisual && (
            <div
              style={{
                marginTop: "1.5rem",
                width: "100%",
                padding: "1rem",
                background: "var(--ai-badge-bg)",
                borderLeft: "4px solid var(--cyber-yellow)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <div
                style={{
                  color: "var(--cyber-yellow)",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  marginBottom: "0.4rem",
                  letterSpacing: "0.05em",
                }}
              >
                INTELLIGENCE_ID: {activeVisual.toUpperCase()}
              </div>
              <div
                style={{
                  color: "var(--text-main)",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                }}
              >
                {LOCATION_PREFERENCES.find((p) => p.value === activeVisual)
                  ? t(`location.${activeVisual}` as any)
                  : activeVisual}
              </div>
              <div
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  marginTop: "0.5rem",
                  lineHeight: "1.4",
                }}
              >
                System analysis complete. Optimal profile mapped to user
                preferences.
              </div>
            </div>
          )}

          {/* Style for scanning frame */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
            @keyframes slideInRight {
              from { opacity: 0; transform: translateX(50px); }
              to { opacity: 1; transform: translateX(0); }
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .scanning-frame {
              position: absolute;
              inset: 0;
              pointer-events: none;
              border: 1px solid var(--cyber-blue);
              opacity: 0.1;
              background: linear-gradient(var(--cyber-grid) 1px, transparent 1px), linear-gradient(90deg, var(--cyber-grid) 1px, transparent 1px);
              background-size: 20px 20px;
            }
            .form-column::-webkit-scrollbar { width: 4px; }
            .form-column::-webkit-scrollbar-thumb { background: var(--cyber-blue); border-radius: 10px; }
            
            @media (max-width: 1024px) {
              .main-layout { flex-direction: column; height: auto !important; display: block !important; }
              .visual-panel { height: 300px; margin-bottom: 1rem; }
              .form-column { width: 100%; height: auto; padding: 1.5rem; }
            }
          `,
            }}
          />
        </div>
      </div>
    </main>
  );
}
