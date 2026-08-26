import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { adminClient, getMembersRow, saveMembersRow, resolveTeam, TEAM_META_KEYS, MAX_SEATS, TeamMember } from "@/lib/team-server";

// Team seats API. One route, op-based:
//   whoami                    — who does the caller work as (self or a team owner)
//   members / invite / remove — owner-side seat management
//   listGet / listSave / get / set / del / getMany / keys
//                             — data proxy for members (RLS blocks them client-side)
// Every op authenticates the caller's JWT; data ops re-verify active membership.

const j = (body: any, status = 200) => NextResponse.json(body, { status });

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return j({ error: "Please log in first." }, 401);
    const db = adminClient();
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) return j({ error: "Please log in first." }, 401);
    const body = await req.json();
    const op = String(body?.op || "");
    const email = (user.email || "").toLowerCase();

    if (op === "whoami") {
      const ownerId = await resolveTeam(db, user.id, email);
      if (!ownerId) return j({ isMember: false });
      const [{ data: ownerProfile }, { data: ownerUser }, { data: orgRow }] = await Promise.all([
        db.from("profiles").select("paid").eq("id", ownerId).maybeSingle(),
        db.auth.admin.getUserById(ownerId),
        db.from("calculator_data").select("data").eq("user_id", ownerId).eq("participant_id", "ndis_provider_details").maybeSingle(),
      ]);
      return j({
        isMember: true,
        ownerId,
        ownerEmail: ownerUser?.user?.email || "",
        ownerPaid: !!ownerProfile?.paid,
        ownerOrg: (orgRow?.data as any)?.orgName || "",
      });
    }

    // ---- owner-side seat management ----
    if (op === "members" || op === "invite" || op === "remove") {
      const members = await getMembersRow(db, user.id);
      if (op === "members") return j({ members, maxSeats: MAX_SEATS });

      if (op === "invite") {
        const { data: profile } = await db.from("profiles").select("paid").eq("id", user.id).maybeSingle();
        if (!profile?.paid) return j({ error: "Team seats need an active subscription." }, 403);
        const invitee = String(body?.email || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitee)) return j({ error: "That doesn't look like an email address." }, 400);
        if (invitee === email) return j({ error: "That's your own login — no seat needed." }, 400);
        if (members.some((m) => m.email === invitee)) return j({ error: "Already invited." }, 400);
        if (members.length >= MAX_SEATS) return j({ error: `Your plan includes ${MAX_SEATS} team seats. Remove someone to free one up.` }, 400);

        const entry: TeamMember = { email: invitee, status: "invited", invitedAt: new Date().toISOString() };
        await saveMembersRow(db, user.id, [...members, entry]);

        const { data: orgRow } = await db.from("calculator_data").select("data").eq("user_id", user.id).eq("participant_id", "ndis_provider_details").maybeSingle();
        const orgName = (orgRow?.data as any)?.orgName || user.email;
        try {
          const resend = new Resend(process.env.RESEND_API_KEY!);
          await resend.emails.send({
            from: "Kevria Calc <support@kevria.com>",
            to: invitee,
            subject: `${orgName} invited you to their Kevria Calc workspace`,
            html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
              <p style="font-size:1.05rem"><strong>${String(orgName).replace(/</g, "&lt;")}</strong> has invited you to work in their Kevria Calc workspace — shared participants, budgets, rosters and documents.</p>
              <p>Log in (or create an account) with <strong>this email address</strong> and the workspace connects automatically:</p>
              <p style="margin:28px 0"><a href="https://kevriacalc.com/login" style="background:#d4a843;color:#0f172a;padding:13px 30px;border-radius:9px;text-decoration:none;font-weight:700">Open Kevria Calc</a></p>
              <p style="color:#64748b;font-size:0.85rem">If you weren't expecting this, you can ignore this email. Questions? support@kevria.com</p>
            </div>`,
          });
        } catch (e) {
          console.error("Invite email failed:", e);
        }
        return j({ members: [...members, entry], maxSeats: MAX_SEATS });
      }

      // remove
      const target = String(body?.email || "").trim().toLowerCase();
      const entry = members.find((m) => m.email === target);
      if (!entry) return j({ error: "Not on your team." }, 404);
      const next = members.filter((m) => m.email !== target);
      await saveMembersRow(db, user.id, next);
      if (entry.user_id) {
        await db.from("calculator_data").delete().eq("user_id", entry.user_id).eq("participant_id", "team_link");
      }
      return j({ members: next, maxSeats: MAX_SEATS });
    }

    // ---- data proxy for members ----
    const ownerId = await resolveTeam(db, user.id, email);
    if (!ownerId) return j({ error: "You're not part of a team workspace." }, 403);

    if (op === "listGet") {
      const { data: row } = await db.from("participant_lists").select("participants").eq("user_id", ownerId).maybeSingle();
      return j({ participants: Array.isArray(row?.participants) ? row.participants : null });
    }
    if (op === "listSave") {
      const participants = Array.isArray(body?.participants) ? body.participants : null;
      if (!participants) return j({ error: "Bad list." }, 400);
      await db.from("participant_lists").upsert(
        { user_id: ownerId, participants, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      return j({ ok: true });
    }

    const key = typeof body?.key === "string" ? body.key : "";
    if (TEAM_META_KEYS.includes(key)) return j({ error: "Reserved key." }, 400);

    if (op === "get") {
      const { data: row } = await db.from("calculator_data").select("data").eq("user_id", ownerId).eq("participant_id", key).maybeSingle();
      return j({ data: row?.data ?? null });
    }
    if (op === "set") {
      await db.from("calculator_data").upsert(
        { user_id: ownerId, participant_id: key, data: body?.data ?? {}, updated_at: new Date().toISOString() },
        { onConflict: "user_id,participant_id" }
      );
      return j({ ok: true });
    }
    if (op === "del") {
      await db.from("calculator_data").delete().eq("user_id", ownerId).eq("participant_id", key);
      return j({ ok: true });
    }
    if (op === "getMany") {
      const keys = (Array.isArray(body?.keys) ? body.keys : []).filter((k: any) => typeof k === "string" && !TEAM_META_KEYS.includes(k)).slice(0, 500);
      const { data: rows } = await db.from("calculator_data").select("participant_id, data").eq("user_id", ownerId).in("participant_id", keys);
      return j({ rows: rows || [] });
    }
    if (op === "keys") {
      const { data: rows } = await db.from("calculator_data").select("participant_id, updated_at").eq("user_id", ownerId);
      return j({ rows: (rows || []).filter((r: any) => !TEAM_META_KEYS.includes(String(r.participant_id))) });
    }

    return j({ error: "Unknown op." }, 400);
  } catch (e) {
    console.error("Team API error:", e);
    return j({ error: "Something went wrong — try again." }, 500);
  }
}
