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

  hrsWeekdayOrd: number;
  hrsWeekdayNight: number;
  hrsSat: number;
  hrsSun: number;
  hrsPublicHoliday: number;

  activeSleepoverHours: number;
  fixedSleepovers: number;
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

function Field(props: {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="text-sm text-slate-300 mb-1">{props.label}</div>
      <input
        type="number"
        step={props.step ?? 1}
        value={Number.isFinite(props.value) ? props.value : 0}
        onChange={(e) => props.onChange(num(e.target.value))}
        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
      />
    </label>
  );
}

function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="text-sm text-slate-300 mb-1">{props.label}</div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
      />
    </label>
  );
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function PageClient() {
  const STORAGE_KEY = "ndis_budget_calc_v2";

  const unlocked = true;

  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const [rates, setRates] = useState<Rates>({
    weekdayOrd: 70.23,
    weekdayNight: 77.38,
    sat: 98.83,
    sun: 127.43,
    publicHoliday: 156.03,
    activeSleepoverHourly: 78.81,
    fixedSleepoverUnit: 297.6,
    gstRate: 0,
  });

  const [lines, setLines] = useState<SupportLine[]>([
    {
      id: uid(),
      code: "01",
      description: "Core Supports",
      totalFunding: 200000,
      hrsWeekdayOrd: 8,
      hrsWeekdayNight: 8,
      hrsSat: 8,
      hrsSun: 8,
      hrsPublicHoliday: 0,
      activeSleepoverHours: 0,
      fixedSleepovers: 3,
    },
  ]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.rates) setRates((r) => ({ ...r, ...parsed.rates }));
      if (Array.isArray(parsed?.lines) && parsed.lines.length > 0)
        setLines(parsed.lines);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rates, lines }));
    } catch {
      // ignore
    }
  }, [rates, lines]);

  const perLine = useMemo(() => {
    return lines.map((l) => {
      const weeklyBase =
        l.hrsWeekdayOrd * rates.weekdayOrd +
        l.hrsWeekdayNight * rates.weekdayNight +
        l.hrsSat * rates.sat +
        l.hrsSun * rates.sun +
        l.hrsPublicHoliday * rates.publicHoliday +
        l.activeSleepoverHours * rates.activeSleepoverHourly +
        l.fixedSleepovers * rates.fixedSleepoverUnit;

      const weeklyGST = weeklyBase * (rates.gstRate || 0);
      const weeklyTotal = weeklyBase + weeklyGST;

      const annualTotal = weeklyTotal * 52;
      const remaining = l.totalFunding - annualTotal;

      return {
        ...l,
        weeklyBase,
        weeklyGST,
        weeklyTotal,
        annualTotal,
        remaining,
      };
    });
  }, [lines, rates]);

  const totals = useMemo(() => {
    const totalFunding = perLine.reduce((a, l) => a + l.totalFunding, 0);
    const weekly = perLine.reduce((a, l: any) => a + l.weeklyTotal, 0);
    const annual = perLine.reduce((a, l: any) => a + l.annualTotal, 0);
    const remaining = totalFunding - annual;
    return { totalFunding, weekly, annual, remaining };
  }, [perLine]);

  function updateLine(id: string, patch: Partial<SupportLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLine() {
    if (!unlocked) return;
    setLines((prev) => [
      ...prev,
      {
        id: uid(),
        code: "NEW",
        description: "New line",
        totalFunding: 0,
        hrsWeekdayOrd: 0,
        hrsWeekdayNight: 0,
        hrsSat: 0,
        hrsSun: 0,
        hrsPublicHoliday: 0,
        activeSleepoverHours: 0,
        fixedSleepovers: 0,
      },
    ]);
  }

  function deleteLine(id: string) {
    if (!unlocked) return;
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  }

  function exportCSV() {
    if (!unlocked) return;

    const header = [
      "Code",
      "Description",
      "Total Funding (AUD)",
      "Weekday Ord hrs/wk",
      "Weekday Night hrs/wk",
      "Sat hrs/wk",
      "Sun hrs/wk",
      "Public Holiday hrs/wk",
      "Active sleepover hours/wk",
      "Fixed sleepovers (units)/wk",
      "Weekly base (ex GST)",
      "Weekly GST",
      "Weekly total (inc GST)",
      "Annual total",
      "Remaining",
    ];

    const rows = perLine.map((l: any) => [
      l.code,
      l.description,
      l.totalFunding,
      l.hrsWeekdayOrd,
      l.hrsWeekdayNight,
      l.hrsSat,
      l.hrsSun,
      l.hrsPublicHoliday,
      l.activeSleepoverHours,
      l.fixedSleepovers,
      l.weeklyBase,
      l.weeklyGST,
      l.weeklyTotal,
      l.annualTotal,
      l.remaining,
    ]);

    const csv = [header, ...rows]
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");

    downloadTextFile(`ndis-budget-export-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  function exportPDF() {
    if (!unlocked) return;

    const dateStr = new Date().toLocaleString("en-AU");

    const ratesRow = `
      <tr>
        <td class="num">${rates.weekdayOrd}</td>
        <td class="num">${rates.weekdayNight}</td>
        <td class="num">${rates.sat}</td>
        <td class="num">${rates.sun}</td>
        <td class="num">${rates.publicHoliday}</td>
        <td class="num">${rates.activeSleepoverHourly}</td>
        <td class="num">${rates.fixedSleepoverUnit}</td>
        <td class="num">${rates.gstRate}</td>
      </tr>
    `;

    const rowsHtml = perLine
      .map((l: any) => {
        const remClass = l.remaining < 0 ? "neg" : "pos";
        return `
          <tr>
            <td>${escapeHtml(l.code)}</td>
            <td>${escapeHtml(l.description)}</td>
            <td class="num">${escapeHtml(money(l.totalFunding))}</td>
            <td class="num">${l.hrsWeekdayOrd}</td>
            <td class="num">${l.hrsWeekdayNight}</td>
            <td class="num">${l.hrsSat}</td>
            <td class="num">${l.hrsSun}</td>
            <td class="num">${l.hrsPublicHoliday}</td>
            <td class="num">${l.activeSleepoverHours}</td>
            <td class="num">${l.fixedSleepovers}</td>
            <td class="num">${escapeHtml(money(l.weeklyTotal))}</td>
            <td class="num">${escapeHtml(money(l.annualTotal))}</td>
            <td class="num ${remClass}">${escapeHtml(money(l.remaining))}</td>
          </tr>
        `;
      })
      .join("");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>NDIS Budget Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; color:#111; }
    h1 { margin: 0 0 6px 0; font-size: 20px; }
    .meta { color: #444; margin-bottom: 16px; font-size: 12px; }
    .kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 14px 0 18px 0; }
    .kpi { font-size: 13px; }
    .kpi b { display: inline-block; min-width: 170px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #ddd; padding: 6px; vertical-align: top; }
    th { background: #f4f4f4; font-weight: 600; text-align: left; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .neg { color: #c0392b; font-weight: 700; }
    .pos { color: #27ae60; font-weight: 700; }
    .sectionTitle { font-size: 14px; font-weight: 600; margin: 18px 0 6px 0; }
  </style>
</head>
<body>
  <h1>NDIS Budget Calculator – Report</h1>
  <div class="meta">Generated: ${escapeHtml(dateStr)}</div>

  <div class="kpis">
    <div class="kpi"><b>Combined funding:</b> ${escapeHtml(money(totals.totalFunding))}</div>
    <div class="kpi"><b>Weekly cost:</b> ${escapeHtml(money(totals.weekly))}</div>
    <div class="kpi"><b>Projected annual cost:</b> ${escapeHtml(money(totals.annual))}</div>
    <div class="kpi"><b>Remaining:</b> ${escapeHtml(money(totals.remaining))}</div>
  </div>

  <div class="sectionTitle">Rates</div>
  <table>
    <tr>
      <th>Weekday Ord</th><th>Weekday Night</th><th>Sat</th><th>Sun</th><th>Public Holiday</th>
      <th>Active SO ($/hr)</th><th>Fixed SO (flat)</th><th>GST</th>
    </tr>
    ${ratesRow}
  </table>

  <div class="sectionTitle">Support lines</div>
  <table>
    <tr>
      <th>Code</th>
      <th>Description</th>
      <th>Total Funding</th>
      <th>WD Ord hrs/wk</th>
      <th>WD Night hrs/wk</th>
      <th>Sat hrs/wk</th>
      <th>Sun hrs/wk</th>
      <th>PH hrs/wk</th>
      <th>Active SO hrs/wk</th>
      <th>Fixed SO count/wk</th>
      <th>Weekly (inc GST)</th>
      <th>Annual</th>
      <th>Remaining</th>
    </tr>
    ${rowsHtml}
  </table>

  <script>
    window.onload = () => { window.focus(); window.print(); };
  </script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup blocked. Allow popups for this site and try again.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-3xl font-bold mb-2">NDIS Budget Calculator</h1>

        <div className="text-sm text-slate-400 mb-6">
          NDIS Budget Calculator Pro
        </div>

        {/* Top summary */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900/40 p-6 mb-6">
          <div className="grid gap-2">
            <div>
              Combined funding: <span className="font-semibold">{money(totals.totalFunding)}</span>
            </div>
            <div>
              Weekly cost: <span className="font-semibold">{money(totals.weekly)}</span>
            </div>
            <div>
              Projected annual cost: <span className="font-semibold">{money(totals.annual)}</span>
            </div>
            <div className="text-xl font-bold mt-2">Remaining: {money(totals.remaining)}</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={addLine}
              className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 hover:border-slate-400"
            >
              + Add support line
            </button>

            <button
              onClick={exportCSV}
              className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 hover:border-slate-400"
            >
              Export CSV
            </button>

            <button
              onClick={exportPDF}
              className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 hover:border-slate-400"
            >
              Export PDF
            </button>
          </div>

          <div className="text-sm text-slate-400 mt-3">
            Active sleepover = hourly (hours/week). Fixed sleepover = flat per unit (count/week). GST applies to the whole weekly base.
          </div>
        </div>

        {/* Rates */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Rates</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Weekday (Ord) $/hr" value={rates.weekdayOrd} onChange={(v) => setRates((r) => ({ ...r, weekdayOrd: v }))} step={0.01} />
            <Field label="Weekday (Night) $/hr" value={rates.weekdayNight} onChange={(v) => setRates((r) => ({ ...r, weekdayNight: v }))} step={0.01} />
            <Field label="Saturday $/hr" value={rates.sat} onChange={(v) => setRates((r) => ({ ...r, sat: v }))} step={0.01} />
            <Field label="Sunday $/hr" value={rates.sun} onChange={(v) => setRates((r) => ({ ...r, sun: v }))} step={0.01} />
            <Field label="Public Holiday $/hr" value={rates.publicHoliday} onChange={(v) => setRates((r) => ({ ...r, publicHoliday: v }))} step={0.01} />
            <Field label="Active sleepover $/hr (hourly)" value={rates.activeSleepoverHourly} onChange={(v) => setRates((r) => ({ ...r, activeSleepoverHourly: v }))} step={0.01} />
            <Field label="Fixed sleepover $ (flat per unit)" value={rates.fixedSleepoverUnit} onChange={(v) => setRates((r) => ({ ...r, fixedSleepoverUnit: v }))} step={0.01} />
            <Field label="GST rate (0 or 0.1)" value={rates.gstRate} onChange={(v) => setRates((r) => ({ ...r, gstRate: v }))} step={0.01} />
          </div>
        </div>

        {/* Lines */}
        <div className="grid gap-6">
          {perLine.map((l: any) => (
            <div key={l.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="text-xl font-semibold">
                  Support line: <span className="text-slate-200">{l.code}</span> —{" "}
                  <span className="text-slate-300">{l.description}</span>
                </div>

                <button
                  onClick={() => deleteLine(l.id)}
                  disabled={lines.length <= 1}
                  className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 hover:border-slate-400 disabled:opacity-40"
                  title={lines.length <= 1 ? "Need at least one line" : "Delete this line"}
                >
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4">
                  <div className="text-sm text-slate-300 mb-3 font-semibold">Line details</div>
                  <div className="grid grid-cols-1 gap-3">
                    <TextField label="Code" value={l.code} onChange={(v) => updateLine(l.id, { code: v })} />
                    <TextField label="Description" value={l.description} onChange={(v) => updateLine(l.id, { description: v })} />
                    <Field label="Total funding (AUD)" value={l.totalFunding} onChange={(v) => updateLine(l.id, { totalFunding: v })} step={100} />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4">
                  <div className="text-sm text-slate-300 mb-3 font-semibold">Hours per week</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Weekday (Ord) hrs/wk" value={l.hrsWeekdayOrd} onChange={(v) => updateLine(l.id, { hrsWeekdayOrd: v })} step={0.25} />
                    <Field label="Weekday (Night) hrs/wk" value={l.hrsWeekdayNight} onChange={(v) => updateLine(l.id, { hrsWeekdayNight: v })} step={0.25} />
                    <Field label="Saturday hrs/wk" value={l.hrsSat} onChange={(v) => updateLine(l.id, { hrsSat: v })} step={0.25} />
                    <Field label="Sunday hrs/wk" value={l.hrsSun} onChange={(v) => updateLine(l.id, { hrsSun: v })} step={0.25} />
                    <Field label="Public Holiday hrs/wk" value={l.hrsPublicHoliday} onChange={(v) => updateLine(l.id, { hrsPublicHoliday: v })} step={0.25} />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4">
                  <div className="text-sm text-slate-300 mb-3 font-semibold">Sleepovers per week</div>
                  <div className="grid grid-cols-1 gap-3">
                    <Field label="Active sleepover HOURS / wk (hourly paid)" value={l.activeSleepoverHours} onChange={(v) => updateLine(l.id, { activeSleepoverHours: v })} step={0.25} />
                    <Field label="Fixed sleepovers / wk (units, flat paid)" value={l.fixedSleepovers} onChange={(v) => updateLine(l.id, { fixedSleepovers: v })} step={1} />
                  </div>

                  <div className="mt-4 text-sm text-slate-300">
                    <div>Weekly base (ex GST): <span className="font-semibold">{money(l.weeklyBase)}</span></div>
                    <div>Weekly GST: <span className="font-semibold">{money(l.weeklyGST)}</span></div>
                    <div>Weekly total: <span className="font-semibold">{money(l.weeklyTotal)}</span></div>
                    <div className="mt-2">Annual total: <span className="font-semibold">{money(l.annualTotal)}</span></div>
                    <div className="text-lg font-bold mt-2">Remaining: {money(l.remaining)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-slate-500 mt-8">
          Auto-saves in your browser. Export PDF opens your print dialog (Save as PDF).
        </div>
      </div>
    </main>
  );
}

