import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import FinanceClientPage from "./FinanceClientPage";
import { getAdminSessionUser } from "@/lib/admin-auth";

export default async function FinancePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const sessionUser = await getAdminSessionUser();
  const cookieStore = await cookies();
  const rawCenterId = cookieStore.get("fregenet_center_id")?.value || "GLOBAL";
  const isGlobal = rawCenterId === "GLOBAL";

  const centerScope = isGlobal ? {} : { centerId: rawCenterId };

  const [donationAgg, expenseAgg, payrollAgg, existingExpenses, sealedMonths] = await Promise.all([
    prisma.donation.aggregate({
      _sum: { amount: true },
      where: { paymentStatus: "COMPLETED", ...centerScope }
    }),
    prisma.schoolExpense.aggregate({
      _sum: { amount: true },
      where: centerScope
    }),
    prisma.payrollRecord.aggregate({
      _sum: { grossSalary: true, employerPensionContribution: true },
      where: isGlobal ? {} : { staff: { centerId: rawCenterId } } 
    }),
    prisma.schoolExpense.findMany({
      where: centerScope,
      orderBy: { createdAt: "desc" }
    }),
    prisma.sealedFinanceMonth.findMany({
      where: isGlobal ? {} : { centerId: rawCenterId },
      select: {
        centerId: true,
        month: true,
        year: true,
        sealedAt: true
      },
      orderBy: { sealedAt: "desc" }
    })
  ]);

  const totalIncome = Number(donationAgg._sum?.amount ?? 0);
  const totalOpsExpense = Number(expenseAgg._sum?.amount ?? 0);
  
  const totalGrossSalary = Number(payrollAgg._sum?.grossSalary ?? 0);
  const totalEmployerPension = Number(payrollAgg._sum?.employerPensionContribution ?? 0);
  const totalStaffCosts = totalGrossSalary + totalEmployerPension;

  const netBalance = totalIncome - totalOpsExpense - totalStaffCosts;

  const trendData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const startObj = new Date(d.getFullYear(), d.getMonth(), 1);
    const endObj = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    
    const label = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(startObj);

    const timeConstraint = {
      createdAt: { gte: startObj, lt: endObj }
    };

    const [mIncomeAgg, mExpAgg, mPayAgg] = await Promise.all([
      prisma.donation.aggregate({
        _sum: { amount: true },
        where: { paymentStatus: "COMPLETED", ...centerScope, ...timeConstraint }
      }),
      prisma.schoolExpense.aggregate({
        _sum: { amount: true },
        where: { ...centerScope, ...timeConstraint }
      }),
      prisma.payrollRecord.aggregate({
        _sum: { grossSalary: true, employerPensionContribution: true },
        where: { 
          month: startObj.getMonth() + 1, 
          year: startObj.getFullYear(), 
          ...(isGlobal ? {} : { staff: { centerId: rawCenterId } }) 
        }
      })
    ]);

    const mIncome = Number(mIncomeAgg._sum?.amount ?? 0);
    const mOpsExp = Number(mExpAgg._sum?.amount ?? 0);
    const mStaffGross = Number(mPayAgg._sum?.grossSalary ?? 0);
    const mStaffPension = Number(mPayAgg._sum?.employerPensionContribution ?? 0);
    const mOutflow = mOpsExp + mStaffGross + mStaffPension;

    trendData.push({
      name: label,
      income: mIncome,
      outflow: mOutflow
    });
  }

  const categoryGroups = await prisma.schoolExpense.groupBy({
    by: ['category'],
    _sum: { amount: true },
    where: centerScope
  });
  
  const pieData = categoryGroups.map(cg => ({
    name: cg.category,
    value: Number(cg._sum?.amount ?? 0)
  })).sort((a, b) => b.value - a.value);

  return (
    <FinanceClientPage
      isGlobal={isGlobal}
      centerId={rawCenterId}
      userRole={sessionUser?.role || "STAFF"}
      summary={{
        totalIncome,
        totalOpsExpense,
        totalStaffCosts,
        netBalance
      }}
      trendData={trendData}
      pieData={pieData}
      expenses={existingExpenses.map((expense) => ({
        id: expense.id,
        amount: Number(expense.amount),
        category: expense.category,
        description: expense.description,
        createdAt: expense.createdAt
      }))}
      sealedMonths={sealedMonths}
    />
  );
}
