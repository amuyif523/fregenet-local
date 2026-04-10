import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession, verifyAdminPassword } from "@/lib/admin-auth";
import { logCriticalEvent } from "@/lib/logger";

const schema = z.object({
  password: z.string().min(1)
});

type RateLimitRecord = {
  attempts: number;
  resetAt: number;
  blockedUntil: number;
};

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, RateLimitRecord>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "unknown";
}

function getRateLimitState(key: string) {
  const now = Date.now();
  const current = loginAttempts.get(key);

  if (!current || now > current.resetAt) {
    const fresh = { attempts: 0, resetAt: now + WINDOW_MS, blockedUntil: 0 };
    loginAttempts.set(key, fresh);
    return fresh;
  }

  return current;
}

function registerFailedAttempt(key: string) {
  const now = Date.now();
  const state = getRateLimitState(key);

  state.attempts += 1;
  if (state.attempts >= MAX_ATTEMPTS) {
    state.blockedUntil = now + BLOCK_MS;
  }

  loginAttempts.set(key, state);
}

function clearAttempts(key: string) {
  loginAttempts.delete(key);
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const state = getRateLimitState(clientIp);
  const now = Date.now();

  if (state.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((state.blockedUntil - now) / 1000);
    return NextResponse.json(
      { error: "Too many login attempts. Please retry later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) }
      }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    registerFailedAttempt(clientIp);
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }


  let isValid = false;

  try {
    isValid = await verifyAdminPassword(parsed.data.password);
  } catch {
    return NextResponse.json({ error: "Admin authentication is not configured." }, { status: 500 });
  }

  if (!isValid) {
    registerFailedAttempt(clientIp);
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  await createAdminSession();
  clearAttempts(clientIp);

  logCriticalEvent({
    event: "ADMIN_LOGIN",
    userId: "admin",
    ip: clientIp,
    message: "Admin login successful."
  });

  return NextResponse.json({ ok: true });
}
