import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const { data: profile } = await supabase.from("profiles").select("paid").eq("id", user.id).single();
    if (!profile?.paid) {
      return Response.json({ error: "An active subscription is required to upload plans." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("pdf") as File;
    if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
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
            text: `You are extracting data from an Australian NDIS (National Disability Insurance Scheme) plan document.

Extract the following and return ONLY a valid JSON object — no markdown, no extra text:

{
  "planStart": "YYYY-MM-DD or null",
  "planEnd": "YYYY-MM-DD or null",
  "state": "VIC|NSW|QLD|SA|WA|TAS|NT|ACT or null",
  "participantName": "string or null",
  "ndisNumber": "string or null",
  "supportLines": [
    {
      "code": "2-digit string e.g. 01",
      "description": "string",
      "totalFunding": number
    }
  ]
}

NDIS support category codes:
01 = Daily Activities (Core Supports)
02 = Transport (Core Supports)
03 = Consumables (Core Supports)
04 = Social & Community Participation (Core Supports)
05 = Assistive Technology
06 = Home Modifications
07 = Support Coordination
08 = Improved Living Arrangements
09 = Increased Social & Community Participation
10 = Finding & Keeping a Job
11 = Improved Health & Wellbeing
12 = Improved Learning
13 = Improved Life Choices
14 = Improved Daily Living Skills
15 = Improved Relationships

Extract ALL funding line items. If a field is not present in the document use null. Convert dates to YYYY-MM-DD. Funding amounts must be plain numbers (no $ symbol).`,
          },
        ],
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);
    return Response.json(parsed);
  } catch (e: any) {
    console.error("Plan parse error:", e);
    return Response.json({ error: e.message || "Failed to parse plan" }, { status: 500 });
  }
}
