"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Client, { defaultRoster, getHolidaysInRange, getWeeksInPlan, calcDayCountPlanCost, calcPHImpact, getPresetRates, NDIS_RATES_2026_27 } from "../client";

type Participant = {
  id: string;
  name: string;
  ndisNumber: string;
};

function uid(): string {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function money(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

type Budget = { totalFunding: number; planCost: number; remaining: number; status: string };
const EMPTY_BUDGET: Budget = { totalFunding: 0, planCost: 0, remaining: 0, status: "empty" };

// Mirrors the per-line maths in client.tsx (roster data model + line rates + PH adjustment)
// so the overview cards match what the calculator shows inside.
function computeBudget(raw: any): Budget {
  try {
    if (!raw) return EMPTY_BUDGET;
    const lines = Array.isArray(raw.lines) ? raw.lines : [];
    const planDates = raw.planDates || {};
    const start = planDates.serviceStart || planDates.start || "";
    const end = planDates.serviceEnd || planDates.end || "";
    const planWeeks = raw.weeksOverride != null ? raw.weeksOverride : getWeeksInPlan(start, end);
    const holidays = getHolidaysInRange(start, end, planDates.state || "NSW");
    const globalRates = { ...NDIS_RATES_2026_27, ...(raw.rates || {}) };

    let totalFunding = 0;
    let planCost = 0;
    for (const l of lines) {
      const line = {
        ...l,
        ratio: l.ratio || "1:1",
        excludedHolidays: l.excludedHolidays || [],
        roster: l.roster || defaultRoster(),
        activeSleepoverHours: l.activeSleepoverHours || 0,
        activeSleepoverFreq: l.activeSleepoverFreq || "every",
        fixedSleepovers: l.fixedSleepovers || 0,
        fixedSleepoverFreq: l.fixedSleepoverFreq || "every",
        kmsPerWeek: l.kmsPerWeek || 0,
        kmRate: l.kmRate || 1.00,
        kmFreq: l.kmFreq || "every",
      };
      const lr = l.lineRates || getPresetRates(l.code) || globalRates;
      totalFunding += line.totalFunding || 0;
      const base = calcDayCountPlanCost(line, start, end, planWeeks, lr) * (1 + (lr.gstRate || 0));
      const ph = calcPHImpact(line, holidays, lr);
      planCost += base + ph.extraCost - ph.savedCost;
    }

    // Standalone clinical budget (when not drawn from the plan lines above)
    if (!raw.clinicalBudgetLinked) {
      totalFunding += raw.clinicalFunding || 0;
      const services = Array.isArray(raw.clinicalServices) ? raw.clinicalServices : [];
      planCost += services.reduce((s: number, i: any) => s + (i.hours || 0) * (i.rate || 0), 0);
    }

    const remaining = totalFunding - planCost;
    let status = "on_track";
    if (totalFunding <= 0 && planCost <= 0) status = "empty";
    else if (remaining < 0) status = "over";
    else if (totalFunding > 0 && (remaining / totalFunding) * 100 < 10) status = "low";

    return { totalFunding, planCost, remaining, status };
  } catch {
    return EMPTY_BUDGET;
  }
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeParticipant, setActiveParticipant] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNdis, setNewNdis] = useState("");
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [editName, setEditName] = useState("");
  const [editNdis, setEditNdis] = useState("");
  const [budgets, setBudgets] = useState<{ [id: string]: Budget }>({});
  const hasLoadedRef = useRef(false);
  const skipNextSaveRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setShowWelcome(true);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setUser(session.user);
      const { data: profile } = await supabase.from("profiles").select("paid, stripe_customer_id").eq("id", session.user.id).single();
      if (profile?.paid) setPaid(true);
      if (profile?.stripe_customer_id) setStripeCustomerId(profile.stripe_customer_id);
      setLoading(false);
      // Record activity (fire-and-forget) so /admin can see who is actively using the app.
      fetch("/api/activity", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {});
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    async function load() {
      try {
        const { data: d } = await supabase.auth.getUser();
        if (d.user) {
          // Authenticated: always use Supabase as source of truth — never fall back to
          // localStorage, which may contain a different user's data on shared devices.
          const { data: row } = await supabase.from("participant_lists").select("participants").eq("user_id", d.user.id).single();
          if (row?.participants && Array.isArray(row.participants)) {
            setParticipants(row.participants);
          }
          // If no Supabase row exists yet, leave list empty (don't read localStorage).
        } else {
          // Unauthenticated / preview mode — fall back to localStorage.
          const raw = localStorage.getItem("ndis_participants_list");
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) setParticipants(parsed);
            } catch {}
          }
        }
      } catch {
        // Network error while authenticated — stay empty rather than leak another user's data.
      } finally {
        hasLoadedRef.current = true;
      }
    }
    load();
  }, []);

  // Realtime sync — keeps all open sessions in sync when 1 login is shared
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("participant_sync_" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "participant_lists", filter: `user_id=eq.${user.id}` }, (payload: any) => {
        if (Array.isArray(payload.new?.participants)) {
          skipNextSaveRef.current = true;
          setParticipants(payload.new.participants);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (skipNextSaveRef.current) { skipNextSaveRef.current = false; return; }
    try { localStorage.setItem("ndis_participants_list", JSON.stringify(participants)); } catch {}
    async function save() {
      try {
        const { data: d } = await supabase.auth.getUser();
        if (d.user) {
          await supabase.from("participant_lists").upsert(
            { user_id: d.user.id, participants: participants, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        }
      } catch (e) {
        console.error("Cloud save error:", e);
      }
    }
    save();
  }, [participants]);

  // Compute overview budgets: cloud data first (works on any device), localStorage as fallback.
  useEffect(() => {
    if (activeParticipant || participants.length === 0) return;
    let cancelled = false;
    async function loadBudgets() {
      const map: { [id: string]: Budget } = {};
      for (const p of participants) {
        try {
          const raw = localStorage.getItem("ndis_participant_" + p.id);
          if (raw) map[p.id] = computeBudget(JSON.parse(raw));
        } catch {}
      }
      try {
        const { data: d } = await supabase.auth.getUser();
        if (d.user) {
          const keys = participants.map((p) => "ndis_participant_" + p.id);
          const { data: rows } = await supabase
            .from("calculator_data")
            .select("participant_id, data")
            .eq("user_id", d.user.id)
            .in("participant_id", keys);
          for (const row of rows || []) {
            const id = String(row.participant_id).replace(/^ndis_participant_/, "");
            map[id] = computeBudget(row.data);
          }
        }
      } catch {}
      if (!cancelled) setBudgets(map);
    }
    loadBudgets();
    return () => { cancelled = true; };
  }, [participants, activeParticipant]);

  const budgetFor = (id: string): Budget => budgets[id] || EMPTY_BUDGET;

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, email: user.email, plan: selectedPlan }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert("Error starting checkout: " + (data.error || "Unknown error. Check Vercel logs."));
    setCheckoutLoading(false);
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    const res = await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert("Could not open billing portal. Contact support@kevria.com");
    setPortalLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const loadSampleParticipant = () => {
    const id = uid();
    const today = new Date();
    const claimDate = (daysAgo: number) => new Date(today.getTime() - daysAgo * 86400000).toISOString().slice(0, 10);
    const mkRoster = (days: { [day: string]: { hours: number; nightHours?: number; frequency?: string } }) => {
      const r = defaultRoster();
      for (const [d, v] of Object.entries(days)) r[d] = { enabled: true, hours: v.hours, nightHours: v.nightHours || 0, frequency: v.frequency || "every" };
      return r;
    };
    const line = (code: string, description: string, totalFunding: number, roster: any, extra: any = {}) => ({
      id: uid(), code, description, totalFunding, ratio: "1:1", excludedHolidays: [], roster,
      activeSleepoverHours: 0, activeSleepoverFreq: "every", fixedSleepovers: 0, fixedSleepoverFreq: "every",
      kmsPerWeek: 0, kmRate: 1.00, kmFreq: "every", claims: [], lineRates: getPresetRates(code), ...extra,
    });
    const data = {
      rates: NDIS_RATES_2026_27,
      planDates: { start: "2026-07-01", end: "2027-06-30", state: "NSW" },
      weeksOverride: null,
      calcMode: "both",
      clinicalFunding: 12000,
      clinicalBudgetLinked: false,
      clinicalServices: [
        { id: uid(), code: "11", description: "Functional Behaviour Assessment", hours: 15, rate: 252.99, note: "" },
        { id: uid(), code: "15", description: "OT — Assistive Technology Assessment", hours: 12, rate: 156.16, note: "" },
      ],
      lines: [
        line("01", "Core Supports — Daily Living", 140000, mkRoster({
          mon: { hours: 4 }, tue: { hours: 4 }, wed: { hours: 4 }, thu: { hours: 4 }, fri: { hours: 4 },
          sat: { hours: 4 }, sun: { hours: 3 },
        }), {
          kmsPerWeek: 40,
          claims: [
            { id: uid(), date: claimDate(21), amount: 2340.50, note: "Roster week — invoice #2041" },
            { id: uid(), date: claimDate(14), amount: 2298.75, note: "Roster week — invoice #2052" },
            { id: uid(), date: claimDate(7), amount: 2412.10, note: "Roster week — invoice #2063" },
          ],
        }),
        line("04", "Community Participation", 15000, mkRoster({
          wed: { hours: 2 }, sat: { hours: 2, frequency: "2nd" },
        })),
        line("03", "Consumables", 2500, defaultRoster()),
      ],
    };
    const p: Participant = { id, name: "Alex Sample (Demo)", ndisNumber: "430000001" };
    try { localStorage.setItem("ndis_participant_" + id, JSON.stringify(data)); } catch {}
    setParticipants((prev) => [...prev, p]);
    setActiveParticipant(id);
  };

  const addParticipant = () => {
    if (!newName.trim()) return;
    const p: Participant = { id: uid(), name: newName.trim(), ndisNumber: newNdis.trim() };
    setParticipants((prev) => [...prev, p]);
    setNewName("");
    setNewNdis("");
    setShowAddForm(false);
  };

  const deleteParticipant = (id: string) => {
    const p = participants.find((x) => x.id === id);
    if (!confirm(`Delete ${p?.name || "this participant"} and all their data? This cannot be undone.`)) return;
    setParticipants((prev) => prev.filter((x) => x.id !== id));
    try { localStorage.removeItem("ndis_participant_" + id); } catch {}
    // Also remove their calculator data from the cloud so it doesn't linger on other devices.
    if (user?.id) {
      supabase.from("calculator_data").delete()
        .eq("user_id", user.id)
        .eq("participant_id", "ndis_participant_" + id)
        .then(({ error }: { error: any }) => { if (error) console.error("Cloud delete error:", error); });
    }
  };

  const openEdit = (p: Participant) => {
    setEditingParticipant(p);
    setEditName(p.name);
    setEditNdis(p.ndisNumber);
  };

  const saveEdit = () => {
    if (!editingParticipant || !editName.trim()) return;
    setParticipants((prev) => prev.map((p) =>
      p.id === editingParticipant.id ? { ...p, name: editName.trim(), ndisNumber: editNdis.trim() } : p
    ));
    setEditingParticipant(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#0f172a" }}>
        Loading...
      </div>
    );
  }

  if (!paid) {
    return (
      <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
        {/* Static skeleton behind the paywall — cheaper than rendering the real calculator */}
        <div aria-hidden style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none", opacity: 0.6, minHeight: "100vh", background: "#f8fafc" }}>
          <div style={{ background: "linear-gradient(135deg, #2d1b69 0%, #3d2787 100%)", height: "110px" }} />
          <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "24px" }}>
            {[220, 160, 320].map((h, i) => (
              <div key={i} style={{ background: "#ffffff", border: "1px solid rgba(212,168,67,0.45)", borderRadius: "16px", height: h + "px", marginBottom: "24px", padding: "24px" }}>
                <div style={{ background: "rgba(212,168,67,0.25)", borderRadius: "8px", height: "18px", width: "180px", marginBottom: "16px" }} />
                <div style={{ background: "rgba(15,23,42,0.06)", borderRadius: "8px", height: "12px", width: "70%", marginBottom: "10px" }} />
                <div style={{ background: "rgba(15,23,42,0.06)", borderRadius: "8px", height: "12px", width: "50%" }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.7)", zIndex: 50,
        }}>
          <div style={{
            background: "#1e293b", padding: "40px", borderRadius: "16px",
            textAlign: "center", maxWidth: "480px", width: "90%", border: "1px solid #334155",
          }}>
            <h2 style={{ fontSize: "1.8rem", color: "#ffffff", marginBottom: "8px" }}>Unlock Kevria Calc</h2>
            <p style={{ color: "#94a3b8", marginBottom: "24px", fontSize: "0.95rem" }}>Cancel anytime. No lock-in.</p>

            {/* Plan picker */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
              {([
                { key: "monthly", label: "Monthly", price: "$9.99", period: "/ month", badge: null },
                { key: "annual", label: "Annual", price: "$79", period: "/ year", badge: "Save 34%" },
              ] as const).map((plan) => (
                <div
                  key={plan.key}
                  onClick={() => setSelectedPlan(plan.key)}
                  style={{
                    flex: 1, padding: "16px 12px", borderRadius: "12px", cursor: "pointer",
                    border: selectedPlan === plan.key ? "2px solid #d4a843" : "2px solid #334155",
                    background: selectedPlan === plan.key ? "rgba(212,168,67,0.08)" : "rgba(15,23,42,0.02)",
                    position: "relative",
                  }}
                >
                  {plan.badge && (
                    <div style={{
                      position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)",
                      background: "#d4a843", color: "#0f172a", fontSize: "0.7rem", fontWeight: "800",
                      padding: "2px 10px", borderRadius: "20px", whiteSpace: "nowrap",
                    }}>{plan.badge}</div>
                  )}
                  <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "4px" }}>{plan.label}</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "800", color: selectedPlan === plan.key ? "#d4a843" : "white" }}>{plan.price}</div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{plan.period}</div>
                </div>
              ))}
            </div>

            {["Unlimited participants & support lines", "100 PDF plan uploads / month", "Public holiday auto-calculations", "Plan pace tracking", "Claims & actual spend tracker", "CSV & PDF exports", "Cancel anytime"].map((f) => (
              <p key={f} style={{ color: "#94a3b8", marginBottom: "6px", fontSize: "0.88rem", textAlign: "left" }}>✓ {f}</p>
            ))}

            <button onClick={handleCheckout} disabled={checkoutLoading} style={{
              marginTop: "20px", padding: "15px 40px", fontSize: "1.1rem", backgroundColor: "#d4a843", color: "#0f172a",
              border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", width: "100%",
            }}>
              {checkoutLoading ? "Redirecting..." : selectedPlan === "annual" ? "Subscribe — $79/yr" : "Subscribe — $9.99/mo"}
            </button>
            <p onClick={handleLogout} style={{ marginTop: "15px", color: "#64748b", cursor: "pointer", fontSize: "0.9rem" }}>Log out</p>
          </div>
        </div>
      </div>
    );
  }

  // If viewing a specific participant
  if (activeParticipant) {
    const p = participants.find((x) => x.id === activeParticipant);
    return (
      <div>
        <div style={{
          background: "linear-gradient(135deg, #2d1b69 0%, #3d2787 100%)", padding: "12px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={() => setActiveParticipant(null)} style={{
            background: "rgba(212,168,67,0.18)", border: "1px solid rgba(212,168,67,0.5)",
            color: "#d4a843", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600",
          }}>Back to All Participants</button>
          <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.9rem", fontWeight: "500" }}>
            {p?.name} {p?.ndisNumber ? "(" + p.ndisNumber + ")" : ""}
          </div>
        </div>
        <Client storageKey={"ndis_participant_" + activeParticipant} participantName={p?.name} ndisNumber={p?.ndisNumber} />
      </div>
    );
  }
  // Overview - all participants
  return (
    <main className="min-h-screen" style={{ background: "#f8fafc", color: "#0f172a" }}>
      <div className="mx-auto max-w-6xl p-6">

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "1.5rem", color: "#d4a843" }}>✦</span>
            <h1 className="text-3xl font-bold" style={{ color: "#2d1b69" }}>Kevria Calc</h1>
          </div>
          <div className="flex items-center gap-3">
            {user?.email && <span className="text-sm" style={{ color: "#475569" }}>{user.email}</span>}
            {stripeCustomerId && (
              <button onClick={handlePortal} disabled={portalLoading} style={{
                background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)",
                color: "#d4a843", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem",
              }}>{portalLoading ? "..." : "Manage Subscription"}</button>
            )}
            <button onClick={handleLogout} style={{
              background: "rgba(15,23,42,0.05)", border: "1px solid rgba(15,23,42,0.1)",
              color: "#334155", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem",
            }}>Log out</button>
          </div>
        </div>

        <div className="text-sm mb-8" style={{ color: "#64748b" }}>
          Powered by <span style={{ color: "#d4a843" }}>Kevria</span> — Participant Overview
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <div className="rounded-2xl p-5" style={{ background: "#ffffff", border: "1px solid rgba(212,168,67,0.45)" }}>
            <div className="text-sm" style={{ color: "#334155" }}>Total Participants</div>
            <div className="text-3xl font-bold" style={{ color: "#d4a843" }}>{participants.length}</div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: "#ffffff", border: "1px solid rgba(212,168,67,0.45)" }}>
            <div className="text-sm" style={{ color: "#334155" }}>Total Funding</div>
            <div className="text-3xl font-bold" style={{ color: "#d4a843" }}>
              {money(participants.reduce((a, p) => a + budgetFor(p.id).totalFunding, 0))}
            </div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: "#ffffff", border: "1px solid rgba(212,168,67,0.45)" }}>
            <div className="text-sm" style={{ color: "#334155" }}>Total Remaining</div>
            <div className="text-3xl font-bold" style={{
              color: participants.reduce((a, p) => a + budgetFor(p.id).remaining, 0) < 0 ? "#ef4444" : "#22c55e"
            }}>
              {money(participants.reduce((a, p) => a + budgetFor(p.id).remaining, 0))}
            </div>
          </div>
        </div>

        {/* Participant Cards */}
        {participants.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: "#ffffff", border: "1px solid rgba(212,168,67,0.45)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "15px" }}>👤</div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: "#2d1b69" }}>No Participants Yet</h2>
            <p className="mb-6" style={{ color: "#334155" }}>Add your first NDIS participant to get started.</p>
            <button onClick={() => setShowAddForm(true)} style={{
              background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)",
              color: "#d4a843", padding: "12px 32px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "1rem",
            }}>+ Add First Participant</button>
            <div>
              <button onClick={loadSampleParticipant} style={{
                marginTop: "14px", background: "none", border: "none",
                color: "#64748b", cursor: "pointer", fontSize: "0.9rem", textDecoration: "underline",
              }}>or load a sample participant to explore</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {participants.map((p) => {
              const budget = budgetFor(p.id);
              const statusColors = budget.status === "over"
                ? { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "OVER BUDGET", border: "rgba(239,68,68,0.3)" }
                : budget.status === "low"
                ? { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "LOW BUDGET", border: "rgba(245,158,11,0.3)" }
                : budget.status === "empty"
                ? { color: "#475569", bg: "rgba(128,128,160,0.1)", label: "NOT SET UP", border: "rgba(128,128,160,0.3)" }
                : { color: "#22c55e", bg: "rgba(34,197,94,0.1)", label: "ON TRACK", border: "rgba(34,197,94,0.3)" };

              return (
                <div key={p.id} className="rounded-2xl p-5" style={{
                  background: "#ffffff", border: "1px solid " + statusColors.border,
                  cursor: "pointer", transition: "all 0.2s",
                }}
                  onClick={() => setActiveParticipant(p.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={"Open " + p.name}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveParticipant(p.id); } }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(241,245,249,0.6)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#ffffff"; }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div style={{
                        width: "48px", height: "48px", borderRadius: "50%",
                        background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.2rem", color: "#d4a843", fontWeight: "bold",
                      }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-lg font-semibold">{p.name}</div>
                        {p.ndisNumber && <div className="text-sm" style={{ color: "#475569" }}>NDIS: {p.ndisNumber}</div>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right" style={{ minWidth: "120px" }}>
                        <div className="text-sm" style={{ color: "#334155" }}>Funding</div>
                        <div className="font-semibold" style={{ color: "#d4a843" }}>{money(budget.totalFunding)}</div>
                      </div>
                      <div className="text-right" style={{ minWidth: "120px" }}>
                        <div className="text-sm" style={{ color: "#334155" }}>Remaining</div>
                        <div className="font-semibold" style={{ color: statusColors.color }}>{money(budget.remaining)}</div>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{
                        background: statusColors.bg, color: statusColors.color, border: "1px solid " + statusColors.border,
                      }}>{statusColors.label}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                        className="rounded-lg px-3 py-2" style={{
                          background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)", color: "#d4a843",
                          cursor: "pointer", fontSize: "0.8rem",
                        }}>Edit</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteParticipant(p.id); }}
                        className="rounded-lg px-3 py-2" style={{
                          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444",
                          cursor: "pointer", fontSize: "0.8rem",
                        }}>Delete</button>
                    </div>
                  </div>

                  {/* Budget bar */}
                  {budget.totalFunding > 0 && (
                    <div className="mt-3">
                      <div style={{ background: "rgba(15,23,42,0.1)", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
                        <div style={{
                          width: Math.min(100, budget.totalFunding > 0 ? (budget.planCost / budget.totalFunding) * 100 : 0) + "%",
                          height: "100%", borderRadius: "6px",
                          background: budget.status === "over" ? "#ef4444" : budget.status === "low" ? "#f59e0b" : "#22c55e",
                        }} />
                      </div>
                      <div className="text-xs mt-1 text-right" style={{ color: "#475569" }}>
                        {budget.totalFunding > 0 ? ((budget.planCost / budget.totalFunding) * 100).toFixed(1) : 0}% used
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add button */}
            <button onClick={() => setShowAddForm(true)} className="rounded-2xl p-5" style={{
              background: "rgba(212,168,67,0.05)", border: "2px dashed rgba(212,168,67,0.3)",
              color: "#d4a843", cursor: "pointer", fontSize: "1rem", fontWeight: "600", textAlign: "center",
            }}>+ Add New Participant</button>
            <button onClick={loadSampleParticipant} style={{
              background: "none", border: "none", color: "#64748b", cursor: "pointer",
              fontSize: "0.82rem", textDecoration: "underline", textAlign: "center", padding: "2px",
            }}>Load a sample participant</button>
          </div>
        )}

        {/* Add Participant Modal */}
        {showAddForm && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          }}>
            <div style={{
              background: "#f8fafc", padding: "32px", borderRadius: "16px",
              border: "1px solid rgba(212,168,67,0.3)", maxWidth: "400px", width: "90%",
            }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: "#d4a843" }}>Add New Participant</h3>

              <div className="mb-4">
                <div className="text-sm mb-1" style={{ color: "#334155" }}>Participant Name *</div>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. John Smith"
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: "#ffffff", border: "1px solid rgba(212,168,67,0.45)", color: "#0f172a" }}
                />
              </div>

              <div className="mb-6">
                <div className="text-sm mb-1" style={{ color: "#334155" }}>NDIS Number (optional)</div>
                <input value={newNdis} onChange={(e) => setNewNdis(e.target.value)} placeholder="e.g. 431234567"
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: "#ffffff", border: "1px solid rgba(212,168,67,0.45)", color: "#0f172a" }}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={addParticipant} style={{
                  flex: 1, padding: "12px", backgroundColor: "#d4a843", color: "#0f172a",
                  border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold",
                }}>Add Participant</button>
                <button onClick={() => { setShowAddForm(false); setNewName(""); setNewNdis(""); }} style={{
                  flex: 1, padding: "12px", background: "rgba(15,23,42,0.05)",
                  border: "1px solid rgba(15,23,42,0.1)", color: "#334155", borderRadius: "8px", cursor: "pointer",
                }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Participant Modal */}
        {editingParticipant && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          }}>
            <div style={{
              background: "#f8fafc", padding: "32px", borderRadius: "16px",
              border: "1px solid rgba(212,168,67,0.3)", maxWidth: "400px", width: "90%",
            }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: "#d4a843" }}>Edit Participant</h3>

              <div className="mb-4">
                <div className="text-sm mb-1" style={{ color: "#334155" }}>Participant Name *</div>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. John Smith"
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: "#ffffff", border: "1px solid rgba(212,168,67,0.45)", color: "#0f172a" }}
                />
              </div>

              <div className="mb-6">
                <div className="text-sm mb-1" style={{ color: "#334155" }}>NDIS Number (optional)</div>
                <input value={editNdis} onChange={(e) => setEditNdis(e.target.value)} placeholder="e.g. 431234567"
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: "#ffffff", border: "1px solid rgba(212,168,67,0.45)", color: "#0f172a" }}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={saveEdit} style={{
                  flex: 1, padding: "12px", backgroundColor: "#d4a843", color: "#0f172a",
                  border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold",
                }}>Save Changes</button>
                <button onClick={() => setEditingParticipant(null)} style={{
                  flex: 1, padding: "12px", background: "rgba(15,23,42,0.05)",
                  border: "1px solid rgba(15,23,42,0.1)", color: "#334155", borderRadius: "8px", cursor: "pointer",
                }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Welcome modal */}
        {showWelcome && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200,
            background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
              border: "1px solid rgba(212,168,67,0.4)", borderRadius: "24px",
              padding: "48px 40px", maxWidth: "480px", width: "90%", textAlign: "center",
            }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🎉</div>
              <h2 style={{ fontSize: "1.9rem", fontWeight: "800", color: "#2d1b69", marginBottom: "10px" }}>
                You&apos;re all set!
              </h2>
              <p style={{ color: "#334155", fontSize: "1rem", lineHeight: "1.6", marginBottom: "8px" }}>
                Welcome to <span style={{ color: "#d4a843", fontWeight: "700" }}>Kevria Calc</span>.
              </p>
              <p style={{ color: "#475569", fontSize: "0.9rem", lineHeight: "1.6", marginBottom: "32px" }}>
                Add your first participant to get started. Your data saves automatically and syncs across all your devices.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {["Unlimited participants & support lines", "Auto public holiday calculations", "Plan pace tracking", "Claims & actual spend tracker"].map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left" }}>
                    <span style={{ color: "#22c55e", fontSize: "1.1rem" }}>✓</span>
                    <span style={{ color: "#1e293b", fontSize: "0.9rem" }}>{f}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setShowWelcome(false); setShowAddForm(true); }}
                style={{
                  marginTop: "32px", width: "100%", padding: "14px",
                  backgroundColor: "#d4a843", color: "#0f172a",
                  border: "none", borderRadius: "10px", cursor: "pointer",
                  fontWeight: "bold", fontSize: "1.05rem",
                }}
              >
                Add First Participant →
              </button>
              <p onClick={() => setShowWelcome(false)} style={{ marginTop: "14px", color: "#64748b", cursor: "pointer", fontSize: "0.85rem" }}>
                I&apos;ll do it later
              </p>
            </div>
          </div>
        )}

        <div className="text-xs mt-8" style={{ color: "#64748b" }}>
          Data syncs to your account automatically.
        </div>
        <div className="text-xs mt-2 mb-8" style={{ color: "#64748b" }}>
          Powered by <span style={{ color: "#d4a843" }}>Kevria</span>
        </div>
      </div>
    </main>
  );
}

