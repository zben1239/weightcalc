// app/lib/accessStore.ts
import { cookies } from "next/headers";
import { verifyAccessToken } from "./token";

export type PremiumState =
  | { premium: true; email: string }
  | { premium: false; reason?: string };

const COOKIE_NAME = "wc_premium";

export async function getPremiumState(): Promise<PremiumState> {
  const store = await cookies(); // ✅ IMPORTANT (Next version async)
  const token = store.get(COOKIE_NAME)?.value;

  if (!token) return { premium: false, reason: "no_cookie" };

  const v = verifyAccessToken(token);
  if (!v.ok) return { premium: false, reason: v.reason };

  return { premium: true, email: v.email };
}

export async function hasPremiumAccess(): Promise<boolean> {
  return (await getPremiumState()).premium;
}

export async function getPremiumEmail(): Promise<string | null> {
  const state = await getPremiumState();
  return state.premium ? state.email : null;
}
