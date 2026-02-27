"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Client from "../client";

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

function getBudgetStatusFromStorage(participantId: string) {
  try {
    const raw = localStorage.getItem("ndis_participant_" + participantId);
    if (!raw) return { totalFunding: 0, planCost: 0, remaining: 0, status: "empty" };
    const parsed = JSON.parse(raw);
    const lines = parsed?.lines || [];
    const rates = parsed?.rates || {};
    const planDates = parsed?.planDates || {};

    const start = planDates.start ? new Date(planDates.start) : new Date();
    const end = planDates.end ? new Date(planDates.end) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const planWeeks = Math.max(1, (end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));

    const RATIOS: { [key: string]: number } = { "1:1": 1, "1:2": 2, "1:3": 3, "1:4": 4 };

    let totalFunding = 0;
    let totalPlanCost = 0;

    for (const l of lines) {
      totalFunding += l.totalFunding || 0;
      const divisor = RATIOS[l.ratio] || 1;
      const weeklyBase =
        (l.hrsWeekdayOrd || 0) * ((rates.weekdayOrd || 70.23) / divisor) +
        (l.hrsWeekdayNight || 0) * ((rates.weekdayNight || 77.38) / divisor) +
        (l.hrsSat || 0) * ((rates.sat || 98.83) / divisor) +
        (l.hrsSun || 0) * ((rates.sun || 127.43) / divisor) +
        (l.activeSleepoverHours || 0) * ((rates.activeSleepoverHourly || 78.81) / divisor) +
        (l.fixedSleepovers || 0) * (rates.fixedSleepoverUnit || 297.6);
      const weeklyGST = weeklyBase * (rates.gstRate || 0);
      const weeklyTotal = weeklyBase + weeklyGST;
      totalPlanCost += weeklyTotal * planWeeks;
    }

    const remaining = totalFunding - totalPlanCost;
    const pct = totalFunding > 0 ? (remaining / totalFunding) * 100 : 0;
    let status = "on_track";
    if (remaining < 0) status = "over";
    else if (pct < 10) status = "low";

    return { totalFunding, planCost: totalPlanCost, remaining, status };
  } catch {
    return { totalFunding: 0, planCost: 0, remaining: 0, status: "empty" };
  }
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeParticipant, setActiveParticipant] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNdis, setNewNdis] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setUser(session.user);
      const { data: profile } = await supabase.from("profiles").select("paid").eq("id", session.user.id).single();
      if (profile?.paid) setPaid(true);
      setLoading(false);
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    async function load() {
      try {
        const { data: d } = await supabase.auth.getUser();
        if (d.user) {
          const { data: row } = await supabase.from("participant_lists").select("participants").eq("user_id", d.user.id).single();
          if (row?.participants && Array.isArray(row.participants) && row.participants.length > 0) {
            setParticipants(row.participants);
            return;
          }
        }
        const raw = localStorage.getItem("ndis_participants_list");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) setParticipants(parsed);
        }
      } catch {
        const raw = localStorage.getItem("ndis_participants_list");
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) setParticipants(parsed);
          } catch {}
        }
      }
    }
    load();
  }, []);

  useEffect(() => {
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

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, email: user.email }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert("Error starting checkout.");
    setCheckoutLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
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
    if (!confirm("Delete this participant and all their data?")) return;
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    try { localStorage.removeItem("ndis_participant_" + id); } catch {}
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0a30", color: "white" }}>
        Loading...
      </div>
    );
  }

  if (!paid) {
    return (
      <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
        <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none", opacity: 0.6 }}>
          <Client storageKey="ndis_preview" />
        </div>
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.7)", zIndex: 50,
        }}>
          <div style={{
            background: "#1e293b", padding: "40px", borderRadius: "16px",
            textAlign: "center", maxWidth: "450px", width: "90%", border: "1px solid #334155",
          }}>
            <h2 style={{ fontSize: "1.8rem", color: "white", marginBottom: "10px" }}>Unlock NDIS Budget Calculator</h2>
            <p style={{ color: "#94a3b8", marginBottom: "8px" }}>Get lifetime access to the full NDIS Budget Calculator.</p>
            <p style={{ color: "#94a3b8", marginBottom: "8px", fontSize: "0.9rem" }}>Unlimited support lines</p>
            <p style={{ color: "#94a3b8", marginBottom: "8px", fontSize: "0.9rem" }}>Export to CSV and PDF</p>
            <p style={{ color: "#94a3b8", marginBottom: "8px", fontSize: "0.9rem" }}>Auto public holiday calculations</p>
            <p style={{ color: "#94a3b8", marginBottom: "20px", fontSize: "0.9rem" }}>Multiple participants</p>
            <p style={{ fontSize: "2rem", color: "#d4a843", fontWeight: "bold", marginBottom: "20px" }}>$9.99 AUD</p>
            <button onClick={handleCheckout} disabled={checkoutLoading} style={{
              padding: "15px 40px", fontSize: "1.2rem", backgroundColor: "#d4a843", color: "#1a1150",
              border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", width: "100%",
            }}>{checkoutLoading ? "Redirecting..." : "Pay $9.99 - Unlock Now"}</button>
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
          background: "#0f0a30", padding: "12px 24px", borderBottom: "1px solid rgba(212,168,67,0.15)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={() => setActiveParticipant(null)} style={{
            background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)",
            color: "#d4a843", padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600",
          }}>Back to All Participants</button>
          <div style={{ color: "#b0a0d0", fontSize: "0.9rem" }}>
            {p?.name} {p?.ndisNumber ? "(" + p.ndisNumber + ")" : ""}
          </div>
        </div>
        <Client storageKey={"ndis_participant_" + activeParticipant} />
      </div>
    );
  }
  // Overview - all participants
  return (
    <main className="min-h-screen" style={{ background: "#0f0a30", color: "white" }}>
      <div className="mx-auto max-w-6xl p-6">

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "1.5rem", color: "#d4a843" }}>✦</span>
            <h1 className="text-3xl font-bold">NDIS Budget Calculator</h1>
          </div>
          <div className="flex items-center gap-3">
            {user?.email && <span className="text-sm" style={{ color: "#8080a0" }}>{user.email}</span>}
            <button onClick={handleLogout} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#b0b0d0", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem",
            }}>Log out</button>
          </div>
        </div>

        <div className="text-sm mb-8" style={{ color: "#6060a0" }}>
          Powered by <span style={{ color: "#d4a843" }}>Kevria</span> — Participant Overview
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <div className="rounded-2xl p-5" style={{ background: "rgba(26,17,80,0.4)", border: "1px solid rgba(212,168,67,0.15)" }}>
            <div className="text-sm" style={{ color: "#b0a0d0" }}>Total Participants</div>
            <div className="text-3xl font-bold" style={{ color: "#d4a843" }}>{participants.length}</div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: "rgba(26,17,80,0.4)", border: "1px solid rgba(212,168,67,0.15)" }}>
            <div className="text-sm" style={{ color: "#b0a0d0" }}>Total Funding</div>
            <div className="text-3xl font-bold" style={{ color: "#d4a843" }}>
              {money(participants.reduce((a, p) => a + getBudgetStatusFromStorage(p.id).totalFunding, 0))}
            </div>
          </div>
          <div className="rounded-2xl p-5" style={{ background: "rgba(26,17,80,0.4)", border: "1px solid rgba(212,168,67,0.15)" }}>
            <div className="text-sm" style={{ color: "#b0a0d0" }}>Total Remaining</div>
            <div className="text-3xl font-bold" style={{
              color: participants.reduce((a, p) => a + getBudgetStatusFromStorage(p.id).remaining, 0) < 0 ? "#ef4444" : "#22c55e"
            }}>
              {money(participants.reduce((a, p) => a + getBudgetStatusFromStorage(p.id).remaining, 0))}
            </div>
          </div>
        </div>

        {/* Participant Cards */}
        {participants.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: "rgba(26,17,80,0.4)", border: "1px solid rgba(212,168,67,0.15)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "15px" }}>👤</div>
            <h2 className="text-xl font-semibold mb-2">No Participants Yet</h2>
            <p className="mb-6" style={{ color: "#b0a0d0" }}>Add your first NDIS participant to get started.</p>
            <button onClick={() => setShowAddForm(true)} style={{
              background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)",
              color: "#d4a843", padding: "12px 32px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "1rem",
            }}>+ Add First Participant</button>
          </div>
        ) : (
          <div className="grid gap-4">
            {participants.map((p) => {
              const budget = getBudgetStatusFromStorage(p.id);
              const statusColors = budget.status === "over"
                ? { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "OVER BUDGET", border: "rgba(239,68,68,0.3)" }
                : budget.status === "low"
                ? { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "LOW BUDGET", border: "rgba(245,158,11,0.3)" }
                : budget.status === "empty"
                ? { color: "#8080a0", bg: "rgba(128,128,160,0.1)", label: "NOT SET UP", border: "rgba(128,128,160,0.3)" }
                : { color: "#22c55e", bg: "rgba(34,197,94,0.1)", label: "ON TRACK", border: "rgba(34,197,94,0.3)" };

              return (
                <div key={p.id} className="rounded-2xl p-5" style={{
                  background: "rgba(26,17,80,0.4)", border: "1px solid " + statusColors.border,
                  cursor: "pointer", transition: "all 0.2s",
                }}
                  onClick={() => setActiveParticipant(p.id)}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(26,17,80,0.6)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(26,17,80,0.4)"; }}
                >
                  <div className="flex items-center justify-between">
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
                        {p.ndisNumber && <div className="text-sm" style={{ color: "#8080a0" }}>NDIS: {p.ndisNumber}</div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right" style={{ minWidth: "120px" }}>
                        <div className="text-sm" style={{ color: "#b0a0d0" }}>Funding</div>
                        <div className="font-semibold" style={{ color: "#d4a843" }}>{money(budget.totalFunding)}</div>
                      </div>
                      <div className="text-right" style={{ minWidth: "120px" }}>
                        <div className="text-sm" style={{ color: "#b0a0d0" }}>Remaining</div>
                        <div className="font-semibold" style={{ color: statusColors.color }}>{money(budget.remaining)}</div>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{
                        background: statusColors.bg, color: statusColors.color, border: "1px solid " + statusColors.border,
                      }}>{statusColors.label}</span>
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
                      <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
                        <div style={{
                          width: Math.min(100, budget.totalFunding > 0 ? (budget.planCost / budget.totalFunding) * 100 : 0) + "%",
                          height: "100%", borderRadius: "6px",
                          background: budget.status === "over" ? "#ef4444" : budget.status === "low" ? "#f59e0b" : "#22c55e",
                        }} />
                      </div>
                      <div className="text-xs mt-1 text-right" style={{ color: "#8080a0" }}>
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
          </div>
        )}

        {/* Add Participant Modal */}
        {showAddForm && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          }}>
            <div style={{
              background: "#1a1150", padding: "32px", borderRadius: "16px",
              border: "1px solid rgba(212,168,67,0.3)", maxWidth: "400px", width: "90%",
            }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: "#d4a843" }}>Add New Participant</h3>

              <div className="mb-4">
                <div className="text-sm mb-1" style={{ color: "#b0a0d0" }}>Participant Name *</div>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. John Smith"
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: "rgba(15,10,48,0.6)", border: "1px solid rgba(212,168,67,0.2)", color: "white" }}
                />
              </div>

              <div className="mb-6">
                <div className="text-sm mb-1" style={{ color: "#b0a0d0" }}>NDIS Number (optional)</div>
                <input value={newNdis} onChange={(e) => setNewNdis(e.target.value)} placeholder="e.g. 431234567"
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{ background: "rgba(15,10,48,0.6)", border: "1px solid rgba(212,168,67,0.2)", color: "white" }}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={addParticipant} style={{
                  flex: 1, padding: "12px", backgroundColor: "#d4a843", color: "#1a1150",
                  border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold",
                }}>Add Participant</button>
                <button onClick={() => { setShowAddForm(false); setNewName(""); setNewNdis(""); }} style={{
                  flex: 1, padding: "12px", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)", color: "#b0b0d0", borderRadius: "8px", cursor: "pointer",
                }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs mt-8" style={{ color: "#505080" }}>
          Auto-saves in your browser.
        </div>
        <div className="text-xs mt-2 mb-8" style={{ color: "#6060a0" }}>
          Powered by <span style={{ color: "#d4a843" }}>Kevria</span>
        </div>
      </div>
    </main>
  );
}

