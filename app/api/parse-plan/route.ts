import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildPlanPrompt } from "@/lib/plan-prompt";

const MONTHLY_LIMIT = 100;

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
      .select("paid, pdf_uploads_today, pdf_upload_date")
      .eq("id", user.id)
      .single();

    if (!profile?.paid) {
      return Response.json({ error: "An active subscription is required to upload plans." }, { status: 403 });
    }

    // Check monthly upload limit
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const uploadsThisMonth = profile.pdf_upload_date?.slice(0, 7) === currentMonth
      ? (profile.pdf_uploads_today ?? 0)
      : 0;
    if (uploadsThisMonth >= MONTHLY_LIMIT) {
      return Response.json({
        error: `Monthly PDF upload limit reached (${MONTHLY_LIMIT}/month). You can still enter plan details manually below. Limit resets at the start of next month.`,
      }, { status: 429 });
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
