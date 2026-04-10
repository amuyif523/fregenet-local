import { prisma } from "@/lib/prisma";
import TransparencyClientPage from "./TransparencyClientPage";

export const revalidate = 3600;

type BucketKey = "TEACHERS" | "FOOD" | "CONSTRUCTION" | "SUPPLIES" | "OPERATIONS";

const BUCKET_LABELS: Record<BucketKey, string> = {
  TEACHERS: "Teachers",
  FOOD: "Food Program",
  CONSTRUCTION: "Construction",
  SUPPLIES: "Supplies",
  OPERATIONS: "Operations"
};

export default async function TransparencyPage() {
  const [incomeAggregate, payrollAggregate, expenseGroups] = await Promise.all([
    prisma.donation.aggregate({
      _sum: { amount: true },
      where: { paymentStatus: "COMPLETED" }
    }),
    prisma.payrollRecord.aggregate({
      _sum: {
        grossSalary: true,
        employerPensionContribution: true
      }
    }),
    prisma.schoolExpense.groupBy({
      by: ["category"],
      _sum: { amount: true }
    })
  ]);

  const totalIncome = Number(incomeAggregate._sum?.amount ?? 0);
  const teacherSpending = Number(payrollAggregate._sum?.grossSalary ?? 0) + Number(payrollAggregate._sum?.employerPensionContribution ?? 0);

  const buckets: Record<BucketKey, number> = {
    TEACHERS: teacherSpending,
    FOOD: 0,
    CONSTRUCTION: 0,
    SUPPLIES: 0,
    OPERATIONS: 0
  };

  for (const group of expenseGroups) {
    const amount = Number(group._sum?.amount ?? 0);

    if (group.category === "FOOD_PROGRAM") {
      buckets.FOOD += amount;
      continue;
    }

    if (group.category === "CONSTRUCTION") {
      buckets.CONSTRUCTION += amount;
      continue;
    }

    if (group.category === "SUPPLIES") {
      buckets.SUPPLIES += amount;
      continue;
    }

    if (group.category === "UTILITIES" || group.category === "MAINTENANCE") {
      buckets.OPERATIONS += amount;
    }
  }

  const totalImpactSpending = Object.values(buckets).reduce((sum, value) => sum + value, 0);

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

  return (
    <TransparencyClientPage
      totalIncome={totalIncome}
      totalImpactSpending={totalImpactSpending}
      utilizationRatio={utilizationRatio}
      chartData={chartData}
    />
  );
}
