import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { PaymentStatus, Prisma } from "@/../prisma/generated/client";
import SyncPendingPaymentsButton from "@/components/admin/SyncPendingPaymentsButton";

function formatETB(amount: string) {
  const numeric = Number(amount);
  return `ETB ${numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();

  if (normalized === "COMPLETED") {
    return <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-700">COMPLETED</span>;
  }

  if (normalized === "PENDING") {
    return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">PENDING</span>;
  }

  return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">FAILED</span>;
}

export default async function AdminDonationsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const resolved = await searchParams;
  const query = (resolved.q ?? "").trim();
  const requestedStatus = (resolved.status ?? "ALL").toUpperCase();
  const status: "ALL" | PaymentStatus =
    requestedStatus === "COMPLETED" || requestedStatus === "PENDING" || requestedStatus === "FAILED"
      ? requestedStatus
      : "ALL";

  const whereClause: Prisma.DonationWhereInput = {
    ...(status !== "ALL" ? { paymentStatus: status } : {}),
    ...(query
      ? {
          OR: [{ donorName: { contains: query } }, { tx_ref: { contains: query } }]
        }
      : {})
  };

  let donations: Array<{
    id: string;
    donorName: string | null;
    donorEmail: string | null;
    amount: { toString(): string };
    paymentStatus: string;
    tx_ref: string;
  }> = [];
  let completedTotal = 0;
  let pendingCount = 0;
  let totalCount = 0;
  let completedCount = 0;
  let loadError = false;

  try {
    const [donationRows, completedAggregate, pendingTotal, allTotal, completedOnly] = await Promise.all([
      prisma.donation.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" }
      }),
      prisma.donation.aggregate({
        _sum: { amount: true },
        where: { paymentStatus: "COMPLETED" }
      }),
      prisma.donation.count({ where: { paymentStatus: "PENDING" } }),
      prisma.donation.count(),
      prisma.donation.count({ where: { paymentStatus: "COMPLETED" } })
    ]);

    donations = donationRows;
    completedTotal = completedAggregate._sum.amount ? Number(completedAggregate._sum.amount) : 0;
    pendingCount = pendingTotal;
    totalCount = allTotal;
    completedCount = completedOnly;
  } catch {
    loadError = true;
  }

  const totalRaised = completedTotal;
  const conversionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const statusTabs = ["ALL", "COMPLETED", "PENDING", "FAILED"] as const;
  const exportParams = new URLSearchParams();

  if (query) {
    exportParams.set("q", query);
  }

  if (status !== "ALL") {
    exportParams.set("status", status);
  }

  const exportQuery = exportParams.toString();
  const exportHref = exportQuery ? `/api/admin/donations/export?${exportQuery}` : "/api/admin/donations/export";

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Raised (ETB)"
          value={`ETB ${totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accent="teal"
        />
        <StatCard title="Pending Transactions" value={pendingCount.toLocaleString()} accent="gold" />
        <StatCard title="Conversion Rate" value={`${conversionRate.toFixed(1)}%`} accent="teal" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Donation Ledger</h1>
        <p className="mt-2 text-sm text-slate-600">Real-time transparency view for local ETB transactions.</p>

        {loadError ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Donation data is temporarily unavailable.
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <form className="contents" method="GET">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search donor or tx_ref"
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#006D77]"
            />
            <button className="rounded-xl bg-[#006D77] px-4 py-3 text-sm font-bold text-white hover:bg-[#005B63]">Search</button>
          </form>
          <a
            href={exportHref}
            className="inline-flex items-center justify-center rounded-xl border border-[#006D77] px-4 py-3 text-sm font-bold text-[#006D77] hover:bg-[#E7F6F7]"
          >
            Export .xlsx
          </a>
          <SyncPendingPaymentsButton />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {statusTabs.map((tab) => {
            const isActive = status === tab;
            const params = new URLSearchParams();

            if (query) {
              params.set("q", query);
            }

            if (tab !== "ALL") {
              params.set("status", tab);
            }

            const href = `?${params.toString()}`;

            return (
              <Link
                key={tab}
                href={href}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  isActive ? "bg-[#006D77] text-white" : "border border-slate-300 text-slate-700 hover:border-[#006D77]"
                }`}
              >
                {tab}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="border-b border-slate-200 px-4 py-3">Donor</th>
                <th className="border-b border-slate-200 px-4 py-3">Amount</th>
                <th className="border-b border-slate-200 px-4 py-3">Status</th>
                <th className="border-b border-slate-200 px-4 py-3">Reference</th>
              </tr>
            </thead>
            <tbody>
              {donations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="border-b border-slate-100 px-4 py-8">
                    <div className="mx-auto max-w-xl rounded-2xl border border-teal-200 bg-gradient-to-r from-[#E7F6F7] to-[#F2FBFB] px-4 py-5 text-center">
                      <p className="text-sm font-bold text-[#005B63]">
                        {loadError ? "Donations are temporarily unavailable." : "No donations found for this filter."}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">Try a different status filter or run a pending payment sync.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                donations.map((donation) => (
                  <tr key={donation.id}>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <p className="font-semibold text-slate-800">{donation.donorName ?? "Anonymous"}</p>
                      <p className="text-xs text-slate-500">{donation.donorEmail ?? "No email"}</p>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-800">
                      {formatETB(donation.amount.toString())}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <StatusBadge status={donation.paymentStatus} />
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-600">
                      {donation.tx_ref}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StatCard({ title, value, accent }: { title: string; value: string; accent: "teal" | "gold" }) {
  const accentClasses = accent === "teal" ? "border-[#006D77] text-[#006D77]" : "border-[#FFB703] text-[#B77900]";

  return (
    <article className={`rounded-2xl border-t-4 bg-white p-5 shadow-sm ${accentClasses}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </article>
  );
}
