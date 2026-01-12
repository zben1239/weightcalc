// app/success/page.tsx
import { cookies } from "next/headers";
import Stripe from "stripe";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export default async function SuccessPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const sessionId = Array.isArray(sp.session_id) ? sp.session_id[0] : sp.session_id;

  if (!sessionId) {
    redirect("/");
  }

  // récupère la session Stripe
  const session = await stripe.checkout.sessions.retrieve(String(sessionId));

  // on accepte si paid (ou no_payment_required)
  const ok =
    session.payment_status === "paid" || session.payment_status === "no_payment_required";

  if (ok) {
    const jar = await cookies();
    jar.set("wc_premium", "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 an
    });
  }

  redirect("/");
}
