"use client";

import CountUp from "@/components/CountUp";
import RevealOnScroll from "@/components/RevealOnScroll";

export default function LandingPage() {
  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "var(--cyber-black)",
        overflowX: "hidden",
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

            .hud-glass-panel {
              background: rgba(15, 23, 42, 0.65);
              backdrop-filter: blur(24px);
              -webkit-backdrop-filter: blur(24px);
              border: 1px solid rgba(52, 229, 235, 0.3);
              box-shadow: 0 0 50px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(52, 229, 235, 0.1);
              border-radius: 16px;
            }
          `,
        }}
      />

      {/* BACKGROUND 3D GRID & SCANNER */}
      <div className="map-fade-in" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        {/* Sky / deep gradient */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)", opacity: 0.95 }} />

        {/* Global Laser Scan Line */}
        <div style={{ position: "absolute", left: 0, right: 0, height: "4px", background: "var(--cyber-blue)", boxShadow: "0 0 20px 5px var(--cyber-blue-glow)", animation: "scanning-laser 6s linear infinite", zIndex: 5 }} />

        {/* Animated 3D Grid */}
        <div style={{ position: "absolute", inset: "-50%", backgroundImage: "linear-gradient(rgba(52, 229, 235, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(52, 229, 235, 0.1) 1px, transparent 1px)", backgroundSize: "80px 80px", animation: "grid-pan 4s linear infinite", transform: "perspective(1000px) rotateX(65deg) scale(1.2)", transformOrigin: "center top", zIndex: 1 }} />

        {/* Ambient Glows */}
        <div style={{ position: "absolute", top: "25%", left: "-5rem", width: "30rem", height: "30rem", borderRadius: "50%", opacity: 0.2, filter: "blur(80px)", background: "radial-gradient(circle, var(--cyber-blue) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "-5rem", width: "30rem", height: "30rem", borderRadius: "50%", opacity: 0.2, filter: "blur(80px)", background: "radial-gradient(circle, var(--cyber-purple) 0%, transparent 70%)" }} />
      </div>

      {/* FOREGROUND CONTENT */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          padding: "4rem 2rem",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
      {/* Hero Section - Clear & Inviting */}
      <section
        className="card-drop-in hud-glass-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          marginBottom: "6rem",
          padding: "3rem 2rem",
          marginTop: "1rem",
        }}
      >
        {/* LỚP NGOÀI: Chỉ chịu trách nhiệm làm hiệu ứng rớt xuống và rõ dần */}
        <div className="animate-focus-1">
          {/* LỚP TRONG: Chịu trách nhiệm font chữ và hiệu ứng rê chuột (hover) */}
          <div
            className="glitch-yellow"
            style={{
              fontSize: "clamp(2.5rem, 8vw, 5rem)",
              marginBottom: "1.5rem",
              lineHeight: 1.1,
            }}
          >
            Your AI Travel
            <br />
            Companion
          </div>
        </div>
        <p
          className="animate-focus-2"
          style={{
            fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)",
            color: "var(--text-secondary)",
            maxWidth: "700px",
            lineHeight: 1.7,
            marginBottom: "2.5rem",
          }}
        >
          Discover hidden gems, get instant recommendations, and navigate like a
          local. Powered by advanced AI to make every journey effortless.
        </p>

        <div
          className="animate-focus-3"
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            className="cyber-button"
            onClick={() => (window.location.href = "/renting/suggestions")}
          >
            Try AI Assistant
          </button>
          <button
            style={{
              padding: "1rem 2rem",
              background: "transparent",
              border: "2px solid var(--cyber-border)",
              borderRadius: "8px",
              color: "var(--text-main)",
              fontFamily: "var(--font-header)",
              fontWeight: "600",
              fontSize: "0.95rem",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onClick={() => (window.location.href = "/tour-judging")}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--cyber-yellow)";
              e.currentTarget.style.color = "var(--cyber-yellow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--cyber-border)";
              e.currentTarget.style.color = "var(--text-main)";
            }}
          >
            Explore Destinations
          </button>
        </div>

        {/* Trust Indicators MỚI CÓ HIỆU ỨNG NHẢY SỐ */}
        <div
          style={{
            display: "flex",
            gap: "3rem",
            marginTop: "3rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {/* Số 1 */}
          <div style={{ textAlign: "center" }}>
            <div
              className="stat-number"
              style={{
                fontSize: "2.5rem",
                color: "var(--cyber-yellow)",
                marginBottom: "0.25rem",
              }}
            >
              <CountUp end={10} suffix="K+" />
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                color: "var(--text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              Happy Travelers
            </div>
          </div>

          {/* Số 2 */}
          <div style={{ textAlign: "center" }}>
            <div
              className="stat-number"
              style={{
                fontSize: "2.5rem",
                color: "var(--cyber-yellow)",
                marginBottom: "0.25rem",
              }}
            >
              <CountUp end={95} suffix="%" />
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                color: "var(--text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              Satisfaction Rate
            </div>
          </div>

          {/* Số 3 */}
          <div style={{ textAlign: "center" }}>
            <div
              className="stat-number"
              style={{
                fontSize: "2.5rem",
                color: "var(--cyber-yellow)",
                marginBottom: "0.25rem",
              }}
            >
              <CountUp end={24} suffix="/7" />
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                color: "var(--text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              AI Support
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Clear Value Props */}
      <section style={{ marginBottom: "5rem" }}>
        <h2
          style={{
            fontFamily: "var(--font-header)",
            fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
            fontWeight: "700",
            textAlign: "center",
            marginBottom: "1rem",
            color: "var(--text-main)",
          }}
        >
          How Tourist AI Helps You
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "var(--text-secondary)",
            fontSize: "1.1rem",
            marginBottom: "3rem",
            maxWidth: "600px",
            margin: "0 auto 3rem",
          }}
        >
          Everything you need for seamless travel planning and navigation
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "2rem",
          }}
        >
          {/* Feature Card 1 */}
          <RevealOnScroll delay={0}>
            <a href="/renting/suggestions" style={{ textDecoration: "none" }}>
              <div className="edgerunner-card" style={{ height: "100%" }}>
                <div className="module-label" style={{ marginBottom: "1rem" }}>
                  AI-Powered
                </div>

                <h3
                  style={{
                    fontFamily: "var(--font-header)",
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    marginBottom: "1rem",
                    color: "var(--cyber-yellow)",
                  }}
                >
                  Smart Recommendations
                </h3>

                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "1rem",
                    lineHeight: 1.7,
                    marginBottom: "1.5rem",
                  }}
                >
                  Ask anything about your destination. Get personalized
                  suggestions for restaurants, attractions, and hidden gems
                  based on your preferences.
                </p>

                <div className="ready-label">✓ Always Learning</div>
              </div>
            </a>
          </RevealOnScroll>
          {/* Feature Card 2 */}
          <RevealOnScroll delay={150}>
            <a href="/booking" style={{ textDecoration: "none" }}>
              <div className="edgerunner-card" style={{ height: "100%" }}>
                <div className="module-label" style={{ marginBottom: "1rem" }}>
                  Real-Time
                </div>

                <h3
                  style={{
                    fontFamily: "var(--font-header)",
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    marginBottom: "1rem",
                    color: "var(--cyber-blue)",
                  }}
                >
                  Instant Transportation
                </h3>

                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "1rem",
                    lineHeight: 1.7,
                    marginBottom: "1.5rem",
                  }}
                >
                  Book rides with live tracking, estimated arrival times, and
                  multiple vehicle options. Your journey, your way.
                </p>

                <div className="ready-label">✓ Live GPS Tracking</div>
              </div>
            </a>
          </RevealOnScroll>
          {/* Feature Card 3 */}
          <RevealOnScroll delay={300}>
            <a href="/tour-judging" style={{ textDecoration: "none" }}>
              <div className="edgerunner-card" style={{ height: "100%" }}>
                <div className="module-label" style={{ marginBottom: "1rem" }}>
                  Data-Driven
                </div>

                <h3
                  style={{
                    fontFamily: "var(--font-header)",
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    marginBottom: "1rem",
                    color: "var(--cyber-purple)",
                  }}
                >
                  Smart Route Planning
                </h3>

                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "1rem",
                    lineHeight: 1.7,
                    marginBottom: "1.5rem",
                  }}
                >
                  Analyze weather, safety, and traffic patterns to suggest the
                  best times and routes for your adventures.
                </p>

                <div className="ready-label">✓ Predictive Analytics</div>
              </div>
            </a>
          </RevealOnScroll>
        </div>
      </section>

      {/* How It Works - Simple Steps */}
      <RevealOnScroll delay={0}>
        <section
          className="hud-glass-panel"
          style={{
            padding: "4rem 2rem",
            marginBottom: "5rem",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-header)",
              fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
              fontWeight: "700",
              textAlign: "center",
              marginBottom: "3rem",
              color: "var(--text-main)",
            }}
          >
            Getting Started is Easy
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "3rem",
              maxWidth: "1000px",
              margin: "0 auto",
            }}
          >
            {[
              {
                step: "1",
                title: "Tell Us Your Plans",
                desc: "Share your destination, dates, and interests",
              },
              {
                step: "2",
                title: "Get AI Recommendations",
                desc: "Receive personalized suggestions instantly",
              },
              {
                step: "3",
                title: "Book & Navigate",
                desc: "Reserve rides and explore with confidence",
              },
            ].map((item, i) => (
              <RevealOnScroll key={i} delay={i * 200}>
                <div key={i} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, var(--cyber-yellow), var(--cyber-blue))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-header)",
                      fontSize: "1.5rem",
                      fontWeight: "700",
                      color: "var(--cyber-black)",
                      margin: "0 auto 1.5rem",
                      boxShadow: "0 8px 20px var(--cyber-yellow-glow)",
                    }}
                  >
                    {item.step}
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-header)",
                      fontSize: "1.2rem",
                      fontWeight: "700",
                      marginBottom: "0.75rem",
                      color: "var(--text-main)",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.95rem",
                      lineHeight: 1.6,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </section>
      </RevealOnScroll>
      {/* CTA Section */}
      <RevealOnScroll delay={100}>
        <section
          className="hud-glass-panel"
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-header)",
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              fontWeight: "700",
              marginBottom: "1rem",
              color: "var(--cyber-yellow)",
            }}
          >
            Ready to Transform Your Travel?
          </h2>
          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-secondary)",
              marginBottom: "2rem",
              maxWidth: "600px",
              margin: "0 auto 2rem",
            }}
          >
            Join thousands of travelers who trust Tourist AI for smarter
            journeys
          </p>
          <button
            className="cyber-button"
            onClick={() => (window.location.href = "/renting/suggestions")}
            style={{ fontSize: "1.1rem", padding: "1.25rem 2.5rem" }}
          >
            Start Your Journey
          </button>
        </section>
      </RevealOnScroll>
      </div>
    </main>
  );
}
