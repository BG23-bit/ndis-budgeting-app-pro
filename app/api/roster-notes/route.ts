import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildRosterPrompt, buildClinicalNotesPrompt } from "@/lib/plan-prompt";

// Translates provider notes into a proposed weekly roster against the
// participant's existing support lines. Text-only — does not count toward
// the monthly PDF upload limit.
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return Response.json({ error: "Please log in first." }, { status: 401 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: "Please log in first." }, { status: 401 });
    }
    const { data: profile } = await supabase.from("profiles").select("paid").eq("id", user.id).single();
    if (!profile?.paid) {
      return Response.json({ error: "An active subscription is required." }, { status: 403 });
    }

    // Generous monthly cap (500) as runaway/abuse protection — stored in
    // calculator_data so no schema change is needed. ~0.5c per call.
    const MONTHLY_NOTES_LIMIT = 500;
    const month = new Date().toISOString().slice(0, 7);
    const { data: usageRow } = await supabase
      .from("calculator_data").select("data")
      .eq("user_id", user.id).eq("participant_id", "roster_notes_usage").maybeSingle();
    const usage = (usageRow?.data as any)?.month === month ? Number((usageRow?.data as any)?.count) || 0 : 0;
    if (usage >= MONTHLY_NOTES_LIMIT) {
      return Response.json({
        error: `You've hit this month's auto-fill limit (${MONTHLY_NOTES_LIMIT}). It resets at the start of next month — you can still fill the roster manually.`,
      }, { status: 429 });
    }
    await supabase.from("calculator_data").upsert(
      { user_id: user.id, participant_id: "roster_notes_usage", data: { month, count: usage + 1 }, updated_at: new Date().toISOString() },
      { onConflict: "user_id,participant_id" }
    );

    const body = await req.json();
    const mode = body?.mode === "clinical" ? "clinical" : "roster";
    const notes = String(body?.notes || "").slice(0, 2000).trim();
    const lines = Array.isArray(body?.lines)
      ? body.lines.slice(0, 30).map((l: any) => ({
          code: String(l?.code || "").slice(0, 2),
          description: String(l?.description || "").slice(0, 120),
          totalFunding: Number(l?.totalFunding) || 0,
        }))
      : [];
    if (!notes) return Response.json({ error: "Add some notes describing the supports first." }, { status: 400 });
    if (mode === "roster" && lines.length === 0) return Response.json({ error: "Add at least one support line (or upload a plan) first." }, { status: 400 });

    const prompt = mode === "clinical"
      ? buildClinicalNotesPrompt(notes, Number(body?.funding) || 0, body?.planStart, body?.planEnd)
      : buildRosterPrompt(notes, lines, body?.planStart, body?.planEnd, body?.state);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 6000,
      messages: [{
        role: "user",
        content: [{ type: "text", text: prompt }],
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    let parsed;
    try {
      parsed = JSON.parse(start >= 0 && end > start ? clean.slice(start, end + 1) : clean);
    } catch {
      console.error("Roster notes parse error: non-JSON output:", clean.slice(0, 300));
      return Response.json({ error: "Couldn't turn those notes into a roster. Try describing days and hours more plainly." }, { status: 422 });
    }
    if (mode === "clinical") {
      return Response.json({ services: Array.isArray(parsed?.services) ? parsed.services : [] });
    }
    return Response.json({ proposedRoster: Array.isArray(parsed?.proposedRoster) ? parsed.proposedRoster : [] });
  } catch (e: any) {
    console.error("Roster notes error:", e);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
