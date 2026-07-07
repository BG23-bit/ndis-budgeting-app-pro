// Live test: run the production parse-plan prompt against a real plan PDF,
// optionally with provider notes, and check extraction + roster rules hold.
// Usage: node --experimental-strip-types scripts/parse-plan-live-test.ts <pdf-path> ["provider notes"]
// Reads ANTHROPIC_API_KEY from .env.vercel-test (pull with: npx vercel env pull .env.vercel-test)

import { readFileSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { buildPlanPrompt } from "../lib/plan-prompt.ts";

const envText = readFileSync(new URL("../.env.vercel-test", import.meta.url), "utf8");
const key = envText.match(/^ANTHROPIC_API_KEY="?([^"\n]+)"?$/m)?.[1];
if (!key) { console.error("No ANTHROPIC_API_KEY in .env.vercel-test"); process.exit(1); }

const pdfPath = process.argv[2];
const notes = process.argv[3] || "";
const base64 = readFileSync(pdfPath).toString("base64");

const client = new Anthropic({ apiKey: key });
const response = await client.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 3000,
  messages: [{
    role: "user",
    content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
      { type: "text", text: buildPlanPrompt(notes) },
    ],
  }],
});

const text = response.content[0].type === "text" ? response.content[0].text : "";
const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
const start = clean.indexOf("{"), end = clean.lastIndexOf("}");
const parsed = JSON.parse(clean.slice(start, end + 1));

console.log(JSON.stringify({ planStart: parsed.planStart, planEnd: parsed.planEnd, state: parsed.state, planTotal: parsed.planTotal, supportLines: parsed.supportLines, proposedRoster: parsed.proposedRoster }, null, 2));

const lines = (parsed.supportLines || []).filter((l: any) => (l.totalFunding || 0) > 0);
const sum = lines.reduce((s: number, l: any) => s + l.totalFunding, 0);
const amounts = lines.map((l: any) => l.totalFunding);
const dup = amounts.some((a: number, i: number) => amounts.indexOf(a) !== i);
console.log("\n--- checks ---");
console.log("sum of lines:", sum.toFixed(2), "| planTotal:", parsed.planTotal);
console.log("duplicate amounts across lines:", dup ? "YES (BAD)" : "no");
console.log("sum matches planTotal (±$1):", parsed.planTotal && Math.abs(sum - parsed.planTotal) <= 1 ? "YES" : "NO");
if (notes) {
  const pr = parsed.proposedRoster || [];
  console.log("proposedRoster entries:", pr.length);
  const lineCodes = new Set(lines.map((l: any) => l.code));
  const badCodes = pr.filter((r: any) => !lineCodes.has(r.categoryCode)).map((r: any) => r.categoryCode);
  console.log("roster codes all match a support line:", badCodes.length === 0 ? "YES" : "NO — stray: " + badCodes.join(","));
  for (const r of pr) {
    const weekly = Object.values(r.days || {}).reduce((s: number, d: any) => s + (d?.hours || 0) + (d?.nightHours || 0), 0);
    console.log(`  ${r.categoryCode}: ${weekly}h/wk across ${Object.keys(r.days || {}).length} days; sleepovers/wk=${r.sleepoversPerWeek || 0}; km/wk=${r.kmsPerWeek || 0}`);
  }
} else {
  console.log("proposedRoster empty (no notes):", (parsed.proposedRoster || []).length === 0 ? "YES" : "NO (BAD)");
}
