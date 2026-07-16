// Statewide Australian public holidays by state/territory.
//
// Scope: statewide, full-day, general public holidays only. Intentionally excluded:
// regional days (TAS show days/regattas, NT show days, QLD Royal Show), part-day
// holidays (QLD/SA/NT Christmas Eve & New Year's Eve evenings), TAS Easter Tuesday
// (restricted), NSW Bank Holiday (banks only), and VIC AFL Grand Final Friday
// (proclaimed annually — no computable rule). TAS Recreation Day (Northern TAS only)
// is included with a label since the app treats TAS as one region.
//
// Rules verified against official NSW/QLD/WA government lists and cross-checked
// state calendars for 2026 and 2027 (see scripts/holidays.test.ts).

export type Holiday = { date: string; name: string; dayOfWeek: number };

function fmt(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// nth <weekday> of a month (weekday: 0=Sun..6=Sat, month0: 0-based, n: 1-based)
function nthWeekday(year: number, month0: number, weekday: number, n: number): Date {
  const first = new Date(year, month0, 1);
  const day = 1 + ((7 + weekday - first.getDay()) % 7) + 7 * (n - 1);
  return new Date(year, month0, day);
}

function lastWeekday(year: number, month0: number, weekday: number): Date {
  const last = new Date(year, month0 + 1, 0);
  return new Date(year, month0, last.getDate() - ((7 + last.getDay() - weekday) % 7));
}

function easterSunday(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4,
    f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31),
    da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, mo - 1, da);
}

const EASTER_SAT_SUN_STATES = ["NSW", "VIC", "QLD", "SA", "NT", "ACT"]; // not WA, TAS

export function getPublicHolidays(year: number, state: string): Holiday[] {
  const h: Holiday[] = [];
  const add = (d: Date | string, name: string) => {
    const date = typeof d === "string" ? d : fmt(d);
    const dow = new Date(date).getDay();
    h.push({ date, name, dayOfWeek: dow });
  };

  // New Year's Day (+ additional Monday everywhere when it falls on a weekend)
  add(year + "-01-01", "New Year's Day");
  const nyd = new Date(year, 0, 1);
  if (nyd.getDay() === 6) add(new Date(year, 0, 3), "New Year's Day (additional)");
  if (nyd.getDay() === 0) add(new Date(year, 0, 2), "New Year's Day (additional)");

  // Australia Day — observed the following Monday when it falls on a weekend
  const aus = new Date(year, 0, 26);
  if (aus.getDay() === 6 || aus.getDay() === 0) add(new Date(year, 0, 26 + ((8 - aus.getDay()) % 7)), "Australia Day (observed)");
  else add(aus, "Australia Day");

  // Easter
  const easter = easterSunday(year);
  const off = (days: number) => new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + days);
  add(off(-2), "Good Friday");
  if (EASTER_SAT_SUN_STATES.includes(state)) {
    add(off(-1), "Easter Saturday");
    add(off(0), "Easter Sunday");
  }
  add(off(1), "Easter Monday");

  // ANZAC Day — additional/substitute Monday rules differ by state
  const anzac = new Date(year, 3, 25);
  const anzacDow = anzac.getDay();
  if (state === "QLD" && anzacDow === 0) {
    add(new Date(year, 3, 26), "Anzac Day (observed)"); // QLD substitutes, Sunday itself not a holiday
  } else {
    add(anzac, "Anzac Day");
    if (anzacDow === 6 && ["NSW", "WA", "ACT"].includes(state)) add(new Date(year, 3, 27), "Anzac Day (additional)");
    if (anzacDow === 0 && ["NSW", "WA", "ACT", "NT"].includes(state)) add(new Date(year, 3, 26), "Anzac Day (additional)");
  }

  // Labour Day and equivalents
  if (state === "WA") add(nthWeekday(year, 2, 1, 1), "Labour Day");
  if (state === "VIC") add(nthWeekday(year, 2, 1, 2), "Labour Day");
  if (state === "TAS") add(nthWeekday(year, 2, 1, 2), "Eight Hours Day");
  if (state === "QLD") add(nthWeekday(year, 4, 1, 1), "Labour Day");
  if (state === "NT") add(nthWeekday(year, 4, 1, 1), "May Day");
  if (["NSW", "SA", "ACT"].includes(state)) add(nthWeekday(year, 9, 1, 1), "Labour Day");

  // Other state days
  if (state === "ACT") {
    add(nthWeekday(year, 2, 1, 2), "Canberra Day");
    const may27 = new Date(year, 4, 27);
    add(new Date(year, 4, 27 + ((8 - may27.getDay()) % 7)), "Reconciliation Day"); // Monday on/after 27 May
  }
  if (state === "SA") add(nthWeekday(year, 2, 1, 2), "Adelaide Cup Day");
  if (state === "WA") add(nthWeekday(year, 5, 1, 1), "Western Australia Day");
  if (state === "VIC") add(nthWeekday(year, 10, 2, 1), "Melbourne Cup Day");
  if (state === "TAS") add(nthWeekday(year, 10, 1, 1), "Recreation Day (Northern TAS)");
  if (state === "NT") add(nthWeekday(year, 7, 1, 1), "Picnic Day");

  // King's Birthday
  if (state === "QLD") add(nthWeekday(year, 9, 1, 1), "King's Birthday");
  else if (state === "WA") add(lastWeekday(year, 8, 1), "King's Birthday"); // proclaimed annually; last Monday of September in recent years
  else add(nthWeekday(year, 5, 1, 2), "King's Birthday");

  // Christmas / Boxing Day (+ additional days when on a weekend — both actual and
  // additional days are public holidays in all jurisdictions)
  add(year + "-12-25", "Christmas Day");
  add(year + "-12-26", state === "SA" ? "Proclamation Day" : "Boxing Day");
  const xmasDow = new Date(year, 11, 25).getDay();
  if (xmasDow === 6 || xmasDow === 0) add(new Date(year, 11, 27), "Christmas Day (additional)");
  const boxDow = new Date(year, 11, 26).getDay();
  if (boxDow === 6 || boxDow === 0) add(new Date(year, 11, 28), (state === "SA" ? "Proclamation Day" : "Boxing Day") + " (additional)");

  return h.sort((a, b) => a.date.localeCompare(b.date));
}

// Overlay user-entered regional holidays (e.g. QLD show days) onto the statewide
// list. Custom dates that clash with an auto-generated holiday are skipped.
export function mergeCustomHolidays(base: Holiday[], custom: { date: string; name: string }[] | undefined, start: string, end: string): Holiday[] {
  if (!custom || custom.length === 0) return base;
  const seen = new Set(base.map((h) => h.date));
  const sd = start ? new Date(start) : null, ed = end ? new Date(end) : null;
  const out = [...base];
  for (const c of custom) {
    if (!c?.date || !/^\d{4}-\d{2}-\d{2}$/.test(c.date) || seen.has(c.date)) continue;
    const d = new Date(c.date);
    if (sd && d < sd) continue;
    if (ed && d > ed) continue;
    seen.add(c.date);
    out.push({ date: c.date, name: (c.name || "Regional holiday") + " (custom)", dayOfWeek: d.getDay() });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function getHolidaysInRange(start: string, end: string, state: string): Holiday[] {
  if (!start || !end) return [];
  const sd = new Date(start), ed = new Date(end);
  const all: Holiday[] = [];
  for (let y = sd.getFullYear(); y <= ed.getFullYear(); y++) all.push(...getPublicHolidays(y, state));
  return all.filter((x) => { const d = new Date(x.date); return d >= sd && d <= ed; }).sort((a, b) => a.date.localeCompare(b.date));
}
