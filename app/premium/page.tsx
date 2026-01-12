// app/premium/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

const S = {
  page: {
    minHeight: "100vh",
    padding: 22,
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(900px 420px at 12% 12%, rgba(139,92,246,.35), transparent 65%), radial-gradient(900px 420px at 85% 30%, rgba(16,185,129,.18), transparent 60%), #07080d",
    color: "#e8e8f0",
  } as const,
  shell: {
    width: "min(720px, 94vw)",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.06)",
    backdropFilter: "blur(14px)",
    boxShadow: "0 20px 60px rgba(0,0,0,.35)",
    padding: 18,
  } as const,
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  } as const,
  title: { fontSize: 30, fontWeight: 900, letterSpacing: -0.5 } as const,
  sub: { opacity: 0.8, marginTop: 4 } as const,
  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid rgba(139,92,246,.45)",
    background: "rgba(139,92,246,.15)",
    color: "#ddd6fe",
    whiteSpace: "nowrap",
  } as const,
  card: {
    marginTop: 14,
    borderRadius: 14,
    border: "1px solid rgba(34,197,94,.35)",
    background: "rgba(34,197,94,.10)",
    padding: 16,
  } as const,
  note: { opacity: 0.88, fontSize: 13, lineHeight: 1.35 } as const,
  field: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "#f2f2ff",
    outline: "none",
    marginTop: 10,
  } as const,
  btnRow: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 12,
  } as const,
  btn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.08)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  } as const,
  btnPrimary: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(139,92,246,.55)",
    background: "rgba(139,92,246,.35)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(139,92,246,.25)",
  } as const,
};

export default function PremiumPage() {
  return (
    <main style={S.page}>
      <div style={S.shell}>
        <div style={S.topRow}>
          <div>
            <div style={S.title}>WeightCalc</div>
            <div style={S.sub}>Débloque le vrai programme Premium</div>
          </div>
          <div style={S.badge}>🔒 Premium</div>
        </div>

        <div style={S.card}>
          <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 6 }}>
            Ton email (pour recevoir l’accès)
          </div>
          <div style={S.note}>
            On t’enverra un email de confirmation + ton lien d’accès Premium après paiement.
          </div>

          {/* ✅ IMPORTANT: on passe par /api/create-checkout avec email */}
          <form action="/api/create-checkout" method="post">
            <input
              name="email"
              type="email"
              required
              placeholder="ex: zaid.bennani@gmail.com"
              style={S.field}
              autoComplete="email"
            />

            <div style={S.btnRow}>
              <Link href="/" style={S.btn}>
                Retour
              </Link>

              <button type="submit" style={S.btnPrimary}>
                Débloquer Premium
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
