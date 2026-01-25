// app/lib/accessStore.ts
import { cookies } from "next/headers";
import { verifyAccessToken } from "./token";

export type PremiumState =
  | { premium: true; email: string }
  | { premium: false; reason: string };

const COOKIE_NAME = "wc_premium";

/**
 * Source de vérité Premium:
 * - lit le cookie wc_premium (qui contient un TOKEN signé)
 * - vérifie le token
 */
export async function getPremiumState(): Promise<PremiumState> {
  const store = await cookies(); // ✅ IMPORTANT (sinon .get n'existe pas)
  const token = store.get(COOKIE_NAME)?.value || "";

  if (!token) return { premium: false, reason: "no_cookie" };

  const v = verifyAccessToken(token);
  if (!v?.ok) return { premium: false, reason: v?.reason || "invalid_token" };

  return { premium: true, email: v.email };
}

export async function hasPremiumAccess(): Promise<boolean> {
  const s = await getPremiumState();
  return s.premium;
}

export async function getPremiumEmail(): Promise<string | null> {
  const s = await getPremiumState();
  return s.premium ? s.email : null;
}
