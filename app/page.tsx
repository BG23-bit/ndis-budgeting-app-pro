"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: "white" }}>

      {/* NAV */}
      <nav style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 40px",
        background: "#1a1150",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.5rem", color: "#d4a843", fontWeight: "bold" }}>✦</span>
          <span style={{ fontSize: "1.2rem", fontWeight: "600" }}>NDIS Budget Calculator</span>
        </div>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <a href="#features" style={{ color: "#ccc", textDecoration: "none", fontSize: "0.95rem" }}>Features</a>
          <a href="#how" style={{ color: "#ccc", textDecoration: "none", fontSize: "0.95rem" }}>How It Works</a>
          <a href="#pricing" style={{ color: "#ccc", textDecoration: "none", fontSize: "0.95rem" }}>Pricing</a>
          <a href="#faq" style={{ color: "#ccc", textDecoration: "none", fontSize: "0.95rem" }}>FAQ</a>
          <button
            onClick={() => router.push("/login")}
            style={{
              padding: "10px 24px",
              backgroundColor: "#d4a843",
              color: "#1a1150",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.95rem",
            }}
          >
            Log In
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        background: "linear-gradient(135deg, #1a1150 0%, #2d1b69 50%, #1a1150 100%)",
        padding: "100px 40px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{
          position: "absolute", top: "50px", right: "10%",
          width: "200px", height: "200px", borderRadius: "50%",
          background: "#d4a843", opacity: 0.15,
        }} />
        <div style={{
          position: "absolute", bottom: "30px", left: "5%",
          width: "150px", height: "150px", borderRadius: "50%",
          background: "#5b6abf", opacity: 0.2,
        }} />
        <div style={{
          position: "absolute", top: "40%", left: "15%",
          width: "60px", height: "60px", borderRadius: "50%",
          background: "white", opacity: 0.1,
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{
            fontSize: "1rem",
            color: "#d4a843",
            fontWeight: "600",
            letterSpacing: "2px",
            textTransform: "uppercase",
            marginBottom: "15px",
          }}>
            Powered by Kevria
          </p>
          <h1 style={{
            fontSize: "3.5rem",
            fontWeight: "800",
            lineHeight: "1.1",
            marginBottom: "20px",
            maxWidth: "800px",
            marginLeft: "auto",
            marginRight: "auto",
          }}>
            The Smartest Way to Manage{" "}
            <span style={{ color: "#d4a843" }}>NDIS Budgets</span>
          </h1>
          <p style={{
            fontSize: "1.25rem",
            color: "#b0b0d0",
            maxWidth: "600px",
            margin: "0 auto 40px auto",
            lineHeight: "1.6",
          }}>
            Track funding, calculate costs, forecast spending — all in one
            powerful tool built for NDIS providers.
          </p>
          <button
            onClick={() => router.push("/login")}
            style={{
              padding: "16px 48px",
              fontSize: "1.2rem",
              backgroundColor: "#d4a843",
              color: "#1a1150",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              marginRight: "15px",
            }}
          >
            Get Started — $9.99
          </button>
          <button
            onClick={() => {
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              padding: "16px 36px",
              fontSize: "1.2rem",
              backgroundColor: "transparent",
              color: "white",
              border: "2px solid rgba(255,255,255,0.3)",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Learn More ↓
          </button>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{
        background: "#150e40",
        padding: "30px 40px",
        textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <p style={{ color: "#8080a0", fontSize: "0.95rem" }}>
          Trusted by NDIS providers across Australia 🇦🇺
        </p>
      </section>

      {/* FEATURES */}
      <section id="features" style={{
        background: "#1a1150",
        padding: "80px 40px",
      }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "700", marginBottom: "10px" }}>
            Everything You Need
          </h2>
          <p style={{ color: "#8080a0", marginBottom: "50px", fontSize: "1.1rem" }}>
            One tool to manage all your NDIS budget calculations
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "30px",
          }}>
            {[
              {
                icon: "📊",
                title: "Budget Tracking",
                desc: "Track combined funding, weekly costs, and projected annual spend across all support lines.",
              },
              {
                icon: "⏰",
                title: "Shift Rate Calculator",
                desc: "Automatically calculate costs for weekday, night, weekend, public holiday, and sleepover shifts.",
              },
              {
                icon: "📋",
                title: "Multiple Support Lines",
                desc: "Add unlimited support lines. Manage Core Supports, Capacity Building, and more — all in one place.",
              },
              {
                icon: "📤",
                title: "Export CSV & PDF",
                desc: "Export professional reports in CSV or PDF format. Perfect for audits and plan reviews.",
              },
              {
                icon: "💾",
                title: "Auto-Save",
                desc: "Your data saves automatically in your browser. Come back anytime and pick up where you left off.",
              },
              {
                icon: "🔒",
                title: "Secure & Private",
                desc: "Your data stays in your browser. No tracking, no data collection, no third-party access.",
              },
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  padding: "30px",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "15px" }}>{f.icon}</div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "10px" }}>
                  {f.title}
                </h3>
                <p style={{ color: "#9090b0", lineHeight: "1.6", fontSize: "0.95rem" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{
        background: "#150e40",
        padding: "80px 40px",
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "700", marginBottom: "10px" }}>
            How It Works
          </h2>
          <p style={{ color: "#8080a0", marginBottom: "50px", fontSize: "1.1rem" }}>
            Up and running in under 2 minutes
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "30px",
          }}>
            {[
              { step: "1", title: "Create Account", desc: "Sign up with your email in seconds" },
              { step: "2", title: "Unlock Access", desc: "One-time payment of $9.99 AUD" },
              { step: "3", title: "Start Calculating", desc: "Enter your rates and funding — done!" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "#d4a843",
                  color: "#1a1150",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  margin: "0 auto 15px auto",
                }}>
                  {s.step}
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "8px" }}>
                  {s.title}
                </h3>
                <p style={{ color: "#9090b0", fontSize: "0.95rem" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{
        background: "#1a1150",
        padding: "80px 40px",
      }}>
        <div style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "700", marginBottom: "10px" }}>
            Simple Pricing
          </h2>
          <p style={{ color: "#8080a0", marginBottom: "40px", fontSize: "1.1rem" }}>
            No subscriptions. No hidden fees. Pay once, use forever.
          </p>

          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "2px solid #d4a843",
            borderRadius: "20px",
            padding: "40px",
          }}>
            <p style={{
              fontSize: "0.9rem",
              color: "#d4a843",
              fontWeight: "600",
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}>
              Lifetime Access
            </p>
            <div style={{ fontSize: "3.5rem", fontWeight: "800", marginBottom: "5px" }}>
              $9.99
            </div>
            <p style={{ color: "#8080a0", marginBottom: "25px" }}>AUD — One-time payment</p>

            <div style={{ textAlign: "left", marginBottom: "30px" }}>
              {[
                "Unlimited support lines",
                "All shift rate calculations",
                "Sleepover calculations (active & fixed)",
                "CSV & PDF exports",
                "Auto-save in browser",
                "Lifetime access — no expiry",
                "Future updates included",
              ].map((item, i) => (
                <div key={i} style={{
                  padding: "8px 0",
                  borderBottom: i < 6 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  color: "#c0c0e0",
                  fontSize: "0.95rem",
                }}>
                  ✅ {item}
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push("/login")}
              style={{
                width: "100%",
                padding: "16px",
                fontSize: "1.2rem",
                backgroundColor: "#d4a843",
                color: "#1a1150",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Get Started Now →
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{
        background: "#150e40",
        padding: "80px 40px",
      }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "700", marginBottom: "40px", textAlign: "center" }}>
            Frequently Asked Questions
          </h2>

          {[
            {
              q: "Who is this for?",
              a: "This tool is built for NDIS service providers, support coordinators, and plan managers who need to track and forecast NDIS budgets.",
            },
            {
              q: "Is this a subscription?",
              a: "No! It's a one-time payment of $9.99 AUD. Pay once, use forever. No recurring charges.",
            },
            {
              q: "Can I manage multiple participants?",
              a: "Yes! You can add unlimited support lines to manage budgets for different participants or support categories.",
            },
            {
              q: "Is my data secure?",
              a: "Your budget data is saved locally in your browser. We don't store or access your calculation data on our servers.",
            },
            {
              q: "Can I export reports?",
              a: "Yes! Export your budget calculations as CSV files or professional PDF reports — perfect for plan reviews and audits.",
            },
            {
              q: "What if I need help?",
              a: "Contact us at support@kevria.com.au and we'll help you out.",
            },
          ].map((faq, i) => (
            <div
              key={i}
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                padding: "20px 0",
              }}
            >
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "8px", color: "#d4a843" }}>
                {faq.q}
              </h3>
              <p style={{ color: "#9090b0", lineHeight: "1.6", fontSize: "0.95rem" }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: "#0f0a30",
        padding: "40px",
        textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "15px" }}>
          <span style={{ fontSize: "1.5rem", color: "#d4a843" }}>✦</span>
          <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>NDIS Budget Calculator</span>
        </div>
        <p style={{ color: "#6060a0", fontSize: "0.9rem", marginBottom: "8px" }}>
          Powered by <a href="https://kevria.com.au" target="_blank" style={{ color: "#d4a843", textDecoration: "none" }}>Kevria</a> — A YOU Focused NDIS Disability Service Provider
        </p>
        <p style={{ color: "#4040700", fontSize: "0.8rem" }}>
          © {new Date().getFullYear()} Kevria. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

