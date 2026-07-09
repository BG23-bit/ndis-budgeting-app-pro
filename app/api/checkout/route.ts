import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const { userId, email, plan } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Add-on: +25 plan uploads per month, stackable (quantity 1-4). Attaches to
    // the existing Stripe customer so it appears alongside the main plan in the
    // billing portal.
    if (plan === "uploads_addon") {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: profile } = await supabase
        .from("profiles")
        .select("paid, stripe_customer_id")
        .eq("id", userId)
        .single();
      if (!profile?.paid || !profile?.stripe_customer_id) {
        return NextResponse.json({ error: "An active subscription is required before adding extra uploads." }, { status: 403 });
      }
      const addonPrice = process.env.STRIPE_ADDON_PRICE_ID;
      if (!addonPrice) {
        return NextResponse.json({ error: "Add-on not configured" }, { status: 500 });
      }
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://kevriacalc.com";
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer: profile.stripe_customer_id,
        line_items: [{
          price: addonPrice,
          quantity: 1,
          adjustable_quantity: { enabled: true, minimum: 1, maximum: 4 },
        }],
        success_url: `${baseUrl}/dashboard?addon=success`,
        cancel_url: `${baseUrl}/dashboard`,
        metadata: { userId, addon: "1" },
        subscription_data: { metadata: { userId, addon: "1" } },
      });
      return NextResponse.json({ url: session.url });
    }

    const priceId =
      plan === "annual"
        ? process.env.STRIPE_ANNUAL_PRICE_ID!
        : process.env.STRIPE_MONTHLY_PRICE_ID!;

    if (!priceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 500 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://kevriacalc.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard?success=true`,
      cancel_url: `${baseUrl}/dashboard?canceled=true`,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: err?.message || "Checkout error" },
      { status: 500 }
    );
  }
}
