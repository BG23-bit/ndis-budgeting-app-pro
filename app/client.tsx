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

type PlanDates = {
  start: string;
  end: string;
  state: string;
};

type SupportLine = {
  id: string;
  code: string;
  description: string;
  totalFunding: number;
  ratio: string;
  excludedHolidays: string[];
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

const STATES = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "SA", label: "South Australia" },
  { value: "WA", label: "Western Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "NT", label: "Northern Territory" },
  { value: "ACT", label: "Australian Capital Territory" },
];

function getPublicHolidays(year: number, state: string): { date: string; name: string; dayOfWeek: number }[] {
  const holidays: { date: string; name: string; dayOfWeek: number }[] = [];
  function addH(date: string, name: string) {
    const d = new Date(date);
    holidays.push({ date, name, dayOfWeek: d.getDay() });
  }
  addH(year + "-01-01", "New Year's Day");
  addH(year + "-01-26", "Australia Day");
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(year, month - 1, day);
  const goodFriday = new Date(easter); goodFriday.setDate(easter.getDate() - 2);
  addH(formatDate(goodFriday), "Good Friday");
  const easterSat = new Date(easter); easterSat.setDate(easter.getDate() - 1);
  addH(formatDate(easterSat), "Easter Saturday");
  addH(formatDate(easter), "Easter Sunday");
  const easterMon = new Date(easter); easterMon.setDate(easter.getDate() + 1);
  addH(formatDate(easterMon), "Easter Monday");
  addH(year + "-04-25", "ANZAC Day");
  if (state === "ACT") { const mar = new Date(year, 2, 1); const dow = mar.getDay(); addH(formatDate(new Date(year, 2, 1 + ((8 - dow) % 7) + 7)), "Canberra Day"); }
  if (state === "VIC") {
    const jun = new Date(year, 5, 1); const dow = jun.getDay(); addH(formatDate(new Date(year, 5, 1 + ((8 - dow) % 7) + 7)), "Queen's Birthday");
    const nov = new Date(year, 10, 1); const dow2 = nov.getDay(); addH(formatDate(new Date(year, 10, 1 + ((9 - dow2) % 7))), "Melbourne Cup");
  }
  if (state === "NSW" || state === "SA" || state === "TAS" || state === "ACT") {
    const jun = new Date(year, 5, 1); const dow = jun.getDay(); addH(formatDate(new Date(year, 5, 1 + ((8 - dow) % 7) + 7)), "Queen's Birthday");
  }
  if (state === "QLD") { const oct = new Date(year, 9, 1); const dow = oct.getDay(); addH(formatDate(new Date(year, 9, 1 + ((8 - dow) % 7) + 21)), "Queen's Birthday"); }
  if (state === "WA") { const sep = new Date(year, 8, 1); const dow = sep.getDay(); addH(formatDate(new Date(year, 8, 1 + ((8 - dow) % 7) + 21)), "Queen's Birthday"); }
  if (state === "NT") {
    const may = new Date(year, 4, 1); const dow = may.getDay(); addH(formatDate(new Date(year, 4, 1 + ((8 - dow) % 7))), "May Day");
    const jun = new Date(year, 5, 1); const dow2 = jun.getDay(); addH(formatDate(new Date(year, 5, 1 + ((8 - dow2) % 7) + 7)), "Queen's Birthday");
  }
  if (state === "SA") { const oct = new Date(year, 9, 1); const dow = oct.getDay(); addH(formatDate(new Date(year, 9, 1 + ((8 - dow) % 7))), "Labour Day"); }
  if (state === "TAS") { const nov = new Date(year, 10, 1); const dow = nov.getDay(); addH(formatDate(new Date(year, 10, 1 + ((8 - dow) % 7))), "Recreation Day"); }
  addH(year + "-12-25", "Christmas Day");
  addH(year + "-12-26", "Boxing Day");
  return holidays;
}

function formatDate(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function getHolidaysInRange(start: string, end: string, state: string) {
  if (!start || !end) return [];
  const startDate = new Date(start); const endDate = new Date(end);
  const all: { date: string; name: string; dayOfWeek: number }[] = [];
  for (let y = startDate.getFullYear(); y <= endDate.getFullYear(); y++) all.push(...getPublicHolidays(y, state));
  return all.filter((h) => { const d = new Date(h.date); return d >= startDate && d <= endDate; }).sort((a, b) => a.date.localeCompare(b.date));
}

function getDayName(day: number): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day];
}

