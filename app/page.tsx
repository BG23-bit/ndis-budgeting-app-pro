"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Marketing homepage. Everything claimed here must exist in the product —
// keep features honest and CTAs on the trial-first funnel (free preview,
// no card, paywall only when adding a second participant).

const GOLD = "#d4a843";
const INK = "#2d1b69";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "0.78rem", color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px" }}>{children}</p>;
}

export default function LandingPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState(10);
  const [hourlyRate, setHourlyRate] = useState(80);

  const setupHrs = 2, monthlyReviewHrs = 5, phCalcHrs = 1.5, scheduleHrs = 1.5, claimsHrs = 3;
  const hrsPerParticipant = setupHrs + monthlyReviewHrs + phCalcHrs + scheduleHrs + claimsHrs;
  const totalHrs = Math.round(participants * hrsPerParticipant);
  const valuePerYear = totalHrs * hourlyRate;
  const roi = Math.round(valuePerYear / 79);

  const start = () => router.push("/login");

  return (
    <div style={{ color: "#0f172a", background: "#ffffff" }}>
      <style>{`
        .lp-hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
        .lp-nav-links { display: flex; gap: 26px; align-items: center; }
        @media (max-width: 900px) {
          .lp-hero-grid { grid-template-columns: 1fr; gap: 40px; }
          .lp-nav-links a[data-anchor] { display: none; }
          .lp-pad { padding-left: 20px !important; padding-right: 20px !important; }
          .lp-h1 { font-size: 2.4rem !important; }
        }
        .lp-cta { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .lp-cta:hover { transform: translateY(-1px); }
        .lp-feature { transition: border-color 0.2s ease, transform 0.2s ease; }
        .lp-feature:hover { border-color: rgba(212,168,67,0.55) !important; transform: translateY(-2px); }
      `}</style>

      {/* NAV */}
      <nav className="lp-pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 48px", background: "rgba(255,255,255,0.92)", borderBottom: "1px solid rgba(212,168,67,0.14)", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.4rem", color: GOLD }}>✦</span>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.02em", color: INK }}>Kevria Calc</span>
        </div>
        <div className="lp-nav-links">
          {[["Features", "#features"], ["Who it's for", "#roles"], ["Pricing", "#pricing"], ["FAQ", "#faq"]].map(([label, href]) => (
            <a key={label} data-anchor href={href} style={{ color: "#475569", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>{label}</a>
          ))}
          <button onClick={start} style={{ padding: "9px 14px", background: "none", color: INK, border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>Log in</button>
          <button onClick={start} className="lp-cta" style={{ padding: "9px 22px", backgroundColor: GOLD, color: "#0f172a", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" }}>Start free</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-pad" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 60%, #f8fafc 100%)", padding: "76px 48px 96px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "400px", height: "400px", borderRadius: "50%", background: GOLD, opacity: 0.06, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-80px", left: "-40px", width: "300px", height: "300px", borderRadius: "50%", background: GOLD, opacity: 0.1, pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(15,23,42,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />

        <div className="lp-hero-grid" style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <span style={{ width: "28px", height: "2px", background: GOLD, display: "inline-block" }} />
              <span style={{ fontSize: "0.78rem", color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>Built by providers · For providers</span>
            </div>
            <h1 className="lp-h1" style={{ fontSize: "3.3rem", fontWeight: 800, lineHeight: 1.08, marginBottom: "20px", letterSpacing: "-0.02em", color: INK }}>
              The NDIS budgeting workspace that <span style={{ color: GOLD }}>does the maths for you</span>
            </h1>
            <p style={{ fontSize: "1.1rem", color: "#334155", lineHeight: 1.65, marginBottom: "14px", maxWidth: "520px" }}>
              Build rosters, watch every budget line track live as you type, and generate a Schedule of Supports that reconciles to the cent — public holidays, ratios, sleepovers and evening splits handled automatically.
            </p>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "34px" }}>
              SIL · Support Coordination · Plan Management · Community Access · Therapy · Respite
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={start} className="lp-cta" style={{ padding: "15px 36px", fontSize: "1rem", backgroundColor: INK, color: "#ffffff", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 700, boxShadow: "0 4px 14px rgba(45,27,105,0.25)" }}>
                Start free — no card needed
              </button>
              <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} style={{ padding: "15px 28px", fontSize: "1rem", backgroundColor: "transparent", color: "#0f172a", border: "1.5px solid rgba(15,23,42,0.2)", borderRadius: "10px", cursor: "pointer", fontWeight: 600 }}>
                See what&apos;s inside ↓
              </button>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "14px" }}>
              Try the full calculator with one participant free, for as long as you like. Upgrade from $9.90/mo when you&apos;re ready.
            </p>
          </div>

          {/* Product mock */}
          <div style={{ position: "relative" }}>
            <div style={{ background: "#ffffff", border: "1px solid rgba(212,168,67,0.45)", borderRadius: "20px", padding: "24px", boxShadow: "0 32px 64px rgba(15,23,42,0.18)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                <span style={{ color: GOLD, fontSize: "1rem" }}>✦</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: GOLD }}>Kevria Calc</span>
                <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#64748b" }}>2026–27 rates loaded</span>
              </div>
              <div style={{ display: "flex", gap: "6px", marginBottom: "18px", flexWrap: "wrap" }}>
                {["Setup", "Budgets", "Roster", "Documents"].map((t, i) => (
                  <span key={t} style={{ fontSize: "0.75rem", fontWeight: 700, padding: "5px 14px", borderRadius: "20px", background: i === 2 ? INK : "rgba(15,23,42,0.05)", color: i === 2 ? "#fff" : "#64748b" }}>{t}</span>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "18px" }}>
                {[
                  { label: "Total Funding", value: "$148,500", color: GOLD },
                  { label: "Weekly Cost", value: "$2,689.31", color: "#0f172a" },
                  { label: "Plan Cost", value: "$142,301", color: "#0f172a" },
                  { label: "Remaining", value: "$6,199", color: "#22c55e" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "rgba(15,23,42,0.04)", borderRadius: "10px", padding: "12px 14px" }}>
                    <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>{s.label}</div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px" }}>Live per-line tracking</div>
              {[
                { code: "01", label: "Daily Living (SIL) — 1:2", pct: 96, cost: "$118,204" },
                { code: "04", label: "Community Participation", pct: 74, cost: "$11,097" },
                { code: "15", label: "Therapy — OT & Speech", pct: 88, cost: "$13,000" },
              ].map((r) => (
                <div key={r.code} style={{ padding: "7px 0", borderBottom: "1px solid rgba(15,23,42,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
                    <span style={{ background: "rgba(212,168,67,0.12)", color: "#b8901a", fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "6px" }}>{r.code}</span>
                    <span style={{ fontSize: "0.8rem", color: "#334155", flex: 1, fontWeight: 500 }}>{r.label}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>{r.cost}</span>
                  </div>
                  <div style={{ background: "rgba(15,23,42,0.07)", borderRadius: "4px", height: "5px", overflow: "hidden" }}>
                    <div style={{ width: r.pct + "%", height: "100%", background: r.pct > 92 ? "#f59e0b" : "#22c55e", borderRadius: "4px" }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: "14px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>11 public holidays detected (QLD) — incl. Christmas Eve 6pm–midnight</span>
                <span style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: 600 }}>+$4,112.90</span>
              </div>
            </div>
            <div style={{ position: "absolute", bottom: "-18px", left: "24px", background: GOLD, color: "#0f172a", padding: "8px 16px", borderRadius: "24px", fontSize: "0.78rem", fontWeight: 800, boxShadow: "0 8px 24px rgba(212,168,67,0.35)", whiteSpace: "nowrap" }}>
              ✓ Schedule of Supports — day-by-day, to the cent
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="lp-pad" style={{ background: GOLD, padding: "18px 48px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "44px", flexWrap: "wrap" }}>
          {[
            { value: "2026–27", label: "price guide built in" },
            { value: "Every state", label: "public holidays auto-detected" },
            { value: "All ratios", label: "1:1 to 2:3 shared supports" },
            { value: "5 seats", label: "team access included" },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>{s.value}</span>
              <span style={{ fontSize: "0.82rem", color: "rgba(45,27,105,0.75)", fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" className="lp-pad" style={{ background: "#ffffff", padding: "90px 48px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <SectionLabel>Who it&apos;s for</SectionLabel>
            <h2 style={{ fontSize: "2.3rem", fontWeight: 800, marginBottom: "12px", letterSpacing: "-0.02em", color: INK }}>Set your role once — the workspace adapts</h2>
            <p style={{ color: "#475569", fontSize: "1.02rem", maxWidth: "560px", margin: "0 auto" }}>Tell Kevria Calc what kind of provider you are and it tunes the calculators, item numbers and documents to how you actually work.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            {[
              { title: "SIL providers", desc: "Shift-based rosters with support ratios (1:1 through 2:3), sleepovers divided correctly, SIL item numbers, and a day-by-day Schedule of Supports with public holiday dates billed at the right rate." },
              { title: "Support coordinators", desc: "Budgets entered up front, therapy lines per discipline, joint core + clinical schedules, and per-category remaining so nothing quietly runs dry mid-plan." },
              { title: "Plan managers", desc: "Track projected against actual spend per line, log claims as invoices land, and export clean reports for plan reviews and audits." },
              { title: "Allied health & community", desc: "Hourly service schedules with the right price caps per discipline — OT, physio, speech, psychology, behaviour support — plus travel and consumables." },
            ].map((r) => (
              <div key={r.title} className="lp-feature" style={{ background: "rgba(15,23,42,0.02)", border: "1px solid rgba(15,23,42,0.07)", borderRadius: "16px", padding: "26px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "10px", color: INK }}>{r.title}</h3>
                <p style={{ color: "#64748b", lineHeight: 1.6, fontSize: "0.88rem" }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="lp-pad" style={{ background: "#f1f5f9", padding: "90px 48px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <SectionLabel>What you get</SectionLabel>
            <h2 style={{ fontSize: "2.3rem", fontWeight: 800, marginBottom: "12px", letterSpacing: "-0.02em", color: INK }}>From plan PDF to signed schedule</h2>
            <p style={{ color: "#475569", fontSize: "1.02rem", maxWidth: "560px", margin: "0 auto" }}>A guided workspace — Setup, Budgets, Roster, Documents — with the numbers updating live at every step.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px", marginBottom: "20px" }}>
            {[
              { title: "Schedule of Supports that reconciles on its face", desc: "One click generates a professional PDF — every support line with its NDIS item number, shift times, ratios, weekly and plan totals, public holiday dates billed at the holiday rate, and signature blocks. Summary or full day-by-day layout." },
              { title: "Upload the plan PDF — skip the data entry", desc: "Drop in the participant's NDIS plan and the AI reads plan dates, state, categories and funding amounts, and even proposes a roster from your notes. You review and confirm before anything is applied." },
            ].map((f) => (
              <div key={f.title} className="lp-feature" style={{ background: "rgba(212,168,67,0.05)", border: "1px solid rgba(212,168,67,0.45)", borderRadius: "16px", padding: "30px" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#b8901a", marginBottom: "10px" }}>{f.title}</h3>
                <p style={{ color: "#475569", lineHeight: 1.6, fontSize: "0.9rem" }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
            {[
              { title: "Live tracking while you roster", desc: "Every budget line follows you across tabs — watch remaining funds move as you add shifts, before anything is committed." },
              { title: "Public holidays, automatically", desc: "Detected per state per plan period — including part-day holidays like QLD's Christmas Eve 6pm–midnight. Toggle any date and see the cost impact." },
              { title: "Ratios & sleepovers done right", desc: "Shared supports from 2:1 to 2:3 priced per participant, sleepovers divided by ratio, evening and overnight bands split at the correct times." },
              { title: "Budget envelopes", desc: "Hold a category total fixed and split it into named buckets — $15k in Capacity Building as $7.5k psychology, $7.5k OT — splits can never change the total." },
              { title: "The whole price guide, selectable", desc: "Import the official NDIA Support Catalogue once and every support item is type-ahead searchable with its price limit, in every state." },
              { title: "Plan renewals in one click", desc: "Expiry warnings from 60 days out, then start the new period keeping the roster, budgets and rates — claims and holiday exclusions reset for the new year." },
              { title: "Claims & actual spend", desc: "Log invoices (or import a CSV) and track projected vs actual side by side, with pace warnings before a budget runs out." },
              { title: "Team seats included", desc: "Invite up to 5 colleagues into your workspace — same participants, budgets and documents, on one subscription." },
              { title: "Your branding, not ours", desc: "Upload your logo and company details once — every document you generate carries them." },
              { title: "Documents history", desc: "Every generated schedule is recorded — what, when, which layout, and the total at the time — so there's always an audit trail." },
              { title: "Whole-caseload dashboard", desc: "Every participant's funding, remaining budget, plan-end countdown and health status on one screen." },
              { title: "Cloud sync", desc: "Saves automatically and syncs across your devices — and your team's." },
            ].map((f) => (
              <div key={f.title} className="lp-feature" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.06)", borderRadius: "14px", padding: "22px" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "8px", color: "#0f172a" }}>{f.title}</h3>
                <p style={{ color: "#64748b", lineHeight: 1.55, fontSize: "0.85rem" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="lp-pad" style={{ background: "#ffffff", padding: "90px 48px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
          <SectionLabel>Getting started</SectionLabel>
          <h2 style={{ fontSize: "2.3rem", fontWeight: 800, marginBottom: "12px", letterSpacing: "-0.02em", color: INK }}>Try it properly before you pay</h2>
          <p style={{ color: "#64748b", marginBottom: "56px", fontSize: "1.02rem" }}>The free preview is the real product with one participant — no card, no time limit</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "36px 28px" }}>
            {[
              { step: "01", title: "Create a free account", desc: "Sign up with your email, tell us your role, add your company details once" },
              { step: "02", title: "Add a participant", desc: "Enter plan details — or upload the NDIS plan PDF and let the AI fill everything in" },
              { step: "03", title: "Build the roster", desc: "Shifts, ratios, sleepovers — every line tracks live, holidays and rate bands are automatic" },
              { step: "04", title: "Generate documents", desc: "Schedule of Supports and therapy schedules, branded with your logo, ready to sign" },
              { step: "05", title: "Upgrade when ready", desc: "Unlimited participants, AI plan uploads and team seats from $9.90/mo" },
            ].map((s) => (
              <div key={s.step}>
                <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: s.step === "04" ? GOLD : "rgba(212,168,67,0.12)", border: s.step === "04" ? "none" : "1px solid rgba(212,168,67,0.25)", color: s.step === "04" ? "#f8fafc" : GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", fontWeight: 800, margin: "0 auto 16px auto" }}>{s.step}</div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "8px", color: s.step === "04" ? "#b8901a" : INK }}>{s.title}</h3>
                <p style={{ color: "#64748b", fontSize: "0.88rem", lineHeight: 1.55 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="lp-pad" style={{ background: "#f1f5f9", padding: "90px 48px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
          <SectionLabel>Pricing</SectionLabel>
          <h2 style={{ fontSize: "2.3rem", fontWeight: 800, marginBottom: "12px", letterSpacing: "-0.02em", color: INK }}>Simple, transparent pricing</h2>
          <p style={{ color: "#64748b", marginBottom: "44px", fontSize: "1.02rem" }}>Start free. No lock-in. Cancel anytime. All features on every paid plan.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", textAlign: "left" }}>
            {/* Free */}
            <div style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.1)", borderRadius: "20px", padding: "32px" }}>
              <p style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Free preview</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "4px" }}><span style={{ fontSize: "2.6rem", fontWeight: 800 }}>$0</span></div>
              <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "0.88rem" }}>no card, no time limit</p>
              {["1 participant", "Full calculator & roster", "Public holidays & ratios", "Budget tracking & claims", "Company profile & branding"].map((item, i, arr) => (
                <div key={i} style={{ padding: "7px 0", borderBottom: i < arr.length - 1 ? "1px solid rgba(15,23,42,0.05)" : "none", color: "#334155", fontSize: "0.86rem", display: "flex", gap: "10px", alignItems: "center" }}>
                  <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span> {item}
                </div>
              ))}
              <button onClick={start} className="lp-cta" style={{ marginTop: "24px", width: "100%", padding: "13px", fontSize: "0.95rem", backgroundColor: "transparent", color: INK, border: "1.5px solid rgba(45,27,105,0.35)", borderRadius: "10px", cursor: "pointer", fontWeight: 700 }}>Start free</button>
            </div>

            {/* Monthly */}
            <div style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.1)", borderRadius: "20px", padding: "32px" }}>
              <p style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Monthly</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "4px" }}><span style={{ fontSize: "2.6rem", fontWeight: 800 }}>$9.90</span></div>
              <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "0.88rem" }}>AUD / month</p>
              {["Unlimited participants", "Everything in the free preview", "25 AI plan uploads / month", "AI roster auto-fill from notes", "5 team seats included", "CSV & PDF exports", "Cancel anytime"].map((item, i, arr) => (
                <div key={i} style={{ padding: "7px 0", borderBottom: i < arr.length - 1 ? "1px solid rgba(15,23,42,0.05)" : "none", color: "#334155", fontSize: "0.86rem", display: "flex", gap: "10px", alignItems: "center" }}>
                  <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span> {item}
                </div>
              ))}
              <button onClick={start} className="lp-cta" style={{ marginTop: "24px", width: "100%", padding: "13px", fontSize: "0.95rem", backgroundColor: "transparent", color: "#b8901a", border: "2px solid " + GOLD, borderRadius: "10px", cursor: "pointer", fontWeight: 700 }}>Get started →</button>
            </div>

            {/* Annual */}
            <div style={{ background: "rgba(212,168,67,0.05)", border: "2px solid " + GOLD, borderRadius: "20px", padding: "32px", position: "relative" }}>
              <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: GOLD, color: "#0f172a", fontSize: "0.72rem", fontWeight: 800, padding: "4px 16px", borderRadius: "20px", whiteSpace: "nowrap" }}>BEST VALUE — SAVE 34%</div>
              <p style={{ fontSize: "0.78rem", color: "#b8901a", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>Annual</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "4px" }}><span style={{ fontSize: "2.6rem", fontWeight: 800 }}>$79</span></div>
              <p style={{ color: "#64748b", marginBottom: "24px", fontSize: "0.88rem" }}>AUD / year <span style={{ color: "#b8901a" }}>(≈$6.58/mo)</span></p>
              {["Everything in Monthly", "4 months free vs monthly", "Priority support", "Cancel anytime"].map((item, i, arr) => (
                <div key={i} style={{ padding: "7px 0", borderBottom: i < arr.length - 1 ? "1px solid rgba(15,23,42,0.05)" : "none", color: "#334155", fontSize: "0.86rem", display: "flex", gap: "10px", alignItems: "center" }}>
                  <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span> {item}
                </div>
              ))}
              <button onClick={start} className="lp-cta" style={{ marginTop: "24px", width: "100%", padding: "13px", fontSize: "0.95rem", backgroundColor: GOLD, color: "#0f172a", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 700 }}>Get started →</button>
            </div>
          </div>
          <p style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "18px" }}>Bigger caseload? Add 25 more AI plan uploads anytime for $4.99/mo.</p>
        </div>
      </section>

      {/* ROI CALCULATOR */}
      <section className="lp-pad" style={{ background: "#ffffff", padding: "90px 48px" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto", textAlign: "center" }}>
          <SectionLabel>ROI Calculator</SectionLabel>
          <h2 style={{ fontSize: "2.3rem", fontWeight: 800, marginBottom: "12px", letterSpacing: "-0.02em", color: INK }}>How much time will you save?</h2>
          <p style={{ color: "#64748b", marginBottom: "44px", fontSize: "1.02rem" }}>Adjust to match your caseload and see where the time goes</p>

          <div style={{ background: "#ffffff", border: "1px solid rgba(212,168,67,0.45)", borderRadius: "24px", padding: "36px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "28px", marginBottom: "32px" }}>
              <div>
                <div style={{ fontSize: "0.95rem", color: "#334155", marginBottom: "12px" }}>I manage <span style={{ color: "#b8901a", fontWeight: 800, fontSize: "1.35rem" }}>{participants}</span> participants</div>
                <input type="range" min={1} max={50} value={participants} onChange={(e) => setParticipants(Number(e.target.value))} style={{ width: "100%", accentColor: GOLD, height: "6px", cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#64748b", marginTop: "6px" }}><span>1</span><span>25</span><span>50</span></div>
              </div>
              <div>
                <div style={{ fontSize: "0.95rem", color: "#334155", marginBottom: "12px" }}>My time is worth <span style={{ color: "#b8901a", fontWeight: 800, fontSize: "1.35rem" }}>${hourlyRate}/hr</span></div>
                <input type="range" min={50} max={200} step={10} value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} style={{ width: "100%", accentColor: GOLD, height: "6px", cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#64748b", marginTop: "6px" }}><span>$50</span><span>$125</span><span>$200</span></div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "14px", marginBottom: "26px" }}>
              {[
                { label: "Hours saved per year", value: totalHrs + " hrs", color: "#b8901a" },
                { label: "Value of time saved", value: "$" + valuePerYear.toLocaleString(), color: "#16a34a" },
                { label: "Return on the annual plan", value: roi + "x", color: INK },
              ].map((stat) => (
                <div key={stat.label} style={{ background: "rgba(15,23,42,0.04)", borderRadius: "14px", padding: "18px" }}>
                  <div style={{ fontSize: "1.7rem", fontWeight: 800, color: stat.color, marginBottom: "6px" }}>{stat.value}</div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.05)", borderRadius: "12px", padding: "18px", marginBottom: "22px", textAlign: "left" }}>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>Where the time comes from — per participant per year</div>
              {[
                { task: "Initial budget setup", detail: "vs building in Excel from scratch", hrs: setupHrs },
                { task: "Monthly budget reviews", detail: "25 min saved × 12 months", hrs: monthlyReviewHrs },
                { task: "Public holiday calculations", detail: "auto-detected per state, per line", hrs: phCalcHrs },
                { task: "Schedule of Supports", detail: "45 min manual → 2 min per participant", hrs: scheduleHrs },
                { task: "Claims & reconciliation", detail: "15 min saved × 12 months", hrs: claimsHrs },
              ].map((row) => (
                <div key={row.task} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: "1px solid rgba(15,23,42,0.04)", gap: "10px", flexWrap: "wrap" }}>
                  <div>
                    <span style={{ color: "#334155", fontSize: "0.88rem", fontWeight: 500 }}>{row.task}</span>
                    <span style={{ color: "#64748b", fontSize: "0.78rem", marginLeft: "10px" }}>{row.detail}</span>
                  </div>
                  <span style={{ color: "#b8901a", fontWeight: 700, fontSize: "0.88rem", whiteSpace: "nowrap" }}>{row.hrs} hrs</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0 0" }}>
                <span style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 600 }}>Total per participant per year</span>
                <span style={{ color: "#b8901a", fontWeight: 800, fontSize: "0.95rem" }}>{hrsPerParticipant} hrs</span>
              </div>
            </div>

            <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginBottom: "22px" }}>Time estimates are conservative averages based on typical provider workflows. Individual savings will vary.</p>
            <button onClick={start} className="lp-cta" style={{ padding: "14px 48px", fontSize: "1rem", backgroundColor: GOLD, color: "#0f172a", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 700 }}>Start free →</button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="lp-pad" style={{ background: "#f1f5f9", padding: "90px 48px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ textAlign: "center" }}><SectionLabel>FAQ</SectionLabel></div>
          <h2 style={{ fontSize: "2.3rem", fontWeight: 800, marginBottom: "44px", textAlign: "center", letterSpacing: "-0.02em", color: INK }}>Frequently asked questions</h2>
          {[
            { q: "Who is this for?", a: "Any NDIS provider who manages participant budgets. Built originally as an internal tool for a provider's finance team — it works for SIL providers, support coordinators, plan managers, community access providers, allied health providers and respite services. You pick your role at setup and the workspace adapts." },
            { q: "What does the free preview include?", a: "The full calculator for one participant — rosters, ratios, public holidays, budget tracking, claims and your company branding — free for as long as you like, no card needed. A subscription unlocks unlimited participants, AI plan uploads, auto-fill, exports and team seats." },
            { q: "What is the Schedule of Supports?", a: "A professional PDF listing all funded supports for a participant — NDIS item numbers, shift times and ratios, weekly and plan totals, public holiday dates billed at the correct rate, provider details and signature blocks. Choose a summary or a full day-by-day layout that reconciles line by line. Most providers attach it to their existing service agreement." },
            { q: "How do team seats work?", a: "Every subscription includes 5 seats. Invite colleagues by email from your Company Profile — they log in with their own account and see the same participants, budgets, rosters and documents. Remove a seat anytime and access ends immediately." },
            { q: "How does the plan PDF upload work?", a: "Upload a participant's NDIS plan and the AI reads the plan period, state and each category's funding. It can also propose a weekly roster from your shift notes. You review and confirm before anything is applied — you stay in control." },
            { q: "Are the rates current?", a: "The 2026–27 NDIS Pricing Schedule is built in, with per-category presets (core, therapy, coordination, behaviour support and more). You can also import the official NDIA Support Catalogue CSV to make every support item selectable at its price limit — and re-import each July when new prices land. Negotiated rates below the cap are fully supported, with a gentle flag." },
            { q: "Is my data secure?", a: "Your data is stored securely in your Kevria account, scoped to your login (and any team seats you invite), and syncs across devices. We use your email only for account access — never sold or shared. See our Privacy Policy for details." },
            { q: "Need help?", a: "Contact us at support@kevria.com — a human reads it." },
          ].map((faq, i) => (
            <div key={i} style={{ borderBottom: "1px solid rgba(15,23,42,0.07)", padding: "20px 0" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "8px", color: "#b8901a" }}>{faq.q}</h3>
              <p style={{ color: "#475569", lineHeight: 1.65, fontSize: "0.92rem" }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="lp-pad" style={{ background: "#ffffff", padding: "80px 48px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ background: "linear-gradient(135deg, #2d1b69, #3d2787)", borderRadius: "24px", padding: "52px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: "220px", height: "220px", borderRadius: "50%", background: GOLD, opacity: 0.12, transform: "translate(30%, -30%)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <p style={{ fontSize: "0.78rem", color: GOLD, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "12px" }}>Ready when you are</p>
              <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "12px", letterSpacing: "-0.02em", color: "#ffffff" }}>Take the spreadsheets out of NDIS budgets</h2>
              <p style={{ color: "rgba(255,255,255,0.75)", marginBottom: "30px", fontSize: "1rem", lineHeight: 1.6 }}>Set up your first participant in minutes — free, no card, and the maths is handled.</p>
              <button onClick={start} className="lp-cta" style={{ padding: "15px 40px", fontSize: "1rem", backgroundColor: GOLD, color: "#0f172a", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: 700 }}>Start free →</button>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8rem", marginTop: "14px" }}>Paid plans from $9.90/mo · $79/yr · Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-pad" style={{ background: "#ffffff", padding: "40px 48px", borderTop: "1px solid rgba(15,23,42,0.04)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.3rem", color: GOLD }}>✦</span>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: INK }}>Kevria Calc</span>
            </div>
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              {[
                { label: "kevria.com", href: "https://kevria.com", external: true },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "support@kevria.com", href: "mailto:support@kevria.com" },
              ].map((l) => (
                <a key={l.label} href={l.href} target={l.external ? "_blank" : undefined} rel={l.external ? "noopener noreferrer" : undefined} style={{ color: "#64748b", fontSize: "0.82rem", textDecoration: "none" }}>{l.label}</a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(15,23,42,0.04)", paddingTop: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <p style={{ color: "#64748b", fontSize: "0.75rem" }}>© {new Date().getFullYear()} Kevria. All rights reserved. Powered by <a href="https://kevria.com" target="_blank" rel="noopener noreferrer" style={{ color: "#b8901a", textDecoration: "none" }}>Kevria</a></p>
            <p style={{ color: "#94a3b8", fontSize: "0.72rem", maxWidth: "500px" }}>Rates based on the 2026–27 NDIS Pricing Schedule. Not affiliated with NDIA. Not financial advice. Always verify with your plan manager.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
