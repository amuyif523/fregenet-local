import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { revalidateTag } from "next/cache";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { reconcilePendingDonations } from "@/lib/reconcile";
import { getIpFromHeaders } from "@/lib/logger";
import { ROLE_DIRECTOR, ROLE_FINANCE, ROLE_SUPERADMIN, assertRoleAllowed } from "@/lib/rbac";
import { TRANSPARENCY_IMPACT_TAG } from "@/lib/cache-tags";

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export async function POST(request: Request) {
  const requestIp = getIpFromHeaders(request.headers);
  const configuredCronSecret = process.env.CRON_SECRET;
  const incomingCronSecret = request.headers.get("x-cron-secret")?.trim();

  const isCronAuthorized =
    Boolean(configuredCronSecret) &&
    Boolean(incomingCronSecret) &&
    safeEqual(incomingCronSecret ?? "", configuredCronSecret ?? "");

  const user = isCronAuthorized ? { id: "system-cron" } : await getAdminSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCronAuthorized && "role" in user) {
    try {
      assertRoleAllowed(user.role, [ROLE_SUPERADMIN, ROLE_DIRECTOR, ROLE_FINANCE]);
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const result = await reconcilePendingDonations({
    actorUserId: user.id,
    actorIp: requestIp
  });

  revalidateTag(TRANSPARENCY_IMPACT_TAG);

  return NextResponse.json({
    ok: true,
    ...result
  });
}
