"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState(10);
  const [hourlyRate, setHourlyRate] = useState(80);

  // Time saved per participant per year (in hours) — broken down by task
  const setupHrs = 2;          // Initial budget setup vs Excel
  const monthlyReviewHrs = 5;  // 25 min × 12 months
  const phCalcHrs = 1.5;       // Public holiday calculations
  const scheduleHrs = 1.5;     // 2 × Schedule of Supports per year (~45 min each)
  const claimsHrs = 3;         // 15 min × 12 months claims logging
  const hrsPerParticipant = setupHrs + monthlyReviewHrs + phCalcHrs + scheduleHrs + claimsHrs;

  const totalHrs = Math.round(participants * hrsPerParticipant);
  const valuePerYear = totalHrs * hourlyRate;
  const annualCost = 79;
  const roi = Math.round(valuePerYear / annualCost);

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
          <span style={{ fontSize: "1.2rem", fontWeight: "600" }}>Kevria Calc</span>
        </div>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <a href="#features" style={{ color: "#ccc", textDecoration: "none", fontSize: "0.95rem" }}>Features</a>
          <a href="#how" style={{ color: "#ccc", textDecoration: "none", fontSize: "0.95rem" }}>How It Works</a>
          <a href="#pricing" style={{ color: "#ccc", textDecoration: "none", fontSize: "0.95rem" }}>Pricing</a>
          <a href="#faq" style={{ color: "#ccc", textDecoration: "none", fontSize: "0.95rem" }}>FAQ</a>
          <a href="https://kevria.com" target="_blank" rel="noopener noreferrer" style={{ color: "#d4a843", textDecoration: "none", fontSize: "0.95rem", fontWeight: "600" }}>kevria.com</a>
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
        <div style={{ position: "absolute", top: "50px", right: "10%", width: "200px", height: "200px", borderRadius: "50%", background: "#d4a843", opacity: 0.15 }} />
        <div style={{ position: "absolute", bottom: "30px", left: "5%", width: "150px", height: "150px", borderRadius: "50%", background: "#5b6abf", opacity: 0.2 }} />
        <div style={{ position: "absolute", top: "40%", left: "15%", width: "60px", height: "60px", borderRadius: "50%", background: "white", opacity: 0.1 }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-block",
            background: "rgba(212,168,67,0.12)",
            border: "1px solid rgba(212,168,67,0.3)",
            borderRadius: "20px",
            padding: "6px 18px",
            marginBottom: "20px",
          }}>
            <p style={{ fontSize: "0.85rem", color: "#d4a843", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", margin: 0 }}>
              Built by providers · For providers
            </p>
          </div>
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
            fontSize: "1.2rem",
            color: "#b0b0d0",
            maxWidth: "650px",
            margin: "0 auto 16px auto",
            lineHeight: "1.6",
          }}>
            Track funding, calculate rosters, forecast spending, and generate Schedule of Supports documents — built by an NDIS provider for every provider type across Australia.
          </p>
          <p style={{
            fontSize: "0.95rem",
            color: "#7070a0",
            maxWidth: "600px",
            margin: "0 auto 40px auto",
          }}>
            SIL · Support Coordination · Community Access · Therapy · Plan Management · Respite · Employment Support
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
            Get Started — $9.99/mo
          </button>
          <button
            onClick={() => { document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }); }}
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
            See Features ↓
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
          Built by an NDIS provider, used by providers across Australia 🇦🇺 — originally created internally to manage rosters of care
        </p>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ background: "#1a1150", padding: "80px 40px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "700", marginBottom: "10px" }}>Everything You Need</h2>
          <p style={{ color: "#8080a0", marginBottom: "50px", fontSize: "1.1rem" }}>
            One tool to manage all your NDIS budget calculations — whatever type of support you deliver
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "30px" }}>
            {[
              {
                icon: "📋",
                title: "Schedule of Supports — Ready to Sign",
                desc: "Generate a professional Schedule of Supports PDF in seconds. Shows each support line with NDIS item code, weekly roster (days and hours), estimated weekly cost, and plan total — with signature blocks. Attach it to your existing SA template. Works out of the box for every provider.",
                highlight: true,
              },
              {
                icon: "📄",
                title: "Upload Plan PDF — Skip the Data Entry",
                desc: "Got the participant's plan PDF? Upload it and we extract the plan dates, state, support categories, and funding amounts automatically. Or enter it manually — your choice.",
                highlight: true,
              },
              {
                icon: "💰",
                title: "Per-Category Hourly Rates",
                desc: "Every support line uses the correct 2025–26 rates for its category. 07 Support Coordination, 14 Daily Living, 01 Core Supports — each pre-loaded with the right rates. Fully editable.",
                highlight: true,
              },
              {
                icon: "🗂️",
                title: "Smart Roster Modes",
                desc: "Roster view adapts to the support type. Full shift roster for SIL and community access. Weekday-only for coordination and therapy. Lump sum view for AT and home modifications.",
                highlight: true,
              },
              {
                icon: "⚠️",
                title: "Rate Monitoring",
                desc: "Yellow warnings flag any rate set below the 2025–26 price guide — helping your team catch errors while still allowing lower negotiated rates.",
              },
              {
                icon: "📈",
                title: "Plan Pace Tracking",
                desc: "See if spending is on pace, ahead, or behind based on today's date — so you can act before the budget runs out.",
              },
              {
                icon: "🗓️",
                title: "Public Holiday Auto-Calc",
                desc: "Public holidays detected automatically per state. Toggle each holiday per support line and see the exact cost impact in real time.",
              },
              {
                icon: "🧾",
                title: "Claims & Actual Spend",
                desc: "Log actual invoices and claims against each support line. Track projected vs actual spend side by side.",
              },
              {
                icon: "👥",
                title: "Multiple Participants",
                desc: "Manage budgets for as many participants as you need from a single dashboard — each with their own full calculator, support lines, and claims tracker.",
              },
              {
                icon: "🚗",
                title: "KM Tracking",
                desc: "Add transport kilometre costs per support line with configurable rates and frequency.",
              },
              {
                icon: "📤",
                title: "Export CSV & PDF",
                desc: "Export professional reports in CSV or PDF format. Perfect for plan reviews, handovers, audits, and sharing with participants and families.",
              },
              {
                icon: "☁️",
                title: "Cloud Sync",
                desc: "Your data saves automatically and syncs across all your devices. Access your participant budgets from anywhere.",
              },
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  background: f.highlight ? "rgba(212,168,67,0.06)" : "rgba(255,255,255,0.04)",
                  border: f.highlight ? "1px solid rgba(212,168,67,0.25)" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  padding: "30px",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: "2.2rem", marginBottom: "15px" }}>{f.icon}</div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "600", marginBottom: "10px", color: f.highlight ? "#d4a843" : "white" }}>
                  {f.title}
                </h3>
                <p style={{ color: "#9090b0", lineHeight: "1.6", fontSize: "0.93rem" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ background: "#150e40", padding: "80px 40px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "700", marginBottom: "10px" }}>How It Works</h2>
          <p style={{ color: "#8080a0", marginBottom: "50px", fontSize: "1.1rem" }}>Up and running in under 2 minutes</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "40px 30px" }}>
            {[
              { step: "1", title: "Create Account", desc: "Sign up with your email in seconds" },
              { step: "2", title: "Choose a Plan", desc: "Monthly ($9.99/mo) or Annual ($79/yr). Cancel anytime." },
              { step: "3", title: "Add Participants", desc: "Add participants and enter their plan details — or upload their NDIS plan PDF to auto-fill everything instantly" },
              { step: "4", title: "Build Rosters", desc: "Set up support lines, shifts, and rates per day. The calculator handles costs, public holidays, and pace tracking automatically" },
              { step: "5", title: "Generate Schedule of Supports", desc: "One click generates a professional Schedule of Supports PDF — NDIS codes, daily hours, weekly costs, plan totals, and signature blocks. Ready to attach to any SA template" },
              { step: "6", title: "Track & Monitor", desc: "Log actual claims as invoices come in and monitor budget health — pace tracking shows you when a plan is at risk before it runs out" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{
                  width: "60px", height: "60px", borderRadius: "50%",
                  background: s.step === "5" ? "#d4a843" : "#d4a843",
                  color: "#1a1150",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.5rem", fontWeight: "bold", margin: "0 auto 15px auto",
                }}>
                  {s.step}
                </div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: "600", marginBottom: "8px", color: s.step === "5" ? "#d4a843" : "white" }}>{s.title}</h3>
                <p style={{ color: "#9090b0", fontSize: "0.93rem", lineHeight: "1.55" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ background: "#1a1150", padding: "80px 40px" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "700", marginBottom: "10px" }}>Simple Pricing</h2>
          <p style={{ color: "#8080a0", marginBottom: "40px", fontSize: "1.1rem" }}>No lock-in. Cancel anytime.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", textAlign: "left" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "20px", padding: "36px" }}>
              <p style={{ fontSize: "0.85rem", color: "#8080a0", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Monthly</p>
              <div style={{ fontSize: "3rem", fontWeight: "800", marginBottom: "2px" }}>$9.99</div>
              <p style={{ color: "#8080a0", marginBottom: "24px", fontSize: "0.9rem" }}>AUD / month</p>
              {["Unlimited participants & support lines", "Schedule of Supports PDF generator", "PDF plan upload & auto-fill", "Per-category rate presets (01–15)", "Public holiday auto-calc by state", "Plan pace tracking", "Claims & actual spend tracker", "CSV & PDF exports", "Cancel anytime"].map((item, i) => (
                <div key={i} style={{ padding: "7px 0", borderBottom: i < 8 ? "1px solid rgba(255,255,255,0.05)" : "none", color: "#c0c0e0", fontSize: "0.9rem" }}>✅ {item}</div>
              ))}
              <button onClick={() => router.push("/login")} style={{ marginTop: "24px", width: "100%", padding: "14px", fontSize: "1rem", backgroundColor: "transparent", color: "#d4a843", border: "2px solid #d4a843", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                Get Started →
              </button>
            </div>

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
      <section id="faq" style={{ background: "#150e40", padding: "80px 40px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "700", marginBottom: "40px", textAlign: "center" }}>
            Frequently Asked Questions
          </h2>
          {[
            {
              q: "Who is this for?",
              a: "Any NDIS provider who manages participant budgets. Built originally as an internal tool for a provider's finance team — it works for SIL providers, support coordinators, specialist support coordinators, plan managers, community access providers, allied health providers, employment support providers, and respite services. If you deliver NDIS supports and need to track budgets, this is for you.",
            },
            {
              q: "What is the Schedule of Supports?",
              a: "The Schedule of Supports is a professional PDF document that lists all funded supports for a participant — including the NDIS item codes, the weekly roster (which days and how many hours), estimated weekly cost, and the total for the plan period. It includes provider and participant details and signature blocks. Most providers attach it to their own existing service agreement template. It's not a legal agreement itself — it's the supports schedule that sits inside your SA.",
            },
            {
              q: "How does the PDF upload work?",
              a: "Upload a participant's NDIS plan PDF and the tool reads it using AI — extracting the plan period, state, and each support category's funding amount. You review and confirm before anything is applied, so you stay in full control.",
            },
            {
              q: "How are hourly rates handled?",
              a: "Each support line has its own rates, pre-loaded from the 2025–26 NDIS Price Guide for that category. Support Coordination (07) loads at $100.14/hr. Core Supports (01/04) load at the standard DSW rates. Therapy categories (14) load at $193.99/hr. All rates are editable — providers who charge less than the price guide can adjust freely, with a yellow indicator to flag anything below guide.",
            },
            {
              q: "How does pricing work?",
              a: "Choose monthly ($9.99/mo) or annual ($79/yr — save 34%). Both plans include all features with no limits. No lock-in — cancel anytime from your account.",
            },
            {
              q: "Can I manage multiple participants?",
              a: "Yes — unlimited participants, each with their own full budget calculator, support lines, roster, claims tracker, and export. Manage your whole caseload from one dashboard.",
            },
            {
              q: "Is my data secure?",
              a: "Your data is stored securely in your Kevria account and syncs across devices. We use your email only for account access — never sold or shared. See our Privacy Policy for full details.",
            },
            {
              q: "What if I need help?",
              a: "Contact us at support@kevria.com or visit kevria.com and we'll help you out.",
            },
          ].map((faq, i) => (
            <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "20px 0" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "8px", color: "#d4a843" }}>{faq.q}</h3>
              <p style={{ color: "#9090b0", lineHeight: "1.6", fontSize: "0.95rem" }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SAVINGS CALCULATOR */}
      <section style={{ background: "#1a1150", padding: "80px 40px" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "0.9rem", color: "#d4a843", fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>
            See your ROI
          </p>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "700", marginBottom: "10px" }}>
            How much time will you save?
          </h2>
          <p style={{ color: "#8080a0", marginBottom: "50px", fontSize: "1.1rem" }}>
            Adjust to match your caseload and see a breakdown of exactly where the time goes
          </p>

          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,168,67,0.2)", borderRadius: "24px", padding: "40px" }}>

            {/* Sliders */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "32px", marginBottom: "36px" }}>
              <div>
                <div style={{ fontSize: "1rem", color: "#b0a0d0", marginBottom: "12px" }}>
                  I manage <span style={{ color: "#d4a843", fontWeight: "800", fontSize: "1.4rem" }}>{participants}</span> participants
                </div>
                <input
                  type="range" min={1} max={50} value={participants}
                  onChange={(e) => setParticipants(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#d4a843", height: "6px", cursor: "pointer" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#505070", marginTop: "6px" }}>
                  <span>1</span><span>25</span><span>50</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: "1rem", color: "#b0a0d0", marginBottom: "12px" }}>
                  My time is worth <span style={{ color: "#d4a843", fontWeight: "800", fontSize: "1.4rem" }}>${hourlyRate}/hr</span>
                </div>
                <input
                  type="range" min={50} max={200} step={10} value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#d4a843", height: "6px", cursor: "pointer" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#505070", marginTop: "6px" }}>
                  <span>$50</span><span>$125</span><span>$200</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "28px" }}>
              {[
                { label: "Hours saved per year", value: totalHrs + " hrs", color: "#d4a843" },
                { label: "Value of time saved", value: "$" + valuePerYear.toLocaleString(), color: "#22c55e" },
                { label: "Return on investment", value: roi + "x", color: "#a78bfa" },
              ].map((stat) => (
                <div key={stat.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "16px", padding: "20px" }}>
                  <div style={{ fontSize: "1.9rem", fontWeight: "800", color: stat.color, marginBottom: "6px" }}>{stat.value}</div>
                  <div style={{ fontSize: "0.83rem", color: "#8080a0" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Breakdown */}
            <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "20px", marginBottom: "24px", textAlign: "left" }}>
              <div style={{ fontSize: "0.75rem", color: "#6060a0", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>
                Where the time comes from — per participant per year
              </div>
              {[
                { task: "Initial budget setup", detail: "vs building in Excel from scratch", hrs: setupHrs },
                { task: "Monthly budget reviews", detail: "25 min saved × 12 months", hrs: monthlyReviewHrs },
                { task: "Public holiday calculations", detail: "auto-detected per state, per line", hrs: phCalcHrs },
                { task: "Schedule of Supports", detail: "45 min manual → 2 min per participant", hrs: scheduleHrs },
                { task: "Claims & reconciliation", detail: "15 min saved × 12 months", hrs: claimsHrs },
              ].map((row) => (
                <div key={row.task} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <span style={{ color: "#c0c0e0", fontSize: "0.9rem", fontWeight: "500" }}>{row.task}</span>
                    <span style={{ color: "#505070", fontSize: "0.8rem", marginLeft: "10px" }}>{row.detail}</span>
                  </div>
                  <span style={{ color: "#d4a843", fontWeight: "700", fontSize: "0.9rem", whiteSpace: "nowrap", marginLeft: "16px" }}>{row.hrs} hrs</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0 0" }}>
                <span style={{ color: "#8080a0", fontSize: "0.85rem", fontWeight: "600" }}>Total per participant per year</span>
                <span style={{ color: "#d4a843", fontWeight: "800", fontSize: "0.95rem" }}>{hrsPerParticipant} hrs</span>
              </div>
            </div>

            <p style={{ color: "#505070", fontSize: "0.78rem", marginBottom: "24px" }}>
              Time estimates are conservative averages based on typical provider workflows. Individual savings will vary by caseload complexity and existing processes.
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

      {/* FOOTER */}
      <footer style={{
        background: "#0f0a30",
        padding: "40px",
        textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "15px" }}>
          <span style={{ fontSize: "1.5rem", color: "#d4a843" }}>✦</span>
          <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>Kevria Calc</span>
        </div>
        <p style={{ color: "#6060a0", fontSize: "0.9rem", marginBottom: "8px" }}>
          Powered by <a href="https://kevria.com" target="_blank" rel="noopener noreferrer" style={{ color: "#d4a843", textDecoration: "none" }}>Kevria</a> — Built by providers, for providers
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "12px", flexWrap: "wrap" }}>
          <a href="https://kevria.com" target="_blank" rel="noopener noreferrer" style={{ color: "#6060a0", fontSize: "0.85rem", textDecoration: "none" }}>kevria.com</a>
          <span style={{ color: "#3a3a60" }}>|</span>
          <a href="/privacy" style={{ color: "#6060a0", fontSize: "0.85rem", textDecoration: "none" }}>Privacy Policy</a>
          <span style={{ color: "#3a3a60" }}>|</span>
          <a href="/terms" style={{ color: "#6060a0", fontSize: "0.85rem", textDecoration: "none" }}>Terms of Service</a>
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
