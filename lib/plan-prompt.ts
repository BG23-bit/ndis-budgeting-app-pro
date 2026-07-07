// Extraction prompt for /api/parse-plan. Kept here (not in the route) so
// scripts/parse-plan-live-test.ts can exercise exactly what production sends.

// Standalone notes → roster translation (used by /api/roster-notes after budgets exist)
export function buildRosterPrompt(notes: string, lines: { code: string; description: string; totalFunding: number }[], planStart?: string, planEnd?: string, state?: string): string {
  return `You are converting a support provider's notes into a weekly roster for an NDIS budgeting tool.

The participant's current support lines (budgets) are:
${lines.map((l) => `- code ${l.code}: ${l.description} — total funding $${(l.totalFunding || 0).toFixed(2)}`).join("\n")}
${planStart && planEnd ? `Plan period: ${planStart} to ${planEnd}.` : ""}${state ? ` State: ${state}.` : ""}

Provider notes:
"""
${notes}
"""

Return ONLY a valid JSON object — no markdown, no extra text:
{
  "proposedRoster": [
    {
      "categoryCode": "2-digit string — MUST be one of the codes listed above",
      "days": { "mon": {"hours": number, "nightHours": number}, "tue": {"hours": number, "nightHours": number} },
      "frequency": "every|2nd|3rd|4th|monthly",
      "activeSleepoverHoursPerWeek": number,
      "sleepoversPerWeek": number,
      "kmsPerWeek": number
    }
  ]
}

Rules:
- "each weekday" / "weekdays" = mon, tue, wed, thu, fri. "weekend" = sat and sun. An amount "per weekend" with no per-day split means that many hours across the whole weekend (split evenly between sat and sun); "each weekend day" means that many hours on sat AND sun.
- Hours delivered between 6am and 8pm are daytime "hours". Any portion between 8pm and midnight is "nightHours". A sleepover / overnight stay = sleepoversPerWeek (e.g. "sleepover every night" = 7). Awake overnight support = activeSleepoverHoursPerWeek.
- Put hours on the line whose budget they draw from: under a flexible Core budget, daily living AND community access hours both draw from that Core line — combine hours for the same code by summing per day. Only roster-based core supports (codes 01, 04, 08, 16, 21) get entries; ignore therapy, coordination or plan-management hours.
- Round hours to the nearest quarter hour. Do not invent supports that are not described in the notes. If the notes don't describe any roster supports, return {"proposedRoster": []}.`;
}

