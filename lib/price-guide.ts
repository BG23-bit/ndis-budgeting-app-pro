// NDIS support item catalogue: a built-in set of the items the app already
// prices, plus an importer for the official NDIA Support Catalogue so the
// full item list becomes selectable. No prices are invented here — the
// built-ins mirror the app's 2026-27 presets and the rest comes from the
// user's imported official file.

import { parseCSV } from "./claims-import";

export type CatalogueItem = {
  item: string;              // e.g. 01_011_0107_1_1
  name: string;
  unit?: string;             // H (hour), EA, D, WK...
  price?: number;            // national / fallback price limit
  prices?: { [state: string]: number }; // per-state price limits when present
};

export const BUILTIN_CATALOGUE: CatalogueItem[] = [
  // Core — self-care (standard)
  { item: "01_011_0107_1_1", name: "Assistance With Self-Care Activities - Weekday Daytime", unit: "H", price: 73.58 },
  { item: "01_015_0107_1_1", name: "Assistance With Self-Care Activities - Weekday Evening", unit: "H", price: 81.07 },
  { item: "01_002_0107_1_1", name: "Assistance With Self-Care Activities - Weekday Night", unit: "H", price: 82.57 },
  { item: "01_013_0107_1_1", name: "Assistance With Self-Care Activities - Saturday", unit: "H", price: 103.54 },
  { item: "01_014_0107_1_1", name: "Assistance With Self-Care Activities - Sunday", unit: "H", price: 133.50 },
  { item: "01_012_0107_1_1", name: "Assistance With Self-Care Activities - Public Holiday", unit: "H", price: 163.46 },
  { item: "01_010_0107_1_1", name: "Assistance With Self-Care Activities - Night-Time Sleepover", unit: "EA", price: 311.79 },
  // Core — SIL series
  { item: "01_801_0115_1_1", name: "Assistance in Supported Independent Living - Weekday Daytime", unit: "H", price: 73.58 },
  { item: "01_802_0115_1_1", name: "Assistance in Supported Independent Living - Weekday Evening", unit: "H", price: 81.07 },
  { item: "01_803_0115_1_1", name: "Assistance in Supported Independent Living - Weekday Night", unit: "H", price: 82.57 },
  { item: "01_804_0115_1_1", name: "Assistance in Supported Independent Living - Saturday", unit: "H", price: 103.54 },
  { item: "01_805_0115_1_1", name: "Assistance in Supported Independent Living - Sunday", unit: "H", price: 133.50 },
  { item: "01_806_0115_1_1", name: "Assistance in Supported Independent Living - Public Holiday", unit: "H", price: 163.46 },
  { item: "01_832_0115_1_1", name: "Assistance in Supported Independent Living - Night-Time Sleepover", unit: "EA", price: 311.79 },
  { item: "01_821_0115_1_1", name: "Assistance in Supported Independent Living - Weekly", unit: "WK" },
  // Community participation
  { item: "04_104_0125_6_1", name: "Access Community, Social and Rec Activities - Weekday Daytime", unit: "H", price: 73.58 },
  { item: "04_103_0125_6_1", name: "Access Community, Social and Rec Activities - Weekday Evening", unit: "H", price: 81.07 },
  { item: "04_105_0125_6_1", name: "Access Community, Social and Rec Activities - Saturday", unit: "H", price: 103.54 },
  { item: "04_106_0125_6_1", name: "Access Community, Social and Rec Activities - Sunday", unit: "H", price: 133.50 },
  { item: "04_102_0125_6_1", name: "Access Community, Social and Rec Activities - Public Holiday", unit: "H", price: 163.46 },
  // Coordination / plan management / capacity building
  { item: "07_002_0106_8_3", name: "Support Coordination Level 2: Coordination of Supports", unit: "H", price: 100.14 },
  { item: "14_034_0127_8_3", name: "Plan Management - Monthly Fee", unit: "MON", price: 104.45 },
  { item: "13_030_0102_4_3", name: "Improved Learning - Transition Through School / Further Education", unit: "H", price: 83.87 },
  { item: "12_027_0126_3_3", name: "Exercise Physiology", unit: "H", price: 161.99 },
  { item: "11_022_0110_7_3", name: "Specialist Behavioural Intervention Support", unit: "H", price: 252.99 },
  { item: "10_806_0133_5_1", name: "Employment Related Assessment and Counselling", unit: "H", price: 73.58 },
  // Therapy suite — per-discipline national caps from the 2026-27 NDIS
  // Pricing Schedule (each discipline has its OWN cap; they are not all equal)
  { item: "15_056_0128_1_3", name: "Assessment, Recommendation, Therapy or Training - Other Therapy", unit: "H", price: 193.99 },
  { item: "15_617_0128_1_3", name: "Occupational Therapy", unit: "H", price: 193.99 },
  { item: "15_055_0128_1_3", name: "Physiotherapy", unit: "H", price: 183.99 },
  { item: "15_622_0128_1_3", name: "Speech Pathology", unit: "H", price: 193.99 },
  { item: "15_054_0128_1_3", name: "Psychology", unit: "H", price: 252.99 },
  { item: "15_062_0128_1_3", name: "Dietetics", unit: "H", price: 178.99 },
  { item: "15_043_0128_1_3", name: "Counselling", unit: "H", price: 156.16 },
  { item: "15_053_0128_1_3", name: "Therapy Assistant - Level 2", unit: "H", price: 86.79 },
];

