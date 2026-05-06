import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { TRANSPARENCY_IMPACT_TAG } from "@/lib/cache-tags";
import TransparencyClientPage from "./TransparencyClientPage";

export const revalidate = 3600;

type BucketKey = "DONATIONS" | "PENDING" | "ALLOCATION_PLANNED" | "NOT_ALLOCATED" | "OPERATIONS";

const BUCKET_LABELS: Record<BucketKey, string> = {
  DONATIONS: "Donations Received",
  PENDING: "Pending Processing",
  ALLOCATION_PLANNED: "Planned Allocation",
  NOT_ALLOCATED: "Not Yet Allocated",
  OPERATIONS: "Operations"
};

const getTransparencyImpactData = unstable_cache(
  async () => {
    const incomeAggregate = await prisma.donation.aggregate({
      _sum: { amount: true },
      where: { paymentStatus: "COMPLETED" }
    });

    const totalIncome = Number(incomeAggregate._sum?.amount ?? 0);

    // Foundation: only show donation totals, no spending breakdown since ERP is decommissioned
    const buckets: Record<BucketKey, number> = {
      DONATIONS: totalIncome,
      PENDING: 0,
      ALLOCATION_PLANNED: 0,
      NOT_ALLOCATED: 0,
      OPERATIONS: 0
    };

    const totalImpactSpending = totalIncome;

    const chartData = (Object.keys(buckets) as BucketKey[])
      .map((bucketKey) => {
        const amount = buckets[bucketKey];
        const percent = totalImpactSpending > 0 ? (amount / totalImpactSpending) * 100 : 0;
        const perBirr = totalImpactSpending > 0 ? amount / totalImpactSpending : 0;

        return {
          key: bucketKey,
          label: BUCKET_LABELS[bucketKey],
          amount,
          percent,
          perBirr
        };
      })
      .filter((entry) => entry.amount > 0);

    const utilizationRatio = totalIncome > 0 ? totalImpactSpending / totalIncome : 0;

    return {
      totalIncome,
      totalImpactSpending,
      utilizationRatio,
      chartData
    };
  },
  ["public-transparency-impact-v1"],
  { revalidate: 3600, tags: [TRANSPARENCY_IMPACT_TAG] }
);

export default async function TransparencyPage() {
  const data = await getTransparencyImpactData();
  return <TransparencyClientPage {...data} />;
}
