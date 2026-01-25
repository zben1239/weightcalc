"use client";

// app/success/page.tsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

type Status = "activating" | "ok" | "error";

export default function SuccessPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const sessionId = useMemo(() => sp.get("session_id")?.trim() || "", [sp]);
  const open = useMemo(() => sp.get("open")?.trim() || "", [sp]);

  const [status, setStatus] = useState<Status>(sessionId ? "activating" : "error");
  const [errorMsg, setErrorMsg] = useState<string>("");

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
      width: "min(900px, 94vw)",
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
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 12,
    } as const,
    title: { fontSize: 30, fontWeight: 950, letterSpacing: -0.5 } as const,
    sub: { opacity: 0.8, marginTop: 4 } as const,
    badgeOk: {
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      border: "1px solid rgba(34,197,94,.45)",
      background: "rgba(34,197,94,.15)",
      color: "#a7f3d0",
      whiteSpace: "nowrap",
    } as const,
    badgeKo: {
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      border: "1px solid rgba(239,68,68,.45)",
      background: "rgba(239,68,68,.15)",
      color: "#fecaca",
      whiteSpace: "nowrap",
    } as const,
    box: {
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.12)",
      background: "rgba(0,0,0,.16)",
      padding: 14,
      marginTop: 12,
    } as const,
    note: { opacity: 0.85, fontSize: 13, lineHeight: 1.35 } as const,
    btnRow: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      alignItems: "center",
      marginTop: 14,
      flexWrap: "wrap",
    } as const,
    btn: {
      padding: "12px 14px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,.14)",
      background: "rgba(255,255,255,.08)",
      color: "#fff",
      fontWeight: 900,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    } as const,
    btnPrimary: {
      padding: "12px 16px",
      borderRadius: 12,
      border: "1px solid rgba(139,92,246,.55)",
      background: "rgba(139,92,246,.35)",
      color: "#fff",
      fontWeight: 950,
      cursor: "pointer",
      boxShadow: "0 10px 30px rgba(139,92,246,.25)",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    } as const,
    spinner: {
      width: 16,
      height: 16,
      borderRadius: 999,
      border: "2px solid rgba(255,255,255,.25)",
      borderTop: "2px solid rgba(255,255,255,.9)",
      animation: "spin 0.8s linear infinite",
    } as const,
  };

  const goHomeHref = useMemo(() => {
    // On renvoie sur la home et on ré-ouvre la section que l’utilisateur avait cliqué (optionnel)
    // Exemple: "/?open=temps"
    if (open) return `/?open=${encodeURIComponent(open)}`;
    return "/";
  }, [open]);

  async function activate() {
    if (!sessionId) {
      setStatus("error");
      setErrorMsg("session_id manquant (retour Stripe incomplet).");
      return;
    }

    try {
      setStatus("activating");
      setErrorMsg("");

      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Erreur activation (${res.status})`);
      }

      const data = await res.json().catch(() => ({}));
      if (!data?.ok) throw new Error(data?.error || "Activation impossible");

      setStatus("ok");

      // UX PRO : redirection auto vers la home (où Premium sera visible)
      // petit délai pour laisser le cookie s’écrire correctement
      setTimeout(() => {
        router.replace(goHomeHref);
      }, 450);
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message || "Erreur activation");
    }
  }

  useEffect(() => {
    if (sessionId) activate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const titleLine =
    status === "ok"
      ? "Paiement confirmé ✅ — Premium activé"
      : status === "activating"
      ? "Paiement confirmé ✅ — Activation en cours…"
      : "Paiement confirmé ✅ — mais activation impossible";

  const badge =
    status === "ok" ? "✅ Activé" : status === "activating" ? "⏳ Activation" : "⚠️ Activation KO";

  return (
    <main style={S.page}>
      <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>

      <div style={S.shell}>
        <div style={S.topRow}>
          <div>
            <div style={S.title}>WeightCalc</div>
            <div style={S.sub}>{titleLine}</div>
          </div>
          <div style={status === "ok" ? S.badgeOk : S.badgeKo}>{badge}</div>
        </div>

        <div style={S.box}>
          {status === "activating" ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 950, display: "flex", gap: 10, alignItems: "center" }}>
                <div style={S.spinner} />
                Activation du Premium…
              </div>
              <div style={{ ...S.note, marginTop: 8 }}>
                On finalise l’accès premium. Tu vas être redirigé automatiquement.
              </div>
            </>
          ) : status === "ok" ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 950 }}>Tout est bon ✨</div>
              <div style={{ ...S.note, marginTop: 8 }}>
                Premium activé. Redirection en cours…
              </div>

              <div style={S.btnRow}>
                <a href={goHomeHref} style={S.btnPrimary}>
                  Aller au programme
                </a>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 950 }}>Activation impossible</div>
              <div style={{ ...S.note, marginTop: 8 }}>
                {errorMsg || "Erreur inconnue."}
              </div>

              <div style={S.btnRow}>
                <a href="/" style={S.btn}>
                  Retour accueil
                </a>
                <button onClick={activate} style={S.btnPrimary} type="button">
                  Réessayer l’activation
                </button>
                <a href="/?view=unlock" style={S.btnPrimary}>
                  Refaire le paiement
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
