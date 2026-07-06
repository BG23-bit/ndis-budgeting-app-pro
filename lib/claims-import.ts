// Parsing helpers for importing claims from NDIS portal payment request CSV exports
// (or any CSV with date/amount columns). Pure functions — tested in scripts/claims-import.test.ts.

export type ClaimsImportRow = { lineId: string; lineLabel: string; date: string; amount: number; note: string };
export type ClaimsImportPreview = { rows: ClaimsImportRow[]; skippedOther: number; skippedNoMatch: number; skippedDup: number; skippedBad: number; fileName: string };

export function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); cur = "";
        if (row.length > 1 || row[0].trim() !== "") rows.push(row);
        row = [];
      } else cur += ch;
    }
  }
  row.push(cur);
  if (row.length > 1 || row[0].trim() !== "") rows.push(row);
  return rows;
}

// First header containing any of the keys (headers pre-normalised to lowercase alphanumerics)
export function findCol(headers: string[], keys: string[]): number {
  for (const k of keys) { const i = headers.findIndex((h) => h.includes(k)); if (i >= 0) return i; }
  return -1;
}

// Accepts YYYY-MM-DD and DD/MM/YYYY (NDIS portal format)
export function normDate(s: string): string | null {
  s = (s || "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[1] + "-" + m[2] + "-" + m[3];
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
  return null;
}

export function parseMoney(s: unknown): number {
  const v = parseFloat(String(s ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(v) ? v : 0;
}
