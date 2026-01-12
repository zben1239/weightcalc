// app/api/create-checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});

function baseUrl(req: Request) {
  const env =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.APP_URL?.trim();

  if (env) return env.replace(/\/$/, "");

  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: "Missing STRIPE_PRICE_ID" }, { status: 500 });
    }

    const urlBase = baseUrl(req);

    // On accepte FormData (depuis /premium) OU JSON (si un jour tu passes en fetch)
    const ct = req.headers.get("content-type") || "";
    let email: string | undefined;

    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.email === "string") email = body.email.trim();
    } else {
      const form = await req.formData();
      const e = form.get("email");
      if (typeof e === "string") email = e.trim();
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${urlBase}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${urlBase}/premium?canceled=1`,
      allow_promotion_codes: true,
      ...(email ? { customer_email: email } : {}),
      customer_creation: "if_required",
    });

    if (!session.url) {
      return NextResponse.json({ error: "Missing session.url" }, { status: 500 });
    }

    // Si ça vient d'un form HTML -> redirection directe
    if (!ct.includes("application/json")) {
      return NextResponse.redirect(session.url, { status: 303 });
    }

    // Si ça vient d'un fetch -> JSON
    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("create-checkout error:", err);
    return NextResponse.json(
      { error: err?.message || "Checkout error" },
      { status: 500 }
    );
  }
}

// Optionnel: si quelqu'un ouvre l'URL dans le navigateur
export async function GET() {
  return NextResponse.json({ ok: true, hint: "Use POST to create a checkout session." });
}
