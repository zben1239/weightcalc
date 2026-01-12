"use client";

import { useState } from "react";

export default function PremiumButton() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const goPremium = async () => {
    try {
      setErr(null);
      setLoading(true);

      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Tu peux passer des infos ici plus tard (email, etc.)
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Erreur create-checkout");
      }

      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("URL Stripe manquante");

      window.location.href = data.url;
    } catch (e: any) {
      setErr(e?.message || "Erreur inconnue");
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        onClick={goPremium}
        disabled={loading}
        className="btn-primary" // si tu as déjà une classe bouton, garde-la
        style={
          !("btn-primary" in ({} as any))
            ? {
                padding: "12px 16px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.12)",
                cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "#3b3b3b" : "#5b5bff",
                color: "white",
                fontWeight: 600,
              }
            : undefined
        }
      >
        {loading ? "Redirection..." : "Débloquer Premium"}
      </button>

      {err ? (
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          ❌ {err}
          <div style={{ marginTop: 6, opacity: 0.8 }}>
            Astuce : vérifie tes variables Vercel (STRIPE_SECRET_KEY / STRIPE_PRICE_ID).
          </div>
        </div>
      ) : null}
    </div>
  );
}
