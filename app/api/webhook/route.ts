import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function setActiveByUserId(userId: string, customerId: string) {
  await getSupabase()
    .from("profiles")
    .update({ paid: true, subscription_status: "active", stripe_customer_id: customerId })
    .eq("id", userId);
}

async function updateStatusByCustomerId(customerId: string, status: string) {
  const active = status === "active" || status === "trialing";
  await getSupabase()
    .from("profiles")
    .update({ paid: active, subscription_status: status })
    .eq("stripe_customer_id", customerId);
}

// Derive access from the MAIN subscription only, so cancelling or failing to
// pay for the uploads add-on never locks a customer out of the app.
function isAddonSub(sub: Stripe.Subscription): boolean {
  const addonPrice = process.env.STRIPE_ADDON_PRICE_ID;
  if (sub.metadata?.addon === "1") return true;
  if (!addonPrice) return false;
  const items = sub.items?.data || [];
  return items.length > 0 && items.every((i) => i.price?.id === addonPrice);
}

async function syncMainStatus(customerId: string) {
  const subs = await getStripe().subscriptions.list({ customer: customerId, status: "all", limit: 10 });
  const mains = subs.data
    .filter((s) => !isAddonSub(s))
    .sort((a, b) => b.created - a.created);
  const best =
    mains.find((s) => s.status === "active" || s.status === "trialing") || mains[0];
  if (!best) return;
  await updateStatusByCustomerId(customerId, best.status);
  console.log("Synced main subscription status:", customerId, best.status);
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        // Add-on purchases don't grant (or re-grant) app access
        if (session.metadata?.addon === "1") {
          console.log("Uploads add-on purchased for user:", userId);
          break;
        }
        if (userId && customerId) {
          await setActiveByUserId(userId, customerId);
          console.log("Subscription activated for user:", userId);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        if (isAddonSub(sub)) {
          console.log("Add-on subscription change ignored for access:", sub.customer, sub.status);
          break;
        }
        await syncMainStatus(sub.customer as string);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        // Re-derive from the main subscription rather than blanket past_due —
        // a failed add-on invoice must not lock the account.
        await syncMainStatus(customerId);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  return NextResponse.json({ received: true });
}
