"use server";

import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/storage";
import { revalidatePath } from "next/cache";

export async function upsertStaff(formData: FormData) {
  const file = formData.get("photo") as File | null;
  const name = formData.get("name") as string;
  const role = formData.get("role") as "TEACHER" | "ADMIN" | "SUPPORT";
  const baseSalary = parseFloat(formData.get("baseSalary") as string);
  const pensionNumber = formData.get("pensionNumber") as string | null;
  const centerId = formData.get("centerId") as string;
  const staffId = formData.get("staffId") as string | null;

  if (!name || !role || isNaN(baseSalary) || !centerId) {
    throw new Error("Missing required fields");
  }

  let photoUrl: string | undefined;

  // We only upload if a valid file with substantial size was attached
  if (file && file.size > 0 && file.name !== "undefined") {
    photoUrl = await saveUpload(file, { subdirectory: "staff" });
  }

  if (staffId) {
    // Update existing
    await prisma.staff.update({
      where: { id: staffId },
      data: {
        name,
        role,
        baseSalary,
        pensionNumber: pensionNumber || null,
        ...(photoUrl ? { photoUrl } : {}) // maintain old photo if none uploaded
      }
    });
  } else {
    // Create new
    await prisma.staff.create({
      data: {
        name,
        role,
        baseSalary,
        pensionNumber: pensionNumber || null,
        centerId,
        ...(photoUrl ? { photoUrl } : {})
      }
    });
  }

  revalidatePath("/[locale]/admin/staff", "page");
  return { success: true };
}

export async function deactivateStaff(staffId: string) {
  await prisma.staff.update({
    where: { id: staffId },
    data: { isActive: false }
  });
  revalidatePath("/[locale]/admin/staff", "page");
}
