import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setActiveByUserId(userId: string, customerId: string) {
  await supabase
    .from("profiles")
    .update({ paid: true, subscription_status: "active", stripe_customer_id: customerId })
    .eq("id", userId);
}

async function updateStatusByCustomerId(customerId: string, status: string) {
  const active = status === "active" || status === "trialing";
  await supabase
    .from("profiles")
    .update({ paid: active, subscription_status: status })
    .eq("stripe_customer_id", customerId);
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
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
        if (userId && customerId) {
          await setActiveByUserId(userId, customerId);
          console.log("Subscription activated for user:", userId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await updateStatusByCustomerId(sub.customer as string, sub.status);
        console.log("Subscription updated:", sub.customer, sub.status);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await updateStatusByCustomerId(sub.customer as string, "canceled");
        console.log("Subscription canceled:", sub.customer);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        await updateStatusByCustomerId(customerId, "past_due");
        console.log("Payment failed:", customerId);
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
