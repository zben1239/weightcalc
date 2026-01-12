// app/premium/page.tsx
import { cookies } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PremiumPage() {
  const cookieStore = await cookies();
  const premium = cookieStore.get("premium")?.value === "true";

  if (!premium) {
    return (
      <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
        <h1>Premium requis</h1>
        <p>Tu dois activer ton accès Premium via le lien reçu par email.</p>
        <Link href="/">Retour</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>✅ Premium déverrouillé</h1>
      <p>Ici tu mettras ton plan complet, PDF, etc.</p>
      <Link href="/">Retour</Link>
    </div>
  );
}
