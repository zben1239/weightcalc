// app/api/create-checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

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

function isFormContentType(ct: string) {
  return (
    ct.includes("application/x-www-form-urlencoded") ||
    ct.includes("multipart/form-data")
  );
}

function isJsonContentType(ct: string) {
  return ct.includes("application/json");
}

// Stripe client (server only)
const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-12-15.clover",
});

async function readEmailAndOpen(req: Request): Promise<{ email: string; open: string }> {
  const ct = (req.headers.get("content-type") || "").toLowerCase();

  // 1) Form POST (<form method="post">)
  if (isFormContentType(ct)) {
    const form = await req.formData();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const open = String(form.get("open") ?? "").trim();
    return { email, open };
  }

  // 2) JSON (fetch)
  if (isJsonContentType(ct)) {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const open = String(body?.open ?? "").trim();
    return { email, open };
  }

  // 3) Fallback: essaie JSON une seule fois
  const body = await req.json().catch(() => ({} as any));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const open = String(body?.open ?? "").trim();
  return { email, open };
}

export async function POST(req: Request) {
  try {
    const priceId = requireEnv("STRIPE_PRICE_ID");
    const baseUrl = getBaseUrl().replace(/\/$/, "");

    const { email, open } = await readEmailAndOpen(req);

    if (!email || !isValidEmail(email)) {
      // form => message simple / fetch => JSON. Ici on renvoie JSON (ok aussi),
      // mais si tu veux être ultra strict, je peux te faire une version qui renvoie
      // du HTML en cas de form.
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    // Success URL (on garde open optionnellement)
    const successUrl = open
      ? `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&open=${encodeURIComponent(open)}`
      : `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = `${baseUrl}/?canceled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: {
        email,
        open: open || "",
        app: process.env.APP_NAME || "WeightCalc",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ ok: false, error: "Stripe session has no URL" }, { status: 500 });
    }

    // ✅ Form POST => redirect direct (UX parfait)
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    if (isFormContentType(ct)) {
      return NextResponse.redirect(session.url, 303);
    }

    // ✅ fetch => JSON (PremiumButton)
    return NextResponse.json({ ok: true, url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erreur create-checkout" },
      { status: 500 }
    );
  }
}
