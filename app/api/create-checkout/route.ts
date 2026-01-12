// app/api/create-checkout/route.ts
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_URL ||
    "";
  if (!url) return "http://localhost:3000";
  if (url.startsWith("http")) return url;
  return `https://${url}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!stripeKey) {
    return new Response("Missing STRIPE_SECRET_KEY", { status: 500 });
  }
  if (!priceId) {
    return new Response("Missing STRIPE_PRICE_ID", { status: 500 });
  }

  const form = await req.formData();
  const emailRaw = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!emailRaw || !isValidEmail(emailRaw)) {
    return new Response("Invalid email", { status: 400 });
  }

  const baseUrl = getBaseUrl();
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2025-12-15.clover",
  });

  // ⚠️ OBLIGATOIRE : session_id pour la page success
  const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/?canceled=1`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: emailRaw,

    metadata: {
      email: emailRaw,
      app: process.env.APP_NAME || "WeightCalc",
    },

    success_url: successUrl,
    cancel_url: cancelUrl,

    allow_promotion_codes: true,
  });

  if (!session.url) {
    return new Response("Stripe session has no URL", { status: 500 });
  }

  return Response.redirect(session.url, 303);
}
