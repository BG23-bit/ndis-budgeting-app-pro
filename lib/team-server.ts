import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Team seats (server side). No schema changes: membership lives in two
// calculator_data meta rows, everything else goes through the service role.
//   - owner's row  participant_id "team_members": { members: [{email, user_id?, status, invitedAt}] }
//   - member's row participant_id "team_link":    { owner_id, owner_email }
// RLS still blocks members from the owner's rows client-side, so member data
// access is proxied through /api/team with the checks below.

export const TEAM_META_KEYS = ["team_members", "team_link"];
export const MAX_SEATS = 5;

export type TeamMember = { email: string; user_id?: string; status: "invited" | "active"; invitedAt: string };

export function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function getMembersRow(db: SupabaseClient, ownerId: string): Promise<TeamMember[]> {
  const { data } = await db.from("calculator_data").select("data").eq("user_id", ownerId).eq("participant_id", "team_members").maybeSingle();
  const list = (data?.data as any)?.members;
  return Array.isArray(list) ? list : [];
}

export async function saveMembersRow(db: SupabaseClient, ownerId: string, members: TeamMember[]) {
  await db.from("calculator_data").upsert(
    { user_id: ownerId, participant_id: "team_members", data: { members }, updated_at: new Date().toISOString() },
    { onConflict: "user_id,participant_id" }
  );
}

// Resolves who the caller works as: themselves, or the team owner whose
// workspace they belong to. Also self-heals a pending invite on first login
// (matches by email, records the user_id, writes the reverse link row).
export async function resolveTeam(db: SupabaseClient, userId: string, email: string | undefined) {
  const { data: link } = await db.from("calculator_data").select("data").eq("user_id", userId).eq("participant_id", "team_link").maybeSingle();
  let ownerId: string | null = (link?.data as any)?.owner_id || null;

  if (ownerId) {
    // Verify the membership still stands — removal deletes the link row, but
    // check the source of truth anyway.
    const members = await getMembersRow(db, ownerId);
    const me = members.find((m) => m.user_id === userId && m.status === "active");
    if (!me) {
      await db.from("calculator_data").delete().eq("user_id", userId).eq("participant_id", "team_link");
      ownerId = null;
    }
  }

  if (!ownerId && email) {
    // Pending invite? jsonb containment finds the owner row holding this email.
    const { data: rows } = await db
      .from("calculator_data")
      .select("user_id, data")
      .eq("participant_id", "team_members")
      .contains("data", { members: [{ email: email.toLowerCase() }] })
      .limit(1);
    const row = rows?.[0];
    if (row && row.user_id !== userId) {
      const members: TeamMember[] = ((row.data as any)?.members || []).map((m: TeamMember) =>
        m.email === email.toLowerCase() ? { ...m, user_id: userId, status: "active" as const } : m
      );
      await saveMembersRow(db, row.user_id, members);
      const { data: ownerUser } = await db.auth.admin.getUserById(row.user_id);
      await db.from("calculator_data").upsert(
        { user_id: userId, participant_id: "team_link", data: { owner_id: row.user_id, owner_email: ownerUser?.user?.email || "" }, updated_at: new Date().toISOString() },
        { onConflict: "user_id,participant_id" }
      );
      ownerId = row.user_id;
    }
  }

  return ownerId; // null = works as themselves
}

// Paid check that lets team members inherit the owner's subscription.
export async function effectivePaid(db: SupabaseClient, userId: string, email?: string): Promise<boolean> {
  const { data: profile } = await db.from("profiles").select("paid").eq("id", userId).maybeSingle();
  if (profile?.paid) return true;
  const ownerId = await resolveTeam(db, userId, email);
  if (!ownerId) return false;
  const { data: owner } = await db.from("profiles").select("paid").eq("id", ownerId).maybeSingle();
  return !!owner?.paid;
}
