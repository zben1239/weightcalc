// app/api/webhook/route.ts
import Stripe from "stripe";
import { Resend } from "resend";
import { createAccessToken } from "../../lib/token";
import { premiumEmailHtml } from "../../lib/premiumEmail";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature", { status: 400 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return new Response(`Webhook signature error: ${err?.message ?? "unknown"}`, { status: 400 });
  }

  // On envoie l’email seulement quand le paiement est confirmé
  const sendForTypes = new Set([
    "checkout.session.completed",
    "payment_intent.succeeded",
  ]);

  if (!sendForTypes.has(event.type)) {
    return new Response("Ignored", { status: 200 });
  }

  try {
    // 1) Récupère l’email client
    let customerEmail: string | null = null;

   if (event.type === "checkout.session.completed") {
  const session = event.data.object as Stripe.Checkout.Session;

  // ✅ le plus fiable sur Checkout
  customerEmail = session.customer_details?.email ?? null;

  // (optionnel) si tu veux être sûr de ne jamais continuer sans email :
  // if (!customerEmail) return new Response("No email in checkout session", { status: 400 });
}

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      // Stripe peut contenir receipt_email
      customerEmail = (pi.receipt_email ?? null) as string | null;
    }

    // 2) En sandbox Resend tu ne peux envoyer qu’à TON email propriétaire
    // -> on force l’envoi à DEV_FORCE_EMAIL si présent
    const to =
      process.env.DEV_FORCE_EMAIL?.trim() ||
      customerEmail ||
      process.env.SUPPORT_EMAIL?.trim() ||
      "";

    if (!to) {
      return new Response("No recipient email found", { status: 400 });
    }

    // 3) Magic link
    const token = createAccessToken(to, 60 * 60 * 24 * 30); // 30 jours
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.APP_URL ||
      "http://localhost:3000";

    const accessUrl = `${baseUrl.replace(/\/$/, "")}/api/activate?token=${encodeURIComponent(token)}`;

    // 4) Envoi Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return new Response("Missing RESEND_API_KEY", { status: 500 });

    const resend = new Resend(resendKey);

    const from = process.env.FROM_EMAIL || "WeightCalc <onboarding@resend.dev>";

    const result = await resend.emails.send({
      from,
      to,
      subject: "✅ Ton accès Premium est activé",
      html: premiumEmailHtml({ appName: process.env.APP_NAME || "WeightCalc", accessUrl }),
    });

    // Log utile en dev
    console.log("Resend result:", result);

    return new Response("OK", { status: 200 });
  } catch (e: any) {
    console.error("Webhook error:", e);
    return new Response(`Webhook failed: ${e?.message ?? "unknown"}`, { status: 500 });
  }
}
