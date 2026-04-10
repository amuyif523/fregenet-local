import bcrypt from "bcryptjs";
import { getServerAdminSession, type AdminUserSession } from "@/lib/admin-session";

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;

  if (!hash) {
    throw new Error("ADMIN_PASSWORD_HASH is not configured.");
  }

  return bcrypt.compare(password, hash);
}

export async function createAdminSession(): Promise<void> {
  const session = await getServerAdminSession();
  session.user = { id: "admin", role: "admin" };
  session.isLoggedIn = true;
  session.authenticatedAt = Date.now();
  await session.save();
}

export async function destroyAdminSession(): Promise<void> {
  const session = await getServerAdminSession();
  session.destroy();
}

export async function getAdminSessionUser(): Promise<AdminUserSession | null> {
  const session = await getServerAdminSession();
  return session.user ?? null;
}
