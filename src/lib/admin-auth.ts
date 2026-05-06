import bcrypt from "bcryptjs";
import { getServerAdminSession, type AdminUserSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

export async function verifyAdminCredentials(email: string, password: string): Promise<AdminUserSession | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      password: true,
      role: true
    }
  });

  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    role: user.role,
    email: user.email,
    userId: user.id
  };
}

export async function createAdminSession(user: AdminUserSession): Promise<void> {
  const session = await getServerAdminSession();
  session.user = user;
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
