// app/lib/token.ts
import crypto from "crypto";

type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; reason: string };

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const s = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(s, "base64");
}

export function createAccessToken(email: string, ttlSeconds = 60 * 60 * 24 * 7) {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) throw new Error("Missing TOKEN_SECRET in env");

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    email,
    iat: now,
    exp: now + ttlSeconds,
  };

  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest();

  return `${payloadB64}.${b64url(sig)}`;
}

export function verifyAccessToken(token: string): VerifyResult {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) return { ok: false, reason: "TOKEN_SECRET missing" };
  if (!token || !token.includes(".")) return { ok: false, reason: "Bad token format" };

  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return { ok: false, reason: "Bad token format" };

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest();

  const got = b64urlDecode(sigB64);

  // timing-safe compare
  if (got.length !== expected.length) return { ok: false, reason: "Invalid signature" };
  if (!crypto.timingSafeEqual(got, expected)) return { ok: false, reason: "Invalid signature" };

  let payload: any;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, reason: "Invalid payload" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload?.email) return { ok: false, reason: "Missing email" };
  if (typeof payload.exp !== "number" || payload.exp < now) return { ok: false, reason: "Token expired" };

  return { ok: true, email: String(payload.email) };
}
