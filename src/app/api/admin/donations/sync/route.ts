import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { revalidateTag } from "next/cache";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { reconcilePendingDonations } from "@/lib/reconcile";
import { getIpFromHeaders, logServerActionFailure } from "@/lib/logger";
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
      await logServerActionFailure({
        action: "donationSyncForbidden",
        userId: user.id,
        ip: requestIp,
        message: "Forbidden sync attempt.",
        metadata: { role: user.role }
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const result = await reconcilePendingDonations({
      actorUserId: user.id,
      actorIp: requestIp
    });

    revalidateTag(TRANSPARENCY_IMPACT_TAG);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error: unknown) {
    await logServerActionFailure({
      action: "donationSyncFailure",
      userId: user.id,
      ip: requestIp,
      message: error instanceof Error ? error.message : "Donation sync failed.",
      metadata: { cronAuthorized: isCronAuthorized }
    });
    return NextResponse.json({ error: "Failed to sync pending donations" }, { status: 500 });
  }
}
