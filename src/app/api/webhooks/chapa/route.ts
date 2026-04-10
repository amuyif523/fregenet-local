import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/chapa";
import { getIpFromHeaders, logCriticalEvent } from "@/lib/logger";
import type { Prisma } from "@/../prisma/generated/client";

type ChapaWebhookPayload = {
  event?: string;
  status?: string;
  tx_ref?: string;
  data?: {
    tx_ref?: string;
    status?: string;
  };
};

function isSuccessEvent(payload: ChapaWebhookPayload) {
  const event = payload.event?.toLowerCase() ?? "";
  const status = (payload.data?.status ?? payload.status ?? "").toLowerCase();

  return event.includes("success") || status === "success";
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

function isSuccessfulStatus(value: string | undefined) {
  return (value ?? "").toLowerCase() === "success";
}

function mergeMetadata(
  existing: unknown,
  patch: Record<string, unknown>
): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};

  return {
    ...base,
    ...patch
  } as Prisma.InputJsonValue;
}

export async function POST(request: Request) {
  const requestIp = getIpFromHeaders(request.headers);
  const expectedSignature = process.env.CHAPA_WEBHOOK_SECRET || process.env.CHAPA_SECRET_KEY;
  const incomingSignature = request.headers.get("x-chapa-signature");

  const rawBody = await request.text();

  if (!incomingSignature) {
    logCriticalEvent({
      event: "WEBHOOK_FAILURE",
      userId: "system",
      ip: requestIp,
      message: "Webhook rejected: missing signature."
    });
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 401 });
  }

  if (!expectedSignature) {
    logCriticalEvent({
      event: "WEBHOOK_FAILURE",
      userId: "system",
      ip: requestIp,
      message: "Webhook rejected: secret not configured."
    });
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 500 });
  }

  const computed = crypto.createHmac("sha256", expectedSignature).update(rawBody).digest("hex");

  if (!safeEqual(incomingSignature, computed)) {
    logCriticalEvent({
      event: "WEBHOOK_FAILURE",
      userId: "system",
      ip: requestIp,
      message: "Webhook rejected: invalid signature."
    });
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: ChapaWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as ChapaWebhookPayload;
  } catch {
    logCriticalEvent({
      event: "WEBHOOK_FAILURE",
      userId: "system",
      ip: requestIp,
      message: "Webhook rejected: invalid JSON payload."
    });
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const txRef = payload.data?.tx_ref ?? payload.tx_ref;

  if (!txRef) {
    return NextResponse.json({ error: "Missing tx_ref" }, { status: 400 });
  }

  const donation = await prisma.donation.findUnique({
    where: { tx_ref: txRef }
  });

  if (!donation) {
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  if (donation.paymentStatus === "COMPLETED") {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  if (isSuccessEvent(payload)) {
    try {
      const verified = await verifyTransaction(txRef);
      const verifiedStatus = verified.data?.status;
      const verifiedAmount = Number(verified.data?.amount ?? 0);
      const storedAmount = Number(donation.amount.toString());

      if (isSuccessfulStatus(verifiedStatus) && verifiedAmount === storedAmount) {
        const updateResult = await prisma.donation.updateMany({
          where: {
            tx_ref: txRef,
            paymentStatus: { not: "COMPLETED" }
          },
          data: {
            paymentStatus: "COMPLETED",
            paidAt: new Date(),
            metadata: mergeMetadata(donation.metadata, {
              webhook: payload,
              verification: verified
            })
          }
        });

        if (updateResult.count === 0) {
          return NextResponse.json({ ok: true, idempotent: true });
        }

        logCriticalEvent({
          event: "DONATION_SUCCESS",
          userId: "system",
          ip: requestIp,
          message: "Donation marked as completed by webhook verification.",
          metadata: {
            tx_ref: txRef,
            source: "webhook"
          }
        });

        return NextResponse.json({ ok: true, updated: true });
      }

      await prisma.donation.updateMany({
        where: {
          tx_ref: txRef,
          paymentStatus: { not: "COMPLETED" }
        },
        data: {
          paymentStatus: "FAILED",
          metadata: mergeMetadata(donation.metadata, {
            webhook: payload,
            verification: verified,
            reason: "Verification mismatch"
          })
        }
      });

      return NextResponse.json({ ok: true, verified: false });
    } catch (verifyError) {
      const message = verifyError instanceof Error ? verifyError.message : "Verification failed";

      logCriticalEvent({
        event: "WEBHOOK_FAILURE",
        userId: "system",
        ip: requestIp,
        message: "Webhook verification failed.",
        metadata: {
          tx_ref: txRef,
          reason: message
        }
      });

      await prisma.donation.updateMany({
        where: {
          tx_ref: txRef,
          paymentStatus: { not: "COMPLETED" }
        },
        data: {
          paymentStatus: "FAILED",
          metadata: mergeMetadata(donation.metadata, {
            webhook: payload,
            reason: message
          })
        }
      });

      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  await prisma.donation.updateMany({
    where: {
      tx_ref: txRef,
      paymentStatus: { not: "COMPLETED" }
    },
    data: {
      paymentStatus: "FAILED",
      metadata: mergeMetadata(donation.metadata, { webhook: payload })
    }
  });

  return NextResponse.json({ ok: true });
}
