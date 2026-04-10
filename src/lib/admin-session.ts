import { cookies } from "next/headers";
import { getIronSession, unsealData, type IronSession, type SessionOptions } from "iron-session";
import type { NextRequest } from "next/server";

export type AdminUserSession = {
  id: "admin";
  role: "admin";
};

export type AdminSessionData = {
  user?: AdminUserSession;
  isLoggedIn?: boolean;
  authenticatedAt?: number;
};

export const ADMIN_SESSION_COOKIE_NAME = "fkl_admin_session";

function getSessionPassword() {
  const password = process.env.ADMIN_SESSION_SECRET;

  if (!password || password.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be set and at least 32 characters long.");
  }

  return password;
}

export function getAdminSessionOptions(): SessionOptions {
  return {
    password: getSessionPassword(),
    cookieName: ADMIN_SESSION_COOKIE_NAME,
    ttl: 60 * 60 * 8,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    }
  };
}

export async function getServerAdminSession(): Promise<IronSession<AdminSessionData>> {
  const cookieStore = await cookies();
  return getIronSession<AdminSessionData>(cookieStore, getAdminSessionOptions());
}

export async function readAdminSessionFromRequest(request: NextRequest): Promise<AdminSessionData | null> {
  const cookie = request.cookies.get(getAdminSessionOptions().cookieName)?.value;

  if (!cookie) {
    return null;
  }

  try {
    const data = await unsealData<AdminSessionData>(cookie, {
      password: getAdminSessionOptions().password,
      ttl: getAdminSessionOptions().ttl
    });

    return data ?? null;
  } catch {
    return null;
  }
}

export function isAdminSessionAuthenticated(session: AdminSessionData | null | undefined) {
  if (!session) {
    return false;
  }

  if (session.isLoggedIn === false) {
    return false;
  }

  return session.isLoggedIn === true || Boolean(session.user?.id === "admin" && session.user?.role === "admin");
}
