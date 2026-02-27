"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState(10);

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
          Built for NDIS support coordinators and plan managers across Australia 🇦🇺
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
                desc: "Track combined funding, weekly costs, and projected plan spend across all support lines — with a live remaining balance.",
              },
              {
                icon: "⏰",
                title: "Shift Rate Calculator",
                desc: "Automatically calculate costs for weekday, night, Saturday, Sunday, public holiday, active sleepover, and fixed sleepover shifts.",
              },
              {
                icon: "🗓️",
                title: "Public Holiday Auto-Calc",
                desc: "Public holidays are detected automatically for your state. Toggle each holiday per support line and see the exact cost impact.",
              },
              {
                icon: "📈",
                title: "Plan Pace Tracking",
                desc: "See if spending is on pace, ahead, or behind based on today's date — so you can act before the budget runs out.",
              },
              {
                icon: "🧾",
                title: "Claims Tracker",
                desc: "Log actual invoices and claims against each support line. Track projected vs actual spend side by side.",
              },
              {
                icon: "👥",
                title: "Multiple Participants",
                desc: "Manage budgets for as many participants as you need from a single dashboard — each with their own calculator.",
              },
              {
                icon: "🚗",
                title: "KM Tracking",
                desc: "Add transport kilometre costs per support line with configurable rates and frequency.",
              },
              {
                icon: "📤",
                title: "Export CSV & PDF",
                desc: "Export professional reports in CSV or PDF format. Perfect for plan reviews, audits, and sharing with participants.",
              },
              {
                icon: "🔒",
                title: "Secure & Private",
                desc: "Your data is stored securely in your account. Your email is used only for login — never sold or shared with third parties.",
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
        <div style={{ maxWidth: "780px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "700", marginBottom: "10px" }}>
            Simple Pricing
          </h2>
          <p style={{ color: "#8080a0", marginBottom: "40px", fontSize: "1.1rem" }}>
            No lock-in. Cancel anytime.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", textAlign: "left" }}>
            {/* Monthly */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "20px", padding: "36px" }}>
              <p style={{ fontSize: "0.85rem", color: "#8080a0", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Monthly</p>
              <div style={{ fontSize: "3rem", fontWeight: "800", marginBottom: "2px" }}>$9.99</div>
              <p style={{ color: "#8080a0", marginBottom: "24px", fontSize: "0.9rem" }}>AUD / month</p>
              {["Unlimited participants & support lines", "All shift rate calculations", "Public holiday auto-calc", "Plan pace tracking", "Claims tracker", "CSV & PDF exports", "Cancel anytime"].map((item, i) => (
                <div key={i} style={{ padding: "7px 0", borderBottom: i < 6 ? "1px solid rgba(255,255,255,0.05)" : "none", color: "#c0c0e0", fontSize: "0.9rem" }}>✅ {item}</div>
              ))}
              <button onClick={() => router.push("/login")} style={{ marginTop: "24px", width: "100%", padding: "14px", fontSize: "1rem", backgroundColor: "transparent", color: "#d4a843", border: "2px solid #d4a843", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                Get Started →
              </button>
            </div>

            {/* Annual */}
            <div style={{ background: "rgba(212,168,67,0.06)", border: "2px solid #d4a843", borderRadius: "20px", padding: "36px", position: "relative" }}>
              <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "#d4a843", color: "#1a1150", fontSize: "0.75rem", fontWeight: "800", padding: "4px 16px", borderRadius: "20px", whiteSpace: "nowrap" }}>
                BEST VALUE — SAVE 34%
              </div>
              <p style={{ fontSize: "0.85rem", color: "#d4a843", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Annual</p>
              <div style={{ fontSize: "3rem", fontWeight: "800", marginBottom: "2px" }}>$79</div>
              <p style={{ color: "#8080a0", marginBottom: "24px", fontSize: "0.9rem" }}>AUD / year <span style={{ color: "#d4a843" }}>(≈$6.58/mo)</span></p>
              {["Everything in Monthly", "2 months free vs monthly", "Priority support", "Cancel anytime"].map((item, i) => (
                <div key={i} style={{ padding: "7px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none", color: "#c0c0e0", fontSize: "0.9rem" }}>✅ {item}</div>
              ))}
              <button onClick={() => router.push("/login")} style={{ marginTop: "24px", width: "100%", padding: "14px", fontSize: "1rem", backgroundColor: "#d4a843", color: "#1a1150", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                Get Started →
              </button>
            </div>
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
              q: "How does pricing work?",
              a: "Choose monthly ($9.99/mo) or annual ($79/yr — save 34%). Both plans include all features. No lock-in — cancel anytime from your account.",
            },
            {
              q: "Can I manage multiple participants?",
              a: "Yes! The dashboard lets you manage unlimited participants, each with their own full budget calculator, support lines, and claims tracker.",
            },
            {
              q: "Is my data secure?",
              a: "Your data is stored securely in your Kevria account. We use your email address only for account access and never sell or share your personal information. See our Privacy Policy for full details.",
            },
            {
              q: "Can I export reports?",
              a: "Yes! Export your budget calculations as CSV files or professional PDF reports — perfect for plan reviews and audits.",
            },
            {
              q: "What if I need help?",
              a: "Contact us at support@kevria.com and we'll help you out.",
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

      {/* SAVINGS CALCULATOR */}
      {(() => {
        const hoursPerYear = participants * 18;
        const valuePerYear = hoursPerYear * 100;
        const annualCost = 79;
        const roi = Math.round(valuePerYear / annualCost);
        return (
          <section style={{ background: "#1a1150", padding: "80px 40px" }}>
            <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center" }}>
              <p style={{ fontSize: "0.9rem", color: "#d4a843", fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>
                See your ROI
              </p>
              <h2 style={{ fontSize: "2.2rem", fontWeight: "700", marginBottom: "10px" }}>
                How much time will you save?
              </h2>
              <p style={{ color: "#8080a0", marginBottom: "50px", fontSize: "1.1rem" }}>
                Move the slider to see your estimated savings
              </p>

              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,168,67,0.2)", borderRadius: "24px", padding: "40px" }}>
                <div style={{ marginBottom: "40px" }}>
                  <div style={{ fontSize: "1rem", color: "#b0a0d0", marginBottom: "12px" }}>
                    I manage <span style={{ color: "#d4a843", fontWeight: "800", fontSize: "1.4rem" }}>{participants}</span> participants
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={participants}
                    onChange={(e) => setParticipants(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#d4a843", height: "6px", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#505070", marginTop: "6px" }}>
                    <span>1</span><span>25</span><span>50</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "20px", marginBottom: "32px" }}>
                  {[
                    { label: "Hours saved per year", value: hoursPerYear + " hrs", color: "#d4a843" },
                    { label: "Value of time saved", value: "$" + valuePerYear.toLocaleString(), color: "#22c55e" },
                    { label: "Your ROI", value: roi + "x", color: "#a78bfa" },
                  ].map((stat) => (
                    <div key={stat.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "16px", padding: "20px" }}>
                      <div style={{ fontSize: "2rem", fontWeight: "800", color: stat.color, marginBottom: "6px" }}>{stat.value}</div>
                      <div style={{ fontSize: "0.85rem", color: "#8080a0" }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p style={{ color: "#6060a0", fontSize: "0.8rem", marginBottom: "24px" }}>
                  Based on ~1.5 hrs saved per participant per month at $100/hr coordinator rate
                </p>

                <button
                  onClick={() => router.push("/login")}
                  style={{ padding: "14px 48px", fontSize: "1.1rem", backgroundColor: "#d4a843", color: "#1a1150", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                >
                  Start Saving Time →
                </button>
              </div>
            </div>
          </section>
        );
      })()}

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
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "12px" }}>
          <a href="/privacy" style={{ color: "#6060a0", fontSize: "0.85rem", textDecoration: "none" }}>Privacy Policy</a>
          <span style={{ color: "#3a3a60" }}>|</span>
          <a href="mailto:support@kevria.com" style={{ color: "#6060a0", fontSize: "0.85rem", textDecoration: "none" }}>support@kevria.com</a>
        </div>
        <p style={{ color: "#404070", fontSize: "0.75rem", maxWidth: "600px", margin: "0 auto 8px auto", lineHeight: "1.5" }}>
          This tool is provided for budgeting guidance only. It is not affiliated with the NDIA and does not constitute financial or planning advice. Always verify rates against the official NDIS Pricing Arrangements.
        </p>
        <p style={{ color: "#404070", fontSize: "0.8rem" }}>
          © {new Date().getFullYear()} Kevria. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

