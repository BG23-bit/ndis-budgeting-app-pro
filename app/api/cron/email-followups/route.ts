import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FROM = "NDIS Budget Pro <support@kevria.com>";
const DASHBOARD_URL = "https://kevriacalc.com/dashboard";
const UPGRADE_URL = "https://kevriacalc.com/#pricing";

function emailHeader(title: string, subtitle: string) {
  return `
    <div style="background: linear-gradient(135deg, #1a0a2e 0%, #2d1554 100%); padding: 40px 32px; border-radius: 12px 12px 0 0; text-align: center;">
      <div style="font-size: 28px; font-weight: 800; color: #d4a843; margin-bottom: 6px; letter-spacing: -0.5px;">NDIS Budget Pro</div>
      <div style="font-size: 20px; font-weight: 600; color: #e8e0f0; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 14px; color: #9880b8;">${subtitle}</div>
    </div>
  `;
}

function emailFooter() {
  return `
    <div style="padding: 24px 32px; text-align: center; border-top: 1px solid #e8e0f0;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0 0 4px;">NDIS Budget Pro — built by Kevria</p>
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">Questions? Reply to this email or visit <a href="https://kevriacalc.com" style="color: #d4a843;">kevriacalc.com</a></p>
    </div>
  `;
}

function ctaButton(text: string, url: string) {
  return `
    <div style="text-align: center; margin: 28px 0;">
      <a href="${url}" style="display: inline-block; background: #d4a843; color: #1a0a2e; font-weight: 700; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; letter-spacing: 0.3px;">${text}</a>
    </div>
  `;
}

