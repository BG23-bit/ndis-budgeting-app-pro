"use client";
import { supabase } from "./supabase";

// Client-side team context + data facade. Owners (and solo users) talk to
// Supabase directly exactly as before; team members go through /api/team,
// because RLS (correctly) blocks them from reading the owner's rows.

export type TeamCtx = {
  uid: string | null;
  isMember: boolean;
  ownerId: string | null; // whose namespace data lives under (self when not a member)
  ownerEmail?: string;
  ownerPaid?: boolean;
  ownerOrg?: string;
};

let ctxPromise: Promise<TeamCtx> | null = null;

export function teamCtx(): Promise<TeamCtx> {
  if (!ctxPromise) ctxPromise = fetchCtx();
  return ctxPromise;
}
export function resetTeamCtx() { ctxPromise = null; }

async function fetchCtx(): Promise<TeamCtx> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { uid: null, isMember: false, ownerId: null };
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ op: "whoami" }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.isMember) {
      return { uid: session.user.id, isMember: true, ownerId: body.ownerId, ownerEmail: body.ownerEmail, ownerPaid: !!body.ownerPaid, ownerOrg: body.ownerOrg };
    }
    return { uid: session.user.id, isMember: false, ownerId: session.user.id };
  } catch {
    // Offline / API hiccup: behave as a solo user so nothing blocks.
    const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } } as any));
    return { uid: data?.user?.id ?? null, isMember: false, ownerId: data?.user?.id ?? null };
  }
}

async function proxy(op: string, extra: Record<string, any> = {}): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not logged in");
  const res = await fetch("/api/team", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ op, ...extra }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || "Team request failed");
  return body;
}

// ---- data facade ----

export async function dbGet(key: string): Promise<any> {
  const ctx = await teamCtx();
  if (!ctx.uid) return null;
  if (ctx.isMember) return (await proxy("get", { key })).data;
  const { data: row } = await supabase.from("calculator_data").select("data").eq("user_id", ctx.uid).eq("participant_id", key).maybeSingle();
  return row?.data ?? null;
}

export async function dbSet(key: string, data: any): Promise<void> {
  const ctx = await teamCtx();
  if (!ctx.uid) return;
  if (ctx.isMember) { await proxy("set", { key, data }); return; }
  const { error } = await supabase.from("calculator_data").upsert(
    { user_id: ctx.uid, participant_id: key, data, updated_at: new Date().toISOString() },
    { onConflict: "user_id,participant_id" }
  );
  if (error) throw error;
}

export async function dbDelete(key: string): Promise<void> {
  const ctx = await teamCtx();
  if (!ctx.uid) return;
  if (ctx.isMember) { await proxy("del", { key }); return; }
  const { error } = await supabase.from("calculator_data").delete().eq("user_id", ctx.uid).eq("participant_id", key);
  if (error) throw error;
}

export async function dbGetMany(keys: string[]): Promise<{ participant_id: string; data: any }[]> {
  const ctx = await teamCtx();
  if (!ctx.uid || keys.length === 0) return [];
  if (ctx.isMember) return (await proxy("getMany", { keys })).rows;
  const { data: rows } = await supabase.from("calculator_data").select("participant_id, data").eq("user_id", ctx.uid).in("participant_id", keys);
  return rows || [];
}

export async function dbKeys(): Promise<{ participant_id: string; updated_at: string }[]> {
  const ctx = await teamCtx();
  if (!ctx.uid) return [];
  if (ctx.isMember) return (await proxy("keys")).rows;
  const { data: rows } = await supabase.from("calculator_data").select("participant_id, updated_at").eq("user_id", ctx.uid);
  return rows || [];
}

// participant_lists — returns null when no row exists (vs an empty list),
// and throws on a read error so callers can keep the "never save over a
// failed load" guarantee.
export async function dbListGet(): Promise<any[] | null> {
  const ctx = await teamCtx();
  if (!ctx.uid) return null;
  if (ctx.isMember) return (await proxy("listGet")).participants;
  const { data: row, error } = await supabase.from("participant_lists").select("participants").eq("user_id", ctx.uid).maybeSingle();
  if (error) throw error;
  return Array.isArray(row?.participants) ? row.participants : null;
}

export async function dbListSave(participants: any[]): Promise<void> {
  const ctx = await teamCtx();
  if (!ctx.uid) return;
  if (ctx.isMember) { await proxy("listSave", { participants }); return; }
  const { error } = await supabase.from("participant_lists").upsert(
    { user_id: ctx.uid, participants, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

// ---- seat management (owner side) ----
export const teamMembers = () => proxy("members");
export const teamInvite = (email: string) => proxy("invite", { email });
export const teamRemove = (email: string) => proxy("remove", { email });
