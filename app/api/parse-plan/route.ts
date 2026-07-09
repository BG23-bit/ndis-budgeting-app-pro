import Anthropic from "@anthropic-ai/sdk";
import Stripe from "stripe";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildPlanPrompt } from "@/lib/plan-prompt";

const BASE_MONTHLY_LIMIT = 25;
const ADDON_UPLOADS = 25;

// Extra uploads come from the "+25 uploads" add-on subscription, read live from
// Stripe (quantity is stackable) so no extra state needs syncing.
async function getUploadAllowance(stripeCustomerId: string | null): Promise<number> {
  if (!stripeCustomerId || !process.env.STRIPE_ADDON_PRICE_ID || !process.env.STRIPE_SECRET_KEY) {
    return BASE_MONTHLY_LIMIT;
  }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const subs = await stripe.subscriptions.list({ customer: stripeCustomerId, status: "active", limit: 10 });
    let addonQty = 0;
    for (const sub of subs.data) {
      for (const item of sub.items?.data || []) {
        if (item.price?.id === process.env.STRIPE_ADDON_PRICE_ID) addonQty += item.quantity || 0;
      }
    }
    return BASE_MONTHLY_LIMIT + addonQty * ADDON_UPLOADS;
  } catch (e) {
    console.error("Upload allowance lookup failed:", e);
    return BASE_MONTHLY_LIMIT;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify the user is authenticated and has an active subscription
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return Response.json({ error: "Please log in to upload plans." }, { status: 401 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: "Please log in to upload plans." }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("paid, pdf_uploads_today, pdf_upload_date, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.paid) {
      return Response.json({ error: "An active subscription is required to upload plans." }, { status: 403 });
    }

    // Check monthly upload limit (base + any "+25 uploads" add-ons)
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const uploadsThisMonth = profile.pdf_upload_date?.slice(0, 7) === currentMonth
      ? (profile.pdf_uploads_today ?? 0)
      : 0;
    if (uploadsThisMonth >= BASE_MONTHLY_LIMIT) {
      const allowance = await getUploadAllowance(profile.stripe_customer_id ?? null);
      if (uploadsThisMonth >= allowance) {
        return Response.json({
          error: `You've used all ${allowance} plan uploads for this month. Add 25 more for $4.99/mo, or enter plan details manually below. The limit resets at the start of next month.`,
          limitReached: true,
        }, { status: 429 });
      }
    }

    const formData = await req.formData();
    const file = formData.get("pdf") as File;
    if (!file) return Response.json({ error: "No file provided" }, { status: 400 });
    const notes = String(formData.get("notes") || "").slice(0, 2000);

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: buildPlanPrompt(notes),
          },
        ],
      }],
    });

    // Increment monthly upload count
    await supabase
      .from("profiles")
      .update({
        pdf_uploads_today: uploadsThisMonth + 1,
        pdf_upload_date: new Date().toISOString().slice(0, 10),
      })
      .eq("id", user.id);

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    // The model can wrap the JSON in prose; extract the outermost object before parsing.
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    let parsed;
    try {
      parsed = JSON.parse(start >= 0 && end > start ? clean.slice(start, end + 1) : clean);
    } catch {
      console.error("Plan parse error: model returned non-JSON output:", clean.slice(0, 500));
      return Response.json({
        error: "We couldn't read that PDF as an NDIS plan. Try a clearer copy, or enter the plan details manually below.",
      }, { status: 422 });
    }
    return Response.json(parsed);
  } catch (e: any) {
    console.error("Plan parse error:", e);
    return Response.json({
      error: "Something went wrong reading the plan. Please try again, or enter the details manually below.",
    }, { status: 500 });
  }
}
