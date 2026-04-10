"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";

// We use the string representation for the enum to avoid type mismatch if client isn't regenerated yet
// But we should cast to any to bypass strict type check if necessary, or just use the string.
// Ideally Prisma types will catch up.

export async function upsertSchoolExpense(formData: FormData) {
  const amountStr = formData.get("amount") as string;
  const category = formData.get("category") as any;
  const description = formData.get("description") as string | null;
  const rawCenterId = formData.get("centerId") as string;
  const expenseId = formData.get("expenseId") as string | null;

  if (!amountStr || !category || !rawCenterId) {
    throw new Error("Missing required fields for School Expense");
  }

  const amount = new Decimal(amountStr).toNumber();
  const centerId = rawCenterId === "GLOBAL" ? null : rawCenterId;

  const data: any = {
    amount,
    category,
    description: description || null,
    centerId: centerId
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
  return { success: true };
}

export async function deleteSchoolExpense(expenseId: string) {
  await prisma.schoolExpense.delete({
    where: { id: expenseId }
  });
  revalidatePath("/[locale]/admin/finance", "page");
}
