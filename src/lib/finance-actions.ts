"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import Decimal from "decimal.js";
import { verifySession } from "@/lib/auth-guard";
import { ROLE_DIRECTOR, ROLE_FINANCE, ROLE_SUPERADMIN, assertRoleAllowed, normalizeRole } from "@/lib/rbac";
import { TRANSPARENCY_IMPACT_TAG } from "@/lib/cache-tags";

const EXPENSE_CATEGORIES = ["FOOD_PROGRAM", "UTILITIES", "MAINTENANCE", "CONSTRUCTION", "SUPPLIES"] as const;
type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

async function assertMonthNotSealed(centerId: string | null, month: number, year: number) {
  if (!centerId) {
    return;
  }

  const sealed = await prisma.sealedFinanceMonth.findUnique({
    where: {
      centerId_month_year: {
        centerId,
        month,
        year
      }
    },
    select: { id: true }
  });

  if (sealed) {
    throw new Error("This month is sealed after payroll processing. Expense changes are locked.");
  }
}

function extractMonthYear(date: Date) {
  return {
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear()
  };
}

export async function upsertSchoolExpense(formData: FormData) {
  const user = await verifySession();
  assertRoleAllowed(user.role, [ROLE_SUPERADMIN, ROLE_DIRECTOR, ROLE_FINANCE]);
  const amountStr = String(formData.get("amount") || "").trim();
  const categoryValue = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const rawCenterId = String(formData.get("centerId") || "").trim();
  const expenseId = String(formData.get("expenseId") || "").trim() || null;

  if (!amountStr || !categoryValue || !rawCenterId) {
    throw new Error("Missing required fields for School Expense");
  }

  if (!EXPENSE_CATEGORIES.includes(categoryValue as ExpenseCategory)) {
    throw new Error("Invalid expense category.");
  }

  const amount = new Decimal(amountStr).toNumber();
  const centerId = rawCenterId === "GLOBAL" ? null : rawCenterId;
  const category: ExpenseCategory = categoryValue as ExpenseCategory;

  if (expenseId) {
    const existingExpense = await prisma.schoolExpense.findUnique({
      where: { id: expenseId },
      select: { id: true, centerId: true, createdAt: true }
    });

    if (!existingExpense) {
      throw new Error("Expense not found.");
    }

    if (existingExpense.centerId !== centerId) {
      throw new Error("Cannot update expense outside the active scope.");
    }

    const { month, year } = extractMonthYear(existingExpense.createdAt);
    await assertMonthNotSealed(existingExpense.centerId, month, year);
  } else {
    const now = new Date();
    const { month, year } = extractMonthYear(now);
    await assertMonthNotSealed(centerId, month, year);
  }

  const data = {
    amount,
    category,
    description: description || null,
    centerId: centerId,
    performedBy: user.id
  };

  if (expenseId) {
    await prisma.schoolExpense.update({
      where: { id: expenseId },
      data
    });
  } else {
    await prisma.schoolExpense.create({
      data
    });
  }

  revalidatePath("/[locale]/admin/finance", "page");
  revalidatePath("/[locale]/admin/activity", "page");
  revalidateTag(TRANSPARENCY_IMPACT_TAG);
  return { success: true };
}

export async function deleteSchoolExpense(expenseId: string) {
  const user = await verifySession();
  assertRoleAllowed(user.role, [ROLE_SUPERADMIN, ROLE_DIRECTOR, ROLE_FINANCE]);

  const existingExpense = await prisma.schoolExpense.findUnique({
    where: { id: expenseId },
    select: { centerId: true, createdAt: true }
  });

  if (!existingExpense) {
    throw new Error("Expense not found.");
  }

  const { month, year } = extractMonthYear(existingExpense.createdAt);
  await assertMonthNotSealed(existingExpense.centerId, month, year);

  await prisma.schoolExpense.delete({
    where: { id: expenseId }
  });
  revalidatePath("/[locale]/admin/finance", "page");
  revalidatePath("/[locale]/admin/activity", "page");
  revalidateTag(TRANSPARENCY_IMPACT_TAG);
}

export async function unsealFinanceMonth(input: { centerId: string; month: number; year: number; reason: string }) {
  const user = await verifySession();

  if (normalizeRole(user.role) !== ROLE_SUPERADMIN) {
    throw new Error("Forbidden");
  }

  const centerId = String(input.centerId || "").trim();
  const month = Number(input.month);
  const year = Number(input.year);
  const reason = String(input.reason || "").trim();

  if (!centerId) {
    throw new Error("Center is required.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid month.");
  }

  if (!Number.isInteger(year) || year < 2000) {
    throw new Error("Invalid year.");
  }

  if (reason.length < 10) {
    throw new Error("Reason for unsealing is required and must be at least 10 characters.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.sealedFinanceMonth.delete({
      where: {
        centerId_month_year: {
          centerId,
          month,
          year
        }
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        actionType: "UNSEAL_FINANCE_MONTH",
        notes: reason,
        metadata: {
          centerId,
          month,
          year
        }
      }
    });
  });

  revalidatePath("/[locale]/admin/finance", "page");
  revalidatePath("/[locale]/admin/activity", "page");
  revalidateTag(TRANSPARENCY_IMPACT_TAG);

  return { success: true };
}
