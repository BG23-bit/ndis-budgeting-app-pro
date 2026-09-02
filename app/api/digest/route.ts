// One-click unsubscribe for the weekly caseload brief. The link in the email
// carries an HMAC token, so only the recipient's own link works. The flag is
// stored on the account's provider-details row (no schema change needed).
import { createClient } from "@supabase/supabase-js";
import { digestToken } from "@/lib/digest";

export const dynamic = "force-dynamic";

function page(title: string, body: string): Response {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
    <body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
      <div style="background:#fff;border-radius:12px;padding:40px;max-width:440px;text-align:center;box-shadow:0 4px 24px rgba(26,10,46,0.12);">
        <div style="font-size:22px;font-weight:800;color:#2d1b69;margin-bottom:10px;">✦ Kevria Calc</div>
        <div style="font-size:15px;color:#374151;line-height:1.6;">${body}</div>
        <a href="https://kevriacalc.com/dashboard" style="display:inline-block;margin-top:22px;background:#2d1b69;color:#fff;font-weight:700;padding:11px 26px;border-radius:8px;text-decoration:none;font-size:14px;">Open dashboard</a>
      </div>
    </body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function setOptOut(userId: string, optOut: boolean): Promise<void> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: row } = await db.from("calculator_data").select("data").eq("user_id", userId).eq("participant_id", "ndis_provider_details").maybeSingle();
  const merged = { ...((row?.data && typeof row.data === "object") ? row.data : {}), digestOptOut: optOut };
  await db.from("calculator_data").upsert(
    { user_id: userId, participant_id: "ndis_provider_details", data: merged, updated_at: new Date().toISOString() },
    { onConflict: "user_id,participant_id" },
  );
}

function parseLink(req: Request): { userId: string; valid: boolean; resub: boolean } {
  const url = new URL(req.url);
  const userId = url.searchParams.get("u") || "";
  const token = url.searchParams.get("t") || "";
  return { userId, valid: !!userId && !!token && token === digestToken(userId), resub: url.searchParams.get("resub") === "1" };
}

export async function GET(req: Request) {
  const { userId, valid, resub } = parseLink(req);
  if (!valid) {
    return page("Invalid link", "That unsubscribe link isn't valid — it may have been truncated by your mail client. Reply to the email and we'll sort it out.");
  }
  await setOptOut(userId, !resub);
  if (resub) return page("Subscribed", "Welcome back — the weekly caseload brief will land in your inbox each Monday morning again.");
  return page("Unsubscribed", `Done — you won't receive the weekly caseload brief any more. Everything in the app keeps working exactly as before, and you can turn it back on any time from your Company Profile.<br/><br/><a href="${new URL(req.url).pathname}?u=${userId}&t=${digestToken(userId)}&resub=1" style="color:#b8901a;">Changed your mind? Re-subscribe.</a>`);
}

// RFC 8058 one-click unsubscribe: mail clients POST to the List-Unsubscribe
// URL with no user interaction, so this must unsubscribe unconditionally.
export async function POST(req: Request) {
  const { userId, valid } = parseLink(req);
  if (!valid) return new Response("invalid", { status: 400 });
  await setOptOut(userId, true);
  return new Response("unsubscribed", { status: 200 });
}
