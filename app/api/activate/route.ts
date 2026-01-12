import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: Request) {
  try {
    const { session_id } = await req.json();

    if (!session_id || typeof session_id !== "string") {
      return NextResponse.json({ ok: false, error: "Missing session_id" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Stripe renvoie souvent payment_status = "paid"
    const paid = session.payment_status === "paid";

    if (!paid) {
      return NextResponse.json({ ok: false, error: "Not paid" }, { status: 402 });
    }

    const res = NextResponse.json({ ok: true });

    res.cookies.set("wc_premium", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erreur activate" },
      { status: 500 }
    );
  }
}
