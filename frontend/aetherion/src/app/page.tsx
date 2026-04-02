"use client";

export default function LandingPage() {
  return (
    <main
      style={{
        padding: "4rem 2rem",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      {/* Hero Section - Clear & Inviting */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          marginBottom: "6rem",
          paddingTop: "2rem",
        }}
      >
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

        <p
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

        {/* Trust Indicators */}
        <div
          style={{
            display: "flex",
            gap: "3rem",
            marginTop: "3rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { number: "10K+", label: "Happy Travelers" },
            { number: "95%", label: "Satisfaction Rate" },
            { number: "24/7", label: "AI Support" },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div
                className="stat-number"
                style={{
                  fontSize: "2.5rem",
                  color: "var(--cyber-yellow)",
                  marginBottom: "0.25rem",
                }}
              >
                {stat.number}
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-muted)",
                  letterSpacing: "0.05em",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
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
                suggestions for restaurants, attractions, and hidden gems based
                on your preferences.
              </p>

              <div className="ready-label">✓ Always Learning</div>
            </div>
          </a>

          {/* Feature Card 2 */}
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

          {/* Feature Card 3 */}
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
        </div>
      </section>

      {/* How It Works - Simple Steps */}
      <section
        style={{
          padding: "4rem 2rem",
          background: "var(--cyber-surface)",
          borderRadius: "20px",
          border: "1px solid var(--cyber-border)",
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
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          textAlign: "center",
          padding: "4rem 2rem",
          background:
            "linear-gradient(135deg, var(--cyber-yellow-dim) 0%, var(--cyber-blue-dim) 100%)",
          borderRadius: "20px",
          border: "1px solid var(--cyber-border)",
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
          Join thousands of travelers who trust Tourist AI for smarter journeys
        </p>
        <button
          className="cyber-button"
          onClick={() => (window.location.href = "/renting/suggestions")}
          style={{ fontSize: "1.1rem", padding: "1.25rem 2.5rem" }}
        >
          Start Your Journey
        </button>
      </section>
    </main>
  );
}

