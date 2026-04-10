"use server";

import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { verifySession } from "@/lib/auth-guard";
import { ROLE_DIRECTOR, ROLE_SUPERADMIN, assertRoleAllowed } from "@/lib/rbac";

export async function upsertStaff(formData: FormData) {
  const user = await verifySession();
  assertRoleAllowed(user.role, [ROLE_SUPERADMIN, ROLE_DIRECTOR]);

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
  const user = await verifySession();
  assertRoleAllowed(user.role, [ROLE_SUPERADMIN, ROLE_DIRECTOR]);

  await prisma.staff.update({
    where: { id: staffId },
    data: { isActive: false }
  });
  revalidatePath("/[locale]/admin/staff", "page");
}

export async function createStaffAccount(formData: FormData) {
  const user = await verifySession();
  assertRoleAllowed(user.role, [ROLE_SUPERADMIN, ROLE_DIRECTOR]);

  const staffId = String(formData.get("staffId") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "").trim();
  const role = String(formData.get("role") || "STAFF").trim().toUpperCase() as
    | "SUPERADMIN"
    | "DIRECTOR"
    | "FINANCE"
    | "ADMIN"
    | "STAFF";

  if (!staffId || !email || !password) {
    throw new Error("staffId, email, and password are required.");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  // Security requirement: passwords are hashed before persistence.
  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.staffAccount.upsert({
    where: { staffId },
    create: {
      staffId,
      email,
      password: hashedPassword,
      role
    },
    update: {
      email,
      password: hashedPassword,
      role
    }
  });

  revalidatePath("/[locale]/admin/staff", "page");
  return { success: true };
}