function getWeeksInPlan(start: string, end: string): number {
  if (!start || !end) return 52;
  const s = new Date(start); const e = new Date(end);
  return Math.max(1, (e.getTime() - s.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

function money(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

function num(x: any): number { const v = Number(x); return Number.isFinite(v) ? v : 0; }
function uid(): string { return Math.random().toString(16).slice(2) + Date.now().toString(16); }

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function Field(props: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (<label className="block"><div className="text-sm mb-1" style={{ color: "#b0a0d0" }}>{props.label}</div>
    <input type="number" step={props.step ?? 1} value={Number.isFinite(props.value) ? props.value : 0}
      onChange={(e) => props.onChange(num(e.target.value))} className="w-full rounded-lg px-3 py-2 outline-none"
      style={{ background: "rgba(26,17,80,0.6)", border: "1px solid rgba(212,168,67,0.2)", color: "white" }} /></label>);
}

function TextField(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (<label className="block"><div className="text-sm mb-1" style={{ color: "#b0a0d0" }}>{props.label}</div>
    <input value={props.value} onChange={(e) => props.onChange(e.target.value)} className="w-full rounded-lg px-3 py-2 outline-none"
      style={{ background: "rgba(26,17,80,0.6)", border: "1px solid rgba(212,168,67,0.2)", color: "white" }} /></label>);
}

function DateField(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (<label className="block"><div className="text-sm mb-1" style={{ color: "#b0a0d0" }}>{props.label}</div>
    <input type="date" value={props.value} onChange={(e) => props.onChange(e.target.value)} className="w-full rounded-lg px-3 py-2 outline-none"
      style={{ background: "rgba(26,17,80,0.6)", border: "1px solid rgba(212,168,67,0.2)", color: "white" }} /></label>);
}

function SelectField(props: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (<label className="block"><div className="text-sm mb-1" style={{ color: "#b0a0d0" }}>{props.label}</div>
    <select value={props.value} onChange={(e) => props.onChange(e.target.value)} className="w-full rounded-lg px-3 py-2 outline-none"
      style={{ background: "rgba(26,17,80,0.6)", border: "1px solid rgba(212,168,67,0.2)", color: "white" }}>
      {props.options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
    </select></label>);
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
  if (line.hrsSun > 0) { const s = (rates.sun - rates.weekdayOrd) / divisor; const h = Math.min(line.hrsSun, Math.ceil(overBy / (s * 52))); suggestions.push("Reduce " + h + " Sunday hr" + (h > 1 ? "s" : "") + "/wk - saves " + money(s * h * 52) + "/yr"); }
  if (line.hrsSat > 0) { const s = (rates.sat - rates.weekdayOrd) / divisor; const h = Math.min(line.hrsSat, Math.ceil(overBy / (s * 52))); suggestions.push("Reduce " + h + " Saturday hr" + (h > 1 ? "s" : "") + "/wk - saves " + money(s * h * 52) + "/yr"); }
  if (line.fixedSleepovers > 0) { suggestions.push("Remove 1 fixed sleepover/wk - saves " + money(rates.fixedSleepoverUnit * 52) + "/yr"); }
  return suggestions.slice(0, 3);
}

function escapeHtml(s: string) { return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

function calcPHImpact(line: SupportLine, holidays: { date: string; name: string; dayOfWeek: number }[], rates: Rates) {
  const divisor = RATIOS[line.ratio]?.divisor || 1;
  let extraCost = 0; let savedCost = 0;
  const details: { name: string; date: string; day: string; impact: number; included: boolean }[] = [];
  for (const h of holidays) {
    const isExcluded = line.excludedHolidays.includes(h.date);
    let normalRate = 0; let normalHrs = 0;
    if (h.dayOfWeek >= 1 && h.dayOfWeek <= 5) { normalRate = rates.weekdayOrd / divisor; normalHrs = line.hrsWeekdayOrd; }
    else if (h.dayOfWeek === 6) { normalRate = rates.sat / divisor; normalHrs = line.hrsSat; }
    else { normalRate = rates.sun / divisor; normalHrs = line.hrsSun; }
    const phRate = rates.publicHoliday / divisor;
    if (!isExcluded) {
      const extra = (phRate - normalRate) * normalHrs;
      extraCost += extra;
      details.push({ name: h.name, date: h.date, day: getDayName(h.dayOfWeek), impact: extra, included: true });
    } else {
      const saved = normalRate * normalHrs;
      savedCost += saved;
      details.push({ name: h.name, date: h.date, day: getDayName(h.dayOfWeek), impact: saved, included: false });
    }
  }
  return { extraCost, savedCost, details };
}

export default function PageClient({ storageKey }: { storageKey?: string }) {
  const STORAGE_KEY = storageKey || "ndis_budget_calc_pro_v6";
  const unlocked = true;
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUserEmail(data.user?.email ?? null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => { setUserEmail(session?.user?.email ?? null); });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const [planDates, setPlanDates] = useState<PlanDates>({
    start: new Date().toISOString().slice(0, 10),
    end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    state: "VIC",
  });

  const [rates, setRates] = useState<Rates>({
    weekdayOrd: 70.23, weekdayNight: 77.38, sat: 98.83, sun: 127.43,
    publicHoliday: 156.03, activeSleepoverHourly: 78.81, fixedSleepoverUnit: 297.6, gstRate: 0,
  });

  const [lines, setLines] = useState<SupportLine[]>([{
    id: uid(), code: "01", description: "Core Supports", totalFunding: 0, ratio: "1:1", excludedHolidays: [],
    hrsWeekdayOrd: 0, hrsWeekdayNight: 0, hrsSat: 0, hrsSun: 0, hrsPublicHoliday: 0,
    activeSleepoverHours: 0, fixedSleepovers: 0,
  }]);

  const planWeeks = useMemo(() => getWeeksInPlan(planDates.start, planDates.end), [planDates.start, planDates.end]);
  const holidays = useMemo(() => getHolidaysInRange(planDates.start, planDates.end, planDates.state), [planDates]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.rates) setRates((r) => ({ ...r, ...parsed.rates }));
      if (parsed?.planDates) setPlanDates((p) => ({ ...p, ...parsed.planDates }));
      if (Array.isArray(parsed?.lines) && parsed.lines.length > 0)
        setLines(parsed.lines.map((l: any) => ({ ...l, ratio: l.ratio || "1:1", excludedHolidays: l.excludedHolidays || [] })));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ rates, lines, planDates })); } catch {}
  }, [rates, lines, planDates]);

  const perLine = useMemo(() => {
    return lines.map((l) => {
      const divisor = RATIOS[l.ratio]?.divisor || 1;
      const weeklyBase =
        l.hrsWeekdayOrd * (rates.weekdayOrd / divisor) +
        l.hrsWeekdayNight * (rates.weekdayNight / divisor) +
        l.hrsSat * (rates.sat / divisor) +
        l.hrsSun * (rates.sun / divisor) +
        l.activeSleepoverHours * (rates.activeSleepoverHourly / divisor) +
        l.fixedSleepovers * rates.fixedSleepoverUnit;
      const weeklyGST = weeklyBase * (rates.gstRate || 0);
      const weeklyTotal = weeklyBase + weeklyGST;
      const basePlanCost = weeklyTotal * planWeeks;
      const phImpact = calcPHImpact(l, holidays, rates);
      const phAdjustment = phImpact.extraCost - phImpact.savedCost;
      const planTotal = basePlanCost + phAdjustment;
      const remaining = l.totalFunding - planTotal;
      return { ...l, weeklyBase, weeklyGST, weeklyTotal, basePlanCost, phImpact, phAdjustment, planTotal, remaining };
    });
  }, [lines, rates, planWeeks, holidays]);

  const totals = useMemo(() => {
    const totalFunding = perLine.reduce((a, l) => a + l.totalFunding, 0);
    const weekly = perLine.reduce((a, l) => a + l.weeklyTotal, 0);
    const planCost = perLine.reduce((a, l) => a + l.planTotal, 0);
    const totalPHAdjust = perLine.reduce((a, l) => a + l.phAdjustment, 0);
    const remaining = totalFunding - planCost;
    return { totalFunding, weekly, planCost, totalPHAdjust, remaining };
  }, [perLine]);

  function updateLine(id: string, patch: Partial<SupportLine>) { setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l))); }

  function toggleHoliday(lineId: string, holidayDate: string) {
    setLines((prev) => prev.map((l) => {
      if (l.id !== lineId) return l;
      const excluded = l.excludedHolidays.includes(holidayDate)
        ? l.excludedHolidays.filter((d) => d !== holidayDate)
        : [...l.excludedHolidays, holidayDate];
      return { ...l, excludedHolidays: excluded };
    }));
  }

  function setAllHolidays(lineId: string, include: boolean) {
    setLines((prev) => prev.map((l) => {
      if (l.id !== lineId) return l;
      return { ...l, excludedHolidays: include ? [] : holidays.map((h) => h.date) };
    }));
  }

  function addLine() { setLines((prev) => [...prev, { id: uid(), code: "NEW", description: "New line", totalFunding: 0, ratio: "1:1", excludedHolidays: [], hrsWeekdayOrd: 0, hrsWeekdayNight: 0, hrsSat: 0, hrsSun: 0, hrsPublicHoliday: 0, activeSleepoverHours: 0, fixedSleepovers: 0 }]); }
  function deleteLine(id: string) { setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id))); }

  function exportCSV() {
    const header = ["Code","Description","Ratio","Excluded PHs","Funding","Weekly","PH Adj","Plan Total","Remaining"];
    const rows = perLine.map((l: any) => [l.code,l.description,l.ratio,l.excludedHolidays.length,l.totalFunding,l.weeklyTotal,l.phAdjustment,l.planTotal,l.remaining]);
    const csv = [header, ...rows].map((r) => r.map((cell) => { const s = String(cell ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\n");
    downloadTextFile("ndis-budget-export-" + new Date().toISOString().slice(0, 10) + ".csv", csv);
  }

  function exportPDF() {
    const dateStr = new Date().toLocaleString("en-AU");
    const rowsHtml = perLine.map((l: any) => {
      const remClass = l.remaining < 0 ? "neg" : "pos";
      return "<tr><td>" + escapeHtml(l.code) + "</td><td>" + escapeHtml(l.description) + "</td><td>" + escapeHtml(l.ratio) + "</td><td>" + (holidays.length - l.excludedHolidays.length) + "/" + holidays.length + "</td><td class='num'>" + escapeHtml(money(l.totalFunding)) + "</td><td class='num'>" + escapeHtml(money(l.weeklyTotal)) + "</td><td class='num'>" + escapeHtml(money(l.phAdjustment)) + "</td><td class='num'>" + escapeHtml(money(l.planTotal)) + "</td><td class='num " + remClass + "'>" + escapeHtml(money(l.remaining)) + "</td></tr>";
    }).join("");
    const holidayRows = holidays.map((h) => "<tr><td>" + escapeHtml(h.date) + "</td><td>" + getDayName(h.dayOfWeek) + "</td><td>" + escapeHtml(h.name) + "</td></tr>").join("");
    const html = "<!doctype html><html><head><meta charset='utf-8'/><title>NDIS Budget Report</title><style>body{font-family:-apple-system,sans-serif;padding:24px;color:#111}h1{margin:0 0 6px;font-size:20px;color:#1a1150}.meta{color:#444;margin-bottom:16px;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}th,td{border:1px solid #ddd;padding:8px}th{background:#1a1150;color:white;text-align:left}.num{text-align:right}.neg{color:#c0392b;font-weight:700}.pos{color:#27ae60;font-weight:700}.kpi{font-size:14px;margin:4px 0}.section{font-size:16px;font-weight:600;margin:20px 0 8px;color:#1a1150}.powered{text-align:center;margin-top:20px;font-size:11px;color:#888}</style></head><body><h1>NDIS Budget Calculator - Report</h1><div class='meta'>Generated: " + escapeHtml(dateStr) + " | Plan: " + escapeHtml(planDates.start) + " to " + escapeHtml(planDates.end) + " | State: " + escapeHtml(planDates.state) + " | " + planWeeks.toFixed(1) + " weeks | Powered by Kevria</div><div class='kpi'><b>Combined funding:</b> " + escapeHtml(money(totals.totalFunding)) + "</div><div class='kpi'><b>Weekly cost:</b> " + escapeHtml(money(totals.weekly)) + "</div><div class='kpi'><b>PH adjustment:</b> " + escapeHtml(money(totals.totalPHAdjust)) + "</div><div class='kpi'><b>Plan cost:</b> " + escapeHtml(money(totals.planCost)) + "</div><div class='kpi'><b>Remaining:</b> " + escapeHtml(money(totals.remaining)) + "</div><div class='section'>Support Lines</div><table><tr><th>Code</th><th>Description</th><th>Ratio</th><th>PHs Included</th><th>Funding</th><th>Weekly</th><th>PH Adj</th><th>Plan Total</th><th>Remaining</th></tr>" + rowsHtml + "</table><div class='section'>Public Holidays (" + holidays.length + ")</div><table><tr><th>Date</th><th>Day</th><th>Holiday</th></tr>" + holidayRows + "</table><div class='powered'>Powered by Kevria - NDIS Budget Calculator</div><script>window.onload=()=>{window.focus();window.print()}</script></body></html>";
    const w = window.open("", "_blank");
    if (!w) { alert("Popup blocked."); return; }
    w.document.open(); w.document.write(html); w.document.close();
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
        <div className="text-sm mb-6" style={{ color: "#6060a0" }}>Powered by <span style={{ color: "#d4a843" }}>Kevria</span></div>

        {/* Plan Dates */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(26,17,80,0.4)", border: "1px solid rgba(212,168,67,0.15)" }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: "#d4a843" }}>Plan Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <DateField label="Plan Start Date" value={planDates.start} onChange={(v) => setPlanDates((p) => ({ ...p, start: v }))} />
            <DateField label="Plan End Date" value={planDates.end} onChange={(v) => setPlanDates((p) => ({ ...p, end: v }))} />
            <SelectField label="State / Territory" value={planDates.state} options={STATES.map((s) => ({ value: s.value, label: s.label }))} onChange={(v) => setPlanDates((p) => ({ ...p, state: v }))} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl p-3" style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)" }}>
              <div className="text-xs" style={{ color: "#b0a0d0" }}>Plan Duration</div>
              <div className="text-lg font-bold" style={{ color: "#d4a843" }}>{planWeeks.toFixed(1)} weeks</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)" }}>
              <div className="text-xs" style={{ color: "#b0a0d0" }}>Public Holidays</div>
              <div className="text-lg font-bold" style={{ color: "#d4a843" }}>{holidays.length} days</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)" }}>
              <div className="text-xs" style={{ color: "#b0a0d0" }}>State</div>
              <div className="text-lg font-bold" style={{ color: "#d4a843" }}>{planDates.state}</div>
            </div>
          </div>
          {holidays.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-semibold mb-2" style={{ color: "#b0a0d0" }}>Public Holidays in Plan Period:</div>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {holidays.map((h, i) => (
                  <div key={i} className="text-sm py-1 px-2 rounded" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <span style={{ color: "#d4a843" }}>{h.date}</span> <span style={{ color: "#8080a0" }}>({getDayName(h.dayOfWeek)})</span> <span style={{ color: "#b0a0d0" }}>{h.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: "linear-gradient(135deg, rgba(26,17,80,0.8), rgba(45,27,105,0.8))", border: "2px solid " + totalStatus.border }}>
          <div className="flex items-center justify-between mb-4">
            <div className="grid gap-2">
              <div>Combined funding: <span className="font-semibold" style={{ color: "#d4a843" }}>{money(totals.totalFunding)}</span></div>
              <div>Weekly cost: <span className="font-semibold">{money(totals.weekly)}</span></div>
              <div>PH adjustment: <span className="font-semibold" style={{ color: totals.totalPHAdjust > 0 ? "#ef4444" : totals.totalPHAdjust < 0 ? "#22c55e" : "#b0a0d0" }}>{totals.totalPHAdjust > 0 ? "+" : ""}{money(totals.totalPHAdjust)}</span></div>
              <div>Plan period cost ({planWeeks.toFixed(1)} wks): <span className="font-semibold">{money(totals.planCost)}</span></div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: totalStatus.bg, color: totalStatus.color, border: "1px solid " + totalStatus.border }}>{totalStatus.label}</div>
            </div>
          </div>
          <div className="text-2xl font-bold" style={{ color: totalStatus.color }}>Remaining: {money(totals.remaining)}</div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1" style={{ color: "#b0a0d0" }}><span>Used: {money(totals.planCost)}</span><span>Budget: {money(totals.totalFunding)}</span></div>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: "8px", height: "12px", overflow: "hidden" }}>
              <div style={{ width: Math.min(100, totals.totalFunding > 0 ? (totals.planCost / totals.totalFunding) * 100 : 0) + "%", height: "100%", borderRadius: "8px", background: totals.planCost > totals.totalFunding ? "linear-gradient(90deg, #ef4444, #dc2626)" : totals.planCost > totals.totalFunding * 0.9 ? "linear-gradient(90deg, #f59e0b, #d97706)" : "linear-gradient(90deg, #22c55e, #16a34a)", transition: "width 0.3s" }} />
            </div>
            <div className="text-xs mt-1 text-right" style={{ color: "#b0a0d0" }}>{totals.totalFunding > 0 ? ((totals.planCost / totals.totalFunding) * 100).toFixed(1) : 0}% used</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={addLine} className="rounded-xl px-4 py-2 font-semibold" style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)", color: "#d4a843" }}>+ Add support line</button>
            <button onClick={exportCSV} className="rounded-xl px-4 py-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#b0b0d0" }}>Export CSV</button>
            <button onClick={exportPDF} className="rounded-xl px-4 py-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#b0b0d0" }}>Export PDF</button>
          </div>
        </div>

        {/* Rates */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(26,17,80,0.4)", border: "1px solid rgba(212,168,67,0.15)" }}>
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

        {/* Lines */}
        <div className="grid gap-6">
          {perLine.map((l: any) => {
            const status = getBudgetStatus(l.remaining, l.totalFunding);
            const suggestions = getSuggestions(l, rates);
            const includedCount = holidays.length - l.excludedHolidays.length;
            return (
              <div key={l.id} className="rounded-2xl p-6" style={{ background: "rgba(26,17,80,0.4)", border: "1px solid " + status.border }}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-semibold">Support line: <span style={{ color: "#d4a843" }}>{l.code}</span> — <span style={{ color: "#b0b0d0" }}>{l.description}</span></div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: status.bg, color: status.color, border: "1px solid " + status.border }}>{status.label}</span>
                  </div>
                  <button onClick={() => deleteLine(l.id)} disabled={lines.length <= 1} className="rounded-xl px-3 py-2 disabled:opacity-40" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>Delete</button>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="rounded-xl p-4" style={{ background: "rgba(15,10,48,0.6)", border: "1px solid rgba(212,168,67,0.1)" }}>
                    <div className="text-sm mb-3 font-semibold" style={{ color: "#d4a843" }}>Line details</div>
                    <div className="grid grid-cols-1 gap-3">
                      <TextField label="Code" value={l.code} onChange={(v) => updateLine(l.id, { code: v })} />
                      <TextField label="Description" value={l.description} onChange={(v) => updateLine(l.id, { description: v })} />
                      <Field label="Total funding (AUD)" value={l.totalFunding} onChange={(v) => updateLine(l.id, { totalFunding: v })} step={100} />
                      <SelectField label="Support Ratio" value={l.ratio} options={Object.entries(RATIOS).map(([k, v]) => ({ value: k, label: v.label }))} onChange={(v) => updateLine(l.id, { ratio: v })} />
                    </div>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: "rgba(15,10,48,0.6)", border: "1px solid rgba(212,168,67,0.1)" }}>
                    <div className="text-sm mb-3 font-semibold" style={{ color: "#d4a843" }}>Hours per week</div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Weekday (Ord) hrs/wk" value={l.hrsWeekdayOrd} onChange={(v) => updateLine(l.id, { hrsWeekdayOrd: v })} step={0.25} />
                      <Field label="Weekday (Night) hrs/wk" value={l.hrsWeekdayNight} onChange={(v) => updateLine(l.id, { hrsWeekdayNight: v })} step={0.25} />
                      <Field label="Saturday hrs/wk" value={l.hrsSat} onChange={(v) => updateLine(l.id, { hrsSat: v })} step={0.25} />
                      <Field label="Sunday hrs/wk" value={l.hrsSun} onChange={(v) => updateLine(l.id, { hrsSun: v })} step={0.25} />
                    </div>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: "rgba(15,10,48,0.6)", border: "1px solid rgba(212,168,67,0.1)" }}>
                    <div className="text-sm mb-3 font-semibold" style={{ color: "#d4a843" }}>Sleepovers & Costs</div>
                    <div className="grid grid-cols-1 gap-3">
                      <Field label="Active sleepover hrs/wk" value={l.activeSleepoverHours} onChange={(v) => updateLine(l.id, { activeSleepoverHours: v })} step={0.25} />
                      <Field label="Fixed sleepovers/wk" value={l.fixedSleepovers} onChange={(v) => updateLine(l.id, { fixedSleepovers: v })} step={1} />
                    </div>
                    <div className="mt-4 text-sm" style={{ color: "#b0a0d0" }}>
                      <div>Weekly total: <span className="font-semibold" style={{ color: "white" }}>{money(l.weeklyTotal)}</span></div>
                      <div>Base plan cost: <span className="font-semibold" style={{ color: "white" }}>{money(l.basePlanCost)}</span></div>
                      <div>PH adjustment: <span className="font-semibold" style={{ color: l.phAdjustment > 0 ? "#ef4444" : l.phAdjustment < 0 ? "#22c55e" : "#b0a0d0" }}>{l.phAdjustment > 0 ? "+" : ""}{money(l.phAdjustment)}</span></div>
                      <div className="mt-1">Plan total: <span className="font-semibold" style={{ color: "white" }}>{money(l.planTotal)}</span></div>
                      <div>Ratio: <span className="font-semibold" style={{ color: "#d4a843" }}>{RATIOS[l.ratio]?.label || l.ratio}</span></div>
                      <div className="text-lg font-bold mt-2" style={{ color: status.color }}>Remaining: {money(l.remaining)}</div>
                    </div>
                  </div>
                </div>

                {/* Individual PH Toggles */}
                {holidays.length > 0 && (
                  <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(15,10,48,0.4)", border: "1px solid rgba(212,168,67,0.1)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold" style={{ color: "#d4a843" }}>
                        Public Holidays ({includedCount}/{holidays.length} included)
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setAllHolidays(l.id, true)} className="text-xs px-3 py-1 rounded-lg" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", cursor: "pointer" }}>Include All</button>
                        <button onClick={() => setAllHolidays(l.id, false)} className="text-xs px-3 py-1 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", cursor: "pointer" }}>Exclude All</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {l.phImpact.details.map((d: any, i: number) => (
                        <div key={i} onClick={() => toggleHoliday(l.id, d.date)}
                          className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg cursor-pointer"
                          style={{
                            background: d.included ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
                            border: "1px solid " + (d.included ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"),
                          }}>
                          <div style={{
                            width: "20px", height: "20px", borderRadius: "4px", flexShrink: 0,
                            background: d.included ? "#22c55e" : "rgba(239,68,68,0.2)",
                            border: "1px solid " + (d.included ? "#22c55e" : "rgba(239,68,68,0.4)"),
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "white", fontSize: "12px",
                          }}>{d.included ? "✓" : ""}</div>
                          <div style={{ flex: 1 }}>
                            <span style={{ color: "#b0a0d0" }}>{d.date}</span>{" "}
                            <span style={{ color: "#8080a0" }}>({d.day})</span>{" "}
                            <span style={{ color: d.included ? "#c0c0e0" : "#808090" }}>{d.name}</span>
                          </div>
                          <div style={{ color: d.included ? "#ef4444" : "#22c55e", fontWeight: "600", fontSize: "0.85rem" }}>
                            {d.included ? "+" + money(d.impact) : "-" + money(d.impact)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-3 text-sm font-bold">
                      <span style={{ color: "#ef4444" }}>Extra cost: +{money(l.phImpact.extraCost)}</span>
                      <span style={{ color: "#22c55e" }}>Savings: -{money(l.phImpact.savedCost)}</span>
                      <span style={{ color: l.phAdjustment > 0 ? "#ef4444" : "#22c55e" }}>Net: {l.phAdjustment > 0 ? "+" : ""}{money(l.phAdjustment)}</span>
                    </div>
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <div className="text-sm font-semibold mb-2" style={{ color: "#f59e0b" }}>Suggestions to get back on track:</div>
                    {suggestions.map((s, i) => (<div key={i} className="text-sm py-1" style={{ color: "#b0a0d0" }}>- {s}</div>))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-xs mt-8" style={{ color: "#505080" }}>Auto-saves in your browser.</div>
        <div className="text-xs mt-2 mb-8" style={{ color: "#6060a0" }}>Powered by <span style={{ color: "#d4a843" }}>Kevria</span></div>
      </div>
    </main>
  );
}