function buildWelcomeEmail(email: string) {
  const firstName = email.split("@")[0].split(".")[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin: 0; padding: 0; background: #f4f0fa; font-family: Arial, Helvetica, sans-serif;">
      <div style="max-width: 600px; margin: 32px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(26,10,46,0.12);">
        ${emailHeader("Welcome aboard!", "Your NDIS budgeting toolkit is ready")}
        <div style="padding: 32px;">
          <p style="font-size: 16px; color: #1a0a2e; margin: 0 0 16px;">Hi ${displayName},</p>
          <p style="font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 16px;">
            Thanks for signing up to <strong>NDIS Budget Pro</strong>. You now have access to Australia's most practical NDIS budget calculator — built specifically for support coordinators and plan managers.
          </p>
          <div style="background: #f9f5ff; border-left: 4px solid #d4a843; border-radius: 4px; padding: 16px 20px; margin: 24px 0;">
            <p style="font-size: 14px; font-weight: 700; color: #1a0a2e; margin: 0 0 10px;">Get started in 3 steps:</p>
            <p style="font-size: 14px; color: #4b5563; margin: 0 0 6px;">1. Add a participant via your dashboard</p>
            <p style="font-size: 14px; color: #4b5563; margin: 0 0 6px;">2. Enter their plan dates, state, and support line funding</p>
            <p style="font-size: 14px; color: #4b5563; margin: 0;">3. Build rosters and track actual spend against budget</p>
          </div>
          ${ctaButton("Open My Dashboard →", DASHBOARD_URL)}
          <div style="background: #1a0a2e; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
            <p style="font-size: 13px; font-weight: 700; color: #d4a843; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px;">Upgrade to unlock everything</p>
            <p style="font-size: 13px; color: #c8b8e0; margin: 0 0 6px;">✓ Unlimited participants</p>
            <p style="font-size: 13px; color: #c8b8e0; margin: 0 0 6px;">✓ PDF plan upload (auto-extract dates & funding)</p>
            <p style="font-size: 13px; color: #c8b8e0; margin: 0 0 12px;">✓ Claims & actual spend tracking</p>
            <p style="font-size: 13px; color: #9880b8; margin: 0;">From <strong style="color: #d4a843;">$9.99/month</strong> or $79/year (save 34%)</p>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin: 0;">Any questions — just reply to this email.</p>
        </div>
        ${emailFooter()}
      </div>
    </body>
    </html>
  `;

  return {
    subject: "Welcome to NDIS Budget Pro",
    html,
  };
}

function buildFollowup1Email(email: string) {
  const firstName = email.split("@")[0].split(".")[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin: 0; padding: 0; background: #f4f0fa; font-family: Arial, Helvetica, sans-serif;">
      <div style="max-width: 600px; margin: 32px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(26,10,46,0.12);">
        ${emailHeader("Getting the most out of NDIS Budget Pro", "A few things worth knowing")}
        <div style="padding: 32px;">
          <p style="font-size: 16px; color: #1a0a2e; margin: 0 0 16px;">Hi ${displayName},</p>
          <p style="font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 16px;">
            You signed up a few days ago — how's the planning going? Here are a few features that support coordinators tell us save them the most time:
          </p>
          <div style="margin: 20px 0;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 16px; padding: 16px; background: #f9f5ff; border-radius: 8px;">
              <div style="font-size: 24px; margin-right: 14px;">📄</div>
              <div>
                <p style="font-size: 14px; font-weight: 700; color: #1a0a2e; margin: 0 0 4px;">PDF Plan Upload</p>
                <p style="font-size: 13px; color: #6b7280; margin: 0;">Upload an NDIS plan PDF and we'll auto-extract the plan dates, state, and funding amounts for each support line.</p>
              </div>
            </div>
            <div style="display: flex; align-items: flex-start; margin-bottom: 16px; padding: 16px; background: #f9f5ff; border-radius: 8px;">
              <div style="font-size: 24px; margin-right: 14px;">📊</div>
              <div>
                <p style="font-size: 14px; font-weight: 700; color: #1a0a2e; margin: 0 0 4px;">Plan Pace Tracker</p>
                <p style="font-size: 13px; color: #6b7280; margin: 0;">See if a participant is ahead or behind on spending — updated automatically as you log actual spend against each support line.</p>
              </div>
            </div>
            <div style="display: flex; align-items: flex-start; padding: 16px; background: #f9f5ff; border-radius: 8px;">
              <div style="font-size: 24px; margin-right: 14px;">🗓️</div>
              <div>
                <p style="font-size: 14px; font-weight: 700; color: #1a0a2e; margin: 0 0 4px;">Public Holiday-Aware Rosters</p>
                <p style="font-size: 13px; color: #6b7280; margin: 0;">Build weekly rosters with correct NDIS rates applied automatically, including public holidays by state.</p>
              </div>
            </div>
          </div>
          ${ctaButton("Take Me to My Dashboard →", DASHBOARD_URL)}
          <p style="font-size: 14px; color: #6b7280; margin: 16px 0 0; text-align: center;">
            Not on a plan yet? <a href="${UPGRADE_URL}" style="color: #d4a843; font-weight: 600;">View pricing →</a>
          </p>
        </div>
        ${emailFooter()}
      </div>
    </body>
    </html>
  `;

  return {
    subject: "How's your NDIS planning going?",
    html,
  };
}

function buildFollowup2Email(email: string) {
  const firstName = email.split("@")[0].split(".")[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin: 0; padding: 0; background: #f4f0fa; font-family: Arial, Helvetica, sans-serif;">
      <div style="max-width: 600px; margin: 32px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(26,10,46,0.12);">
        ${emailHeader("Still figuring things out?", "We're here to help")}
        <div style="padding: 32px;">
          <p style="font-size: 16px; color: #1a0a2e; margin: 0 0 16px;">Hi ${displayName},</p>
          <p style="font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 20px;">
            It's been a week since you joined NDIS Budget Pro. If you haven't had a chance to properly try it yet — or if something's not clicking — reply to this email and I'll help you get set up personally.
          </p>
          <div style="background: #1a0a2e; border-radius: 10px; padding: 24px 28px; margin: 24px 0; text-align: center;">
            <p style="font-size: 13px; font-weight: 700; color: #d4a843; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Upgrade today</p>
            <p style="font-size: 28px; font-weight: 800; color: #e8e0f0; margin: 0 0 4px;">$9.99<span style="font-size: 16px; font-weight: 400; color: #9880b8;">/month</span></p>
            <p style="font-size: 13px; color: #9880b8; margin: 0 0 16px;">or $79/year — save 34%</p>
            <a href="${UPGRADE_URL}" style="display: inline-block; background: #d4a843; color: #1a0a2e; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">Unlock Full Access →</a>
          </div>
          <p style="font-size: 14px; color: #374151; line-height: 1.7; margin: 0 0 8px;">NDIS Budget Pro is used by support coordinators across Australia to:</p>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 4px;">✓ Stay on top of participant budgets in real time</p>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 4px;">✓ Build accurate rosters with correct NDIS rates</p>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 20px;">✓ Track claims and actual spend per support line</p>
          <p style="font-size: 14px; color: #9ca3af; margin: 0; font-style: italic;">This is the last email we'll send about upgrading — promise. But if you ever have a question, reply anytime.</p>
        </div>
        ${emailFooter()}
      </div>
    </body>
    </html>
  `;

  return {
    subject: "One last thing from us — NDIS Budget Pro",
    html,
  };
}

export async function sendEmailForUser(userId: string, userEmail: string, type: "welcome" | "followup1" | "followup2") {
  let subject: string;
  let html: string;

  if (type === "welcome") {
    ({ subject, html } = buildWelcomeEmail(userEmail));
  } else if (type === "followup1") {
    ({ subject, html } = buildFollowup1Email(userEmail));
  } else {
    ({ subject, html } = buildFollowup2Email(userEmail));
  }

  await resend.emails.send({ from: FROM, to: userEmail, subject, html });

  const column = type === "welcome" ? "welcome_sent_at" : type === "followup1" ? "followup1_sent_at" : "followup2_sent_at";
  await supabase.from("profiles").update({ [column]: new Date().toISOString() }).eq("id", userId);
}

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const day3Cutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const day7Cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get all auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // Get all profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, paid, welcome_sent_at, followup1_sent_at, followup2_sent_at");

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const results = { welcome: 0, followup1: 0, followup2: 0, errors: 0 };

  for (const user of authData.users) {
    if (!user.email) continue;
    const profile = profileMap.get(user.id) as any;
    if (!profile) continue;

    const createdAt = user.created_at;

    try {
      // Welcome email — send to anyone who hasn't received it yet
      if (!profile.welcome_sent_at) {
        await sendEmailForUser(user.id, user.email, "welcome");
        results.welcome++;
        continue; // don't stack emails on same run
      }

      // Skip paid users for follow-ups
      if (profile.paid) continue;

      // Day 3 follow-up
      if (!profile.followup1_sent_at && createdAt <= day3Cutoff) {
        await sendEmailForUser(user.id, user.email, "followup1");
        results.followup1++;
        continue;
      }

      // Day 7 follow-up
      if (!profile.followup2_sent_at && profile.followup1_sent_at && createdAt <= day7Cutoff) {
        await sendEmailForUser(user.id, user.email, "followup2");
        results.followup2++;
      }
    } catch (err) {
      console.error(`Email error for ${user.email}:`, err);
      results.errors++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