export function buildPlanPrompt(notes?: string | null): string {
  let prompt = `You are extracting data from an Australian NDIS (National Disability Insurance Scheme) plan or service agreement document.

Extract the following and return ONLY a valid JSON object — no markdown, no extra text:

{
  "planStart": "YYYY-MM-DD or null",
  "planEnd": "YYYY-MM-DD or null",
  "state": "VIC|NSW|QLD|SA|WA|TAS|NT|ACT or null",
  "participantName": "string or null",
  "ndisNumber": "string or null",
  "planTotal": "number or null — the plan's stated total funding amount",
  "supportLines": [
    {
      "code": "2-digit string e.g. 01",
      "description": "string",
      "totalFunding": number
    }
  ],
  "proposedRoster": [
    {
      "categoryCode": "2-digit string matching a supportLines code",
      "days": { "mon": {"hours": number, "nightHours": number}, "tue": {"hours": number, "nightHours": number} },
      "frequency": "every|2nd|3rd|4th|monthly",
      "activeSleepoverHoursPerWeek": number,
      "sleepoversPerWeek": number,
      "kmsPerWeek": number
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
01 = Daily Activities (Core Supports — also use for flexible Core budgets)
02 = Transport (Core Supports)
03 = Consumables (Core Supports)
04 = Social & Community Participation (Core Supports)
05 = Assistive Technology
06 = Home Modifications
07 = Support Coordination (incl. Psychosocial Recovery Coaches)
08 = Improved Living Arrangements
09 = Increased Social & Community Participation
10 = Finding & Keeping a Job
11 = Improved Relationships (Behaviour Support)
12 = Improved Health & Wellbeing
13 = Improved Learning
14 = Improved Life Choices (Plan Management / "Choice and Control")
15 = Improved Daily Living
16 = Home and Living
17 = Specialist Disability Accommodation
18 = Recurring Transport

CRITICAL RULES for supportLines:
1. Every funding amount in the plan must appear in supportLines EXACTLY ONCE. NEVER output the same dollar amount under two different codes.
2. Newer NDIA plans list FUNDING COMPONENTS, each with a single "Funding amount: $X" (e.g. "Core Flexible", "Core - Stated", "Choice and Control", "Improved Daily Living Skills", "Behaviour Support", "Support Coordination and Psychosocial Recovery Coaches", "Recurring Transport"). A FLEXIBLE component often lists several support categories it "can be used for" — that is still ONE budget, not one budget per category. Output ONE supportLine per funding component, keeping the component name as the description. Map: Core Flexible → 01; Choice and Control → 14; Improved Daily Living Skills → 15; Behaviour Support → 11; Support Coordination and Psychosocial Recovery Coaches → 07; Recurring Transport → 18; Home and Living → 16.
3. Older plans state separate per-category amounts directly (e.g. "Assistance with Daily Life $X" and "Social & Community Participation $Y" each with their own amount) — output one line per stated amount as usual.
4. Skip any component whose funding amount is $0.00.
5. Set planTotal to the plan's stated total funding amount. Before answering, verify your supportLines amounts sum to planTotal — if they don't, you have duplicated or missed a component; re-read the document and correct it.

For scheduleOfSupports: extract every line item from the Schedule of Supports / Annexure table. Use rateType to classify: look at the service description for keywords like "Weekday", "Saturday", "Sunday", "Public Holiday", "Night", "Weekly", "Establishment". If the description says "Saturday" → "saturday", "Sunday" → "sunday", "Public Holiday" → "publicHoliday", "Night" or "Evening" → "weekdayNight", "Weekly" or "week" in hours → "weekly", otherwise "weekday". Plain numbers only (no $ symbol). Extract ALL line items found.

For specificRequirements: look for a "Specific Requirements" section with checkboxes. true = Yes is checked, false = No is checked, null = not found.

For establishmentFee: look for an establishment fee amount. null if not present.

If a field is not present in the document use null. Convert dates to YYYY-MM-DD.`;

  const trimmed = (notes || "").trim();
  if (!trimmed) {
    prompt += `\n\nNo provider notes were given, so "proposedRoster" must be [].`;
  } else {
    prompt += `

PROVIDER NOTES — the provider described the supports they intend to deliver for this participant:
"""
${trimmed}
"""

Translate these notes into proposedRoster entries using these rules:
- "each weekday" / "weekdays" = mon, tue, wed, thu, fri. "weekend" = sat and sun. An amount "per weekend" with no per-day split means that many hours across the whole weekend (split evenly between sat and sun); "each weekend day" means that many hours on sat AND sun.
- Hours delivered between 6am and 8pm are daytime "hours". Any portion between 8pm and midnight is "nightHours". A sleepover / overnight stay = sleepoversPerWeek (e.g. "sleepover every night" = 7). Awake overnight support = activeSleepoverHoursPerWeek.
- Set categoryCode to the supportLines code whose budget those hours draw from. Under a flexible Core budget, daily living AND community access hours both draw from that Core line (usually 01) — combine hours for the same code by summing per day.
- Only roster-based core supports (codes 01, 04, 08, 16, 21) get proposedRoster entries. Ignore therapy, coordination or plan-management hours here.
- Round hours to the nearest quarter hour. Do not invent supports that are not described in the notes. If the notes don't describe any roster supports, return [].`;
  }
  return prompt;
}