const STATE_COLS = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

// Parse the official NDIA Support Catalogue saved as CSV. Column names vary a
// little between years, so headers are matched loosely.
export function parseCatalogueCSV(text: string): { items: CatalogueItem[]; error?: string } {
  const rows = parseCSV(text);
  if (rows.length < 2) return { items: [], error: "No data rows found in that file." };
  // The catalogue sometimes has preamble rows before the real header — find the
  // row containing a "support item number"-ish column.
  let headerIdx = -1, headers: string[] = [];
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const h = rows[i].map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, ""));
    if (h.some((c) => c.includes("supportitemnumber") || c === "itemnumber" || c === "supportitem")) {
      headerIdx = i; headers = h; break;
    }
  }
  if (headerIdx < 0) return { items: [], error: "Couldn't find a 'Support Item Number' column. Open the NDIA Support Catalogue file and save it as CSV, keeping the header row." };
  // Match most-specific names first, and never let the name column resolve to
  // the item-number column (both contain "supportitem").
  const colSeq = (...names: string[]) => { for (const n of names) { const i = headers.findIndex((h) => h.includes(n)); if (i >= 0) return i; } return -1; };
  const cItem = colSeq("supportitemnumber", "itemnumber");
  let cName = colSeq("supportitemname", "itemname");
  if (cName < 0) cName = headers.findIndex((h, ix) => ix !== cItem && h.includes("supportitem"));
  const cUnit = colSeq("unit");
  const cNat = colSeq("national", "pricelimit", "price");
  const stateCols: { [s: string]: number } = {};
  for (const s of STATE_COLS) {
    const i = headers.findIndex((h) => h === s.toLowerCase() || h.startsWith(s.toLowerCase() + "price") || h.endsWith(s.toLowerCase()));
    if (i >= 0) stateCols[s] = i;
  }
  const items: CatalogueItem[] = [];
  const seen = new Set<string>();
  for (const r of rows.slice(headerIdx + 1)) {
    const item = (r[cItem] || "").trim();
    if (!/^\d{2}_/.test(item) || seen.has(item)) continue;
    seen.add(item);
    const money = (v: string) => { const n = parseFloat(String(v || "").replace(/[$,\s]/g, "")); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : undefined; };
    const prices: { [s: string]: number } = {};
    for (const [s, i] of Object.entries(stateCols)) { const p = money(r[i]); if (p != null) prices[s] = p; }
    const nat = cNat >= 0 ? money(r[cNat]) : undefined;
    items.push({
      item,
      name: (cName >= 0 ? r[cName] : "").trim().slice(0, 160) || item,
      unit: cUnit >= 0 ? (r[cUnit] || "").trim().slice(0, 8) : undefined,
      price: nat ?? (Object.keys(prices).length ? Math.max(...Object.values(prices)) : undefined),
      ...(Object.keys(prices).length ? { prices } : {}),
    });
  }
  if (items.length === 0) return { items: [], error: "No support items found — check the file is the NDIA Support Catalogue saved as CSV." };
  return { items };
}

export function cataloguePrice(it: CatalogueItem, state?: string): number | undefined {
  if (state && it.prices && it.prices[state] != null) return it.prices[state];
  return it.price;
}

export function findCatalogueItem(catalogue: CatalogueItem[], itemNumber: string): CatalogueItem | undefined {
  const key = itemNumber.trim();
  return catalogue.find((c) => c.item === key);
}

export function mergeWithBuiltins(imported: CatalogueItem[]): CatalogueItem[] {
  const have = new Set(imported.map((i) => i.item));
  return [...imported, ...BUILTIN_CATALOGUE.filter((b) => !have.has(b.item))];
}
