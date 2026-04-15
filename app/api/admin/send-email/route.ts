import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmailForUser } from "@/app/api/cron/email-followups/route";

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

  const { userId, type } = await req.json();
  if (!userId || !["welcome", "followup1", "followup2"].includes(type)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Get the user's email from auth
  const { data: authUser, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !authUser.user?.email) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await sendEmailForUser(userId, authUser.user.email, type);

  return NextResponse.json({ success: true });
}
