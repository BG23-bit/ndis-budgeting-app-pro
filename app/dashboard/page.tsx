"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { teamCtx, dbGet, dbGetMany, dbKeys, dbDelete, dbListGet, dbListSave, TeamCtx } from "@/lib/team";
import Client, { defaultRoster, getPresetRates, NDIS_RATES_2026_27 } from "../client";
import { computeBudget, computePace, daysUntil, EMPTY_BUDGET, type Budget } from "@/lib/overview";

type Participant = {
  id: string;
  name: string;
  ndisNumber: string;
  archived?: boolean;
};

function uid(): string {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function money(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
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
  const [search, setSearch] = useState("");
  // Caseload view: the whole caseload as one sortable table (funding, pace,
  // plan end) — the working view for coordinators with many participants.
  const [view, setView] = useState<"cards" | "table">("cards");
  useEffect(() => { try { if (localStorage.getItem("kevria_dash_view") === "table") setView("table"); } catch {} }, []);
  const setViewPersist = (v: "cards" | "table") => { setView(v); try { localStorage.setItem("kevria_dash_view", v); } catch {} };
  const [sortKey, setSortKey] = useState<"name" | "funding" | "remaining" | "used" | "end">("name");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  // Trial-first: unpaid users land straight in the 1-participant free preview.
  // The plan picker opens on demand (banner CTA, or hitting the participant gate).
  const [previewDismissed, setPreviewDismissed] = useState(true);
  const [budgets, setBudgets] = useState<{ [id: string]: Budget }>({});
  // Getting-started checklist: shown until every step is done or dismissed.
  const [orgName, setOrgName] = useState<string | null>(null);
  const [checklistDismissed, setChecklistDismissed] = useState(true);
  useEffect(() => { try { setChecklistDismissed(localStorage.getItem("kevria_checklist_done") === "1"); } catch {} }, []);
  // Org profile is read on its own (not via the budgets loader) so the
  // checklist knows about it even before the first participant exists.
  useEffect(() => {
    try { const raw = localStorage.getItem("kevria_provider_details"); if (raw) setOrgName((o) => o ?? (JSON.parse(raw)?.orgName || "")); } catch {}
    (async () => {
      try {
        const { data: d } = await supabase.auth.getUser();
        if (!d.user) return;
        const prov = await dbGet("ndis_provider_details");
        setOrgName((prov as any)?.orgName || "");
      } catch {}
    })();
  }, []);
  const hasLoadedRef = useRef(false);
  const skipNextSaveRef = useRef(false);
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [team, setTeam] = useState<TeamCtx | null>(null);
  const [recoverable, setRecoverable] = useState<{ id: string; updated: string }[] | null>(null);
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
      // Team members inherit the owner's subscription and work in their data.
      const ctx = await teamCtx();
      setTeam(ctx);
      if (ctx.isMember && ctx.ownerPaid) setPaid(true);
      setLoading(false);
      // Record activity (fire-and-forget) so /admin can see who is actively using the app.
      fetch("/api/activity", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {});
    };
    checkUser();
  }, [router]);

  // Load the participant list. On any error we show a retry banner and keep
  // saving BLOCKED (hasLoadedRef stays false) — a failed load must never lead
  // to an empty list being saved over the real one.
  async function loadList() {
    setLoadError(false);
    try {
      const { data: d } = await supabase.auth.getUser();
      if (d.user) {
        let cloudList: any[] | null = null;
        try { cloudList = await dbListGet(); } catch { setLoadError(true); return; }
        const list = Array.isArray(cloudList) ? cloudList : [];
        if (list.length > 0) setParticipants(list);
        // First-run onboarding: brand-new accounts (no participants, no saved
        // company profile) set up their profile before landing on the dashboard.
        // One-shot — never repeats, and skipped right after checkout success.
        if (list.length === 0 && !localStorage.getItem("kevria_onboarded") && !window.location.search.includes("success=true")) {
          const prov = await dbGet("ndis_provider_details");
          try { localStorage.setItem("kevria_onboarded", "1"); } catch {}
          if (!(prov as any)?.orgName) { router.push("/company?welcome=1"); return; }
        }
        // Calculator data with no matching list entry means the list was wiped
        // by a past sync bug (or a pre-cleanup delete) — offer to restore.
        const rows = await dbKeys().catch(() => []);
        const listIds = new Set(list.map((p: any) => p.id));
        let dismissed: string[] = [];
        try { dismissed = JSON.parse(localStorage.getItem("ndis_recovery_dismissed") || "[]"); } catch {}
        const dismissedSet = new Set(dismissed);
        const orphans = (rows || [])
          .map((r: any) => ({ id: String(r.participant_id).replace("ndis_participant_", ""), updated: String(r.updated_at || "") }))
          .filter((o: any) => !["ndis_preview", "ndis_provider_details", "roster_notes_usage", "ndis_price_guide", "team_members", "team_link"].includes(String(o.id)) && !listIds.has(o.id) && !dismissedSet.has(o.id) && o.id.length > 8)
          .sort((a: any, b: any) => b.updated.localeCompare(a.updated));
        if (orphans.length > 0) setRecoverable(orphans);
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
      hasLoadedRef.current = true;
    } catch {
      setLoadError(true);
    }
  }
  useEffect(() => { loadList(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const recoverParticipants = () => {
    if (!recoverable || recoverable.length === 0) return;
    const existing = new Set(participants.map((p) => p.id));
    const restored: Participant[] = recoverable
      .filter((o) => !existing.has(o.id))
      .map((o, i) => {
        const when = o.updated ? new Date(o.updated).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "";
        return { id: o.id, name: "Recovered " + (i + 1) + (when ? " — edited " + when : ""), ndisNumber: "" };
      });
    setParticipants((prev) => [...prev, ...restored]);
    setRecoverable(null);
  };

  const dismissRecovery = () => {
    if (recoverable) {
      try {
        const prev = JSON.parse(localStorage.getItem("ndis_recovery_dismissed") || "[]");
        localStorage.setItem("ndis_recovery_dismissed", JSON.stringify([...new Set([...prev, ...recoverable.map((o) => o.id)])]));
      } catch {}
    }
    setRecoverable(null);
  };

  // Refresh the list from the cloud when the tab regains focus, merging so a
  // stale tab picks up participants added elsewhere instead of overwriting them.
  useEffect(() => {
    const onVis = async () => {
      if (document.visibilityState !== "visible" || !hasLoadedRef.current) return;
      try {
        const { data: d } = await supabase.auth.getUser();
        if (!d.user) return;
        const cloudList = await dbListGet().catch(() => null);
        if (!Array.isArray(cloudList)) return;
        const cloud = cloudList.filter((p: any) => p?.id && !deletedIdsRef.current.has(p.id));
        setParticipants((prev) => {
          const cloudIds = new Set(cloud.map((p: any) => p.id));
          const extras = prev.filter((p) => !cloudIds.has(p.id));
          const next = [...cloud, ...extras];
          const same = next.length === prev.length && next.every((p: any, i: number) => prev[i]?.id === p.id && prev[i]?.name === p.name && prev[i]?.ndisNumber === p.ndisNumber);
          if (same) return prev;
          skipNextSaveRef.current = true;
          return next;
        });
      } catch {}
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Realtime sync — keeps all open sessions in sync when 1 login is shared
  useEffect(() => {
    if (!user || team?.isMember) return;
    const channel = supabase
      .channel("participant_sync_" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "participant_lists", filter: `user_id=eq.${user.id}` }, (payload: any) => {
        if (Array.isArray(payload.new?.participants)) {
          skipNextSaveRef.current = true;
          setParticipants(payload.new.participants.filter((p: any) => p?.id && !deletedIdsRef.current.has(p.id)));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, team]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (skipNextSaveRef.current) { skipNextSaveRef.current = false; return; }
    try { localStorage.setItem("ndis_participants_list", JSON.stringify(participants)); } catch {}
    async function save() {
      try {
        const { data: d } = await supabase.auth.getUser();
        if (d.user) {
          // Merge with the current cloud list before writing so a stale tab can
          // never wipe participants added elsewhere. Same-session deletes are
          // honoured via tombstones.
          const cloudList = await dbListGet().catch(() => null);
          const cloud = Array.isArray(cloudList) ? cloudList : [];
          const localIds = new Set(participants.map((p) => p.id));
          const missing = cloud.filter((p: any) => p?.id && !localIds.has(p.id) && !deletedIdsRef.current.has(p.id));
          const merged = [...participants, ...missing];
          await dbListSave(merged);
          if (missing.length > 0) {
            skipNextSaveRef.current = true;
            setParticipants(merged);
          }
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
      // Organisation-level custom holidays feed the same PH maths as the calculator.
      let customHolidays: { date: string; name: string }[] = [];
      try {
        const rawProv = localStorage.getItem("kevria_provider_details");
        if (rawProv) { const pd = JSON.parse(rawProv); customHolidays = pd?.customHolidays || []; setOrgName(pd?.orgName || ""); }
      } catch {}
      for (const p of participants) {
        try {
          const raw = localStorage.getItem("ndis_participant_" + p.id);
          if (raw) map[p.id] = computeBudget(JSON.parse(raw), customHolidays);
        } catch {}
      }
      try {
        const { data: d } = await supabase.auth.getUser();
        if (d.user) {
          const prov = await dbGet("ndis_provider_details");
          if (Array.isArray((prov as any)?.customHolidays)) customHolidays = (prov as any).customHolidays;
          setOrgName((prov as any)?.orgName || "");
          const keys = participants.map((p) => "ndis_participant_" + p.id);
          const rows = await dbGetMany(keys);
          for (const row of rows || []) {
            const id = String(row.participant_id).replace(/^ndis_participant_/, "");
            map[id] = computeBudget(row.data, customHolidays);
          }
        }
      } catch {}
      if (!cancelled) setBudgets(map);
    }
    loadBudgets();
    return () => { cancelled = true; };
  }, [participants, activeParticipant]);

  const budgetFor = (id: string): Budget => budgets[id] || EMPTY_BUDGET;
  const activeParticipants = participants.filter((p) => !p.archived);
  const archivedParticipants = participants.filter((p) => p.archived);
  const [showArchived, setShowArchived] = useState(false);

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
    if (loadError) return; // saving is paused until the list loads
    if (!paid && participants.length >= 1) {
      setPreviewDismissed(false);
      return;
    }
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
        { id: uid(), code: "11", description: "Functional Behaviour Assessment", hours: 15, rate: 252.99, note: "", item: "11_022_0110_7_3", typeKey: "bsp" },
        { id: uid(), code: "15", description: "OT — Assistive Technology Assessment", hours: 12, rate: 193.99, note: "", item: "15_617_0128_1_3", typeKey: "ot" },
      ],
      lines: [
        line("01", "Core Supports — Daily Living", 140000, (() => {
          const r = mkRoster({
            mon: { hours: 4 }, tue: { hours: 4 }, wed: { hours: 4 }, thu: { hours: 4 }, fri: { hours: 4 },
            sat: { hours: 4 }, sun: { hours: 3 },
          });
          // Shift times print on the Schedule of Supports (day-by-day layout)
          for (const d of ["mon", "tue", "wed", "thu", "fri"]) (r as any)[d].shifts = [{ s: "09:00", e: "13:00" }];
          return r;
        })(), {
          kmsPerWeek: 40,
          // Splits: named amounts within the one category budget
          allocations: [
            { id: uid(), name: "Support worker roster", amount: 118000 },
            { id: uid(), name: "Transport & community access", amount: 22000 },
          ],
          claims: [
            { id: uid(), date: claimDate(21), amount: 2340.50, note: "Roster week — invoice #2041" },
            { id: uid(), date: claimDate(14), amount: 2298.75, note: "Roster week — invoice #2052" },
            { id: uid(), date: claimDate(7), amount: 2412.10, note: "Roster week — invoice #2063" },
          ],
        }),
        line("04", "Community Participation", 15000, mkRoster({
          wed: { hours: 2 }, sat: { hours: 2, frequency: "2nd" },
        })),
        // Therapy billed as sessions across the plan period
        line("15", "Psychology", 4200, defaultRoster(), {
          hoursMode: "sessions", sessionCount: 12, sessionLength: 1,
          lineRates: { ...getPresetRates("15"), weekdayOrd: 252.99 },
        }),
        line("03", "Consumables", 2500, defaultRoster()),
      ],
    };
    const p: Participant = { id, name: "Alex Sample (Demo)", ndisNumber: "430000001" };
    try { localStorage.setItem("ndis_participant_" + id, JSON.stringify(data)); } catch {}
    setParticipants((prev) => [...prev, p]);
    setActiveParticipant(id);
  };

  const addParticipant = () => {
    if (loadError) return; // saving is paused until the list loads
    if (!newName.trim()) return;
    if (!paid && participants.length >= 1) {
      setShowAddForm(false);
      setPreviewDismissed(false); // the plan picker explains the 1-participant preview limit
      return;
    }
    const p: Participant = { id: uid(), name: newName.trim(), ndisNumber: newNdis.trim() };
    setParticipants((prev) => [...prev, p]);
    setNewName("");
    setNewNdis("");
    setShowAddForm(false);
  };

  // Archiving hides a participant from the list and totals but keeps every
  // budget, roster and claim — participants leave and come back.
  const archiveParticipant = (id: string) => {
    if (loadError) return;
    setParticipants((prev) => prev.map((x) => x.id === id ? { ...x, archived: true } : x));
  };
  const restoreParticipant = (id: string) => {
    if (loadError) return;
    setParticipants((prev) => prev.map((x) => x.id === id ? { ...x, archived: false } : x));
  };

  const deleteParticipant = (id: string) => {
    const p = participants.find((x) => x.id === id);
    if (!confirm(`Delete ${p?.name || "this participant"} and all their data? This cannot be undone.`)) return;
    deletedIdsRef.current.add(id);
    setParticipants((prev) => prev.filter((x) => x.id !== id));
    try { localStorage.removeItem("ndis_participant_" + id); } catch {}
    // Also remove their calculator data from the cloud so it doesn't linger on other devices.
    if (user?.id) {
      dbDelete("ndis_participant_" + id).catch((e) => console.error("Cloud delete error:", e));
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

  if (!paid && !previewDismissed) {
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
                { key: "monthly", label: "Monthly", price: "$9.90", period: "/ month", badge: null },
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

            {["Unlimited participants & support lines", "25 PDF plan uploads / month (add more anytime)", "Public holiday auto-calculations", "Plan pace tracking", "Claims & actual spend tracker", "CSV & PDF exports", "Cancel anytime"].map((f) => (
              <p key={f} style={{ color: "#94a3b8", marginBottom: "6px", fontSize: "0.88rem", textAlign: "left" }}>✓ {f}</p>
            ))}

            <button onClick={handleCheckout} disabled={checkoutLoading} style={{
              marginTop: "20px", padding: "15px 40px", fontSize: "1.1rem", backgroundColor: "#d4a843", color: "#0f172a",
              border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", width: "100%",
            }}>
              {checkoutLoading ? "Redirecting..." : selectedPlan === "annual" ? "Subscribe — $79/yr" : "Subscribe — $9.90/mo"}
            </button>
            <button
              onClick={() => setPreviewDismissed(true)}
              style={{ marginTop: "14px", width: "100%", padding: "11px", background: "none", border: "1px dashed rgba(212,168,67,0.5)", color: "#d4a843", borderRadius: "8px", cursor: "pointer", fontSize: "0.92rem", fontWeight: 600 }}>
              ← Back to the free preview <span style={{ color: "#94a3b8", fontWeight: 400 }}>1 participant, no card needed</span>
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
        <Client storageKey={"ndis_participant_" + activeParticipant} participantName={p?.name} ndisNumber={p?.ndisNumber} paid={paid} />
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
            <button onClick={() => router.push("/company")} style={{
              background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)",
              color: "#d4a843", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem",
            }}>Company Profile</button>
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

        <div className="text-sm mb-8 flex items-center gap-3 flex-wrap" style={{ color: "#64748b" }}>
          <span>Powered by <span style={{ color: "#d4a843" }}>Kevria</span> — Participant Overview</span>
          {team?.isMember && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(45,27,105,0.07)", color: "#2d1b69", border: "1px solid rgba(45,27,105,0.2)" }}>
              Team workspace — {team.ownerOrg || team.ownerEmail}
            </span>
          )}
        </div>

        {!paid && (
          <div className="rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3" style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.4)" }}>
            <div>
              <div style={{ color: "#b8901a", fontWeight: 700 }}>Free preview — 1 participant</div>
              <div className="text-sm" style={{ color: "#64748b" }}>Everything works except AI plan uploads &amp; auto-fill. Subscribe for unlimited participants and 25 plan uploads a month.</div>
            </div>
            <button onClick={() => setPreviewDismissed(false)} style={{ background: "#d4a843", color: "#241456", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}>
              Subscribe — $9.90/mo
            </button>
          </div>
        )}

        {loadError && (
          <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <div style={{ color: "#dc2626", fontWeight: 600, marginBottom: "4px" }}>Couldn&apos;t load your participants</div>
            <div className="text-sm" style={{ color: "#64748b" }}>Your list is safe in the cloud — this is a connection hiccup, nothing has been deleted. Saving is paused until the list loads, so nothing can be overwritten.</div>
            <button onClick={loadList} className="kv-btn mt-3" style={{ background: "#dc2626", color: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 18px", fontWeight: 600, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {recoverable && recoverable.length > 0 && !loadError && (
          <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.35)" }}>
            <div style={{ color: "#b45309", fontWeight: 600, marginBottom: "4px" }}>Found saved data for {recoverable.length} participant{recoverable.length === 1 ? "" : "s"} not shown on your list</div>
            <div className="text-sm" style={{ color: "#64748b" }}>A past sync problem removed entries from this list, but every budget, roster and claim is still stored safely. Restore them (named by last-edited date — rename or delete the ones you don&apos;t need), or dismiss to hide this permanently.</div>
            <div className="flex gap-2 mt-3 flex-wrap">
              <button onClick={recoverParticipants} className="kv-btn" style={{ background: "#d4a843", color: "#241456", border: "none", borderRadius: "8px", padding: "8px 18px", fontWeight: 700, cursor: "pointer" }}>Restore {recoverable.length} participant{recoverable.length === 1 ? "" : "s"}</button>
              <button onClick={dismissRecovery} style={{ background: "rgba(15,23,42,0.05)", border: "1px solid rgba(15,23,42,0.1)", color: "#334155", borderRadius: "8px", padding: "8px 18px", cursor: "pointer" }}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <div className="kv-card p-5">
            <div className="text-sm" style={{ color: "#334155" }}>Total Participants</div>
            <div className="text-3xl font-bold" style={{ color: "#d4a843" }}>{activeParticipants.length}</div>
          </div>
          <div className="kv-card p-5">
            <div className="text-sm" style={{ color: "#334155" }}>Total Funding</div>
            <div className="text-3xl font-bold" style={{ color: "#d4a843" }}>
              {money(activeParticipants.reduce((a, p) => a + budgetFor(p.id).totalFunding, 0))}
            </div>
          </div>
          <div className="kv-card p-5">
            <div className="text-sm" style={{ color: "#334155" }}>Total Remaining</div>
            <div className="text-3xl font-bold" style={{
              color: activeParticipants.reduce((a, p) => a + budgetFor(p.id).remaining, 0) < 0 ? "#ef4444" : "#22c55e"
            }}>
              {money(activeParticipants.reduce((a, p) => a + budgetFor(p.id).remaining, 0))}
            </div>
          </div>
        </div>

        {/* Search + view toggle */}
        {activeParticipants.length >= 2 && (
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            {activeParticipants.length >= 6 && (<>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Search participants by name or NDIS number…"
                className="rounded-xl px-4 py-2.5 outline-none"
                style={{ background: "#ffffff", border: "1px solid rgba(212,168,67,0.35)", color: "#0f172a", width: "100%", maxWidth: "420px", fontSize: "0.92rem" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}>clear</button>
              )}
            </>)}
            <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "rgba(15,23,42,0.04)", border: "1px solid rgba(15,23,42,0.08)", marginLeft: "auto" }}>
              {([["cards", "Cards"], ["table", "Caseload"]] as ["cards" | "table", string][]).map(([v, lbl]) => (
                <button key={v} onClick={() => setViewPersist(v)} style={{ background: view === v ? "#ffffff" : "none", border: view === v ? "1px solid rgba(212,168,67,0.4)" : "1px solid transparent", color: view === v ? "#b8901a" : "#64748b", padding: "6px 14px", borderRadius: "9px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>{lbl}</button>
              ))}
            </div>
          </div>
        )}

        {/* Getting-started checklist — walks new accounts to their first
            generated document, then disappears for good. */}
        {(() => {
          if (checklistDismissed || loading) return null;
          const budgetList = Object.values(budgets);
          const steps: { label: string; hint: string; done: boolean; cta: string; go: () => void }[] = [
            { label: "Set up your organisation", hint: "Name, ABN and logo — they brand every document you generate.", done: !!orgName, cta: "Company profile", go: () => router.push("/company") },
            { label: "Add a participant", hint: "Or load Alex, our fully set-up sample, to poke around a finished workspace first.", done: activeParticipants.length > 0, cta: "+ Add participant", go: () => setShowAddForm(true) },
            { label: "Enter budgets & build the roster", hint: "Type the plan's category budgets, then fill the weekly roster (or upload the plan PDF).", done: budgetList.some((b) => b.totalFunding > 0), cta: "Open participant", go: () => { const p = activeParticipants[0]; if (p) setActiveParticipant(p.id); else setShowAddForm(true); } },
            { label: "Generate a Schedule of Supports", hint: "The signable document — budgets, roster, item numbers and signatures, ready to send.", done: budgetList.some((b) => (b.docCount || 0) > 0), cta: "Open participant", go: () => { const p = activeParticipants.find((x) => budgetFor(x.id).totalFunding > 0) || activeParticipants[0]; if (p) setActiveParticipant(p.id); } },
          ];
          const doneCount = steps.filter((s) => s.done).length;
          if (doneCount === steps.length) { try { localStorage.setItem("kevria_checklist_done", "1"); } catch {} return null; }
          return (
            <div className="kv-card p-5 mb-6" style={{ border: "1px solid rgba(212,168,67,0.4)" }}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="text-sm font-bold" style={{ color: "#2d1b69" }}>Getting started — {doneCount} of {steps.length} done</div>
                <div className="flex items-center gap-3">
                  <button onClick={loadSampleParticipant} style={{ background: "rgba(45,27,105,0.06)", border: "1px solid rgba(45,27,105,0.18)", color: "#2d1b69", padding: "5px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>Load sample participant</button>
                  <button onClick={() => { setChecklistDismissed(true); try { localStorage.setItem("kevria_checklist_done", "1"); } catch {} }} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.78rem", textDecoration: "underline" }}>dismiss</button>
                </div>
              </div>
              <div className="grid gap-2">
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2 flex-wrap" style={{ background: s.done ? "rgba(34,197,94,0.05)" : "rgba(15,23,42,0.02)", border: "1px solid " + (s.done ? "rgba(34,197,94,0.2)" : "rgba(15,23,42,0.06)") }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, background: s.done ? "#22c55e" : "rgba(15,23,42,0.06)", color: s.done ? "#ffffff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>{s.done ? "✓" : i + 1}</div>
                    <div style={{ flex: 1, minWidth: "220px" }}>
                      <div className="text-sm font-semibold" style={{ color: s.done ? "#16a34a" : "#1e293b", textDecoration: s.done ? "line-through" : "none" }}>{s.label}</div>
                      {!s.done && <div className="text-xs" style={{ color: "#64748b" }}>{s.hint}</div>}
                    </div>
                    {!s.done && <button onClick={s.go} style={{ background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.35)", color: "#b8901a", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, flexShrink: 0 }}>{s.cta}</button>}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Participant Cards */}
        {participants.length === 0 ? (
          <div className="kv-card p-12 text-center">
            <div style={{ fontSize: "3rem", marginBottom: "15px" }}>👤</div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: "#2d1b69" }}>No Participants Yet</h2>
            <p className="mb-6" style={{ color: "#334155" }}>Add your first NDIS participant to get started.</p>
            <button onClick={() => setShowAddForm(true)} style={{
              background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)",
              color: "#d4a843", padding: "12px 32px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "1rem",
            }}>+ Add First Participant</button>
            <div>
              <button onClick={loadSampleParticipant} style={{
                marginTop: "14px", background: "rgba(45,27,105,0.06)", border: "1px solid rgba(45,27,105,0.2)",
                color: "#2d1b69", padding: "11px 26px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.92rem",
              }}>Load Alex, a fully set-up sample participant</button>
              <div className="text-xs mt-2" style={{ color: "#94a3b8" }}>Budgets, roster, shift times, therapy sessions and claims already filled — the quickest way to see how everything fits together.</div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {view === "table" ? (() => {
              // Caseload table — the whole book of budgets at a glance.
              const q = search.trim().toLowerCase();
              const shown = q ? activeParticipants.filter((p) => p.name.toLowerCase().includes(q) || (p.ndisNumber || "").toLowerCase().includes(q)) : activeParticipants;
              const rows = shown.map((p) => {
                const b = budgetFor(p.id);
                return { p, b, pace: computePace(b), used: b.totalFunding > 0 ? (b.planCost / b.totalFunding) * 100 : 0, end: daysUntil(b.planEnd) };
              });
              rows.sort((a, z) => {
                switch (sortKey) {
                  case "funding": return (a.b.totalFunding - z.b.totalFunding) * sortDir;
                  case "remaining": return (a.b.remaining - z.b.remaining) * sortDir;
                  case "used": return (a.used - z.used) * sortDir;
                  case "end": return ((a.end ?? 99999) - (z.end ?? 99999)) * sortDir;
                  default: return a.p.name.localeCompare(z.p.name) * sortDir;
                }
              });
              const paceChip = (s: string) => {
                const m: { [k: string]: { c: string; l: string } } = {
                  on_pace: { c: "#22c55e", l: "On pace" }, over_pace: { c: "#ef4444", l: "Over pace" },
                  under_pace: { c: "#f59e0b", l: "Under pace" }, ended: { c: "#64748b", l: "Ended" },
                  not_started: { c: "#64748b", l: "Not started" }, unknown: { c: "#cbd5e1", l: "—" },
                };
                const v = m[s] || m.unknown;
                return <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: v.c, border: "1px solid " + v.c, background: v.c + "14" }}>{v.l}</span>;
              };
              const TH = (k: typeof sortKey, label: string, align: "left" | "right" = "right") => (
                <th onClick={() => { if (sortKey === k) setSortDir((d) => (d === 1 ? -1 : 1)); else { setSortKey(k); setSortDir(k === "name" ? 1 : -1); } }}
                  style={{ textAlign: align, padding: "10px 14px", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                  {label}{sortKey === k ? (sortDir === 1 ? " ↑" : " ↓") : ""}
                </th>
              );
              return (
                <div className="kv-card" style={{ overflowX: "auto", padding: 0 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "760px" }}>
                    <thead><tr style={{ borderBottom: "2px solid rgba(45,27,105,0.12)" }}>
                      {TH("name", "Participant", "left")}
                      {TH("funding", "Funding")}
                      {TH("remaining", "Remaining")}
                      {TH("used", "Used")}
                      <th style={{ textAlign: "center", padding: "10px 14px", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>Pace</th>
                      {TH("end", "Plan ends")}
                    </tr></thead>
                    <tbody>
                      {rows.map(({ p, b, pace, used, end }) => (
                        <tr key={p.id} onClick={() => setActiveParticipant(p.id)} style={{ borderBottom: "1px solid rgba(15,23,42,0.05)", cursor: "pointer" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(241,245,249,0.7)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}>
                          <td style={{ padding: "11px 14px" }}>
                            <div className="text-sm font-semibold" style={{ color: "#1e293b" }}>{p.name}</div>
                            {p.ndisNumber && <div className="text-xs" style={{ color: "#94a3b8" }}>{p.ndisNumber}</div>}
                          </td>
                          <td className="kv-money text-sm" style={{ textAlign: "right", padding: "11px 14px", color: "#334155" }}>{money(b.totalFunding)}</td>
                          <td className="kv-money text-sm font-semibold" style={{ textAlign: "right", padding: "11px 14px", color: b.remaining < 0 ? "#ef4444" : b.status === "low" ? "#f59e0b" : "#16a34a" }}>{money(b.remaining)}</td>
                          <td className="kv-money text-sm" style={{ textAlign: "right", padding: "11px 14px", color: "#475569" }}>{b.totalFunding > 0 ? used.toFixed(0) + "%" : "—"}</td>
                          <td style={{ textAlign: "center", padding: "11px 14px" }}>{paceChip(pace.status)}</td>
                          <td className="text-sm" style={{ textAlign: "right", padding: "11px 14px", whiteSpace: "nowrap", color: end !== null && end <= 60 ? (end < 0 ? "#ef4444" : "#b45309") : "#475569", fontWeight: end !== null && end <= 60 ? 700 : 400 }}>
                            {b.planEnd ? (end !== null && end < 0 ? "ended" : b.planEnd + (end !== null && end <= 60 ? ` (${end}d)` : "")) : "—"}
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && <tr><td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>No participants match &ldquo;{search}&rdquo;</td></tr>}
                    </tbody>
                  </table>
                </div>
              );
            })() : (() => {
              const q = search.trim().toLowerCase();
              const shown = q ? activeParticipants.filter((p) => p.name.toLowerCase().includes(q) || (p.ndisNumber || "").toLowerCase().includes(q)) : activeParticipants;
              if (q && shown.length === 0) return (
                <div className="kv-card p-8 text-center" style={{ color: "#64748b" }}>
                  No participants match &ldquo;{search}&rdquo;
                </div>
              );
              return shown.map((p) => {
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
                      {(() => {
                        const d = daysUntil(budget.planEnd);
                        if (d === null || d > 60) return null;
                        const ended = d < 0;
                        const c = ended || d <= 14 ? "#ef4444" : "#f59e0b";
                        return <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: ended ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", color: c, border: "1px solid " + c }}>{ended ? "PLAN ENDED" : `Plan ends ${d}d`}</span>;
                      })()}
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
                        onClick={(e) => { e.stopPropagation(); archiveParticipant(p.id); }}
                        title="Hide from the list but keep all budgets, rosters and claims — restore any time from Archived"
                        className="rounded-lg px-3 py-2" style={{
                          background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.3)", color: "#64748b",
                          cursor: "pointer", fontSize: "0.8rem",
                        }}>Archive</button>
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
              });
            })()}

            {/* Add button */}
            <button onClick={() => setShowAddForm(true)} className="rounded-2xl p-5" style={{
              background: "rgba(212,168,67,0.05)", border: "2px dashed rgba(212,168,67,0.3)",
              color: "#d4a843", cursor: "pointer", fontSize: "1rem", fontWeight: "600", textAlign: "center",
            }}>+ Add New Participant</button>
            <button onClick={loadSampleParticipant} style={{
              background: "none", border: "none", color: "#64748b", cursor: "pointer",
              fontSize: "0.82rem", textDecoration: "underline", textAlign: "center", padding: "2px",
            }}>Load a sample participant</button>

            {archivedParticipants.length > 0 && (
              <div className="mt-2">
                <button onClick={() => setShowArchived((v) => !v)} style={{
                  background: "none", border: "none", color: "#64748b", cursor: "pointer",
                  fontSize: "0.85rem", textDecoration: "underline", padding: "2px",
                }}>{showArchived ? "▾" : "▸"} Archived ({archivedParticipants.length})</button>
                {showArchived && (
                  <div className="grid gap-2 mt-2">
                    {archivedParticipants.map((p) => (
                      <div key={p.id} className="rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2" style={{ background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.08)" }}>
                        <div>
                          <span style={{ color: "#334155", fontWeight: 600 }}>{p.name}</span>
                          {p.ndisNumber && <span className="text-sm" style={{ color: "#94a3b8", marginLeft: "8px" }}>NDIS: {p.ndisNumber}</span>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => restoreParticipant(p.id)} className="rounded-lg px-3 py-1.5" style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)", color: "#b8901a", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>Restore</button>
                          <button onClick={() => deleteParticipant(p.id)} className="rounded-lg px-3 py-1.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", cursor: "pointer", fontSize: "0.8rem" }}>Delete permanently</button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs" style={{ color: "#94a3b8" }}>Archived participants keep all their data and are excluded from totals. Delete permanently removes everything.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add Participant Modal */}
        {showAddForm && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          }}>
            <div
              onKeyDown={(e) => {
                if (e.key === "Escape") { setShowAddForm(false); setNewName(""); setNewNdis(""); }
                if (e.key === "Enter" && newName.trim()) { e.preventDefault(); addParticipant(); }
              }}
              style={{
              background: "#f8fafc", padding: "32px", borderRadius: "16px",
              border: "1px solid rgba(212,168,67,0.3)", maxWidth: "400px", width: "90%",
            }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: "#d4a843" }}>Add New Participant</h3>

              <div className="mb-4">
                <div className="text-sm mb-1" style={{ color: "#334155" }}>Participant Name *</div>
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. John Smith"
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
                <button onClick={addParticipant} disabled={!newName.trim()} style={{
                  flex: 1, padding: "12px", backgroundColor: newName.trim() ? "#d4a843" : "#ecdfb6", color: "#0f172a",
                  border: "none", borderRadius: "8px", cursor: newName.trim() ? "pointer" : "not-allowed", fontWeight: "bold",
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
            <div
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditingParticipant(null);
                if (e.key === "Enter" && editName.trim()) { e.preventDefault(); saveEdit(); }
              }}
              style={{
              background: "#f8fafc", padding: "32px", borderRadius: "16px",
              border: "1px solid rgba(212,168,67,0.3)", maxWidth: "400px", width: "90%",
            }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: "#d4a843" }}>Edit Participant</h3>

              <div className="mb-4">
                <div className="text-sm mb-1" style={{ color: "#334155" }}>Participant Name *</div>
                <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. John Smith"
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
                <button onClick={saveEdit} disabled={!editName.trim()} style={{
                  flex: 1, padding: "12px", backgroundColor: editName.trim() ? "#d4a843" : "#ecdfb6", color: "#0f172a",
                  border: "none", borderRadius: "8px", cursor: editName.trim() ? "pointer" : "not-allowed", fontWeight: "bold",
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

