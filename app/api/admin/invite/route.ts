import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "brent@kevria.com";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Create/invite the user — sends them an email with a link to set their password
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: "https://kevriacalc.com/dashboard",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Grant paid/staff access immediately
  await supabase.from("profiles").upsert({
    id: data.user.id,
    paid: true,
    subscription_status: "staff",
  });

  return NextResponse.json({ success: true });
}
