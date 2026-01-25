"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SuccessClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const sessionId = useMemo(
    () => sp.get("session_id")?.trim() || "",
    [sp]
  );

  const [status, setStatus] = useState<
    "activating" | "ok" | "error"
  >(sessionId ? "activating" : "error");

  const [errorMsg, setErrorMsg] = useState("");

  async function activate() {
    try {
      if (!sessionId) {
        setStatus("error");
        setErrorMsg("session_id manquant");
        return;
      }

      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ session_id: sessionId }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Activation impossible");
      }

      setStatus("ok");
      router.prefetch("/premium");
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message || "Erreur activation");
    }
  }

  useEffect(() => {
    activate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 40, textAlign: "center" }}>
      {status === "activating" && <h2>Activation du Premium…</h2>}
      {status === "ok" && (
        <>
          <h2>✅ Premium activé</h2>
          <a href="/premium">Accéder au Premium</a>
        </>
      )}
      {status === "error" && (
        <>
          <h2>❌ Activation échouée</h2>
          <p>{errorMsg}</p>
          <a href="/">Retour accueil</a>
        </>
      )}
    </main>
  );
}
