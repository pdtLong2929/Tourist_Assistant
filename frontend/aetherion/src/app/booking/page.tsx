<<<<<<< HEAD
"use client";
import React, { useState } from "react";
import { Navigation, Car, MapPin } from "lucide-react";

const MOCK_DRIVERS = [
  {
    id: "D-801",
    type: "Cyber SUV",
    eta: "3 mins",
    x: 30,
    y: 35,
    heading: 45,
    price: "12.50",
  },
  {
    id: "D-442",
    type: "Aero Sedan",
    eta: "7 mins",
    x: 70,
    y: 15,
    heading: 120,
    price: "8.20",
  },
  {
    id: "D-99X",
    type: "Hypercar",
    eta: "12 mins",
    x: 80,
    y: 80,
    heading: 270,
    price: "25.00",
  },
=======
'use client';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { MapPin, Navigation, Car } from 'lucide-react';
import React, { useState } from 'react';

// Simulated external backend driver data
const MOCK_DRIVERS = [
  { id: 'D-801', type: 'Cyber SUV', eta: '3 mins', x: 30, y: 35, heading: 45 },
  { id: 'D-442', type: 'Aero Sedan', eta: '7 mins', x: 70, y: 15, heading: 120 },
  { id: 'D-99X', type: 'Hypercar', eta: '12 mins', x: 80, y: 80, heading: 270 }
>>>>>>> fb98a63 (feat: basic ui)
];

export default function BookingPage() {
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
<<<<<<< HEAD
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  const handleDispatch = () => {
    if (!selectedDriver) return;
    setIsDispatching(true);
    setTimeout(() => setIsDispatching(false), 2000);
  };

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 72px)",
        overflow: "hidden",
        background: "var(--cyber-black)",
      }}
    >
      {/* SIDEBAR */}
      <aside
        className="surface"
        style={{
          position: "relative",
          width: "420px",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          zIndex: 10,
          borderRight: "1px solid var(--cyber-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--font-header)",
              fontSize: "1.25rem",
              color: "var(--text-main)",
            }}
          >
            <MapPin size={22} color="var(--cyber-blue)" />
            DISPATCH CENTER
          </h2>
          <span
            className="status-active"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            ● LIVE NETWORK
          </span>
        </div>

        {/* Route */}
        <div className="edgerunner-card" style={{ padding: "1.5rem" }}>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--cyber-blue)",
                  boxShadow: "0 0 12px var(--cyber-blue)",
                }}
              />
              <div style={{ flex: 1 }}>
                <div className="module-label">PICKUP POINT</div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: "600",
                    color: "var(--text-main)",
                  }}
                >
                  Downtown District
                </div>
              </div>
            </div>

            <div
              style={{
                width: "1px",
                height: "24px",
                background: "var(--cyber-border)",
                marginLeft: "3.5px",
              }}
            />

            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--cyber-purple)",
                  boxShadow: "0 0 12px var(--cyber-purple)",
                }}
              />
              <div style={{ flex: 1 }}>
                <div className="module-label">DESTINATION</div>
                <input
                  type="text"
                  placeholder="Enter drop-off location..."
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--text-main)",
                    width: "100%",
                    fontSize: "0.95rem",
                    borderBottom: "1px solid var(--cyber-border)",
                    paddingBottom: "4px",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <h3 className="module-label">AVAILABLE UNITS</h3>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            padding: "16px 8px 16px 4px",
            marginTop: "-12px",
            paddingRight: "8px",
          }}
        >
          {MOCK_DRIVERS.map((driver) => (
            <div
              key={driver.id}
              onClick={() => setSelectedDriver(driver.id)}
              className="edgerunner-card"
              style={{
                cursor: "pointer",
                padding: "1.25rem",
                borderRadius: "12px",
                position: "relative", // Yêu cầu để overflow hidden hoạt động tốt với ::before
                overflow: "hidden", // SỬA LỖI VIỀN VUÔNG: Cắt bỏ phần sáng bị tràn ra ngoài góc bo tròn
                border:
                  selectedDriver === driver.id
                    ? "2px solid var(--cyber-yellow)"
                    : "1px solid rgba(255, 255, 255, 0.15)",
                background:
                  selectedDriver === driver.id
                    ? "var(--cyber-yellow-dim)"
                    : "rgba(255, 255, 255, 0.03)",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  position: "relative", // Đảm bảo nội dung nằm trên lớp sáng
                  zIndex: 1,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Car
                      size={26}
                      color={
                        selectedDriver === driver.id
                          ? "var(--cyber-yellow)"
                          : "var(--cyber-blue)"
                      }
                    />
                  </div>
                  <div>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "1.1rem",
                        color:
                          selectedDriver === driver.id
                            ? "var(--cyber-yellow)"
                            : "var(--text-main)",
                      }}
                    >
                      {driver.type}
                    </h4>
                    <p className="module-label" style={{ margin: 0 }}>
                      Unit {driver.id}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "1.35rem",
                      fontWeight: "800",
                      fontFamily: "var(--font-header)",
                      lineHeight: 1,
                      color: "var(--text-main)",
                    }}
                  >
                    {driver.eta}
                  </div>
                  <div
                    style={{ color: "var(--cyber-green)", fontWeight: "600" }}
                  >
                    ${driver.price}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          className="cyber-button"
          onClick={handleDispatch}
          disabled={!selectedDriver || isDispatching}
          style={{ width: "100%", marginTop: "auto" }}
        >
          {isDispatching
            ? "SYSTEM CONNECTING..."
            : selectedDriver
              ? `CONFIRM DISPATCH ${selectedDriver}`
              : "SELECT A VEHICLE"}
        </button>
      </aside>

      {/* MAP AREA - 3D CYBERPUNK CITY */}
      <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* 3D City Background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `
              linear-gradient(180deg, 
                rgba(15, 15, 30, 0.95) 0%, 
                rgba(15, 15, 30, 0.85) 50%,
                rgba(26, 26, 46, 0.9) 100%
              )
            `,
            zIndex: 0,
          }}
        />

        {/* Isometric Grid - 3D Perspective */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            zIndex: 1,
            opacity: 0.4,
          }}
        >
          <defs>
            <pattern
              id="isometric-grid"
              x="0"
              y="0"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
              patternTransform="skewY(-30)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="60"
                stroke="rgba(96, 165, 250, 0.15)"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="60"
                x2="60"
                y2="60"
                stroke="rgba(96, 165, 250, 0.15)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#isometric-grid)" />
        </svg>

        {/* City Buildings - Background Layer */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            zIndex: 2,
            opacity: 0.3,
          }}
        >
          {/* Building 1 - Tall */}
          <rect
            x="15%"
            y="20%"
            width="80"
            height="200"
            fill="url(#building-gradient-1)"
            transform="skewY(-5)"
            opacity="0.6"
          />

          {/* Building 2 - Medium */}
          <rect
            x="60%"
            y="30%"
            width="100"
            height="150"
            fill="url(#building-gradient-2)"
            transform="skewY(-5)"
            opacity="0.5"
          />

          {/* Building 3 - Short */}
          <rect
            x="80%"
            y="60%"
            width="70"
            height="100"
            fill="url(#building-gradient-1)"
            transform="skewY(-5)"
            opacity="0.5"
          />

          {/* Building 4 - Wide */}
          <rect
            x="25%"
            y="65%"
            width="120"
            height="120"
            fill="url(#building-gradient-2)"
            transform="skewY(-5)"
            opacity="0.4"
          />

          {/* Gradients for buildings */}
          <defs>
            <linearGradient
              id="building-gradient-1"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="rgba(96, 165, 250, 0.3)" />
              <stop offset="100%" stopColor="rgba(96, 165, 250, 0.05)" />
            </linearGradient>
            <linearGradient
              id="building-gradient-2"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="rgba(251, 191, 36, 0.2)" />
              <stop offset="100%" stopColor="rgba(251, 191, 36, 0.03)" />
            </linearGradient>
          </defs>

          {/* Building Windows - Glowing */}
          {[...Array(15)].map((_, i) => (
            <rect
              key={`window-${i}`}
              x={`${15 + (i % 5) * 15}%`}
              y={`${25 + Math.floor(i / 5) * 40}%`}
              width="3"
              height="3"
              fill={i % 3 === 0 ? "var(--cyber-yellow)" : "var(--cyber-blue)"}
              opacity={0.6 + Math.random() * 0.4}
              style={{
                animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </svg>

        {/* Street Lines - Traffic Routes */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            zIndex: 3,
            opacity: 0.5,
          }}
        >
          {/* Horizontal Streets */}
          <line
            x1="0%"
            y1="35%"
            x2="100%"
            y2="35%"
            stroke="rgba(251, 191, 36, 0.3)"
            strokeWidth="2"
            strokeDasharray="10,5"
          />
          <line
            x1="0%"
            y1="65%"
            x2="100%"
            y2="65%"
            stroke="rgba(96, 165, 250, 0.3)"
            strokeWidth="2"
            strokeDasharray="10,5"
          />

          {/* Vertical Streets */}
          <line
            x1="30%"
            y1="0%"
            x2="30%"
            y2="100%"
            stroke="rgba(167, 139, 250, 0.2)"
            strokeWidth="2"
            strokeDasharray="10,5"
          />
          <line
            x1="70%"
            y1="0%"
            x2="70%"
            y2="100%"
            stroke="rgba(167, 139, 250, 0.2)"
            strokeWidth="2"
            strokeDasharray="10,5"
          />

          {/* Moving Traffic Lights */}
          <circle r="4" fill="var(--cyber-green)" opacity="0.8">
            <animateMotion
              dur="8s"
              repeatCount="indefinite"
              path="M 0,200 L 800,200"
            />
          </circle>
          <circle r="4" fill="var(--cyber-yellow)" opacity="0.8">
            <animateMotion
              dur="6s"
              repeatCount="indefinite"
              path="M 200,0 L 200,600"
            />
          </circle>
        </svg>

        {/* Ambient Glow Spots */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "15%",
            width: "200px",
            height: "200px",
            background:
              "radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(40px)",
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "60%",
            right: "20%",
            width: "250px",
            height: "250px",
            background:
              "radial-gradient(circle, rgba(251, 191, 36, 0.12) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(50px)",
            zIndex: 2,
          }}
        />

        {/* Client Position */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "45%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 20,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              border: "3px solid var(--cyber-blue)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "ring-pulse 2s infinite",
              background: "rgba(96, 165, 250, 0.15)",
              boxShadow: "0 0 40px rgba(96, 165, 250, 0.5)",
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                background: "var(--cyber-blue)",
                borderRadius: "50%",
                boxShadow: "0 0 30px 12px rgba(96, 165, 250, 0.6)",
              }}
            />
          </div>
          <div
            style={{
              marginTop: "12px",
              padding: "6px 16px",
              background: "rgba(26, 26, 46, 0.95)",
              backdropFilter: "blur(10px)",
              border: "1px solid var(--cyber-blue)",
              color: "var(--cyber-blue)",
              fontSize: "0.85rem",
              fontWeight: "800",
              fontFamily: "var(--font-mono)",
              borderRadius: "6px",
              boxShadow: "0 0 20px rgba(96, 165, 250, 0.3)",
            }}
          >
            YOU ARE HERE
          </div>
        </div>

        {/* DRIVER MARKERS */}
        {MOCK_DRIVERS.map((driver) => (
          <div
            key={driver.id}
            onClick={() => setSelectedDriver(driver.id)}
            style={{
              position: "absolute",
              top: `${driver.y}%`,
              left: `${driver.x}%`,
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: "pointer",
              zIndex: selectedDriver === driver.id ? 100 : 50,
            }}
          >
            {selectedDriver === driver.id && (
              <div
                style={{
                  position: "absolute",
                  width: 58,
                  height: 58,
                  border: "2px dashed var(--cyber-yellow)",
                  borderRadius: "50%",
                  animation: "spin-slow 10s linear infinite",
                  top: "-12px",
                  zIndex: 101,
                }}
              />
            )}

            <div
              style={{
                transform: `rotate(${driver.heading}deg)`,
                background:
                  selectedDriver === driver.id
                    ? "var(--cyber-yellow)"
                    : "rgba(26, 26, 46, 0.95)",
                padding: "8px",
                borderRadius: "50%",
                border: `2px solid ${selectedDriver === driver.id ? "var(--cyber-yellow)" : "rgba(255, 255, 255, 0.2)"}`,
                boxShadow:
                  selectedDriver === driver.id
                    ? "0 0 25px rgba(251, 191, 36, 0.6)"
                    : "0 0 15px rgba(167, 139, 250, 0.4)",
                backdropFilter: "blur(10px)",
              }}
            >
              <Navigation
                size={24}
                color={
                  selectedDriver === driver.id
                    ? "var(--cyber-black)"
                    : "var(--cyber-purple)"
                }
                fill="currentColor"
              />
            </div>

            <div
              style={{
                marginTop: "8px",
                background: "rgba(26, 26, 46, 0.95)",
                backdropFilter: "blur(10px)",
                border: `2px solid ${selectedDriver === driver.id ? "var(--cyber-yellow)" : "var(--cyber-border)"}`,
                padding: "4px 12px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "700",
                fontFamily: "var(--font-mono)",
                color:
                  selectedDriver === driver.id
                    ? "var(--cyber-yellow)"
                    : "var(--text-main)",
                boxShadow: "0 0 15px rgba(0,0,0,0.5)",
              }}
            >
              {driver.id} • {driver.eta}
            </div>
          </div>
        ))}
      </main>

      {/* Animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes ring-pulse { 
              0% { transform: scale(0.85); opacity: 0.9; } 
              100% { transform: scale(2.2); opacity: 0; } 
            }
            @keyframes spin-slow { 
              100% { transform: rotate(360deg); } 
            }
            @keyframes twinkle {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 1; }
            }
          `,
        }}
      />
=======

  const handleDispatch = () => {
    alert(`Backend API Triggered: Booking ${selectedDriver}`);
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 76px)', overflow: 'hidden' }}>
      
      {/* Left Sidebar: Booking Controls */}
      <aside style={{ width: '420px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', zIndex: 10, borderRight: '1px solid var(--glass-border)', background: 'rgba(11, 15, 25, 0.5)' }}>
        <h2 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '10px' }} className="neon-text-blue">
           <MapPin size={24} /> Dispatch Center
        </h2>
        
        <GlassCard>
          <h3 style={{ margin: '0 0 1rem 0' }}>Route Assignment</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
               {/* Client Origin */}
               <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                 <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#00F0FF' }} />
                 <div style={{ flex: 1 }}>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PICKUP (Live Location)</span>
                   <input type="text" readOnly placeholder="Aspen, Colorado (39.1911° N)" style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none', fontWeight: 'bold' }} />
                 </div>
               </div>
               
               <div style={{ width: 2, height: 25, background: 'rgba(255,255,255,0.2)', marginLeft: 5, marginTop: 5, marginBottom: 5 }} />
               
               {/* Destination */}
               <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                 <div style={{ width: 12, height: 12, borderRadius: '0', background: '#B026FF' }} />
                 <div style={{ flex: 1 }}>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>DESTINATION</span>
                   <input type="text" placeholder="Enter Drop-off Point..." style={{ background: 'transparent', border: 'none', color: '#fff', width: '100%', outline: 'none', fontWeight: 'bold' }} />
                 </div>
               </div>
            </div>
          </div>
        </GlassCard>

        <h3 style={{ margin: '0', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>Active Units Proximity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '5px' }}>
           {MOCK_DRIVERS.map(driver => (
             <GlassCard 
               key={driver.id} 
               className="vehicle-card" 
               style={{ 
                 cursor: 'pointer', 
                 border: selectedDriver === driver.id ? '1px solid var(--accent-blue)' : '1px solid var(--glass-border)',
                 background: selectedDriver === driver.id ? 'rgba(0, 240, 255, 0.05)' : 'var(--glass-bg)',
                 transition: 'all 0.2s',
                 margin: 0
               }}
             >
               <div onClick={() => setSelectedDriver(driver.id)}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <Car size={32} color={selectedDriver === driver.id ? '#00F0FF' : '#9CA3AF'} />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.2rem', color: selectedDriver === driver.id ? '#fff' : 'var(--text-secondary)' }}>{driver.type}</h4>
                        <p style={{ margin: 0, color: 'var(--accent-purple)', fontSize: '0.9rem', fontWeight: 'bold' }}>Unit {driver.id}</p>
                      </div>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                      <strong style={{ display: 'block', fontSize: '1.2rem' }}>{driver.eta}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>away</span>
                   </div>
                 </div>
               </div>
             </GlassCard>
           ))}
        </div>
        
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
           <NeonButton 
             onClick={handleDispatch}
             style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', opacity: selectedDriver ? 1 : 0.5, pointerEvents: selectedDriver ? 'auto' : 'none' }}>
             {selectedDriver ? `Dispatch Unit ${selectedDriver}` : 'Select a Vehicle'}
           </NeonButton>
        </div>
      </aside>

      {/* Right Area: Web Map Simulation */}
      <main style={{ flex: 1, position: 'relative', background: 'radial-gradient(circle at center, #111A2C 0%, #0B0F19 100%)', overflow: 'hidden' }}>
         <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
         
         {/* Client Position marker */}
         <div style={{ position: 'absolute', top: '50%', left: '40%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 5 }}>
            <div style={{ width: 80, height: 80, background: 'rgba(0, 240, 255, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'map-pulse 2s infinite' }}>
              <div style={{ width: 24, height: 24, background: '#00F0FF', borderRadius: '50%', boxShadow: '0 0 15px #00F0FF' }} />
            </div>
            <div className="glass-panel" style={{ padding: '0.5rem 1rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.8)', color: '#00F0FF', fontWeight: 'bold' }}>
              Client (You)
            </div>
         </div>

         {/* Driver markers */}
         {MOCK_DRIVERS.map(driver => (
            <div key={driver.id} onClick={() => setSelectedDriver(driver.id)} style={{ position: 'absolute', top: `${driver.y}%`, left: `${driver.x}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.5s ease', zIndex: 4, cursor: 'pointer' }}>
              {/* Highlight Ring for Selected Map Marker */}
              {selectedDriver === driver.id && (
                 <div style={{ position: 'absolute', width: 60, height: 60, borderRadius: '50%', border: '2px solid #00F0FF', animation: 'spin 4s linear infinite', top: '-11px' }} />
              )}
              <div style={{ transform: `rotate(${driver.heading}deg)`, background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '50%' }}>
                <Navigation size={32} color={selectedDriver === driver.id ? '#00F0FF' : '#B026FF'} fill={selectedDriver === driver.id ? '#00F0FF' : '#B026FF'} />
              </div>
              <div style={{ background: 'rgba(0,0,0,0.8)', border: `1px solid ${selectedDriver === driver.id ? '#00F0FF' : 'var(--glass-border)'}`, padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 'bold', color: selectedDriver === driver.id ? '#00F0FF' : '#fff' }}>
                {driver.id} • {driver.eta}
              </div>
            </div>
         ))}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes map-pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.6); }
          70% { box-shadow: 0 0 0 25px rgba(0, 240, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0); }
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}} />
>>>>>>> fb98a63 (feat: basic ui)
    </div>
  );
}
