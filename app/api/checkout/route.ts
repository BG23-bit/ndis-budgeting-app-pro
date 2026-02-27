import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { userId, email, plan } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const priceId =
      plan === "annual"
        ? process.env.STRIPE_ANNUAL_PRICE_ID!
        : process.env.STRIPE_MONTHLY_PRICE_ID!;

    if (!priceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 500 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://ndis-budgeting-app-pro.vercel.app";

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
