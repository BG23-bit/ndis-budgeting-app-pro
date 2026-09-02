// Regression suite for the pure calculation engine (lib/calc.ts).
// Every expected value below was hand-derived and cross-checked against
// customer-verified documents during development — if one of these moves,
// billing output has changed and the change must be intentional.
// Run: node --experimental-strip-types scripts/calc.test.ts

import {
  defaultRoster, getWeeksInPlan, countDayOccurrences, calcWeeklyCost,
  calcDayCountPlanCost, calcPHImpact, splitShiftBands, shiftWindowBands,
  migrateSleepoverRate, NDIS_RATES_2026_27, getPresetRates,
  type SupportLine,
} from "../lib/calc.ts";

let failures = 0;
function check(name: string, got: number, want: number, tol = 0.005) {
  if (Math.abs(got - want) <= tol) console.log(`ok   ${name} (${got.toFixed(4)})`);
  else { failures++; console.error(`FAIL ${name}: got ${got}, want ${want}`); }
}

function line(patch: Partial<SupportLine>): SupportLine {
  return {
    id: "t", code: "01", description: "Test", totalFunding: 0, ratio: "1:1",
    excludedHolidays: [], roster: defaultRoster(), activeSleepoverHours: 0,
    activeSleepoverFreq: "every", fixedSleepovers: 0, fixedSleepoverFreq: "every",
    kmsPerWeek: 0, kmRate: 1, kmFreq: "every", claims: [], lineRates: { ...NDIS_RATES_2026_27 },
    ...patch,
  } as SupportLine;
}

const R = NDIS_RATES_2026_27;

// --- weeks & occurrences ---
check("weeks in a 12-month plan", getWeeksInPlan("2026-07-01", "2027-06-30"), 365 / 7);
check("Mondays in Sep 2026", countDayOccurrences("2026-09-01", "2026-09-30", 1), 4);
check("Tuesdays in Sep 2026 (starts Tue)", countDayOccurrences("2026-09-01", "2026-09-30", 2), 5);

// --- ratio pricing (customer-verified: 3h Monday at 2:3 = $147.16/wk) ---
{
  const l = line({ ratio: "2:3", roster: { ...defaultRoster(), mon: { enabled: true, hours: 3, nightHours: 0, frequency: "every" } } });
  check("2:3 ratio weekly (3h Mon)", calcWeeklyCost(l, R), 147.16, 0.005);
}
{
  const l = line({ ratio: "1:3", roster: { ...defaultRoster(), mon: { enabled: true, hours: 3, nightHours: 0, frequency: "every" } } });
  check("1:3 ratio weekly (3h Mon)", calcWeeklyCost(l, R), 3 * R.weekdayOrd / 3);
}

// --- sleepover divides by ratio (customer-verified: 7 nights at 1:3 = $727.51/wk) ---
{
  const l = line({ ratio: "1:3", fixedSleepovers: 7 });
  check("1:3 sleepover weekly (7 nights)", calcWeeklyCost(l, R), 7 * R.fixedSleepoverUnit / 3, 0.005);
  check("1:3 sleepover weekly value", calcWeeklyCost(l, R), 727.51, 0.005);
}

// --- sleepover rate migration (undo the old manual workaround) ---
check("migrate pre-divided 1:3 rate", migrateSleepoverRate("1:3", { fixedSleepoverUnit: 103.93 }).fixedSleepoverUnit, 311.79);
check("leave 1:1 rate alone", migrateSleepoverRate("1:1", { fixedSleepoverUnit: 103.93 }).fixedSleepoverUnit, 103.93);
check("leave unrelated 1:3 rate alone", migrateSleepoverRate("1:3", { fixedSleepoverUnit: 250 }).fixedSleepoverUnit, 250);

// --- shift band splitting (evening starts 8pm) ---
{
  let b = splitShiftBands("06:00", "09:00"); check("06-09 day hours", b.day, 3); check("06-09 eve hours", b.eve, 0);
  b = splitShiftBands("17:00", "20:30"); check("17-20:30 day", b.day, 3); check("17-20:30 eve", b.eve, 0.5);
  b = splitShiftBands("22:00", "06:00"); check("22-06 overnight day", b.day, 0); check("22-06 overnight eve", b.eve, 8);
  b = splitShiftBands("05:00", "07:00"); check("05-07 day", b.day, 1); check("05-07 eve", b.eve, 1);
}

// --- part-day holiday window overlap (QLD Christmas Eve 6pm-midnight) ---
{
  const o = shiftWindowBands("18:00", "22:00", 18 * 60, 24 * 60);
  check("CE window day portion", o.day, 2);
  check("CE window eve portion", o.eve, 2);
  const none = shiftWindowBands("07:00", "13:00", 18 * 60, 24 * 60);
  check("morning shift outside CE window", none.day + none.eve, 0);
}

