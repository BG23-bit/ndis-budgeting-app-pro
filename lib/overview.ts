// Participant overview maths shared by the dashboard cards/caseload table
// and the weekly digest email — pure functions, safe on server and client.
// Mirrors the per-line maths in client.tsx (roster model, line rates, PH
// adjustment, hourly/sessions categories) via the same calc engine.

import {
  defaultRoster, getWeeksInPlan, calcDayCountPlanCost, calcPHImpact,
  getPresetRates, migrateSleepoverRate, NDIS_RATES_2026_27,
} from "./calc";
import { getHolidaysInRange, mergeCustomHolidays } from "./holidays";

export type Budget = {
  totalFunding: number; planCost: number; remaining: number; status: string;
  planStart?: string; planEnd?: string; docCount?: number;
  totalClaimed?: number; weeklyCost?: number;
};
export const EMPTY_BUDGET: Budget = { totalFunding: 0, planCost: 0, remaining: 0, status: "empty" };

export function computeBudget(raw: any, customHolidays?: { date: string; name: string }[]): Budget {
  try {
    if (!raw) return EMPTY_BUDGET;
    const lines = Array.isArray(raw.lines) ? raw.lines : [];
    const planDates = raw.planDates || {};
    const start = planDates.serviceStart || planDates.start || "";
    const end = planDates.serviceEnd || planDates.end || "";
    const planWeeks = raw.weeksOverride != null ? raw.weeksOverride : getWeeksInPlan(start, end);
    const holidays = mergeCustomHolidays(getHolidaysInRange(start, end, planDates.state || "NSW"), customHolidays, start, end);
    const globalRates = { ...NDIS_RATES_2026_27, ...(raw.rates || {}) };

    let totalFunding = 0;
    let planCost = 0;
    let totalClaimed = 0;
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
      const lr = migrateSleepoverRate(line.ratio, l.lineRates || getPresetRates(l.code) || globalRates);
      totalFunding += line.totalFunding || 0;
      const base = calcDayCountPlanCost(line, start, end, planWeeks, lr) * (1 + (lr.gstRate || 0));
      const ph = calcPHImpact(line, holidays, lr);
      planCost += base + ph.extraCost - ph.savedCost;
      totalClaimed += (l.claims || []).reduce((s: number, c: any) => s + (c?.amount || 0), 0);
    }

    const services = Array.isArray(raw.clinicalServices) ? raw.clinicalServices : [];
    if (!raw.clinicalBudgetLinked) {
      totalFunding += raw.clinicalFunding || 0;
      planCost += services.reduce((s: number, i: any) => s + (i.hours || 0) * (i.rate || 0), 0);
    } else {
      const lineCodes = new Set(lines.map((l: any) => l.code));
      planCost += services.reduce((s: number, i: any) => s + (lineCodes.has(i.code || "15") ? (i.hours || 0) * (i.rate || 0) : 0), 0);
    }

    const remaining = totalFunding - planCost;
    let status = "on_track";
    if (totalFunding <= 0 && planCost <= 0) status = "empty";
    else if (remaining < 0) status = "over";
    else if (totalFunding > 0 && (remaining / totalFunding) * 100 < 10) status = "low";

    return {
      totalFunding, planCost, remaining, status,
      planStart: planDates.start || undefined,
      planEnd: planDates.end || undefined,
      docCount: Array.isArray(raw.docHistory) ? raw.docHistory.length : 0,
      totalClaimed,
      weeklyCost: planWeeks > 0 ? planCost / planWeeks : 0,
    };
  } catch {
    return EMPTY_BUDGET;
  }
}

export type Pace = { status: "not_started" | "on_pace" | "over_pace" | "under_pace" | "ended" | "unknown"; pctElapsed: number; variance: number };

// Spend pace vs time elapsed (same logic as the calculator's Plan Progress):
// actual = logged claims when tracked, otherwise the costed roster projection.
export function computePace(b: Budget, now: Date = new Date()): Pace {
  if (!b.planStart || !b.planEnd || b.totalFunding <= 0) return { status: "unknown", pctElapsed: 0, variance: 0 };
  const start = new Date(b.planStart).getTime();
  const end = new Date(b.planEnd).getTime();
  if (!(end > start)) return { status: "unknown", pctElapsed: 0, variance: 0 };
  const t = now.getTime();
  if (t < start) return { status: "not_started", pctElapsed: 0, variance: 0 };
  const ended = t > end;
  const pctElapsed = Math.min(1, (t - start) / (end - start));
  const expected = b.totalFunding * pctElapsed;
  const weeksElapsed = (Math.min(t, end) - start) / (7 * 86400000);
  const usingClaims = (b.totalClaimed || 0) > 0;
  const actual = usingClaims ? (b.totalClaimed || 0) : (b.weeklyCost || 0) * weeksElapsed;
  const variance = actual - expected;
  const pctDiff = expected > 0 ? (variance / expected) * 100 : 0;
  const status = ended ? "ended" : pctDiff > 5 ? "over_pace" : pctDiff < -5 ? "under_pace" : "on_pace";
  return { status, pctElapsed, variance };
}

export function daysUntil(dateStr?: string, now: Date = new Date()): number | null {
  if (!dateStr) return null;
  const d = Math.ceil((new Date(dateStr).getTime() - now.getTime()) / 86400000);
  return Number.isFinite(d) ? d : null;
}
