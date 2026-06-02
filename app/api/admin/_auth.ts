import crypto from "crypto";
import { cookies } from "next/headers";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const SESSION_COOKIE = "pluckly_admin_session";

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  return Buffer.from(t, "base64");
}

export function createSessionToken(secret: string): string {
  const payload = JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS });
  const payloadB64 = b64url(Buffer.from(payload, "utf8"));
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  return payloadB64 + "." + b64url(sig);
}

export function verifySessionToken(token: string | undefined, secret: string): boolean {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  const expected = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  const got = b64urlDecode(sigB64);
  if (expected.length !== got.length) return false;
  if (!crypto.timingSafeEqual(expected, got)) return false;
  try {
    const payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8")) as { exp?: number };
    if (typeof payload.exp !== "number") return false;
    return Date.now() < payload.exp;
  } catch {
    return false;
  }
}

export async function isAuthed(request: Request): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (verifySessionToken(token, secret)) return true;
  const headerPw = request.headers.get("x-admin-password");
  const adminPw = process.env.ADMIN_PASSWORD;
  if (adminPw && headerPw === adminPw) return true;
  return false;
}
