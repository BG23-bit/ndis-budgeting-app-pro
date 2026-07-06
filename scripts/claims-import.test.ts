// Tests for lib/claims-import.ts against a realistic NDIS bulk payment CSV shape.
// Run: node --experimental-strip-types scripts/claims-import.test.ts

import { parseCSV, findCol, normDate, parseMoney } from "../lib/claims-import.ts";

let failures = 0;
function check(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) console.log("ok   " + name);
  else { failures++; console.error(`FAIL ${name}\n  got:  ${g}\n  want: ${w}`); }
}

// --- parseCSV: quoted fields, embedded commas/quotes, CRLF, trailing newline ---
const csv = 'RegistrationNumber,NDISNumber,SupportsDeliveredFrom,SupportNumber,ClaimReference,Quantity,UnitPrice,PaidTotalAmount\r\n' +
  '4050012345,430000001,07/07/2026,01_011_0107_1_1,"INV-2041",28,73.58,"$2,060.24"\r\n' +
  '4050012345,430000001,07/07/2026,04_104_0125_6_1,"Smith, John — wk1",2,73.58,147.16\r\n' +
  '4050012345,430999999,07/07/2026,01_011_0107_1_1,OTHER-PERSON,10,73.58,735.80\r\n';

const rows = parseCSV(csv);
check("parseCSV row count", rows.length, 4);
check("parseCSV quoted comma field", rows[2][4], "Smith, John — wk1");
check("parseCSV plain field", rows[1][3], "01_011_0107_1_1");

// --- header detection (normalised to lowercase alphanumerics, as the app does) ---
const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
check("findCol date", findCol(headers, ["supportsdeliveredfrom", "deliveredfrom", "servicedate", "supportdate", "date"]), 2);
check("findCol paid amount", findCol(headers, ["paidtotalamount", "paidamount", "amountpaid"]), 7);
check("findCol item", findCol(headers, ["supportnumber", "supportitemnumber", "itemnumber", "supportitem", "item"]), 3);
check("findCol ndis", findCol(headers, ["ndisnumber", "participantndis"]), 1);
check("findCol missing", findCol(headers, ["nonexistent"]), -1);

// --- dates ---
check("normDate portal format", normDate("07/07/2026"), "2026-07-07");
check("normDate single digits", normDate("3/1/2027"), "2027-01-03");
check("normDate ISO", normDate("2026-07-07"), "2026-07-07");
check("normDate garbage", normDate("not a date"), null);

// --- money ---
check("parseMoney currency", parseMoney("$2,060.24"), 2060.24);
check("parseMoney plain", parseMoney("147.16"), 147.16);
check("parseMoney qty x price", Math.round(parseMoney("28") * parseMoney("73.58") * 100) / 100, 2060.24);
check("parseMoney blank", parseMoney(""), 0);

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log("\nAll claims-import checks pass.");
