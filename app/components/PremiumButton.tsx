"use client";

import { useState } from "react";

type PremiumButtonProps = {
  label?: string;
  openKey?: string; // ex: "programme" | "semaine" | "guide" | "regles" | "temps"
  priceLabel?: string; // ex: "2,99€"
  className?: string;
};

export default function PremiumButton({
  label = "Débloquer Premium",
  openKey,
  priceLabel = "2,99€",
  className,
}: PremiumButtonProps) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const goPremium = async () => {
    try {
      setErr(null);
      setLoading(true);

      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open: openKey ?? null }),
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
        className={className ?? "btn-primary"}
        style={
          className
            ? undefined
            : {
                padding: "12px 16px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.12)",
                cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "#3b3b3b" : "#5b5bff",
                color: "white",
                fontWeight: 700,
              }
        }
      >
        {loading ? "Redirection..." : `${label} — ${priceLabel}`}
      </button>

      {err ? (
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          ❌ {err}
          <div style={{ marginTop: 6, opacity: 0.8 }}>
            Astuce : vérifie STRIPE_SECRET_KEY + STRIPE_PRICE_ID (Live) sur Vercel.
          </div>
        </div>
      ) : null}
    </div>
  );
}
