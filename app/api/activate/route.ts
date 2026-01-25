// app/api/activate/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAccessToken, verifyAccessToken } from "../../lib/token";

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

const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-12-15.clover",
});

const COOKIE_NAME = "wc_premium";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

function setPremiumCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}

function redirectToApp(open: string | null) {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  // 👉 Si tu n'as PAS de vraie page /premium, renvoie vers "/"
  // et on garde open= pour rouvrir la bonne section.
  const dest = open ? `${baseUrl}/?open=${encodeURIComponent(open)}` : `${baseUrl}/`;
  return NextResponse.redirect(dest, 302);
}

async function tokenFromSession(session_id: string): Promise<{ token: string; open: string | null }> {
  const session = await stripe.checkout.sessions.retrieve(session_id);

  if (session.payment_status !== "paid") {
    throw new Error("Not paid");
  }

  const email =
    session.customer_details?.email ||
    session.customer_email ||
    (session.metadata?.email as string | undefined) ||
    "";

  if (!email) throw new Error("Missing customer email");

  const open = String(session.metadata?.open ?? "").trim() || null;

  // ✅ token signé 30 jours (même durée que cookie)
  const token = createAccessToken(String(email).trim().toLowerCase(), COOKIE_MAX_AGE);

  return { token, open };
}

/**
 * ✅ GET /api/activate?token=...(&open=...)
 * - vérifie le token
 * - pose cookie premium = token signé
 * - redirect vers "/" (et conserve open)
 *
 * ✅ GET /api/activate?session_id=...
 * - vérifie paiement Stripe
 * - crée token signé depuis l'email
 * - pose cookie premium
 * - redirect vers "/"
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tokenParam = url.searchParams.get("token")?.trim() || "";
    const session_id = url.searchParams.get("session_id")?.trim() || "";
    const openParam = url.searchParams.get("open")?.trim() || "";

    // 1) Activation via magic-link (token déjà signé)
    if (tokenParam) {
      const v = verifyAccessToken(tokenParam);
      if (!v.ok) {
        return NextResponse.json({ ok: false, error: v.reason }, { status: 400 });
      }

      const res = redirectToApp(openParam || null);
      return setPremiumCookie(res, tokenParam);
    }

    // 2) Activation via session Stripe (optionnel)
    if (session_id) {
      const { token, open } = await tokenFromSession(session_id);
      const res = redirectToApp(open);
      return setPremiumCookie(res, token);
    }

    return NextResponse.json(
      { ok: false, error: "Missing token or session_id" },
      { status: 400 }
    );
  } catch (e: any) {
    const msg = e?.message || "Erreur activate";
    const code = msg === "Not paid" ? 402 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}

/**
 * ✅ POST /api/activate
 * Body JSON { session_id }
 * - vérifie paiement Stripe
 * - crée token signé depuis l'email
 * - pose cookie premium
 * - renvoie { ok: true, open }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const session_id = body?.session_id;

    if (!session_id || typeof session_id !== "string") {
      return NextResponse.json({ ok: false, error: "Missing session_id" }, { status: 400 });
    }

    const { token, open } = await tokenFromSession(session_id);

    const res = NextResponse.json({ ok: true, open });
    return setPremiumCookie(res, token);
  } catch (e: any) {
    const msg = e?.message || "Erreur activate";
    const code = msg === "Not paid" ? 402 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}
