// app/api/webhook/route.ts
import Stripe from "stripe";
import { Resend } from "resend";
import { createAccessToken } from "../../lib/token";
import { premiumEmailHtml } from "../../lib/premiumEmail";

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

function normalizeEmail(s: string) {
  return String(s || "").trim().toLowerCase();
}

function pickRecipientEmail(session: Stripe.Checkout.Session) {
  const email =
    session.customer_details?.email ||
    session.customer_email ||
    (session.metadata?.email as string | undefined) ||
    "";

  // ⚠️ DEV_FORCE_EMAIL uniquement hors prod
  const devForce =
    process.env.NODE_ENV !== "production"
      ? normalizeEmail(process.env.DEV_FORCE_EMAIL || "")
      : "";

  return normalizeEmail(devForce || email);
}

const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature", { status: 400 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });

  // IMPORTANT: Stripe a besoin du corps brut
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return new Response(
      `Webhook signature error: ${err?.message ?? "unknown"}`,
      { status: 400 }
    );
  }

  // ✅ On traite uniquement checkout.session.completed
  if (event.type !== "checkout.session.completed") {
    return new Response("Ignored", { status: 200 });
  }

  try {
    const session = event.data.object as Stripe.Checkout.Session;

    // ✅ Sécurité: seulement si payé
    if (session.payment_status !== "paid") {
      return new Response("Not paid", { status: 200 });
    }

    // ✅ Sécurité: éviter de mélanger test/live
    const isLive = session.livemode === true;
    const expectedLive = process.env.STRIPE_LIVEMODE === "true"; // optionnel
    if (process.env.STRIPE_LIVEMODE && isLive !== expectedLive) {
      return new Response("Livemode mismatch", { status: 200 });
    }

    const to = pickRecipientEmail(session);
    if (!to) return new Response("No recipient email found", { status: 400 });

    // ✅ Token 30 jours
    const token = createAccessToken(to, 60 * 60 * 24 * 30);

    const baseUrl = getBaseUrl().replace(/\/$/, "");
    const accessUrl = `${baseUrl}/api/activate?token=${encodeURIComponent(token)}`;

    const resend = new Resend(requireEnv("RESEND_API_KEY"));
    const from = process.env.FROM_EMAIL || "WeightCalc <onboarding@resend.dev>";

    await resend.emails.send({
      from,
      to,
      subject: "Votre accès WeightCalc Premium est activé ✨",
      html: premiumEmailHtml({
        appName: process.env.APP_NAME || "WeightCalc",
        accessUrl,
      }),
    });

    return new Response("OK", { status: 200 });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return new Response(`Webhook failed: ${e?.message ?? "unknown"}`, { status: 500 });
  }
}
