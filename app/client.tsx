"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Rates = {
  weekdayOrd: number;
  weekdayNight: number;
  sat: number;
  sun: number;
  publicHoliday: number;
  activeSleepoverHourly: number;
  fixedSleepoverUnit: number;
  gstRate: number;
};

type SupportLine = {
  id: string;
  code: string;
  description: string;
  totalFunding: number;
  ratio: string;
  hrsWeekdayOrd: number;
  hrsWeekdayNight: number;
  hrsSat: number;
  hrsSun: number;
  hrsPublicHoliday: number;
  activeSleepoverHours: number;
  fixedSleepovers: number;
};

const RATIOS: { [key: string]: { label: string; divisor: number } } = {
  "1:1": { label: "1:1 (Full rate)", divisor: 1 },
  "1:2": { label: "1:2 (Half rate)", divisor: 2 },
  "1:3": { label: "1:3 (Third rate)", divisor: 3 },
  "1:4": { label: "1:4 (Quarter rate)", divisor: 4 },
};

function money(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

function num(x: any): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function uid(): string {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Field(props: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="text-sm mb-1" style={{ color: "#b0a0d0" }}>{props.label}</div>
      <input
        type="number"
        step={props.step ?? 1}
        value={Number.isFinite(props.value) ? props.value : 0}
        onChange={(e) => props.onChange(num(e.target.value))}
        className="w-full rounded-lg px-3 py-2 outline-none"
        style={{ background: "rgba(26,17,80,0.6)", border: "1px solid rgba(212,168,67,0.2)", color: "white" }}
      />
    </label>
  );
}

function TextField(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-sm mb-1" style={{ color: "#b0a0d0" }}>{props.label}</div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 outline-none"
        style={{ background: "rgba(26,17,80,0.6)", border: "1px solid rgba(212,168,67,0.2)", color: "white" }}
      />
    </label>
  );
}

function SelectField(props: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-sm mb-1" style={{ color: "#b0a0d0" }}>{props.label}</div>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 outline-none"
        style={{ background: "rgba(26,17,80,0.6)", border: "1px solid rgba(212,168,67,0.2)", color: "white" }}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function getBudgetStatus(remaining: number, totalFunding: number) {
  const pct = totalFunding > 0 ? (remaining / totalFunding) * 100 : 0;
  if (remaining < 0) return { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "OVER BUDGET", border: "rgba(239,68,68,0.3)" };
  if (pct < 10) return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "LOW BUDGET", border: "rgba(245,158,11,0.3)" };
  return { color: "#22c55e", bg: "rgba(34,197,94,0.1)", label: "ON TRACK", border: "rgba(34,197,94,0.3)" };
}

