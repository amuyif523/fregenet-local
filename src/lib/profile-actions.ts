"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

function requiredString(value: FormDataEntryValue | null, field: string) {
  const parsed = String(value || "").trim();
  if (!parsed) {
    throw new Error(`${field} is required.`);
  }
  return parsed;
}

export async function changeMyPassword(formData: FormData) {
  const user = await verifySession();

  const currentPassword = requiredString(formData.get("currentPassword"), "Current password");
  const newPassword = requiredString(formData.get("newPassword"), "New password");
  const confirmPassword = requiredString(formData.get("confirmPassword"), "Password confirmation");

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("New password and confirmation do not match.");
  }

  const account = await prisma.staffAccount.findUnique({
    where: { id: user.id },
    select: { id: true, password: true }
  });

  if (!account) {
    throw new Error("Unable to load your account.");
  }

  const currentValid = await bcrypt.compare(currentPassword, account.password);
  if (!currentValid) {
    throw new Error("Current password is incorrect.");
  }

  const nextHash = await bcrypt.hash(newPassword, 12);

  await prisma.staffAccount.update({
    where: { id: account.id },
    data: { password: nextHash }
  });

  revalidatePath("/[locale]/admin/profile", "page");
  return { success: true };
}
