import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { verifyDonationStatusToken } from "@/lib/donation-status-token";

const schema = z.object({
  tx_ref: z.string().min(1),
  status_token: z.string().optional()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = schema.safeParse({
    tx_ref: searchParams.get("tx_ref"),
    status_token: searchParams.get("status_token") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "tx_ref is required." }, { status: 400 });
  }

  const user = await getAdminSessionUser();
  const hasValidStatusToken = verifyDonationStatusToken(parsed.data.tx_ref, parsed.data.status_token);

  if (!user && !hasValidStatusToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const donation = await prisma.donation.findUnique({
    where: { tx_ref: parsed.data.tx_ref },
    select: {
      tx_ref: true,
      paymentStatus: true,
      amount: true,
      paidAt: true,
      updatedAt: true
    }
  });

  if (!donation) {
    return NextResponse.json({ error: "Donation not found." }, { status: 404 });
  }

  return NextResponse.json({
    tx_ref: donation.tx_ref,
    status: donation.paymentStatus,
    amount: donation.amount.toString(),
    paidAt: donation.paidAt,
    updatedAt: donation.updatedAt
  });
}
