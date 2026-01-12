"use client";

import { useEffect, useMemo, useState } from "react";

function getSessionIdFromUrl() {
  if (typeof window === "undefined") return "";
  const p = new URLSearchParams(window.location.search);
  return p.get("session_id") || "";
}

export default function SuccessPage() {
  const sessionId = useMemo(() => getSessionIdFromUrl(), []);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        if (!sessionId) {
          setStatus("error");
          setMsg("Session introuvable.");
          return;
        }

        const r = await fetch("/api/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });

        const data = await r.json().catch(() => ({}));

        if (!r.ok || !data?.ok) {
          setStatus("error");
          setMsg(data?.error || "Paiement non confirmé.");
          return;
        }

        setStatus("ok");
        setMsg("Premium activé ✅ Redirection…");

        setTimeout(() => {
          window.location.href = "/";
        }, 900);
      } catch (e: any) {
        setStatus("error");
        setMsg(e?.message || "Erreur réseau.");
      }
    })();
  }, [sessionId]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 18,
        background:
          "radial-gradient(900px 420px at 12% 12%, rgba(34,197,94,0.18), transparent 55%), radial-gradient(800px 360px at 88% 18%, rgba(59,130,246,0.16), transparent 58%), linear-gradient(180deg, #060913 0%, #040612 100%)",
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          width: "min(720px, 92vw)",
          borderRadius: 20,
          border: "1px solid rgba(51,65,85,0.9)",
          background: "rgba(2,6,23,0.65)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          padding: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "rgba(34,197,94,0.14)",
              border: "1px solid rgba(34,197,94,0.35)",
              fontSize: 20,
            }}
          >
            ✅
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.2 }}>
              Paiement confirmé
            </div>
            <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 13, lineHeight: 1.35 }}>
              Activation du Premium en cours…
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: "14px 14px",
            borderRadius: 16,
            border:
              status === "error"
                ? "1px solid rgba(239,68,68,0.45)"
                : "1px solid rgba(51,65,85,0.8)",
            background:
              status === "error"
                ? "rgba(239,68,68,0.08)"
                : "rgba(255,255,255,0.04)",
            color: status === "error" ? "#fecaca" : "#e5e7eb",
            fontSize: 14,
          }}
        >
          {status === "loading" ? "Vérification Stripe…" : msg}
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "transparent",
              border: "1px solid rgba(51,65,85,0.9)",
              color: "#e5e7eb",
              cursor: "pointer",
              height: 40,
              fontWeight: 800,
            }}
          >
            Retour au site
          </button>

          <div style={{ color: "#94a3b8", fontSize: 12, alignSelf: "center" }}>
            (Le Premium est activé via cookie.)
          </div>
        </div>
      </div>
    </main>
  );
}