function getSuggestions(line: any, rates: Rates) {
  if (line.remaining >= 0) return [];
  const suggestions: string[] = [];
  const overBy = Math.abs(line.remaining);
  const divisor = RATIOS[line.ratio]?.divisor || 1;

  if (line.hrsSun > 0) {
    const savingPerHr = (rates.sun - rates.weekdayOrd) / divisor;
    const hrsNeeded = Math.min(line.hrsSun, Math.ceil(overBy / (savingPerHr * 52)));
    suggestions.push("Reduce " + hrsNeeded + " Sunday hr" + (hrsNeeded > 1 ? "s" : "") + "/wk - saves " + money(savingPerHr * hrsNeeded * 52) + "/yr");
  }
  if (line.hrsSat > 0) {
    const savingPerHr = (rates.sat - rates.weekdayOrd) / divisor;
    const hrsNeeded = Math.min(line.hrsSat, Math.ceil(overBy / (savingPerHr * 52)));
    suggestions.push("Reduce " + hrsNeeded + " Saturday hr" + (hrsNeeded > 1 ? "s" : "") + "/wk - saves " + money(savingPerHr * hrsNeeded * 52) + "/yr");
  }
  if (line.fixedSleepovers > 0) {
    suggestions.push("Remove 1 fixed sleepover/wk - saves " + money(rates.fixedSleepoverUnit * 52) + "/yr");
  }
  if (line.hrsWeekdayNight > 0) {
    const savingPerHr = (rates.weekdayNight - rates.weekdayOrd) / divisor;
    const hrsNeeded = Math.min(line.hrsWeekdayNight, Math.ceil(overBy / (savingPerHr * 52)));
    suggestions.push("Switch " + hrsNeeded + " night hr" + (hrsNeeded > 1 ? "s" : "") + " to weekday - saves " + money(savingPerHr * hrsNeeded * 52) + "/yr");
  }
  return suggestions.slice(0, 3);
}

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export default function PageClient() {
  const STORAGE_KEY = "ndis_budget_calc_pro_v3";
  const unlocked = true;
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUserEmail(data.user?.email ?? null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => { setUserEmail(session?.user?.email ?? null); });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const [rates, setRates] = useState<Rates>({
    weekdayOrd: 70.23, weekdayNight: 77.38, sat: 98.83, sun: 127.43,
    publicHoliday: 156.03, activeSleepoverHourly: 78.81, fixedSleepoverUnit: 297.6, gstRate: 0,
  });

  const [lines, setLines] = useState<SupportLine[]>([{
    id: uid(), code: "01", description: "Core Supports", totalFunding: 200000, ratio: "1:1",
    hrsWeekdayOrd: 8, hrsWeekdayNight: 8, hrsSat: 8, hrsSun: 8, hrsPublicHoliday: 0,
    activeSleepoverHours: 0, fixedSleepovers: 3,
  }]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.rates) setRates((r) => ({ ...r, ...parsed.rates }));
      if (Array.isArray(parsed?.lines) && parsed.lines.length > 0)
        setLines(parsed.lines.map((l: any) => ({ ...l, ratio: l.ratio || "1:1" })));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ rates, lines })); } catch {}
  }, [rates, lines]);

  const perLine = useMemo(() => {
    return lines.map((l) => {
      const divisor = RATIOS[l.ratio]?.divisor || 1;
      const weeklyBase =
        l.hrsWeekdayOrd * (rates.weekdayOrd / divisor) +
        l.hrsWeekdayNight * (rates.weekdayNight / divisor) +
        l.hrsSat * (rates.sat / divisor) +
        l.hrsSun * (rates.sun / divisor) +
        l.hrsPublicHoliday * (rates.publicHoliday / divisor) +
        l.activeSleepoverHours * (rates.activeSleepoverHourly / divisor) +
        l.fixedSleepovers * rates.fixedSleepoverUnit;
      const weeklyGST = weeklyBase * (rates.gstRate || 0);
      const weeklyTotal = weeklyBase + weeklyGST;
      const annualTotal = weeklyTotal * 52;
      const remaining = l.totalFunding - annualTotal;
      return { ...l, weeklyBase, weeklyGST, weeklyTotal, annualTotal, remaining };
    });
  }, [lines, rates]);

  const totals = useMemo(() => {
    const totalFunding = perLine.reduce((a, l) => a + l.totalFunding, 0);
    const weekly = perLine.reduce((a, l) => a + l.weeklyTotal, 0);
    const annual = perLine.reduce((a, l) => a + l.annualTotal, 0);
    const remaining = totalFunding - annual;
    return { totalFunding, weekly, annual, remaining };
  }, [perLine]);

  function updateLine(id: string, patch: Partial<SupportLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, {
      id: uid(), code: "NEW", description: "New line", totalFunding: 0, ratio: "1:1",
      hrsWeekdayOrd: 0, hrsWeekdayNight: 0, hrsSat: 0, hrsSun: 0, hrsPublicHoliday: 0,
      activeSleepoverHours: 0, fixedSleepovers: 0,
    }]);
  }

  function deleteLine(id: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  }

  function exportCSV() {
    const header = ["Code","Description","Ratio","Total Funding","WD Ord hrs","WD Night hrs","Sat hrs","Sun hrs","PH hrs","Active SO hrs","Fixed SO","Weekly Base","Weekly GST","Weekly Total","Annual","Remaining"];
    const rows = perLine.map((l: any) => [l.code,l.description,l.ratio,l.totalFunding,l.hrsWeekdayOrd,l.hrsWeekdayNight,l.hrsSat,l.hrsSun,l.hrsPublicHoliday,l.activeSleepoverHours,l.fixedSleepovers,l.weeklyBase,l.weeklyGST,l.weeklyTotal,l.annualTotal,l.remaining]);
    const csv = [header, ...rows].map((r) => r.map((cell) => { const s = String(cell ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\n");
    downloadTextFile("ndis-budget-export-" + new Date().toISOString().slice(0, 10) + ".csv", csv);
  }

  function exportPDF() {
    const dateStr = new Date().toLocaleString("en-AU");
    const rowsHtml = perLine.map((l: any) => {
      const remClass = l.remaining < 0 ? "neg" : "pos";
      return "<tr><td>" + escapeHtml(l.code) + "</td><td>" + escapeHtml(l.description) + "</td><td>" + escapeHtml(l.ratio) + "</td><td class='num'>" + escapeHtml(money(l.totalFunding)) + "</td><td class='num'>" + escapeHtml(money(l.weeklyTotal)) + "</td><td class='num'>" + escapeHtml(money(l.annualTotal)) + "</td><td class='num " + remClass + "'>" + escapeHtml(money(l.remaining)) + "</td></tr>";
    }).join("");

    const html = "<!doctype html><html><head><meta charset='utf-8'/><title>NDIS Budget Report</title><style>body{font-family:-apple-system,sans-serif;padding:24px;color:#111}h1{margin:0 0 6px;font-size:20px;color:#1a1150}.meta{color:#444;margin-bottom:16px;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}th,td{border:1px solid #ddd;padding:8px;vertical-align:top}th{background:#1a1150;color:white;font-weight:600;text-align:left}.num{text-align:right;font-variant-numeric:tabular-nums}.neg{color:#c0392b;font-weight:700}.pos{color:#27ae60;font-weight:700}.kpi{font-size:14px;margin:4px 0}.powered{text-align:center;margin-top:20px;font-size:11px;color:#888}</style></head><body><h1>NDIS Budget Calculator - Report</h1><div class='meta'>Generated: " + escapeHtml(dateStr) + " | Powered by Kevria</div><div class='kpi'><b>Combined funding:</b> " + escapeHtml(money(totals.totalFunding)) + "</div><div class='kpi'><b>Weekly cost:</b> " + escapeHtml(money(totals.weekly)) + "</div><div class='kpi'><b>Annual cost:</b> " + escapeHtml(money(totals.annual)) + "</div><div class='kpi'><b>Remaining:</b> " + escapeHtml(money(totals.remaining)) + "</div><table><tr><th>Code</th><th>Description</th><th>Ratio</th><th>Funding</th><th>Weekly</th><th>Annual</th><th>Remaining</th></tr>" + rowsHtml + "</table><div class='powered'>Powered by Kevria - NDIS Budget Calculator</div><script>window.onload=()=>{window.focus();window.print()}</script></body></html>";

    const w = window.open("", "_blank");
    if (!w) { alert("Popup blocked."); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }
  const totalStatus = getBudgetStatus(totals.remaining, totals.totalFunding);

  return (
    <main className="min-h-screen" style={{ background: "#0f0a30", color: "white" }}>
      <div className="mx-auto max-w-6xl p-6">

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "1.5rem", color: "#d4a843" }}>✦</span>
            <h1 className="text-3xl font-bold">NDIS Budget Calculator</h1>
          </div>
          {userEmail && <span className="text-sm" style={{ color: "#8080a0" }}>{userEmail}</span>}
        </div>

        <div className="text-sm mb-6" style={{ color: "#6060a0" }}>
          Powered by <span style={{ color: "#d4a843" }}>Kevria</span>
        </div>

        <div className="rounded-2xl p-6 mb-6" style={{
          background: "linear-gradient(135deg, rgba(26,17,80,0.8), rgba(45,27,105,0.8))",
          border: "2px solid " + totalStatus.border,
        }}>
          <div className="flex items-center justify-between mb-4">
            <div className="grid gap-2">
              <div>Combined funding: <span className="font-semibold" style={{ color: "#d4a843" }}>{money(totals.totalFunding)}</span></div>
              <div>Weekly cost: <span className="font-semibold">{money(totals.weekly)}</span></div>
              <div>Projected annual cost: <span className="font-semibold">{money(totals.annual)}</span></div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold px-3 py-1 rounded-full" style={{
                background: totalStatus.bg, color: totalStatus.color, border: "1px solid " + totalStatus.border,
              }}>{totalStatus.label}</div>
            </div>
          </div>

          <div className="text-2xl font-bold" style={{ color: totalStatus.color }}>
            Remaining: {money(totals.remaining)}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={addLine} className="rounded-xl px-4 py-2 font-semibold" style={{
              background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)", color: "#d4a843",
            }}>+ Add support line</button>
            <button onClick={exportCSV} className="rounded-xl px-4 py-2" style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#b0b0d0",
            }}>Export CSV</button>
            <button onClick={exportPDF} className="rounded-xl px-4 py-2" style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#b0b0d0",
            }}>Export PDF</button>
          </div>

          <div className="text-sm mt-3" style={{ color: "#6060a0" }}>
            Active sleepover = hourly (hours/week). Fixed sleepover = flat per unit (count/week). GST applies to the whole weekly base.
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-6" style={{
          background: "rgba(26,17,80,0.4)", border: "1px solid rgba(212,168,67,0.15)",
        }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: "#d4a843" }}>Rates</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Weekday (Ord) $/hr" value={rates.weekdayOrd} onChange={(v) => setRates((r) => ({ ...r, weekdayOrd: v }))} step={0.01} />
            <Field label="Weekday (Night) $/hr" value={rates.weekdayNight} onChange={(v) => setRates((r) => ({ ...r, weekdayNight: v }))} step={0.01} />
            <Field label="Saturday $/hr" value={rates.sat} onChange={(v) => setRates((r) => ({ ...r, sat: v }))} step={0.01} />
            <Field label="Sunday $/hr" value={rates.sun} onChange={(v) => setRates((r) => ({ ...r, sun: v }))} step={0.01} />
            <Field label="Public Holiday $/hr" value={rates.publicHoliday} onChange={(v) => setRates((r) => ({ ...r, publicHoliday: v }))} step={0.01} />
            <Field label="Active sleepover $/hr" value={rates.activeSleepoverHourly} onChange={(v) => setRates((r) => ({ ...r, activeSleepoverHourly: v }))} step={0.01} />
            <Field label="Fixed sleepover $ (flat)" value={rates.fixedSleepoverUnit} onChange={(v) => setRates((r) => ({ ...r, fixedSleepoverUnit: v }))} step={0.01} />
            <Field label="GST rate (0 or 0.1)" value={rates.gstRate} onChange={(v) => setRates((r) => ({ ...r, gstRate: v }))} step={0.01} />
          </div>
        </div>

        <div className="grid gap-6">
          {perLine.map((l: any) => {
            const status = getBudgetStatus(l.remaining, l.totalFunding);
            const suggestions = getSuggestions(l, rates);
            return (
              <div key={l.id} className="rounded-2xl p-6" style={{
                background: "rgba(26,17,80,0.4)", border: "1px solid " + status.border,
              }}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-semibold">
                      Support line: <span style={{ color: "#d4a843" }}>{l.code}</span> — <span style={{ color: "#b0b0d0" }}>{l.description}</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{
                      background: status.bg, color: status.color, border: "1px solid " + status.border,
                    }}>{status.label}</span>
                  </div>
                  <button onClick={() => deleteLine(l.id)} disabled={lines.length <= 1}
                    className="rounded-xl px-3 py-2 disabled:opacity-40" style={{
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444",
                    }}>Delete</button>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="rounded-xl p-4" style={{ background: "rgba(15,10,48,0.6)", border: "1px solid rgba(212,168,67,0.1)" }}>
                    <div className="text-sm mb-3 font-semibold" style={{ color: "#d4a843" }}>Line details</div>
                    <div className="grid grid-cols-1 gap-3">
                      <TextField label="Code" value={l.code} onChange={(v) => updateLine(l.id, { code: v })} />
                      <TextField label="Description" value={l.description} onChange={(v) => updateLine(l.id, { description: v })} />
                      <Field label="Total funding (AUD)" value={l.totalFunding} onChange={(v) => updateLine(l.id, { totalFunding: v })} step={100} />
                      <SelectField label="Support Ratio" value={l.ratio}
                        options={Object.entries(RATIOS).map(([k, v]) => ({ value: k, label: v.label }))}
                        onChange={(v) => updateLine(l.id, { ratio: v })} />
                    </div>
                  </div>

                  <div className="rounded-xl p-4" style={{ background: "rgba(15,10,48,0.6)", border: "1px solid rgba(212,168,67,0.1)" }}>
                    <div className="text-sm mb-3 font-semibold" style={{ color: "#d4a843" }}>Hours per week</div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Weekday (Ord) hrs/wk" value={l.hrsWeekdayOrd} onChange={(v) => updateLine(l.id, { hrsWeekdayOrd: v })} step={0.25} />
                      <Field label="Weekday (Night) hrs/wk" value={l.hrsWeekdayNight} onChange={(v) => updateLine(l.id, { hrsWeekdayNight: v })} step={0.25} />
                      <Field label="Saturday hrs/wk" value={l.hrsSat} onChange={(v) => updateLine(l.id, { hrsSat: v })} step={0.25} />
                      <Field label="Sunday hrs/wk" value={l.hrsSun} onChange={(v) => updateLine(l.id, { hrsSun: v })} step={0.25} />
                      <Field label="Public Holiday hrs/wk" value={l.hrsPublicHoliday} onChange={(v) => updateLine(l.id, { hrsPublicHoliday: v })} step={0.25} />
                    </div>
                  </div>

                  <div className="rounded-xl p-4" style={{ background: "rgba(15,10,48,0.6)", border: "1px solid rgba(212,168,67,0.1)" }}>
                    <div className="text-sm mb-3 font-semibold" style={{ color: "#d4a843" }}>Sleepovers per week</div>
                    <div className="grid grid-cols-1 gap-3">
                      <Field label="Active sleepover hrs/wk" value={l.activeSleepoverHours} onChange={(v) => updateLine(l.id, { activeSleepoverHours: v })} step={0.25} />
                      <Field label="Fixed sleepovers/wk (units)" value={l.fixedSleepovers} onChange={(v) => updateLine(l.id, { fixedSleepovers: v })} step={1} />
                    </div>
                    <div className="mt-4 text-sm" style={{ color: "#b0a0d0" }}>
                      <div>Weekly base: <span className="font-semibold" style={{ color: "white" }}>{money(l.weeklyBase)}</span></div>
                      <div>Weekly GST: <span className="font-semibold" style={{ color: "white" }}>{money(l.weeklyGST)}</span></div>
                      <div>Weekly total: <span className="font-semibold" style={{ color: "white" }}>{money(l.weeklyTotal)}</span></div>
                      <div className="mt-2">Annual total: <span className="font-semibold" style={{ color: "white" }}>{money(l.annualTotal)}</span></div>
                      <div className="mt-1">Ratio: <span className="font-semibold" style={{ color: "#d4a843" }}>{RATIOS[l.ratio]?.label || l.ratio}</span></div>
                      <div className="text-lg font-bold mt-2" style={{ color: status.color }}>Remaining: {money(l.remaining)}</div>
                    </div>
                  </div>
                </div>

                {suggestions.length > 0 && (
                  <div className="mt-4 rounded-xl p-4" style={{
                    background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)",
                  }}>
                    <div className="text-sm font-semibold mb-2" style={{ color: "#f59e0b" }}>Suggestions to get back on track:</div>
                    {suggestions.map((s, i) => (
                      <div key={i} className="text-sm py-1" style={{ color: "#b0a0d0" }}>- {s}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-xs mt-8" style={{ color: "#505080" }}>
          Auto-saves in your browser. Export PDF opens your print dialog.
        </div>
        <div className="text-xs mt-2 mb-8" style={{ color: "#6060a0" }}>
          Powered by <span style={{ color: "#d4a843" }}>Kevria</span>
        </div>
      </div>
    </main>
  );
}

