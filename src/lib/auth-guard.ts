import { getServerAdminSession } from "@/lib/admin-session";

export async function verifySession() {
  const session = await getServerAdminSession();
  const user = session.user ?? null;

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
