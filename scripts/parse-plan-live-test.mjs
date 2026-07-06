// One-off live test: run the parse-plan extraction prompt against a real plan PDF
// and check the no-duplicate-amounts + planTotal rules hold.
// Usage: node scripts/parse-plan-live-test.mjs <pdf-path>
// Reads ANTHROPIC_API_KEY from .env.vercel-test (not committed).

import { readFileSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";

const envText = readFileSync(new URL("../.env.vercel-test", import.meta.url), "utf8");
const key = envText.match(/^ANTHROPIC_API_KEY="?([^"\n]+)"?$/m)?.[1];
if (!key) { console.error("No ANTHROPIC_API_KEY in .env.vercel-test"); process.exit(1); }

const routeSrc = readFileSync(new URL("../app/api/parse-plan/route.ts", import.meta.url), "utf8");
const pStart = routeSrc.indexOf("text: `") + "text: `".length;
const pEnd = routeSrc.indexOf("`,", pStart);
if (pStart < 8 || pEnd < 0) { console.error("Couldn't extract prompt from route.ts"); process.exit(1); }
const prompt = routeSrc.slice(pStart, pEnd);

const pdfPath = process.argv[2];
const base64 = readFileSync(pdfPath).toString("base64");

const client = new Anthropic({ apiKey: key });
const response = await client.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 3000,
  messages: [{
    role: "user",
    content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
      { type: "text", text: prompt },
    ],
  }],
});

const text = response.content[0].type === "text" ? response.content[0].text : "";
const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
const start = clean.indexOf("{"), end = clean.lastIndexOf("}");
const parsed = JSON.parse(clean.slice(start, end + 1));

console.log(JSON.stringify({ planStart: parsed.planStart, planEnd: parsed.planEnd, state: parsed.state, planTotal: parsed.planTotal, supportLines: parsed.supportLines }, null, 2));

const lines = (parsed.supportLines || []).filter((l) => (l.totalFunding || 0) > 0);
const sum = lines.reduce((s, l) => s + l.totalFunding, 0);
const amounts = lines.map((l) => l.totalFunding);
const dup = amounts.some((a, i) => amounts.indexOf(a) !== i);
console.log("\n--- checks ---");
console.log("sum of lines:", sum.toFixed(2), "| planTotal:", parsed.planTotal);
console.log("duplicate amounts across lines:", dup ? "YES (BAD)" : "no");
console.log("sum matches planTotal (±$1):", parsed.planTotal && Math.abs(sum - parsed.planTotal) <= 1 ? "YES" : "NO");
