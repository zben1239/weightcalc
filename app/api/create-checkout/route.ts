// app/api/create-checkout/route.ts
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim();

  if (!process.env.STRIPE_SECRET_KEY) {
    return new Response("Missing STRIPE_SECRET_KEY", { status: 500 });
  }
  if (!process.env.STRIPE_PRICE_ID) {
    return new Response("Missing STRIPE_PRICE_ID", { status: 500 });
  }

  // base URL
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    "http://localhost:3000";

  // (optionnel) ref user inputs (tu peux les enlever si tu veux)
  const metadata: Record<string, string> = {};
  for (const k of ["sex", "goal", "activity", "age", "height", "weight"]) {
    const v = form.get(k);
    if (v) metadata[k] = String(v);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    customer_email: email || undefined,
    allow_promotion_codes: true,
    success_url: `${baseUrl.replace(/\/$/, "")}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl.replace(/\/$/, "")}/?unlock=1&email=${encodeURIComponent(email)}`,
    metadata,
  });

  return Response.redirect(session.url!, 303);
}