// --- full-day PH uplift ---
{
  const l = line({ ratio: "1:3", roster: { ...defaultRoster(), mon: { enabled: true, hours: 5, nightHours: 0, frequency: "every" } } });
  const ph = calcPHImpact(l, [{ date: "2026-10-05", name: "Labour Day", dayOfWeek: 1 }], R);
  check("full-day PH uplift (5h Mon at 1:3)", ph.extraCost, (R.publicHoliday - R.weekdayOrd) / 3 * 5);
}

// --- part-day PH uplift (customer-verified: $114.85 for 06-07 + 18-22 at 1:3) ---
{
  const l = line({ ratio: "1:3", roster: { ...defaultRoster(), thu: { enabled: true, hours: 3, nightHours: 2, frequency: "every", shifts: [{ s: "06:00", e: "07:00" }, { s: "18:00", e: "22:00" }] } } });
  const ph = calcPHImpact(l, [{ date: "2026-12-24", name: "Christmas Eve", dayOfWeek: 4, partFrom: 18 * 60, partTo: 24 * 60 }], R);
  const pr = R.publicHoliday / 3, nd = R.weekdayOrd / 3, nn = R.weekdayNight / 3;
  check("part-day PH uplift formula", ph.extraCost, (pr - nd) * 2 + (pr - nn) * 2);
  check("part-day PH uplift value", ph.extraCost, 114.8467, 0.001);
}

// --- excluded holiday saves the normal cost ---
{
  const l = line({ excludedHolidays: ["2026-10-05"], roster: { ...defaultRoster(), mon: { enabled: true, hours: 4, nightHours: 0, frequency: "every" } } });
  const ph = calcPHImpact(l, [{ date: "2026-10-05", name: "Labour Day", dayOfWeek: 1 }], R);
  check("excluded PH saved cost", ph.savedCost, 4 * R.weekdayOrd);
  check("excluded PH no uplift", ph.extraCost, 0);
}

// --- occurrence-based plan cost ---
{
  const l = line({ roster: { ...defaultRoster(), mon: { enabled: true, hours: 2, nightHours: 0, frequency: "every" } } });
  check("plan cost = hrs x rate x occurrences", calcDayCountPlanCost(l, "2026-09-01", "2026-09-30", 30 / 7, R), 2 * R.weekdayOrd * 4);
}

// --- hourly service categories: exact fractional weeks, sessions, no PH ---
{
  // Weekly-hours therapy line: 1 h/wk over exactly 5.45 weeks bills 5.45 h.
  const l = line({ code: "15", lineRates: getPresetRates("15"), roster: { ...defaultRoster(), mon: { enabled: true, hours: 1, nightHours: 0, frequency: "every" } } });
  check("hourly line bills fractional weeks", calcDayCountPlanCost(l, "2026-07-20", "2026-08-26", 5.45, getPresetRates("15")), 1 * 156.16 * 5.45);
}
{
  // Sessions mode: 10 sessions x 1.5 h at the psychology cap, roster ignored.
  const l = line({ code: "15", hoursMode: "sessions", sessionCount: 10, sessionLength: 1.5, lineRates: { ...getPresetRates("15"), weekdayOrd: 252.99 } });
  check("sessions mode bills sessions x length", calcDayCountPlanCost(l, "2026-07-20", "2026-08-26", 5.45, l.lineRates), 10 * 1.5 * 252.99);
}
{
  // Public holidays never adjust hourly service categories.
  const l = line({ code: "15", lineRates: getPresetRates("15"), roster: { ...defaultRoster(), mon: { enabled: true, hours: 1, nightHours: 0, frequency: "every" } } });
  const ph = calcPHImpact(l, [{ date: "2026-09-07", name: "Test PH", dayOfWeek: 1 }], getPresetRates("15"));
  check("hourly line PH extra", ph.extraCost, 0);
  check("hourly line PH saved", ph.savedCost, 0);
}

// --- category presets stay wired ---
// 15 preset = Other Professional cap per the official 2026-27 catalogue
// (matches the category's default item 15_056); discipline-specific caps
// (psych 252.99, OT/speech 193.99…) come from the service-type picker.
check("therapy preset rate", getPresetRates("15").weekdayOrd, 156.16);
check("behaviour support preset rate", getPresetRates("11").weekdayOrd, 252.99);

if (failures) { console.error(`\n${failures} FAILURE(S)`); process.exit(1); }
console.log("\nAll calc engine checks pass.");
