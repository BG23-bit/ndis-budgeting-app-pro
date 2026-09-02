// Monday-morning caseload brief: one email per active account summarising
// every participant's budget position — over budget, over pace, low, and
// plans ending soon — computed with the same engine as the dashboard.
// Scheduled via vercel.json; authenticated with CRON_SECRET.
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { computeBudget, computePace, daysUntil, type Budget } from "@/lib/overview";
import { digestToken } from "@/lib/digest";

const FROM = "Kevria Calc <support@kevria.com>";
const DASHBOARD_URL = "https://kevriacalc.com/dashboard";

function money(n: number): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

function esc(s: string): string {
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

type Row = { name: string; b: Budget; pace: ReturnType<typeof computePace>; endsIn: number | null };

function buildDigestEmail(orgName: string, rows: Row[], userId: string): { subject: string; html: string } {
  const totalFunding = rows.reduce((s, r) => s + r.b.totalFunding, 0);
  const totalRemaining = rows.reduce((s, r) => s + r.b.remaining, 0);
  const overBudget = rows.filter((r) => r.b.remaining < 0);
  const overPace = rows.filter((r) => r.b.remaining >= 0 && r.pace.status === "over_pace");
  const lowBudget = rows.filter((r) => r.b.remaining >= 0 && r.b.status === "low" && r.pace.status !== "over_pace");
  const endingSoon = rows.filter((r) => r.endsIn !== null && r.endsIn >= 0 && r.endsIn <= 60);
  const ended = rows.filter((r) => r.endsIn !== null && r.endsIn < 0);
  const attention = overBudget.length + overPace.length + lowBudget.length + endingSoon.length + ended.length;

  const subjectBits: string[] = [];
  if (overBudget.length) subjectBits.push(`${overBudget.length} over budget`);
  if (overPace.length) subjectBits.push(`${overPace.length} over pace`);
  if (endingSoon.length) subjectBits.push(`${endingSoon.length} plan${endingSoon.length === 1 ? "" : "s"} ending soon`);
  const subject = subjectBits.length ? `Caseload brief — ${subjectBits.join(", ")}` : `Caseload brief — all ${rows.length} participant${rows.length === 1 ? "" : "s"} tracking fine`;

  const section = (title: string, colour: string, items: Row[], detail: (r: Row) => string) => items.length === 0 ? "" : `
    <div style="margin: 18px 0 6px; font-size: 13px; font-weight: 700; color: ${colour}; text-transform: uppercase; letter-spacing: 0.05em;">${title} (${items.length})</div>
    ${items.map((r) => `
      <div style="display: flex; justify-content: space-between; gap: 12px; padding: 9px 12px; background: #f8fafc; border-left: 3px solid ${colour}; border-radius: 4px; margin-bottom: 5px;">
        <span style="font-size: 14px; color: #0f172a; font-weight: 600;">${esc(r.name)}</span>
        <span style="font-size: 13px; color: #475569; white-space: nowrap;">${detail(r)}</span>
      </div>`).join("")}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin: 0; padding: 0; background: #f1f5f9; font-family: Arial, Helvetica, sans-serif;">
    <div style="max-width: 600px; margin: 32px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(26,10,46,0.12);">
      <div style="background: linear-gradient(135deg, #2d1b69 0%, #3d2787 100%); padding: 32px; text-align: center;">
        <div style="font-size: 24px; font-weight: 800; color: #d4a843; margin-bottom: 4px;">Kevria Calc</div>
        <div style="font-size: 18px; font-weight: 600; color: #ffffff;">Your weekly caseload brief</div>
        <div style="font-size: 13px; color: rgba(255,255,255,0.65); margin-top: 4px;">${esc(orgName || "")} &middot; ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" })}</div>
      </div>
      <div style="padding: 28px 32px;">
        <div style="display: flex; gap: 10px; text-align: center; margin-bottom: 8px;">
          <div style="flex: 1; background: #f8fafc; border-radius: 8px; padding: 12px 6px;"><div style="font-size: 20px; font-weight: 800; color: #2d1b69;">${rows.length}</div><div style="font-size: 11px; color: #64748b;">participants</div></div>
          <div style="flex: 1; background: #f8fafc; border-radius: 8px; padding: 12px 6px;"><div style="font-size: 16px; font-weight: 800; color: #b8901a; padding-top: 3px;">${money(totalFunding)}</div><div style="font-size: 11px; color: #64748b;">total funding</div></div>
          <div style="flex: 1; background: #f8fafc; border-radius: 8px; padding: 12px 6px;"><div style="font-size: 16px; font-weight: 800; color: ${totalRemaining < 0 ? "#dc2626" : "#16a34a"}; padding-top: 3px;">${money(totalRemaining)}</div><div style="font-size: 11px; color: #64748b;">planned remaining</div></div>
        </div>
        ${attention === 0
          ? `<div style="margin-top: 18px; padding: 16px; background: #f0fdf4; border-radius: 8px; text-align: center; color: #16a34a; font-weight: 700; font-size: 14px;">Everything is tracking fine — no budgets need attention this week.</div>`
          : section("Over budget", "#dc2626", overBudget, (r) => `${money(-r.b.remaining)} over`)
            + section("Spending ahead of pace", "#ef4444", overPace, (r) => `${money(r.pace.variance)} ahead of expected`)
            + section("Low budget", "#f59e0b", lowBudget, (r) => `${money(r.b.remaining)} left of ${money(r.b.totalFunding)}`)
            + section("Plans ending within 60 days", "#b45309", endingSoon, (r) => `ends ${r.b.planEnd} (${r.endsIn}d)`)
            + section("Plans ended", "#64748b", ended, (r) => `ended ${r.b.planEnd} — start the new period`)}
        <div style="text-align: center; margin: 28px 0 8px;">
          <a href="${DASHBOARD_URL}" style="display: inline-block; background: #2d1b69; color: #ffffff; font-weight: 700; padding: 13px 30px; border-radius: 8px; text-decoration: none; font-size: 15px;">Open the caseload &rarr;</a>
        </div>
      </div>
      <div style="padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 12px; color: #9ca3af; margin: 0 0 4px;">Kevria Calc — built by Kevria. Figures are planned-roster projections (or logged claims where tracked); verify before quoting.</p>
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">Sent every Monday morning. <a href="https://kevriacalc.com/api/digest?u=${userId}&t=${digestToken(userId)}" style="color: #9ca3af;">Unsubscribe from this brief</a></p>
      </div>
    </div>
  </body></html>`;
  return { subject, html };
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Ops controls: ?dry=1 reports who would receive what without sending;
  // ?only=<email> restricts the run to one account (for testing).
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry") === "1";
  const only = (url.searchParams.get("only") || "").toLowerCase();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: authData, error: authError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
  const { data: profiles } = await db.from("profiles").select("id, paid, last_active_at");
  const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

  const activeCutoff = Date.now() - 90 * 86400000;
  let sent = 0, skipped = 0;
  const results: any[] = [];

  for (const u of authData.users) {
    if (sent >= 200) break;
    if (!u.email || !u.email_confirmed_at) { skipped++; continue; }
    if (only && u.email.toLowerCase() !== only) { skipped++; continue; }
    const prof: any = profileById.get(u.id);
    const lastActive = prof?.last_active_at ? Date.parse(prof.last_active_at) : (u.last_sign_in_at ? Date.parse(u.last_sign_in_at) : 0);
    if (!lastActive || lastActive < activeCutoff) { skipped++; continue; }

    try {
      const { data: listRow } = await db.from("participant_lists").select("participants").eq("user_id", u.id).maybeSingle();
      const participants: any[] = (Array.isArray(listRow?.participants) ? listRow!.participants : []).filter((p: any) => p?.id && !p.archived);
      if (participants.length === 0) { skipped++; continue; }

      const { data: dataRows } = await db.from("calculator_data").select("participant_id, data").eq("user_id", u.id);
      const byId = new Map((dataRows || []).map((r: any) => [String(r.participant_id), r.data]));
      const prov: any = byId.get("ndis_provider_details") || {};
      if (prov?.digestOptOut === true) { skipped++; continue; }
      const customHolidays = Array.isArray(prov?.customHolidays) ? prov.customHolidays : [];

      const rows: Row[] = participants.map((p: any) => {
        const b = computeBudget(byId.get("ndis_participant_" + p.id), customHolidays);
        return { name: p.name || "Participant", b, pace: computePace(b), endsIn: daysUntil(b.planEnd) };
      }).filter((r) => r.b.totalFunding > 0 || r.b.planCost > 0);
      if (rows.length === 0) { skipped++; continue; }

      const { subject, html } = buildDigestEmail(prov?.orgName || "", rows, u.id);
      if (!dryRun) await resend.emails.send({ from: FROM, to: u.email, subject, html });
      sent++;
      results.push({ email: u.email, participants: rows.length, subject, ...(dryRun ? { dry: true } : {}) });
    } catch (e: any) {
      results.push({ email: u.email, error: e?.message || "failed" });
    }
  }

  return NextResponse.json({ sent, skipped, results });
}
