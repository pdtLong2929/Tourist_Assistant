"use client";
import React, { useState, useEffect } from "react";
import {
  Navigation,
  Car,
  MapPin,
  Crosshair,
  Zap,
  Activity,
  Scan,
  Target,
  RefreshCw,
  Compass,
  Award,
  Phone,
  Shield,
  Ticket,
  Trash2,
  Plus,
  CheckCircle2,
  ArrowRight,
  Globe,
  Settings,
  Sparkles,
  BarChart3,
  Terminal,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function BookingPage() {
  const { t } = useLanguage();
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // Dynamic inputs
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [couponCode, setCouponCode] = useState("");
  
  // Async states
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // --- SMART COUPON SYSTEMS ---
  const [activeTab, setActiveTab] = useState<"drivers" | "coupons">("drivers");
  const [couponLegs, setCouponLegs] = useState<any[]>([
    { id: "leg-1", pickup: "91 Trung Kính, Hà Nội", destination: "Sân bay Nội Bài, Hà Nội", baseFare: 220000, serviceId: "grab_car_hn", locationType: "airport" },
    { id: "leg-2", pickup: "Sân bay Nội Bài, Hà Nội", destination: "Đại học Bách Khoa, Hà Nội", baseFare: 180000, serviceId: "gsm_car_hanoi", locationType: "university" }
  ]);
  const [couponPromo, setCouponPromo] = useState("");
  const [couponResults, setCouponResults] = useState<any | null>(null);
  const [isApplyingCoupons, setIsApplyingCoupons] = useState(false);
  const [selectedCity, setSelectedCity] = useState<"HANOI" | "HCMC">("HANOI");
  const [couponPreviews, setCouponPreviews] = useState<Record<string, number>>({});

  const getSavingsText = (code: string) => {
    const savings = couponPreviews[code];
    if (savings === undefined) return "";
    if (savings === 0) return " [Saves 0 VND]";
    return ` [Saves -${savings.toLocaleString()} VND]`;
  };

  // Proactive batch preview for coupons
  useEffect(() => {
    if (!mounted || couponLegs.length === 0) return;

    const controller = new AbortController();
    
    const delayDebounce = setTimeout(async () => {
      let inferredCity = selectedCity;
      const hasHN = couponLegs.some(l => 
        l.pickup.toLowerCase().includes("hà nội") || 
        l.pickup.toLowerCase().includes("hn") ||
        l.destination.toLowerCase().includes("hà nội") ||
        l.destination.toLowerCase().includes("hn")
      );
      if (hasHN) {
        inferredCity = "HANOI";
      }

      try {
        const payloadLegs = couponLegs.map(l => ({
          base_fare: Number(l.baseFare),
          location_type: l.locationType,
          service_id: l.serviceId
        }));

        const nginxUrl = process.env.NEXT_PUBLIC_NGINX_URL || "http://localhost";
        const res = await fetch(`${nginxUrl}/api/v1/ride/coupon/preview`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            city: inferredCity,
            legs: payloadLegs
          })
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.savings) {
            setCouponPreviews(resData.savings);
          }
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("Failed to fetch coupon previews:", e);
        }
      }
    }, 400); // 400ms debounce

    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [couponLegs, selectedCity, mounted]);


  const [userId] = useState(() => {
    if (typeof window !== "undefined") {
      let id = localStorage.getItem("renting_userId");
      if (!id) {
        id = `user_${Math.random().toString(36).substring(7)}`;
        localStorage.setItem("renting_userId", id);
      }
      return id;
    }
    return "";
  });

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const queryOrigin = searchParams.get("origin");
      const queryDest = searchParams.get("destination");
      
      const cachedStart = localStorage.getItem("renting_startPos") || "";
      const cachedEnd = localStorage.getItem("renting_endPos") || "";

      setPickup(queryOrigin || cachedStart || "91 Trung Kính, Hà Nội");
      setDestination(queryDest || cachedEnd || "Hoàn Kiếm, Hà Nội");
    }
  }, []);

  // Persist modified inputs
  useEffect(() => {
    if (mounted && pickup) {
      localStorage.setItem("renting_startPos", pickup);
    }
  }, [pickup, mounted]);

  useEffect(() => {
    if (mounted && destination) {
      localStorage.setItem("renting_endPos", destination);
    }
  }, [destination, mounted]);

  // WebSocket connection
  useEffect(() => {
    if (!userId) return;
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWS = () => {
      const nginxUrl = process.env.NEXT_PUBLIC_NGINX_URL || "http://localhost";
      const wsUrl = nginxUrl.replace(/^http/, "ws") + `/ws?userId=${userId}`;
      console.log("Booking: Connecting WebSocket for user:", userId);
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Booking WebSocket Received:", data);
          
          if (data.userId === userId && data.status === "success" && data.result) {
            try {
              const payload = JSON.parse(data.result);
              if (payload.options) {
                setLogs(prev => [...prev, "✅ Live driver coordinates and fares received! Rendering map..."]);
                
                const resolvedDrivers = payload.options.map((opt: any, idx: number) => {
                  const angle = (idx * (360 / payload.options.length) * Math.PI) / 180;
                  const radius = 15 + Math.random() * 10;
                  const x = Math.min(Math.max(50 + Math.cos(angle) * radius, 20), 80);
                  const y = Math.min(Math.max(45 + Math.sin(angle) * radius, 20), 80);
                  
                  return {
                    id: opt.matched_driver ? opt.matched_driver.plate_number : `MOCK-RH-${idx}`,
                    service: opt.service,
                    category: opt.category,
                    eta: opt.matched_driver ? `${opt.matched_driver.eta_minutes.toFixed(1)} mins` : "5.0 mins",
                    etaMins: opt.matched_driver ? opt.matched_driver.eta_minutes : 5,
                    price: `${opt.final_fare.toLocaleString()} VND`,
                    baseFare: opt.base_fare,
                    finalFare: opt.final_fare,
                    status: opt.status || "",
                    appliedPromos: opt.applied_promos || [],
                    driverName: opt.matched_driver ? opt.matched_driver.name : "Nguyen Van Driver",
                    driverPhone: opt.matched_driver ? opt.matched_driver.phone : "090123456",
                    driverRating: opt.matched_driver ? opt.matched_driver.rating : 4.8,
                    distanceToPickup: opt.matched_driver ? opt.matched_driver.distance_to_pickup_km : 1.2,
                    x: x,
                    y: y,
                    heading: Math.random() * 360,
                  };
                });
                
                resolvedDrivers.sort((a: any, b: any) => a.etaMins - b.etaMins);
                setDrivers(resolvedDrivers);
                setIsScanning(false);
              }
            } catch (err) {
              console.error("Failed to parse JSON result in Booking WS:", err);
            }
          } else if (data.userId === userId && data.status === "error") {
            setLogs(prev => [...prev, `❌ Error: ${data.result}`]);
            setIsScanning(false);
          }
        } catch (e) {
          console.error("Booking: Error parsing WS message:", e);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connectWS, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connectWS();

    return () => {
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [userId]);

  const handleScanDrivers = async () => {
    if (!pickup || !destination) {
      alert("Please define both pick-up and destination points!");
      return;
    }
    
    setIsScanning(true);
    setDrivers([]);
    setSelectedDriver(null);
    
    const jobId = `ride-job-${userId}`;
    setActiveJobId(jobId);
    
    const startLogs = [
      "📡 Connecting to dispatch queue broker...",
      `🚀 Publishing ride-hailing-job (userID: ${userId})`,
    ];
    if (couponCode) {
      startLogs.push(`🎟️ Attaching custom coupon override: ${couponCode.trim().toUpperCase()}`);
    }
    startLogs.push("🔍 Resolving geocoding spatial coordinates via Goong API...");
    
    setLogs(startLogs);

    const nginxUrl = process.env.NEXT_PUBLIC_NGINX_URL || "http://localhost";
    
    try {
      setTimeout(() => {
        setLogs(prev => [...prev, "🗺️ Querying routing vectors and distance metrics..."]);
      }, 700);
      
      setTimeout(() => {
        setLogs(prev => [
          ...prev,
          couponCode 
            ? `🧮 Simulating custom override discount for ${couponCode.trim().toUpperCase()}...` 
            : "🧮 Calculating pricing indices and scanning for matching coupons..."
        ]);
      }, 1400);

      setTimeout(() => {
        setLogs(prev => [...prev, "🚕 Matching live coordinates against fleet driver proximity..."]);
      }, 2100);

      const res = await fetch(`${nginxUrl}/api/v1/jobs/ride-hailing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          origin: pickup,
          destination: destination,
          promoCode: couponCode ? couponCode.trim().toUpperCase() : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to queue job");
      }
    } catch (e: any) {
      console.error(e);
      setLogs(prev => [...prev, `❌ Broker failure: ${e.message}`]);
      setIsScanning(false);
    }
  };

  const addCouponLeg = () => {
    const newId = `leg-${Date.now()}`;
    setCouponLegs(prev => [
      ...prev,
      {
        id: newId,
        pickup: "",
        destination: "",
        baseFare: 100000,
        serviceId: selectedCity === "HANOI" ? "grab_car_hn" : "grab_car_hcmc",
        locationType: "normal"
      }
    ]);
  };

  const deleteCouponLeg = (id: string) => {
    setCouponLegs(prev => prev.filter(l => l.id !== id));
  };

  const updateCouponLeg = (id: string, fields: any) => {
    setCouponLegs(prev => prev.map(l => l.id === id ? { ...l, ...fields } : l));
  };

  const handleApplySmartCoupons = async () => {
    if (couponLegs.length === 0) {
      alert("Please add at least one travel segment!");
      return;
    }
    
    setIsApplyingCoupons(true);
    setCouponResults(null);
    
    const nginxUrl = process.env.NEXT_PUBLIC_NGINX_URL || "http://localhost";
    
    // Auto-detect city context based on legs
    let inferredCity = selectedCity;
    const hasHN = couponLegs.some(l => 
      l.pickup.toLowerCase().includes("hà nội") || 
      l.pickup.toLowerCase().includes("hn") ||
      l.destination.toLowerCase().includes("hà nội") ||
      l.destination.toLowerCase().includes("hn")
    );
    if (hasHN) {
      inferredCity = "HANOI";
    }

    try {
      const payloadLegs = couponLegs.map(l => ({
        base_fare: Number(l.baseFare),
        location_type: l.locationType,
        service_id: l.serviceId
      }));

      const res = await fetch(`${nginxUrl}/api/v1/ride/coupon/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          city: inferredCity,
          legs: payloadLegs,
          promo_code: couponPromo ? couponPromo.trim().toUpperCase() : undefined
        })
      });

      if (!res.ok) {
        throw new Error("Failed to solve optimal coupons");
      }

      const resData = await res.json();
      setCouponResults(resData);
    } catch (e: any) {
      console.error(e);
      alert(`Optimal Coupon Solver Error: ${e.message}`);
    } finally {
      setIsApplyingCoupons(false);
    }
  };

  const handleDispatch = () => {
    if (!selectedDriver) return;
    setIsDispatching(true);
    setTimeout(() => {
      setIsDispatching(false);
      alert(`Driver ${selectedDriver} dispatched successfully! Safe travels!`);
    }, 2000);
  };

  if (!mounted) return null;

  const selectedData = drivers.find((d) => d.id === selectedDriver);

  const getRegionalCoupons = () => {
    const isHCMC = pickup.toLowerCase().includes("hcmc") || pickup.toLowerCase().includes("chí minh") || pickup.toLowerCase().includes("district");
    if (isHCMC) {
      return [
        { code: "GRABWELCOME", label: "Grab Welcome 20%" },
        { code: "BETRYME", label: "Be Try Me 30k" },
        { code: "GSMGREEN", label: "GSM Green 10%" },
        { code: "VNSNEW", label: "Vinasun New 25k" },
      ];
    }
    return [
      { code: "GRABHN20", label: "Grab HN 20%" },
      { code: "BEHNFIRST", label: "Be HN 35k" },
      { code: "GSMHNGO", label: "GSM HN 15%" },
      { code: "VNSHNWEL", label: "Vinasun HN 20k" },
    ];
  };

  return (
    <div
      className="responsive-container"
      style={{
        display: "flex",
        height: "calc(100vh - 72px)",
        width: "100vw",
        overflow: "hidden",
        position: "relative",
        background: "var(--cyber-black)",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* BOOT-UP / INTRO ANIMATIONS */
            .hud-slide-in {
              animation: hud-slide 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              opacity: 0;
              transform: translateX(-50px);
            }
            @keyframes hud-slide {
              to { opacity: 1; transform: translateX(0); }
            }

            .map-fade-in {
              animation: map-reveal 1.5s ease-out forwards;
              opacity: 0;
            }
            @keyframes map-reveal {
              to { opacity: 1; }
            }

            .marker-drop {
              animation: drop-bounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
              opacity: 0;
              transform: translateY(-100px);
            }
            @keyframes drop-bounce {
              to { opacity: 1; transform: translateY(0); }
            }

            /* STAGGERED REVEALS FOR HUD ITEMS */
            .reveal-text { opacity: 0; animation: reveal-up 0.8s forwards; }
            @keyframes reveal-up { to { opacity: 1; transform: translateY(0); filter: blur(0); } }
            
            .delay-1 { animation-delay: 0.2s; }
            .delay-2 { animation-delay: 0.3s; }
            .delay-3 { animation-delay: 0.4s; }
            .delay-4 { animation-delay: 0.5s; }
            .delay-5 { animation-delay: 0.6s; }

            /* CONTINUOUS EFFECTS */
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

            @keyframes radar-ping {
              0% { transform: scale(0.5); opacity: 0.8; }
              100% { transform: scale(3.5); opacity: 0; }
            }

            .path-line {
              stroke-dasharray: 10, 10;
              animation: line-flow 1s linear infinite;
            }
            @keyframes line-flow {
              to { stroke-dashoffset: -20; }
            }

            /* HUD SPECIFIC CSS */
            .hud-glass-panel {
              background: var(--cyber-surface-glass-light);
              backdrop-filter: blur(24px);
              -webkit-backdrop-filter: blur(24px);
              border: 1px solid rgba(52, 229, 235, 0.3);
              box-shadow: 0 0 50px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(52, 229, 235, 0.1);
              border-radius: 16px;
            }

            /* DRIVER CARD HOVER FX */
            .driver-card-fx {
              transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
              transform: translateX(0);
            }
            .driver-card-fx:hover {
              transform: translateX(8px);
              box-shadow: -5px 0 20px rgba(52, 229, 235, 0.2);
              border-color: var(--cyber-blue);
            }

            /* SPINNING SCANNER ANIMATION */
            @keyframes radar-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .radar-rotating-sweep {
              position: absolute;
              inset: 0;
              border-radius: 50%;
              background: conic-gradient(from 0deg, rgba(52, 229, 235, 0.15) 0deg, rgba(52, 229, 235, 0) 180deg);
              animation: radar-spin 4s linear infinite;
            }

            @media (max-width: 767px) {
              .responsive-container {
                flex-direction: column !important;
                overflow-y: auto !important;
              }
              .mobile-hud-panel {
                width: 100% !important;
                min-width: 100% !important;
                border-right: none !important;
                border-bottom: 1px solid rgba(52, 229, 235, 0.2) !important;
                padding: 1rem !important;
                border-radius: 0 !important;
              }
              .mobile-driver-hud {
                height: 65vh !important;
                min-height: 400px !important;
                overflow-y: auto !important;
              }
              .mobile-coupon-hud {
                height: auto !important;
                overflow-y: visible !important;
              }
              .mobile-visualizer-panel {
                width: 100% !important;
                display: flex !important;
                flex-direction: column !important;
                border-radius: 0 !important;
              }
              .mobile-driver-map {
                height: 35vh !important;
                min-height: 250px !important;
                order: -1 !important;
              }
              .mobile-coupon-timeline {
                height: auto !important;
                min-height: 400px !important;
              }
              .desktop-only {
                display: none !important;
              }
              .responsive-marker-scale {
                transform: translate(-50%, -50%) scale(0.7) !important;
              }
              .responsive-target-size {
                width: 44px !important;
                height: 44px !important;
                left: -16px !important;
                top: -16px !important;
              }
              .responsive-driver-scale {
                transform: translate(-50%, -50%) scale(0.8) !important;
              }
            }
          `,
        }}
      />

      {/* =========================================
          LEFT SIDE HUD PANEL (DOCKED)
          ========================================= */}
      <aside
        className={`hud-glass-panel hud-slide-in mobile-hud-panel \${activeTab === "drivers" ? "mobile-driver-hud" : "mobile-coupon-hud"}`}
        style={{
          width: "450px",
          minWidth: "450px",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          zIndex: 10,
          height: "100%",
          overflowY: "auto",
          borderRight: "1px solid rgba(52, 229, 235, 0.2)",
          background: "rgba(10, 15, 30, 0.75)",
          backdropFilter: "blur(20px)",
          borderRadius: "0",
          boxShadow: "5px 0 25px rgba(0,0,0,0.6)",
        }}
      >
        <div
          className="reveal-text delay-1"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            className="glitch-yellow"
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "1.4rem",
              textShadow: "0 0 20px var(--cyber-yellow-glow)",
            }}
          >
            <Activity size={26} color="var(--cyber-yellow)" />
            {t("booking.dispatchCenter") as any || "DISPATCH CENTER"}
          </h2>
          <span
            className="status-active"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
          >
            ● {t("booking.liveTracking") as any || "LIVE TARGETS"}
          </span>
        </div>

        {/* TAB SELECTION HEADER */}
        <div style={{ display: "flex", gap: "0.5rem", width: "100%", marginTop: "0.25rem" }}>
          <button
            onClick={() => setActiveTab("drivers")}
            style={{
              flex: 1,
              background: activeTab === "drivers" ? "rgba(52, 229, 235, 0.15)" : "rgba(30, 41, 59, 0.4)",
              border: activeTab === "drivers" ? "2px solid var(--cyber-blue)" : "1px solid var(--cyber-border)",
              color: activeTab === "drivers" ? "var(--cyber-blue)" : "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              fontWeight: "bold",
              fontSize: "0.75rem",
              padding: "8px 4px",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: activeTab === "drivers" ? "0 0 10px rgba(52, 229, 235, 0.2)" : "none",
            }}
          >
            🚕 ESTIMATE DRIVERS
          </button>
          <button
            onClick={() => setActiveTab("coupons")}
            style={{
              flex: 1,
              background: activeTab === "coupons" ? "rgba(245, 158, 11, 0.15)" : "rgba(30, 41, 59, 0.4)",
              border: activeTab === "coupons" ? "2px solid var(--cyber-yellow)" : "1px solid var(--cyber-border)",
              color: activeTab === "coupons" ? "var(--cyber-yellow)" : "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              fontWeight: "bold",
              fontSize: "0.75rem",
              padding: "8px 4px",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: activeTab === "coupons" ? "0 0 10px rgba(245, 158, 11, 0.2)" : "none",
            }}
          >
            🎟️ SMART COUPON SOLVER
          </button>
        </div>

        {activeTab === "coupons" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
            
            {/* City Selector */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", background: "rgba(0,0,0,0.3)", borderRadius: "6px", border: "1px solid var(--cyber-border)" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                TARGET REGION:
              </span>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  onClick={() => { setSelectedCity("HANOI"); setCouponLegs(prev => prev.map(l => ({ ...l, serviceId: "grab_car_hn" }))); }}
                  style={{
                    background: selectedCity === "HANOI" ? "var(--cyber-yellow)" : "transparent",
                    color: selectedCity === "HANOI" ? "#000" : "var(--text-muted)",
                    border: "none",
                    padding: "3px 8px",
                    fontSize: "0.75rem",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)"
                  }}
                >
                  HANOI
                </button>
                <button
                  onClick={() => { setSelectedCity("HCMC"); setCouponLegs(prev => prev.map(l => ({ ...l, serviceId: "grab_car_hcmc" }))); }}
                  style={{
                    background: selectedCity === "HCMC" ? "var(--cyber-yellow)" : "transparent",
                    color: selectedCity === "HCMC" ? "#000" : "var(--text-muted)",
                    border: "none",
                    padding: "3px 8px",
                    fontSize: "0.75rem",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)"
                  }}
                >
                  HCMC
                </button>
              </div>
            </div>

            {/* Dynamic Legs List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "40vh", overflowY: "auto", paddingRight: "4px" }}>
              {couponLegs.map((leg, index) => (
                <div
                  key={leg.id}
                  style={{
                    background: "rgba(30, 41, 59, 0.6)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    borderRadius: "8px",
                    padding: "0.75rem",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--cyber-yellow)", fontWeight: "bold" }}>
                      SEGMENT #{index + 1}
                    </span>
                    {couponLegs.length > 1 && (
                      <button
                        onClick={() => deleteCouponLeg(leg.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: "bold"
                        }}
                      >
                        REMOVE
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
                    {/* LEFT SIDE: EXPANDED PICKUP & DESTINATION FIELDS */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div>
                        <label style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontFamily: "var(--font-mono)", fontWeight: "bold" }}>STARTING LOCATION</label>
                        <input
                          type="text"
                          value={leg.pickup}
                          onChange={(e) => updateCouponLeg(leg.id, { pickup: e.target.value })}
                          placeholder="Starting Point"
                          style={{
                            background: "var(--cyber-input-bg)",
                            border: "1px solid var(--cyber-border)",
                            color: "var(--text-main)",
                            fontSize: "0.8rem",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            width: "100%",
                            outline: "none"
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontFamily: "var(--font-mono)", fontWeight: "bold" }}>FINAL DESTINATION</label>
                        <input
                          type="text"
                          value={leg.destination}
                          onChange={(e) => updateCouponLeg(leg.id, { destination: e.target.value })}
                          placeholder="Destination"
                          style={{
                            background: "var(--cyber-input-bg)",
                            border: "1px solid var(--cyber-border)",
                            color: "var(--text-main)",
                            fontSize: "0.8rem",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            width: "100%",
                            outline: "none"
                          }}
                        />
                      </div>
                    </div>

                    {/* RIGHT SIDE: COMPACT VERTICAL STACK (Location Context -> Fare) */}
                    <div style={{ width: "150px", minWidth: "150px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {/* 1. Location Context */}
                      <div>
                        <label style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontFamily: "var(--font-mono)", fontWeight: "bold" }}>LOCATION CONTEXT</label>
                        <select
                          value={leg.locationType}
                          onChange={(e) => updateCouponLeg(leg.id, { locationType: e.target.value })}
                          style={{
                            background: "var(--cyber-input-bg)",
                            border: "1px solid var(--cyber-border)",
                            color: "var(--cyber-yellow)",
                            padding: "6px 8px",
                            borderRadius: "4px",
                            width: "100%",
                            fontSize: "0.8rem",
                            fontFamily: "var(--font-mono)",
                            outline: "none",
                            cursor: "pointer"
                          }}
                        >
                          <option value="normal" style={{ background: "#1e293b", color: "#fff" }}>Normal</option>
                          <option value="airport" style={{ background: "#1e293b", color: "#fff" }}>Airport ✈️</option>
                          <option value="university" style={{ background: "#1e293b", color: "#fff" }}>Uni 🎓</option>
                        </select>
                      </div>

                      {/* 2. Fare (VND) */}
                      <div>
                        <label style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontFamily: "var(--font-mono)", fontWeight: "bold" }}>FARE (VND)</label>
                        <input
                          type="number"
                          value={leg.baseFare}
                          onChange={(e) => updateCouponLeg(leg.id, { baseFare: Number(e.target.value) })}
                          placeholder="Fare"
                          style={{
                            background: "var(--cyber-input-bg)",
                            border: "1px solid var(--cyber-border)",
                            color: "var(--cyber-green)",
                            padding: "5px 8px",
                            borderRadius: "4px",
                            width: "100%",
                            fontSize: "0.8rem",
                            fontFamily: "var(--font-mono)",
                            fontWeight: "bold",
                            outline: "none"
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* FULL WIDTH SERVICE PROVIDER DROPDOWN */}
                  <div style={{ marginTop: "0.25rem", width: "100%" }}>
                    <label style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block", marginBottom: "4px", fontFamily: "var(--font-mono)", fontWeight: "bold" }}>SERVICE PROVIDER</label>
                    <select
                      value={leg.serviceId}
                      onChange={(e) => updateCouponLeg(leg.id, { serviceId: e.target.value })}
                      style={{
                        background: "var(--cyber-input-bg)",
                        border: "1px solid var(--cyber-border)",
                        color: "var(--cyber-blue)",
                        padding: "6px 8px",
                        borderRadius: "4px",
                        width: "100%",
                        fontSize: "0.8rem",
                        fontFamily: "var(--font-mono)",
                        outline: "none",
                        cursor: "pointer"
                      }}
                    >
                      {(selectedCity === "HANOI" 
                        ? [
                            { id: "grab_car_hn", label: "GrabCar 🚕" },
                            { id: "grab_bike_hn", label: "GrabBike 🏍️" },
                            { id: "gsm_car_hanoi", label: "GSM Green ⚡" },
                            { id: "be_car_hn", label: "beCar 🐝" }
                          ]
                        : [
                            { id: "grab_car_hcmc", label: "GrabCar 🚕" },
                            { id: "grab_bike_hcmc", label: "GrabBike 🏍️" },
                            { id: "gsm_car_hcmc", label: "GSM Green ⚡" },
                            { id: "be_car_hcmc", label: "beCar 🐝" }
                          ]
                      ).map(srv => (
                        <option key={srv.id} value={srv.id} style={{ background: "#1e293b", color: "#fff" }}>
                          {srv.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              </div>

              {/* Add Segment Button */}
              <button
                onClick={addCouponLeg}
                style={{
                  width: "100%",
                  background: "rgba(52, 229, 235, 0.04)",
                  border: "1px dashed var(--cyber-blue)",
                  color: "var(--cyber-blue)",
                  padding: "8px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(52, 229, 235, 0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(52, 229, 235, 0.04)"}
              >
                <Plus size={14} /> ADD TRAVEL SEGMENT
              </button>

              {/* Coupon Override Input */}
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "8px",
                  background: "rgba(251, 191, 36, 0.03)",
                  border: "1px solid rgba(251, 191, 36, 0.15)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Ticket size={14} color="var(--cyber-yellow)" />
                  <span className="module-label" style={{ fontSize: "0.7rem", color: "var(--cyber-yellow)" }}>
                    MANUAL PROMO OVERRIDE (OPTIONAL)
                  </span>
                </div>
                <select
                  value={couponPromo}
                  onChange={(e) => setCouponPromo(e.target.value)}
                  style={{
                    background: "var(--cyber-input-bg)",
                    border: "1px solid var(--cyber-border)",
                    color: "var(--cyber-yellow)",
                    fontSize: "0.85rem",
                    padding: "6px 10px",
                    borderRadius: "4px",
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                    cursor: "pointer",
                    width: "100%"
                  }}
                >
                  <option value="" style={{ background: "#1e293b", color: "#fff" }}>-- NO PROMO OVERRIDE --</option>
                  
                  <optgroup label="HANOI SPECIALS" style={{ background: "#0f172a", color: "var(--cyber-yellow)", fontWeight: "bold" }}>
                    <option value="GRABHN50K" style={{ background: "#1e293b", color: "#fff" }}>GRABHN50K (Grab Hanoi 50K){getSavingsText("GRABHN50K")}</option>
                    <option value="GRABHNAIR" style={{ background: "#1e293b", color: "#fff" }}>GRABHNAIR (Grab Hanoi Airport){getSavingsText("GRABHNAIR")}</option>
                    <option value="GRABHN20" style={{ background: "#1e293b", color: "#fff" }}>GRABHN20 (Grab Hanoi 20% Off){getSavingsText("GRABHN20")}</option>
                    <option value="BEHNFIRST" style={{ background: "#1e293b", color: "#fff" }}>BEHNFIRST (Be Hanoi First Ride){getSavingsText("BEHNFIRST")}</option>
                    <option value="BEHNAIR" style={{ background: "#1e293b", color: "#fff" }}>BEHNAIR (Be Hanoi Airport){getSavingsText("BEHNAIR")}</option>
                    <option value="GSMHNGO" style={{ background: "#1e293b", color: "#fff" }}>GSMHNGO (GSM Green Hanoi Go){getSavingsText("GSMHNGO")}</option>
                    <option value="GSMHNAIR" style={{ background: "#1e293b", color: "#fff" }}>GSMHNAIR (GSM Green Hanoi Airport){getSavingsText("GSMHNAIR")}</option>
                    <option value="VNSHNWEL" style={{ background: "#1e293b", color: "#fff" }}>VNSHNWEL (Vinasun Hanoi Welcome){getSavingsText("VNSHNWEL")}</option>
                    <option value="VNSHNAIR" style={{ background: "#1e293b", color: "#fff" }}>VNSHNAIR (Vinasun Hanoi Airport){getSavingsText("VNSHNAIR")}</option>
                  </optgroup>

                  <optgroup label="GLOBAL & HCMC" style={{ background: "#0f172a", color: "var(--cyber-yellow)", fontWeight: "bold" }}>
                    <option value="GRAB50K" style={{ background: "#1e293b", color: "#fff" }}>GRAB50K (Grab 50K Off){getSavingsText("GRAB50K")}</option>
                    <option value="GRABAIRPORT" style={{ background: "#1e293b", color: "#fff" }}>GRABAIRPORT (Grab Airport){getSavingsText("GRABAIRPORT")}</option>
                    <option value="GRABWELCOME" style={{ background: "#1e293b", color: "#fff" }}>GRABWELCOME (Grab Welcome){getSavingsText("GRABWELCOME")}</option>
                    <option value="GRABHCMC15" style={{ background: "#1e293b", color: "#fff" }}>GRABHCMC15 (Grab HCMC 15% Off){getSavingsText("GRABHCMC15")}</option>
                    <option value="BETRYME" style={{ background: "#1e293b", color: "#fff" }}>BETRYME (Be Try Me){getSavingsText("BETRYME")}</option>
                    <option value="BEAIRPORT60" style={{ background: "#1e293b", color: "#fff" }}>BEAIRPORT60 (Be Airport 60K){getSavingsText("BEAIRPORT60")}</option>
                    <option value="BEBACK25" style={{ background: "#1e293b", color: "#fff" }}>BEBACK25 (Be Back 25% Off){getSavingsText("BEBACK25")}</option>
                    <option value="GSMGREEN" style={{ background: "#1e293b", color: "#fff" }}>GSMGREEN (GSM Green Welcome){getSavingsText("GSMGREEN")}</option>
                    <option value="GSMAIRPORT" style={{ background: "#1e293b", color: "#fff" }}>GSMAIRPORT (GSM Green Airport){getSavingsText("GSMAIRPORT")}</option>
                    <option value="VNSNEW" style={{ background: "#1e293b", color: "#fff" }}>VNSNEW (Vinasun New User){getSavingsText("VNSNEW")}</option>
                    <option value="VNSAIRPORT" style={{ background: "#1e293b", color: "#fff" }}>VNSAIRPORT (Vinasun Airport){getSavingsText("VNSAIRPORT")}</option>
                  </optgroup>
                </select>
                {couponPromo && couponPreviews[couponPromo] !== undefined && (
                  <div style={{
                    marginTop: "0.25rem",
                    padding: "6px 10px",
                    background: "rgba(52, 229, 235, 0.05)",
                    border: "1px solid rgba(52, 229, 235, 0.2)",
                    borderRadius: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--cyber-blue)" }}>
                      EST. PROMO SAVINGS:
                    </span>
                    <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", fontWeight: "bold", color: couponPreviews[couponPromo] > 0 ? "var(--cyber-green)" : "var(--text-muted)" }}>
                      {couponPreviews[couponPromo] > 0 ? `-${couponPreviews[couponPromo].toLocaleString()} VND` : "0 VND (Not Applicable)"}
                    </span>
                  </div>
                )}
              </div>

              {/* Run Solver Button */}
              <button
                onClick={handleApplySmartCoupons}
                disabled={isApplyingCoupons}
                style={{
                  width: "100%",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  color: "var(--cyber-yellow)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: "bold",
                  padding: "12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(245, 158, 11, 0.25)";
                  e.currentTarget.style.borderColor = "var(--cyber-yellow)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(245, 158, 11, 0.12)";
                  e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.4)";
                }}
              >
                <Zap size={14} className={isApplyingCoupons ? "animate-bounce" : ""} />
                {isApplyingCoupons ? "APPLYING OPTIMAL COMBOS..." : "APPLY SMART COUPONS"}
              </button>
            </div>
          ) : (
            <>
              {/* --- BOOK RIDE CONTROL PANEL --- */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Car size={18} color="var(--cyber-blue)" />
                  <h3 className="module-label" style={{ margin: 0, color: "var(--cyber-blue)", fontSize: "0.9rem" }}>
                    DISPATCH INTERFACE
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  Publish geocoded coordinates to locate drivers and select optimal bids.
                </p>
              </div>

              {/* Input Fields for Geocoded Dispatch */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  padding: "1rem",
                  borderRadius: "8px",
                  background: "rgba(30, 41, 59, 0.4)",
                  border: "1px solid var(--cyber-border)"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "var(--cyber-blue)",
                        boxShadow: "0 0 10px var(--cyber-blue)",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div className="module-label" style={{ marginBottom: "4px", fontSize: "0.65rem" }}>
                        {t("booking.scannedPickup") as any || "SCANNED PICK-UP"}
                      </div>
                      <input
                        className="cyber-input"
                        placeholder="Enter Pick-up Location"
                        value={pickup}
                        onChange={(e) => setPickup(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          fontSize: "0.85rem",
                          borderRadius: "6px",
                          outline: "none"
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      width: "2px",
                      height: "15px",
                      background: "linear-gradient(to bottom, var(--cyber-blue), var(--cyber-purple))",
                      marginLeft: "5px",
                      opacity: 0.6,
                    }}
                  />

                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "var(--cyber-purple)",
                        boxShadow: "0 0 10px var(--cyber-purple)",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div className="module-label" style={{ marginBottom: "4px", fontSize: "0.65rem" }}>
                        {t("booking.targetDestination") as any || "TARGET DESTINATION"}
                      </div>
                      <input
                        className="cyber-input"
                        placeholder="Enter Destination"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          fontSize: "0.85rem",
                          borderRadius: "6px",
                          outline: "none"
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Coupon Manual Code Override */}
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "8px",
                  background: "rgba(52, 229, 235, 0.02)",
                  border: "1px solid rgba(52, 229, 235, 0.15)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Ticket size={14} color="var(--cyber-blue)" />
                    <span className="module-label" style={{ fontSize: "0.7rem", color: "var(--cyber-blue)" }}>
                      OVERRIDE PROMO CODE
                    </span>
                  </div>
                  {couponCode && (
                    <button
                      onClick={() => setCouponCode("")}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        fontSize: "0.65rem",
                        fontFamily: "var(--font-mono)",
                        cursor: "pointer",
                      }}
                    >
                      RESET
                    </button>
                  )}
                </div>
                
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="e.g. GRABHN20"
                  style={{
                    background: "var(--cyber-input-bg)",
                    border: "1px solid var(--cyber-border)",
                    color: "var(--cyber-blue)",
                    fontSize: "0.85rem",
                    padding: "6px 10px",
                    borderRadius: "4px",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase"
                  }}
                />

                {/* Quick Picker Tags */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    marginTop: "2px",
                  }}
                >
                  {getRegionalCoupons().map((cp) => (
                    <span
                      key={cp.code}
                      onClick={() => setCouponCode(cp.code)}
                      style={{
                        fontSize: "0.7rem",
                        fontFamily: "var(--font-mono)",
                        padding: "3px 6px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        border:
                          couponCode === cp.code
                            ? "1px solid var(--cyber-yellow)"
                            : "1px solid rgba(52, 229, 235, 0.2)",
                        background:
                          couponCode === cp.code
                            ? "rgba(245, 158, 11, 0.15)"
                            : "rgba(0, 0, 0, 0.25)",
                        color:
                          couponCode === cp.code
                            ? "var(--cyber-yellow)"
                            : "var(--text-muted)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {cp.code}
                    </span>
                  ))}
                </div>
              </div>

              {/* Scan Sector Button */}
              <button
                onClick={handleScanDrivers}
                disabled={isScanning || !pickup || !destination}
                style={{
                  width: "100%",
                  background: "rgba(52, 229, 235, 0.1)",
                  border: "1px solid rgba(52, 229, 235, 0.4)",
                  color: "var(--cyber-blue)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: "bold",
                  padding: "10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontSize: "0.9rem",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(52, 229, 235, 0.25)";
                  e.currentTarget.style.borderColor = "var(--cyber-blue)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(52, 229, 235, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(52, 229, 235, 0.4)";
                }}
              >
                <RefreshCw size={14} className={isScanning ? "animate-spin" : ""} />
                {isScanning ? "SCANNING SECTORS..." : "SCAN SECTOR FOR DRIVERS"}
              </button>

              {/* Matched Bids Title */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "0.5rem"
                }}
              >
                <Scan size={16} color="var(--cyber-blue)" />
                <h3 className="module-label" style={{ margin: 0, color: "var(--cyber-blue)", fontSize: "0.8rem" }}>
                  {t("booking.availableAssets") as any || "AVAILABLE DISPATCH OPTIONS"}
                </h3>
              </div>

              {/* Drivers List */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  flex: 1,
                  overflowY: "auto",
                  paddingRight: "4px"
                }}
              >
                {drivers.length === 0 && !isScanning && (
                  <div
                    style={{
                      padding: "2rem 1rem",
                      textAlign: "center",
                      background: "rgba(30, 41, 59, 0.2)",
                      border: "1px dashed var(--cyber-border)",
                      borderRadius: "12px",
                      color: "#cbd5e1",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8rem",
                      margin: "auto 0"
                    }}
                  >
                    <Compass size={28} color="var(--cyber-blue)" style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
                    No matched drivers in this sector. Scan sector to initiate matchmaking.
                  </div>
                )}
                
                {drivers.map((driver) => (
                  <div
                    key={driver.id}
                    onClick={() => setSelectedDriver(driver.id)}
                    className="driver-card-fx"
                    style={{
                      cursor: "pointer",
                      padding: "1rem",
                      borderRadius: "10px",
                      position: "relative",
                      border:
                        selectedDriver === driver.id
                          ? "2px solid var(--cyber-yellow)"
                          : "1px solid rgba(52, 229, 235, 0.25)",
                      background:
                        selectedDriver === driver.id
                          ? "rgba(251, 191, 36, 0.15)"
                          : "rgba(30, 41, 59, 0.5)",
                      boxShadow:
                        selectedDriver === driver.id
                          ? "0 0 15px rgba(251, 191, 36, 0.15)"
                          : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: "var(--cyber-input-bg)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: `1px solid ${selectedDriver === driver.id ? "var(--cyber-yellow)" : "transparent"}`,
                          }}
                        >
                          <Car size={20} color={selectedDriver === driver.id ? "var(--cyber-yellow)" : "var(--cyber-blue)"} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "0.95rem", color: selectedDriver === driver.id ? "var(--cyber-yellow)" : "var(--text-main)", fontWeight: "bold" }}>
                            {driver.service}
                          </h4>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                            <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                              {driver.id}
                            </span>
                            {selectedDriver === driver.id && <Zap size={10} color="var(--cyber-yellow)" className="animate-pulse" />}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: "800", fontFamily: "var(--font-header)", color: selectedDriver === driver.id ? "var(--cyber-yellow)" : "var(--text-main)" }}>
                          {driver.eta}
                        </div>
                        <div style={{ color: "var(--cyber-green)", fontWeight: "600", fontSize: "0.95rem", marginTop: "2px" }}>
                          {driver.price}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Driver Details */}
                    {selectedDriver === driver.id && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          paddingTop: "0.75rem",
                          borderTop: "1px dashed rgba(251, 191, 36, 0.3)",
                          fontSize: "0.75rem",
                          color: "#cbd5e1",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>👤 Matcher Rating:</span>
                          <span style={{ color: "var(--text-main)", fontWeight: "bold" }}>
                            {driver.driverName} (⭐ {driver.driverRating})
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>📞 Comm Channel:</span>
                          <span style={{ color: "var(--cyber-blue)" }}>{driver.driverPhone}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>📏 Spatial Distance:</span>
                          <span>{driver.distanceToPickup?.toFixed(2)} km</span>
                        </div>
                        {driver.appliedPromos.length > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--cyber-yellow)", fontWeight: "bold", marginTop: "2px" }}>
                            <span>🎟️ Promo Saved:</span>
                            <span>{driver.appliedPromos.join(" + ")} ({driver.status})</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <button
                className="cyber-button"
                onClick={handleDispatch}
                disabled={!selectedDriver || isDispatching}
                style={{
                  width: "100%",
                  padding: "12px",
                  opacity: !selectedDriver ? 0.5 : 1,
                  filter: !selectedDriver ? "grayscale(100%)" : "none",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                {isDispatching ? (
                  <>
                    <Scan size={16} className="animate-spin" />
                    DISPATCHING DRIVER UNIT...
                  </>
                ) : selectedDriver ? (
                  <>
                    <Zap size={16} />
                    CONFIRM DISPATCH FOR {selectedDriver}
                  </>
                ) : (
                  "SELECT A DISPATCH TARGET"
                )}
              </button>
            </>
          )}
        </aside>

        {/* RIGHT COLUMN: INTERACTIVE VISUALIZER PANEL */}
        <div
          className={`hud-glass-panel mobile-visualizer-panel \${activeTab === "drivers" ? "mobile-driver-map" : "mobile-coupon-timeline"}`}
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            border: "1px solid rgba(52, 229, 235, 0.2)",
            boxShadow: "inset 0 0 30px rgba(0,0,0,0.8)"
          }}
        >
          {activeTab === "drivers" ? (
            <>
              {/* --- BOOK RIDE MAP INTERACTIVE HUB --- */}
              <div
                style={{
                  position: "absolute",
                  top: "1rem",
                  left: "1rem",
                  zIndex: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(52, 229, 235, 0.3)", padding: "4px 10px", borderRadius: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--cyber-blue)", boxShadow: "0 0 8px var(--cyber-blue)" }} className="animate-pulse" />
                  <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--cyber-blue)", fontWeight: "bold", letterSpacing: "1px" }}>
                    SIMULATION MAP ENGINE
                  </span>
                </div>
              </div>

              {/* Map background container */}
              <div
                className="map-fade-in"
                style={{
                  flex: 1,
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  backgroundImage:
                    "radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.3) 0%, rgba(2, 6, 23, 0.9) 100%), linear-gradient(rgba(18, 150, 160, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(18, 150, 160, 0.05) 1px, transparent 1px)",
                  backgroundSize: "100% 100%, 40px 40px, 40px 40px",
                  backgroundPosition: "center",
                  animation: "grid-pan 20s linear infinite",
                  overflow: "hidden"
                }}
              >
                {/* Holographic Radar Sweep */}
                {isScanning && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(to bottom, transparent, rgba(52, 229, 235, 0.08) 50%, transparent 100%)",
                      animation: "scanning-laser 2.5s infinite linear",
                      pointerEvents: "none",
                      zIndex: 5,
                    }}
                  />
                )}

                {/* You are Here Marker */}
                <div
                  className="marker-drop responsive-marker-scale"
                  style={{
                    position: "absolute",
                    left: "65%",
                    top: "55%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 10,
                    cursor: "pointer",
                  }}
                >
                  <div
                    className="responsive-target-size"
                    style={{
                      position: "absolute",
                      width: "40px",
                      height: "40px",
                      border: "2px solid var(--cyber-blue)",
                      borderRadius: "50%",
                      left: "-14px",
                      top: "-14px",
                      animation: "radar-ping 2s infinite linear",
                    }}
                  />
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: "var(--cyber-blue)",
                      boxShadow: "0 0 15px var(--cyber-blue)",
                      border: "2px solid #fff",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "20px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--cyber-surface-glass-light)",
                      border: "1px solid var(--cyber-blue)",
                      borderRadius: "4px",
                      padding: "2px 6px",
                      fontSize: "0.6rem",
                      fontFamily: "var(--font-mono)",
                      color: "var(--cyber-blue)",
                      whiteSpace: "nowrap",
                      fontWeight: "bold",
                    }}
                  >
                    YOU ARE HERE
                  </div>
                </div>

                {/* Live Simulated Driver Markers on Grid Map */}
                {drivers.map((driver) => (
                  <div
                    key={driver.id}
                    onClick={() => setSelectedDriver(driver.id)}
                    className="responsive-driver-scale"
                    style={{
                      position: "absolute",
                      left: `${driver.x}%`,
                      top: `${driver.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 20,
                      cursor: "pointer",
                      transition: "all 0.5s ease",
                    }}
                  >
                    {selectedDriver === driver.id && (
                      <div
                        style={{
                          position: "absolute",
                          width: "50px",
                          height: "50px",
                          border: "2px solid var(--cyber-yellow)",
                          borderRadius: "50%",
                          left: "-17px",
                          top: "-17px",
                          animation: "radar-ping 1.5s infinite linear",
                        }}
                      />
                    )}
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        background:
                          selectedDriver === driver.id
                            ? "var(--cyber-yellow)"
                            : "var(--cyber-green)",
                        boxShadow:
                          selectedDriver === driver.id
                            ? "0 0 15px var(--cyber-yellow)"
                            : "0 0 10px var(--cyber-green)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid #fff",
                        transition: "all 0.3s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      <Car size={8} color="#000" />
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: "22px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(15, 23, 42, 0.85)",
                        border: `1px solid ${selectedDriver === driver.id ? "var(--cyber-yellow)" : "rgba(255,255,255,0.15)"}`,
                        borderRadius: "4px",
                        padding: "2px 6px",
                        fontSize: "0.6rem",
                        fontFamily: "var(--font-mono)",
                        color:
                          selectedDriver === driver.id
                            ? "var(--cyber-yellow)"
                            : "#fff",
                        whiteSpace: "nowrap",
                        transition: "all 0.3s",
                      }}
                    >
                      {driver.service} ({driver.eta})
                    </div>
                  </div>
                ))}

                {/* Connection Route Line (Animated SVG Laser) */}
                {selectedData && (
                  <svg
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      zIndex: 15,
                      pointerEvents: "none",
                    }}
                  >
                    <line
                      x1="65%"
                      y1="55%"
                      x2={`${selectedData.x}%`}
                      y2={`${selectedData.y}%`}
                      stroke="var(--cyber-yellow)"
                      strokeWidth="4"
                      className="path-line"
                      style={{
                        filter: "drop-shadow(0 0 10px rgba(251, 191, 36, 0.8))",
                      }}
                    />
                    <circle
                      cx={`${selectedData.x}%`}
                      cy={`${selectedData.y}%`}
                      r="6"
                      fill="var(--cyber-yellow)"
                    />
                  </svg>
                )}
              </div>

              {/* Bottom Telemetry Console Panel */}
              <div
                style={{
                  height: "150px",
                  borderTop: "1px solid rgba(52, 229, 235, 0.25)",
                  background: "rgba(15, 23, 42, 0.8)",
                  display: "flex",
                  flexDirection: "column",
                  padding: "0.75rem 1rem",
                  fontFamily: "var(--font-mono)",
                  zIndex: 20
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Terminal size={14} color="var(--cyber-blue)" />
                    <span style={{ fontSize: "0.7rem", color: "var(--cyber-blue)", fontWeight: "bold" }}>
                      LIVE FLEET TELEMETRY FEED
                    </span>
                  </div>
                  <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
                    LOGS ACTIVE
                  </span>
                </div>
                
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    fontSize: "0.7rem",
                    color: "rgba(52, 229, 235, 0.8)",
                    paddingRight: "4px"
                  }}
                >
                  {logs.length === 0 ? (
                    <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                      📡 Awaiting telemetry scan trigger... Enter locations and select Scan.
                    </span>
                  ) : (
                    logs.map((log, lidx) => (
                      <div key={lidx} style={{ borderLeft: "2px solid rgba(52, 229, 235, 0.3)", paddingLeft: "6px" }}>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* --- SMART COUPON TIMELINE VISUALIZER --- */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "1.5rem", overflowY: "auto", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--cyber-border)", paddingBottom: "0.75rem", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0, fontFamily: "var(--font-header)", color: "var(--cyber-yellow)", fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}>
                    <BarChart3 size={20} color="var(--cyber-yellow)" /> JOURNEY TIMELINE SUMMARY
                  </h3>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {couponLegs.length} Segment{couponLegs.length !== 1 ? "s" : ""} Defined
                  </span>
                </div>

                {couponLegs.length === 0 ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px dashed var(--cyber-border)", borderRadius: "12px", padding: "2rem", color: "var(--text-muted)", textAlign: "center" }}>
                    <Compass size={40} color="var(--cyber-yellow)" style={{ opacity: 0.5, marginBottom: "1rem" }} />
                    <span>No travel segments defined. Add segments in the left control panel to simulate optimal coupon combos.</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {couponLegs.map((leg, index) => {
                      const legRes = couponResults?.data?.find((r: any) => r.leg_index === index);
                      
                      return (
                        <React.Fragment key={leg.id}>
                          {/* Sequential connector arrow */}
                          {index > 0 && (
                            <div className="timeline-arrow">
                              <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>↓</span>
                            </div>
                          )}

                          {/* Interactive Segment Timeline Card */}
                          <div className="timeline-card" style={{ borderLeft: `4px solid ${legRes ? "var(--cyber-green)" : "var(--cyber-yellow)"}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                              <div>
                                <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--cyber-yellow)", fontWeight: "bold", background: "rgba(251, 191, 36, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                                  TRAVEL SEGMENT #{index + 1}
                                </span>
                                <h4 style={{ margin: "4px 0 0 0", color: "#fff", fontSize: "0.95rem", fontWeight: "bold" }}>
                                  {leg.pickup || "Starting Segment Point"} → {leg.destination || "Destination Drop-off"}
                                </h4>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "uppercase" }}>
                                  SERVICE
                                </span>
                                <div style={{ fontSize: "0.85rem", color: "var(--cyber-blue)", fontWeight: "bold" }}>
                                  {leg.serviceId.replace("_hn", "").replace("_hcmc", "").replace("gsm_car_hanoi", "GSM Car").replace("gsm_car_hcmc", "GSM Car").toUpperCase()}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                              <div style={{ display: "flex", gap: "1rem" }}>
                                <div>
                                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block" }}>CONTEXT</span>
                                  <span style={{ fontSize: "0.8rem", color: "#fff", textTransform: "capitalize", fontWeight: "bold" }}>
                                    {leg.locationType === "airport" ? "✈️ Airport" : leg.locationType === "university" ? "🎓 University" : "🏠 Normal"}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block" }}>BASE COST</span>
                                  <span style={{ fontSize: "0.8rem", color: "var(--text-main)", textDecoration: legRes?.cost_saved > 0 ? "line-through" : "none" }}>
                                    {leg.baseFare.toLocaleString()} VND
                                  </span>
                                </div>
                              </div>

                              <div style={{ textAlign: "right" }}>
                                {legRes ? (
                                  <>
                                    {legRes.cost_saved > 0 && (
                                      <div style={{ fontSize: "0.7rem", color: "var(--cyber-green)", fontWeight: "bold", marginBottom: "2px" }}>
                                        SAVED {legRes.cost_saved.toLocaleString()} VND
                                      </div>
                                    )}
                                    <div style={{ fontSize: "1.05rem", color: "var(--cyber-green)", fontWeight: "bold" }}>
                                      {legRes.final_fare.toLocaleString()} VND
                                    </div>
                                    {legRes.applied_promos.length > 0 && (
                                      <div style={{ fontSize: "0.7rem", color: "var(--cyber-blue)", marginTop: "2px", fontWeight: "bold" }}>
                                        🎟️ {legRes.applied_promos.join(" + ")}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", display: "block" }}>ESTIMATED FARE</span>
                                    <span style={{ fontSize: "1.05rem", color: "var(--cyber-yellow)", fontWeight: "bold" }}>
                                      {leg.baseFare.toLocaleString()} VND
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Grand Coupon Analysis Visualizer inside Right Column */}
                    {couponResults && (
                      <div
                        className="hud-glass-panel"
                        style={{
                          marginTop: "1.5rem",
                          padding: "1.25rem",
                          border: "1px solid var(--cyber-green)",
                          background: "rgba(52, 211, 153, 0.05)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                          boxShadow: "0 0 20px rgba(52, 211, 153, 0.05)"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.9rem", color: "#fff", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Sparkles size={16} color="var(--cyber-green)" /> OPTIMAL PROMO SOLVER SUCCESS REPORT
                          </span>
                          <span style={{ background: "rgba(52, 211, 153, 0.2)", color: "var(--cyber-green)", padding: "3px 8px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                            CALCULATION VALIDATED
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginTop: "0.5rem", borderTop: "1px dashed rgba(52, 211, 153, 0.2)", paddingTop: "0.75rem" }}>
                          <div>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", fontFamily: "var(--font-mono)" }}>TOTAL BASE COST</span>
                            <span style={{ fontSize: "1.1rem", color: "var(--text-main)", fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                              {couponLegs.reduce((sum, l) => sum + Number(l.baseFare), 0).toLocaleString()} VND
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: "0.7rem", color: "var(--cyber-green)", display: "block", fontFamily: "var(--font-mono)" }}>GRAND SAVINGS DELTA</span>
                            <span style={{ fontSize: "1.2rem", color: "var(--cyber-green)", fontWeight: "bold", fontFamily: "var(--font-mono)" }}>
                              - {couponResults.total_saved.toLocaleString()} VND
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: "0.7rem", color: "var(--cyber-blue)", display: "block", fontFamily: "var(--font-mono)" }}>FINAL OPTIMIZED COST</span>
                            <span style={{ fontSize: "1.2rem", color: "var(--cyber-blue)", fontWeight: "bold", fontFamily: "var(--font-mono)", textShadow: "0 0 10px rgba(52, 229, 235, 0.3)" }}>
                              {(couponLegs.reduce((sum, l) => sum + Number(l.baseFare), 0) - couponResults.total_saved).toLocaleString()} VND
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
