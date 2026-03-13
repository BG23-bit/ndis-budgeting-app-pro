"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState(10);
  const [hourlyRate, setHourlyRate] = useState(80);

  const setupHrs = 2;
  const monthlyReviewHrs = 5;
  const phCalcHrs = 1.5;
  const scheduleHrs = 1.5;
  const claimsHrs = 3;
  const hrsPerParticipant = setupHrs + monthlyReviewHrs + phCalcHrs + scheduleHrs + claimsHrs;

  const totalHrs = Math.round(participants * hrsPerParticipant);
  const valuePerYear = totalHrs * hourlyRate;
  const annualCost = 79;
  const roi = Math.round(valuePerYear / annualCost);

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "white", background: "#0f0a30" }}>

      {/* NAV */}
      <nav style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "18px 48px",
        background: "rgba(15,10,48,0.95)",
        borderBottom: "1px solid rgba(212,168,67,0.12)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.4rem", color: "#d4a843" }}>✦</span>
          <span style={{ fontSize: "1.1rem", fontWeight: "700", letterSpacing: "0.02em" }}>Kevria Calc</span>
        </div>
        <div style={{ display: "flex", gap: "28px", alignItems: "center" }}>
          {["Features", "How It Works", "Pricing", "FAQ"].map((label, i) => (
            <a
              key={label}
              href={["#features", "#how", "#pricing", "#faq"][i]}
              style={{ color: "rgba(255,255,255,0.55)", textDecoration: "none", fontSize: "0.9rem", fontWeight: "500", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "white")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
            >{label}</a>
          ))}
          <a href="https://kevria.com" target="_blank" rel="noopener noreferrer"
            style={{ color: "#d4a843", textDecoration: "none", fontSize: "0.9rem", fontWeight: "600" }}>
            kevria.com
          </a>
          <button onClick={() => router.push("/login")} style={{
            padding: "9px 22px",
            backgroundColor: "#d4a843",
            color: "#1a1150",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "0.9rem",
          }}>Log In</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        background: "linear-gradient(135deg, #1a1150 0%, #2d1b69 60%, #1a1150 100%)",
        padding: "80px 48px 100px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background accents */}
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "400px", height: "400px", borderRadius: "50%", background: "#d4a843", opacity: 0.06, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-80px", left: "-40px", width: "300px", height: "300px", borderRadius: "50%", background: "#7c6abf", opacity: 0.12, pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />

        <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "center" }}>
          {/* Left — copy */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <span style={{ width: "28px", height: "2px", background: "#d4a843", display: "inline-block" }} />
              <span style={{ fontSize: "0.78rem", color: "#d4a843", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Built by providers · For providers
              </span>
            </div>
            <h1 style={{
              fontSize: "3.4rem",
              fontWeight: "800",
              lineHeight: "1.08",
              marginBottom: "20px",
              letterSpacing: "-0.02em",
            }}>
              The smartest way to manage{" "}
              <span style={{ color: "#d4a843", position: "relative" }}>NDIS budgets</span>
            </h1>
            <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.65)", lineHeight: "1.65", marginBottom: "14px", maxWidth: "500px" }}>
              Track funding, calculate rosters with public holidays, forecast plan spend, and generate Schedule of Supports — all in one tool.
            </p>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.35)", marginBottom: "36px" }}>
              SIL · Support Coordination · Community Access · Therapy · Plan Management · Respite
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button onClick={() => router.push("/login")} style={{
                padding: "15px 36px",
                fontSize: "1rem",
                backgroundColor: "#d4a843",
                color: "#1a1150",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "700",
              }}>
                Get Started — $9.99/mo
              </button>
              <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} style={{
                padding: "15px 28px",
                fontSize: "1rem",
                backgroundColor: "transparent",
                color: "rgba(255,255,255,0.8)",
                border: "1.5px solid rgba(255,255,255,0.2)",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "600",
              }}>
                See Features ↓
              </button>
            </div>
          </div>

          {/* Right — product preview card */}
          <div style={{ position: "relative" }}>
            <div style={{
              background: "rgba(26,17,80,0.7)",
              border: "1px solid rgba(212,168,67,0.2)",
              borderRadius: "20px",
              padding: "24px",
              backdropFilter: "blur(12px)",
              boxShadow: "0 32px 64px rgba(0,0,0,0.4)",
            }}>
              {/* Mini header */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "#d4a843", fontSize: "1rem" }}>✦</span>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#d4a843" }}>Kevria Calc</span>
                <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>2025–26 rates loaded</span>
              </div>

              {/* Budget summary */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                {[
                  { label: "Total Funding", value: "$48,500", color: "#d4a843" },
                  { label: "Weekly Cost", value: "$892.40", color: "white" },
                  { label: "Plan Cost", value: "$46,404", color: "white" },
                  { label: "Remaining", value: "$2,096", color: "#22c55e" },
                ].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 14px" }}>
                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{s.label}</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "700", color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Budget usage — 95.7% used</span>
                  <span style={{ fontSize: "0.72rem", background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", padding: "2px 8px", borderRadius: "20px", fontWeight: "700" }}>ON TRACK</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
                  <div style={{ width: "95.7%", height: "100%", background: "#22c55e", borderRadius: "6px" }} />
                </div>
              </div>

              {/* Roster rows */}
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>Weekly Roster</div>
              {[
                { day: "Mon", hrs: "8h", rate: "$70.23/hr", cost: "$561.84" },
                { day: "Sat", hrs: "6h", rate: "$98.83/hr", cost: "$592.98" },
                { day: "Sun", hrs: "4h", rate: "$127.43/hr", cost: "$509.72" },
              ].map(r => (
                <div key={r.day} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ width: "32px", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", fontWeight: "600" }}>{r.day}</span>
                  <span style={{ background: "rgba(212,168,67,0.12)", color: "#d4a843", fontSize: "0.75rem", fontWeight: "700", padding: "2px 8px", borderRadius: "6px" }}>{r.hrs}</span>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", flex: 1 }}>{r.rate}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "rgba(255,255,255,0.7)" }}>{r.cost}</span>
                </div>
              ))}

              {/* PH badge */}
              <div style={{ marginTop: "14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>🗓 Public holidays detected (VIC)</span>
                <span style={{ fontSize: "0.8rem", color: "#f87171", fontWeight: "600" }}>+$312.06</span>
              </div>
            </div>

            {/* Floating badge */}
            <div style={{
              position: "absolute", bottom: "-18px", left: "24px",
              background: "#d4a843", color: "#1a1150",
              padding: "8px 16px", borderRadius: "24px",
              fontSize: "0.78rem", fontWeight: "800",
              boxShadow: "0 8px 24px rgba(212,168,67,0.35)",
              whiteSpace: "nowrap",
            }}>
              ✓ Schedule of Supports PDF — 1 click
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section style={{
        background: "#d4a843",
        padding: "18px 48px",
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "48px", flexWrap: "wrap" }}>
          {[
            { value: "15", label: "NDIS categories covered" },
            { value: "2025–26", label: "Price guide built in" },
            { value: "8", label: "States & territories" },
            { value: "1-click", label: "Schedule of Supports PDF" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "#1a1150" }}>{s.value}</span>
              <span style={{ fontSize: "0.82rem", color: "rgba(26,17,80,0.65)", fontWeight: "600" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ background: "#1a1150", padding: "100px 48px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <p style={{ fontSize: "0.78rem", color: "#d4a843", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px" }}>What you get</p>
            <h2 style={{ fontSize: "2.4rem", fontWeight: "800", marginBottom: "12px", letterSpacing: "-0.02em" }}>Everything you need</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.05rem", maxWidth: "520px", margin: "0 auto" }}>
              One tool to manage all your NDIS budget calculations — whatever type of support you deliver
            </p>
          </div>

          {/* Highlight features — 2 col */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            {[
              {
                icon: "📋",
                title: "Schedule of Supports — Ready to Sign",
                desc: "Generate a professional PDF in seconds. Shows each support line with NDIS item code, weekly roster, estimated weekly cost, plan total, and signature blocks. Attach to your existing SA template.",
              },
              {
                icon: "📄",
                title: "Upload Plan PDF — Skip the Data Entry",
                desc: "Upload the participant's NDIS plan PDF and we extract plan dates, state, support categories, and funding amounts automatically using AI. Review and confirm before anything is applied.",
              },
            ].map((f) => (
              <div key={f.title} style={{
                background: "rgba(212,168,67,0.05)",
                border: "1px solid rgba(212,168,67,0.2)",
                borderRadius: "16px",
                padding: "32px",
                display: "flex",
                gap: "20px",
                alignItems: "flex-start",
              }}>
                <div style={{ fontSize: "2rem", flexShrink: 0, marginTop: "2px" }}>{f.icon}</div>
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#d4a843", marginBottom: "10px" }}>{f.title}</h3>
                  <p style={{ color: "rgba(255,255,255,0.5)", lineHeight: "1.6", fontSize: "0.9rem" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Grid features */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            {[
              { icon: "💰", title: "Per-Category Rates", desc: "Every support line pre-loaded with correct 2025–26 rates for its category. Fully editable." },
              { icon: "🗂️", title: "Smart Roster Modes", desc: "Full shift, weekday-only, or lump sum — roster adapts to the support type automatically." },
              { icon: "⚠️", title: "Rate Monitoring", desc: "Yellow warnings flag rates set below the price guide while still allowing negotiated rates." },
              { icon: "📈", title: "Plan Pace Tracking", desc: "See if spending is on pace, ahead, or behind today's date — act before the budget runs out." },
              { icon: "🗓️", title: "Public Holiday Auto-Calc", desc: "Holidays detected per state, per line. Toggle each holiday and see the cost impact in real time." },
              { icon: "🧾", title: "Claims & Actual Spend", desc: "Log actual invoices and track projected vs actual spend side by side." },
              { icon: "👥", title: "Multiple Participants", desc: "Unlimited participants from one dashboard — each with their own full calculator and tracker." },
              { icon: "🚗", title: "KM Tracking", desc: "Transport kilometre costs per support line with configurable rates and frequency." },
              { icon: "📤", title: "CSV & PDF Export", desc: "Professional reports for plan reviews, handovers, audits, and sharing with families." },
              { icon: "☁️", title: "Cloud Sync", desc: "Saves automatically and syncs across all your devices. Access from anywhere." },
            ].map((f) => (
              <div key={f.title} style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "14px",
                padding: "24px",
              }}>
                <div style={{ fontSize: "1.6rem", marginBottom: "12px" }}>{f.icon}</div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "8px", color: "rgba(255,255,255,0.9)" }}>{f.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.4)", lineHeight: "1.55", fontSize: "0.85rem" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ background: "#150e40", padding: "100px 48px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "0.78rem", color: "#d4a843", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px" }}>Getting started</p>
          <h2 style={{ fontSize: "2.4rem", fontWeight: "800", marginBottom: "12px", letterSpacing: "-0.02em" }}>Up and running in 2 minutes</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "64px", fontSize: "1.05rem" }}>No setup, no training required</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "40px 30px" }}>
            {[
              { step: "01", title: "Create Account", desc: "Sign up with your email in seconds" },
              { step: "02", title: "Choose a Plan", desc: "Monthly ($9.99/mo) or Annual ($79/yr). Cancel anytime." },
              { step: "03", title: "Add Participants", desc: "Add participants and enter their plan details — or upload their NDIS plan PDF to auto-fill everything instantly" },
              { step: "04", title: "Build Rosters", desc: "Set up support lines, shifts, and rates. Public holidays and pace tracking are automatic." },
              { step: "05", title: "Generate Schedule of Supports", desc: "One click — professional PDF with NDIS codes, daily hours, weekly costs, plan totals, and signature blocks" },
              { step: "06", title: "Track & Monitor", desc: "Log claims as invoices come in and monitor budget health in real time" },
            ].map((s) => (
              <div key={s.step} style={{ textAlign: "center" }}>
                <div style={{
                  width: "52px", height: "52px", borderRadius: "14px",
                  background: s.step === "05" ? "#d4a843" : "rgba(212,168,67,0.12)",
                  border: s.step === "05" ? "none" : "1px solid rgba(212,168,67,0.25)",
                  color: s.step === "05" ? "#1a1150" : "#d4a843",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.9rem", fontWeight: "800", margin: "0 auto 16px auto",
                  letterSpacing: "0.02em",
                }}>
                  {s.step}
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "8px", color: s.step === "05" ? "#d4a843" : "white" }}>{s.title}</h3>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.88rem", lineHeight: "1.55" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ background: "#1a1150", padding: "100px 48px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "0.78rem", color: "#d4a843", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px" }}>Pricing</p>
          <h2 style={{ fontSize: "2.4rem", fontWeight: "800", marginBottom: "12px", letterSpacing: "-0.02em" }}>Simple, transparent pricing</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "48px", fontSize: "1.05rem" }}>No lock-in. Cancel anytime. All features included.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", textAlign: "left" }}>
            {/* Monthly */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "36px" }}>
              <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Monthly</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "4px" }}>
                <span style={{ fontSize: "2.8rem", fontWeight: "800" }}>$9.99</span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.35)", marginBottom: "28px", fontSize: "0.88rem" }}>AUD / month</p>
              {["Unlimited participants & support lines", "Schedule of Supports PDF generator", "PDF plan upload & auto-fill", "Per-category rate presets (01–15)", "Public holiday auto-calc by state", "Plan pace tracking", "Claims & actual spend tracker", "CSV & PDF exports", "Cancel anytime"].map((item, i) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: i < 8 ? "1px solid rgba(255,255,255,0.05)" : "none", color: "rgba(255,255,255,0.65)", fontSize: "0.88rem", display: "flex", gap: "10px", alignItems: "center" }}>
                  <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span> {item}
                </div>
              ))}
              <button onClick={() => router.push("/login")} style={{ marginTop: "28px", width: "100%", padding: "14px", fontSize: "0.95rem", backgroundColor: "transparent", color: "#d4a843", border: "2px solid #d4a843", borderRadius: "10px", cursor: "pointer", fontWeight: "700" }}>
                Get Started →
              </button>
            </div>

            {/* Annual */}
            <div style={{ background: "rgba(212,168,67,0.05)", border: "2px solid #d4a843", borderRadius: "20px", padding: "36px", position: "relative" }}>
              <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "#d4a843", color: "#1a1150", fontSize: "0.72rem", fontWeight: "800", padding: "4px 16px", borderRadius: "20px", whiteSpace: "nowrap" }}>
                BEST VALUE — SAVE 34%
              </div>
              <p style={{ fontSize: "0.78rem", color: "#d4a843", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Annual</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "4px" }}>
                <span style={{ fontSize: "2.8rem", fontWeight: "800" }}>$79</span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.35)", marginBottom: "28px", fontSize: "0.88rem" }}>AUD / year <span style={{ color: "#d4a843" }}>(≈$6.58/mo)</span></p>
              {["Everything in Monthly", "2 months free vs monthly", "Priority support", "Cancel anytime"].map((item, i) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none", color: "rgba(255,255,255,0.65)", fontSize: "0.88rem", display: "flex", gap: "10px", alignItems: "center" }}>
                  <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span> {item}
                </div>
              ))}
              <button onClick={() => router.push("/login")} style={{ marginTop: "28px", width: "100%", padding: "14px", fontSize: "0.95rem", backgroundColor: "#d4a843", color: "#1a1150", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700" }}>
                Get Started →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SAVINGS CALCULATOR */}
      <section style={{ background: "#150e40", padding: "100px 48px" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "0.78rem", color: "#d4a843", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px" }}>ROI Calculator</p>
          <h2 style={{ fontSize: "2.4rem", fontWeight: "800", marginBottom: "12px", letterSpacing: "-0.02em" }}>How much time will you save?</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "48px", fontSize: "1.05rem" }}>
            Adjust to match your caseload and see a breakdown of exactly where the time goes
          </p>

          <div style={{ background: "rgba(26,17,80,0.6)", border: "1px solid rgba(212,168,67,0.15)", borderRadius: "24px", padding: "40px" }}>
            {/* Sliders */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "32px", marginBottom: "36px" }}>
              <div>
                <div style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>
                  I manage <span style={{ color: "#d4a843", fontWeight: "800", fontSize: "1.35rem" }}>{participants}</span> participants
                </div>
                <input type="range" min={1} max={50} value={participants} onChange={(e) => setParticipants(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#d4a843", height: "6px", cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "rgba(255,255,255,0.25)", marginTop: "6px" }}>
                  <span>1</span><span>25</span><span>50</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>
                  My time is worth <span style={{ color: "#d4a843", fontWeight: "800", fontSize: "1.35rem" }}>${hourlyRate}/hr</span>
                </div>
                <input type="range" min={50} max={200} step={10} value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#d4a843", height: "6px", cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "rgba(255,255,255,0.25)", marginTop: "6px" }}>
                  <span>$50</span><span>$125</span><span>$200</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginBottom: "28px" }}>
              {[
                { label: "Hours saved per year", value: totalHrs + " hrs", color: "#d4a843" },
                { label: "Value of time saved", value: "$" + valuePerYear.toLocaleString(), color: "#22c55e" },
                { label: "Return on investment", value: roi + "x", color: "#a78bfa" },
              ].map((stat) => (
                <div key={stat.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "14px", padding: "20px" }}>
                  <div style={{ fontSize: "1.8rem", fontWeight: "800", color: stat.color, marginBottom: "6px" }}>{stat.value}</div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Breakdown */}
            <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "20px", marginBottom: "24px", textAlign: "left" }}>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>
                Where the time comes from — per participant per year
              </div>
              {[
                { task: "Initial budget setup", detail: "vs building in Excel from scratch", hrs: setupHrs },
                { task: "Monthly budget reviews", detail: "25 min saved × 12 months", hrs: monthlyReviewHrs },
                { task: "Public holiday calculations", detail: "auto-detected per state, per line", hrs: phCalcHrs },
                { task: "Schedule of Supports", detail: "45 min manual → 2 min per participant", hrs: scheduleHrs },
                { task: "Claims & reconciliation", detail: "15 min saved × 12 months", hrs: claimsHrs },
              ].map((row) => (
                <div key={row.task} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.88rem", fontWeight: "500" }}>{row.task}</span>
                    <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.78rem", marginLeft: "10px" }}>{row.detail}</span>
                  </div>
                  <span style={{ color: "#d4a843", fontWeight: "700", fontSize: "0.88rem", whiteSpace: "nowrap", marginLeft: "16px" }}>{row.hrs} hrs</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0 0" }}>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem", fontWeight: "600" }}>Total per participant per year</span>
                <span style={{ color: "#d4a843", fontWeight: "800", fontSize: "0.95rem" }}>{hrsPerParticipant} hrs</span>
              </div>
            </div>

            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem", marginBottom: "24px" }}>
              Time estimates are conservative averages based on typical provider workflows. Individual savings will vary.
            </p>

            <button onClick={() => router.push("/login")} style={{
              padding: "14px 48px", fontSize: "1rem", backgroundColor: "#d4a843", color: "#1a1150",
              border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700",
            }}>
              Start Saving Time →
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ background: "#1a1150", padding: "100px 48px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <p style={{ fontSize: "0.78rem", color: "#d4a843", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px", textAlign: "center" }}>FAQ</p>
          <h2 style={{ fontSize: "2.4rem", fontWeight: "800", marginBottom: "48px", textAlign: "center", letterSpacing: "-0.02em" }}>
            Frequently Asked Questions
          </h2>
          {[
            {
              q: "Who is this for?",
              a: "Any NDIS provider who manages participant budgets. Built originally as an internal tool for a provider's finance team — it works for SIL providers, support coordinators, specialist support coordinators, plan managers, community access providers, allied health providers, employment support providers, and respite services.",
            },
            {
              q: "What is the Schedule of Supports?",
              a: "A professional PDF listing all funded supports for a participant — NDIS item codes, weekly roster, estimated weekly cost, plan total, provider/participant details, and signature blocks. Most providers attach it to their existing service agreement template.",
            },
            {
              q: "How does the PDF upload work?",
              a: "Upload a participant's NDIS plan PDF and the tool reads it using AI — extracting the plan period, state, and each support category's funding amount. You review and confirm before anything is applied, so you stay in full control.",
            },
            {
              q: "How are hourly rates handled?",
              a: "Each support line is pre-loaded from the 2025–26 NDIS Price Guide for that category. Support Coordination (07) loads at $100.14/hr. Core Supports (01) at the standard DSW rates. Therapy (14) at $193.99/hr. All rates are editable with a yellow indicator if set below guide.",
            },
            {
              q: "How does pricing work?",
              a: "Monthly ($9.99/mo) or Annual ($79/yr — save 34%). Both plans include all features with no limits. No lock-in — cancel anytime.",
            },
            {
              q: "Can I manage multiple participants?",
              a: "Yes — unlimited participants, each with their own full budget calculator, support lines, roster, claims tracker, and exports. Manage your whole caseload from one dashboard.",
            },
            {
              q: "Is my data secure?",
              a: "Your data is stored securely in your Kevria account and syncs across devices. We use your email only for account access — never sold or shared. See our Privacy Policy for full details.",
            },
            {
              q: "Need help?",
              a: "Contact us at support@kevria.com or visit kevria.com.",
            },
          ].map((faq, i) => (
            <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "22px 0" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "10px", color: "#d4a843" }}>{faq.q}</h3>
              <p style={{ color: "rgba(255,255,255,0.45)", lineHeight: "1.65", fontSize: "0.92rem" }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{ background: "#150e40", padding: "80px 48px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{
            background: "linear-gradient(135deg, #1a1150, #2d1b69)",
            border: "1px solid rgba(212,168,67,0.2)",
            borderRadius: "24px",
            padding: "56px 48px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: "200px", height: "200px", borderRadius: "50%", background: "#d4a843", opacity: 0.06, transform: "translate(30%, -30%)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <p style={{ fontSize: "0.78rem", color: "#d4a843", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px" }}>Ready to start?</p>
              <h2 style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "12px", letterSpacing: "-0.02em" }}>
                Let&apos;s take the spreadsheets out of NDIS budgets
              </h2>
              <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: "32px", fontSize: "1rem", lineHeight: "1.6" }}>
                Join providers across Australia using Kevria Calc to manage participant budgets with confidence.
              </p>
              <button onClick={() => router.push("/login")} style={{
                padding: "15px 40px", fontSize: "1rem", backgroundColor: "#d4a843", color: "#1a1150",
                border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "700",
              }}>
                Get Started — $9.99/mo →
              </button>
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.8rem", marginTop: "14px" }}>Annual plan available at $79/yr · Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: "#0a0620",
        padding: "40px 48px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.3rem", color: "#d4a843" }}>✦</span>
              <span style={{ fontSize: "1rem", fontWeight: "700" }}>Kevria Calc</span>
            </div>
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              {[
                { label: "kevria.com", href: "https://kevria.com", external: true },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "support@kevria.com", href: "mailto:support@kevria.com" },
              ].map(l => (
                <a key={l.label} href={l.href} target={l.external ? "_blank" : undefined} rel={l.external ? "noopener noreferrer" : undefined}
                  style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.82rem", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#d4a843")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                >{l.label}</a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>
              © {new Date().getFullYear()} Kevria. All rights reserved. Powered by <a href="https://kevria.com" target="_blank" rel="noopener noreferrer" style={{ color: "#d4a843", textDecoration: "none" }}>Kevria</a>
            </p>
            <p style={{ color: "rgba(255,255,255,0.15)", fontSize: "0.72rem", maxWidth: "500px", textAlign: "right" }}>
              Rates based on 2025–26 NDIS Price Guide. Not affiliated with NDIA. Not financial advice. Always verify with your plan manager.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
