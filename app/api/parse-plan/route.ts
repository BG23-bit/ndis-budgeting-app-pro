import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
            text: `You are extracting data from an Australian NDIS (National Disability Insurance Scheme) plan or service agreement document.

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
  ],
  "specificRequirements": {
    "behavioursOfConcern": true or false or null,
    "regulatedRestrictivePractice": true or false or null,
    "medicationManagement": true or false or null
  },
  "establishmentFee": number or null,
  "scheduleOfSupports": [
    {
      "supportCategory": "string — description of the service e.g. Assistance in Supported Independent Living - Weekly",
      "itemNumber": "string — NDIS item number e.g. 01_821_0115_1_1",
      "categoryCode": "2-digit string — first 2 chars of item number e.g. 01",
      "price": number,
      "hoursRequired": number or null,
      "totalCost": number or null,
      "rateType": "weekday|weekdayNight|saturday|sunday|publicHoliday|weekly|fixed|other"
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

For scheduleOfSupports: extract every line item from the Schedule of Supports / Annexure table. Use rateType to classify: look at the service description for keywords like "Weekday", "Saturday", "Sunday", "Public Holiday", "Night", "Weekly", "Establishment". If the description says "Saturday" → "saturday", "Sunday" → "sunday", "Public Holiday" → "publicHoliday", "Night" or "Evening" → "weekdayNight", "Weekly" or "week" in hours → "weekly", otherwise "weekday". Plain numbers only (no $ symbol). Extract ALL line items found.

For specificRequirements: look for a "Specific Requirements" section with checkboxes. true = Yes is checked, false = No is checked, null = not found.

For establishmentFee: look for an establishment fee amount. null if not present.

If a field is not present in the document use null. Convert dates to YYYY-MM-DD.`,
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
    const parsed = JSON.parse(clean);
    return Response.json(parsed);
  } catch (e: any) {
    console.error("Plan parse error:", e);
    return Response.json({ error: e.message || "Failed to parse plan" }, { status: 500 });
  }
}
