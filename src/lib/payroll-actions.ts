"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Workaround for `Decimal` type which is sometimes difficult to unwrap natively from standard imports in Next.js builds
import Decimal from "decimal.js";

/**
 * Calculates Ethiopian Income Tax based on standard progressive brackets.
 * Formula: (Taxable Income * Bracket Rate) - Standard Deduction
 */
function calculateEthiopianTax(taxableIncomeVal: string | number | typeof Decimal.prototype): typeof Decimal.prototype {
  const t = new Decimal(taxableIncomeVal as any);

  if (t.lte(600)) {
    return new Decimal(0);
  } else if (t.lte(1650)) {
    return t.times(0.10).minus(60);
  } else if (t.lte(3200)) {
    return t.times(0.15).minus(142.50);
  } else if (t.lte(5250)) {
    return t.times(0.20).minus(302.50);
  } else if (t.lte(7800)) {
    return t.times(0.25).minus(565);
  } else if (t.lte(10900)) {
    return t.times(0.30).minus(955);
  } else {
    return t.times(0.35).minus(1500);
  }
}

export async function processCenterPayroll(centerId: string, month: number, year: number) {
  if (centerId === "GLOBAL") {
    throw new Error("Cannot process payroll globally. Select a specific center.");
  }

  // 1. Fetch all active staff for the center
  const staffMembers = await prisma.staff.findMany({
    where: {
      centerId: centerId,
      isActive: true
    }
  });

  if (staffMembers.length === 0) {
    return { success: false, message: "No active staff found for this center." };
  }

  // 2. Check if payroll for this exact month/year has already been recorded
  const existingRuns = await prisma.payrollRecord.findMany({
    where: {
      staffId: { in: staffMembers.map(s => s.id) },
      month,
      year
    }
  });

  const existingStaffIds = new Set(existingRuns.map(r => r.staffId));
  const staffToProcess = staffMembers.filter(s => !existingStaffIds.has(s.id));

  if (staffToProcess.length === 0) {
    return { success: false, message: "Payroll already processed for all active staff this month." };
  }

  // 3. Compute pay records
  const payrollRecordsData = staffToProcess.map(staff => {
    // Financial Safety: Use imported decimal.js instance
    const grossSalary = new Decimal(staff.baseSalary.toString());
    
    // Pension is 7% of Gross Base Salary
    const pensionContribution = grossSalary.times(0.07);
    
    // Taxable Income = Gross Salary - Pension
    const taxableIncome = grossSalary.minus(pensionContribution);
    
    // Calculate Tax using the progressive brackets
    const incomeTax = calculateEthiopianTax(taxableIncome);
    
    // Net Salary = Gross - Pension - Tax
    const netSalary = grossSalary.minus(pensionContribution).minus(incomeTax);

    return {
      staffId: staff.id,
      month,
      year,
      grossSalary: grossSalary.toNumber(),
      netSalary: netSalary.toNumber(),
      incomeTax: incomeTax.toNumber(),
      pensionContribution: pensionContribution.toNumber()
    };
  });

  // 4. Commit as a single Transaction to ensure atomicity
  await prisma.$transaction(
    payrollRecordsData.map(data => prisma.payrollRecord.create({ data }))
  );

  // 5. Revalidate cache
  revalidatePath("/[locale]/admin/staff", "page");
  
  return { 
    success: true, 
    message: `Processed payroll for ${payrollRecordsData.length} staff members.`,
    processedCount: payrollRecordsData.length
  };
}
