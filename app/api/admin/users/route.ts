import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "brent@kevria.com";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getRequestingEmail(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await getSupabase().auth.getUser(token);
  return user?.email ?? null;
}

export async function GET(req: Request) {
  const email = await getRequestingEmail(req);
  if (email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabase();
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  const { data: profiles } = await supabase.from("profiles").select("id, paid, subscription_status, welcome_sent_at, followup1_sent_at, followup2_sent_at, last_active_at");
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const users = authUsers.users.map((u) => {
    const profile = profileMap.get(u.id) as any;
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      paid: profile?.paid ?? false,
      subscription_status: profile?.subscription_status ?? null,
      welcome_sent_at: profile?.welcome_sent_at ?? null,
      followup1_sent_at: profile?.followup1_sent_at ?? null,
      followup2_sent_at: profile?.followup2_sent_at ?? null,
      // Real per-app-open activity (precise). Null until the user opens the
      // app after this feature shipped.
      last_active_at: profile?.last_active_at ?? null,
      // Supabase Auth's last *fresh* sign-in. Shown as a fallback, but it does
      // NOT update on silent token refresh, so it understates active users.
      last_sign_in_at: u.last_sign_in_at ?? null,
    };
  });

  // Sort by the best signal we have for each user (real activity, else sign-in).
  const signal = (u: { last_active_at: string | null; last_sign_in_at: string | null }) =>
    u.last_active_at ? new Date(u.last_active_at).getTime() : u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
  users.sort((a, b) => {
    const d = signal(b) - signal(a);
    return d !== 0 ? d : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return NextResponse.json({ users });
}

export async function PATCH(req: Request) {
  const email = await getRequestingEmail(req);
  if (email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, paid } = await req.json();
  if (!userId || typeof paid !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { error } = await getSupabase()
    .from("profiles")
    .upsert({
      id: userId,
      paid,
      subscription_status: paid ? "staff" : "canceled",
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
