import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});

function getBaseUrl(req: Request) {
  // Priorité: NEXT_PUBLIC_BASE_URL > APP_URL > host actuel
  const envBase =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.APP_URL?.trim();

  if (envBase) return envBase.replace(/\/$/, "");

  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

async function createCheckoutSession(req: Request) {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Missing STRIPE_PRICE_ID" },
      { status: 500 }
    );
  }

  const baseUrl = getBaseUrl(req);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?canceled=1`,
    // important: pour récupérer l'email dans le webhook
    customer_creation: "if_required",
    // optionnel
    allow_promotion_codes: true,
  });

  return session;
}

// ✅ POST (utilisé par le bouton)
export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const session = await createCheckoutSession(req);
    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("create-checkout POST error:", err);
    return NextResponse.json(
      { error: err?.message || "Checkout error" },
      { status: 500 }
    );
  }
}

// ✅ GET (si tu tapes /api/create-checkout dans le navigateur, ça redirige)
export async function GET(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return new NextResponse("Missing STRIPE_SECRET_KEY", { status: 500 });
    }
    const session = await createCheckoutSession(req);
    if (!session.url) return new NextResponse("Missing session.url", { status: 500 });
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err: any) {
    console.error("create-checkout GET error:", err);
    return new NextResponse(err?.message || "Checkout error", { status: 500 });
  }
}
