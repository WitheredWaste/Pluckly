import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionToken, SESSION_COOKIE } from "../_auth";
import { timingSafeEqual } from "crypto";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; first: number }>();

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!adminPassword || !secret) {
    return NextResponse.json({ error: "Server auth not configured." }, { status: 500 });
  }

  const ip = clientIp(request);
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a few minutes and try again." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const provided = typeof body?.password === "string" ? body.password : "";
  if (!safeEqual(provided, adminPassword)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  attempts.delete(ip);
  const token = createSessionToken(secret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60,
  });
  return NextResponse.json({ ok: true });
}
