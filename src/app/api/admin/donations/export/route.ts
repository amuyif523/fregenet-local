import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth-guard";
import type { PaymentStatus, Prisma } from "@/../prisma/generated/client";

function buildFilter(searchParams: URLSearchParams) {
  const query = (searchParams.get("q") ?? "").trim();
  const requestedStatus = (searchParams.get("status") ?? "ALL").toUpperCase();
  const status: "ALL" | PaymentStatus =
    requestedStatus === "COMPLETED" || requestedStatus === "PENDING" || requestedStatus === "FAILED"
      ? requestedStatus
      : "ALL";

  const whereClause: Prisma.DonationWhereInput = {
    ...(status !== "ALL" ? { paymentStatus: status } : {}),
    ...(query
      ? {
          OR: [{ donorName: { contains: query } }, { tx_ref: { contains: query } }, { donorEmail: { contains: query } }]
        }
      : {})
  };

  return { query, status, whereClause };
}

export async function GET(request: NextRequest) {
  try {
    await verifySession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { whereClause } = buildFilter(request.nextUrl.searchParams);

  const donations = await prisma.donation.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    select: {
      donorName: true,
      donorEmail: true,
      donorPhone: true,
      tx_ref: true,
      amount: true,
      currency: true,
      paymentStatus: true,
      paymentProvider: true,
      chapaCheckoutId: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true
    }
  });

  const rows = donations.map((donation) => ({
    donor_name: donation.donorName ?? "",
    donor_email: donation.donorEmail ?? "",
    donor_phone: donation.donorPhone ?? "",
    tx_ref: donation.tx_ref,
    amount: Number(donation.amount.toString()),
    currency: donation.currency,
    status: donation.paymentStatus,
    provider: donation.paymentProvider,
    checkout_id: donation.chapaCheckoutId ?? "",
    paid_at: donation.paidAt ? donation.paidAt.toISOString() : "",
    created_at: donation.createdAt.toISOString(),
    updated_at: donation.updatedAt.toISOString()
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Donations");

  const fileBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `donations-ledger-${stamp}.xlsx`;

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store"
    }
  });
}
