import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/chapa";
import { logCriticalEvent } from "@/lib/logger";
import type { Prisma } from "@/../prisma/generated/client";

type ReconcileOptions = {
  olderThanMinutes?: number;
  limit?: number;
  actorUserId?: string;
  actorIp?: string;
};

type ReconcileResult = {
  scanned: number;
  verified: number;
  completed: number;
  failedVerification: number;
  amountMismatch: number;
  statusMismatch: number;
  alreadyResolved: number;
};

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

export async function reconcilePendingDonations(options: ReconcileOptions = {}): Promise<ReconcileResult> {
  const olderThanMinutes = options.olderThanMinutes ?? 15;
  const limit = options.limit ?? 100;
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  const pendingDonations = await prisma.donation.findMany({
    where: {
      paymentStatus: "PENDING",
      createdAt: { lte: cutoff }
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      tx_ref: true,
      amount: true,
      metadata: true
    }
  });

  let completed = 0;
  let verifiedCount = 0;
  let failedVerification = 0;
  let amountMismatch = 0;
  let statusMismatch = 0;
  let alreadyResolved = 0;

  for (const donation of pendingDonations) {
    try {
      const verified = await verifyTransaction(donation.tx_ref);
      const verifiedStatus = verified.data?.status;
      const verifiedAmount = Number(verified.data?.amount ?? 0);
      const donationAmount = Number(donation.amount.toString());

      if (isSuccessfulStatus(verifiedStatus) && verifiedAmount === donationAmount) {
        verifiedCount += 1;

        const result = await prisma.donation.updateMany({
          where: {
            id: donation.id,
            paymentStatus: "PENDING"
          },
          data: {
            paymentStatus: "COMPLETED",
            paidAt: new Date(),
            metadata: mergeMetadata(donation.metadata, {
              reconciliation: {
                verifiedAt: new Date().toISOString(),
                verifiedStatus,
                source: "auto-reconcile"
              },
              verification: verified
            })
          }
        });

        if (result.count > 0) {
          completed += 1;
          logCriticalEvent({
            event: "DONATION_SUCCESS",
            userId: options.actorUserId ?? "admin",
            ip: options.actorIp,
            message: "Donation marked as completed by reconciliation.",
            metadata: {
              tx_ref: donation.tx_ref,
              source: "reconciliation"
            }
          });
        } else {
          alreadyResolved += 1;
        }
      } else if (isSuccessfulStatus(verifiedStatus) && verifiedAmount !== donationAmount) {
        amountMismatch += 1;

        await prisma.donation.updateMany({
          where: {
            id: donation.id,
            paymentStatus: "PENDING"
          },
          data: {
            metadata: mergeMetadata(donation.metadata, {
              reconciliation: {
                verifiedAt: new Date().toISOString(),
                verifiedStatus,
                source: "auto-reconcile",
                result: "amount_mismatch",
                expectedAmount: donationAmount,
                providerAmount: verifiedAmount
              },
              verification: verified
            })
          }
        });
      } else {
        statusMismatch += 1;

        await prisma.donation.updateMany({
          where: {
            id: donation.id,
            paymentStatus: "PENDING"
          },
          data: {
            metadata: mergeMetadata(donation.metadata, {
              reconciliation: {
                verifiedAt: new Date().toISOString(),
                verifiedStatus,
                source: "auto-reconcile",
                result: "status_mismatch"
              },
              verification: verified
            })
          }
        });
      }
    } catch (error) {
      failedVerification += 1;

      await prisma.donation.updateMany({
        where: {
          id: donation.id,
          paymentStatus: "PENDING"
        },
        data: {
          metadata: mergeMetadata(donation.metadata, {
            reconciliation: {
              verifiedAt: new Date().toISOString(),
              source: "auto-reconcile",
              result: "verification_error",
              reason: error instanceof Error ? error.message : "Unknown verification error"
            }
          })
        }
      });
    }
  }

  return {
    scanned: pendingDonations.length,
    verified: verifiedCount,
    completed,
    failedVerification,
    amountMismatch,
    statusMismatch,
    alreadyResolved
  };
}
