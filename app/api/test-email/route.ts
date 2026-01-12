import { Resend } from "resend";

export const runtime = "nodejs";

export async function GET() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const to = "TON_EMAIL_ICI@gmail.com"; // mets TON email ici
    const from = process.env.FROM_EMAIL || "WeightCalc <onboarding@resend.dev>";

    const result = await resend.emails.send({
      from,
      to,
      subject: "Test Resend ✅",
      html: "<p>Si tu lis ça, Resend fonctionne ✅</p>",
    });

    return Response.json({ ok: true, result });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
