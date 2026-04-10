"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth-guard";
import { ROLE_DIRECTOR, ROLE_STAFF, ROLE_SUPERADMIN, assertRoleAllowed } from "@/lib/rbac";

function assertCenterScope(centerId: string) {
  if (!centerId || centerId === "GLOBAL") {
    throw new Error("Please select a specific center to manage students.");
  }
}

async function resolveActiveCenterId() {
  const cookieStore = await cookies();
  const centerId = cookieStore.get("fregenet_center_id")?.value || "GLOBAL";
  assertCenterScope(centerId);
  return centerId;
}

function requiredString(value: FormDataEntryValue | null, fieldName: string) {
  const parsed = String(value ?? "").trim();
  if (!parsed) {
    throw new Error(`${fieldName} is required.`);
  }
  return parsed;
}

function parseDateValue(raw: FormDataEntryValue | null, fieldName: string) {
  const value = requiredString(raw, fieldName);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }
  return parsed;
}

export async function upsertStudentWithGuardian(formData: FormData) {
  const user = await verifySession();
  assertRoleAllowed(user.role, [ROLE_SUPERADMIN, ROLE_DIRECTOR, ROLE_STAFF]);
  const centerId = await resolveActiveCenterId();

  const studentId = String(formData.get("studentId") || "").trim() || null;
  const guardianId = String(formData.get("guardianId") || "").trim() || null;

  const studentName = requiredString(formData.get("name"), "Student name");
  const gradeLevel = requiredString(formData.get("gradeLevel"), "Grade level");
  const gender = requiredString(formData.get("gender"), "Gender") as "MALE" | "FEMALE" | "OTHER";
  const dateOfBirth = parseDateValue(formData.get("dateOfBirth"), "Date of birth");
  const enrollmentDate = parseDateValue(formData.get("enrollmentDate"), "Enrollment date");
  const status = requiredString(formData.get("status"), "Status") as "ACTIVE" | "INACTIVE" | "ALUMNI" | "DROPPED";

  const guardianName = requiredString(formData.get("guardianName"), "Guardian name");
  const guardianPhoneNumber = requiredString(formData.get("guardianPhoneNumber"), "Guardian phone number");
  const guardianRelationship = requiredString(formData.get("guardianRelationship"), "Guardian relationship") as
    | "MOTHER"
    | "FATHER"
    | "LEGAL_GUARDIAN";

  const guardianEmailRaw = String(formData.get("guardianEmail") || "").trim();
  const guardianAddressRaw = String(formData.get("guardianAddress") || "").trim();

  await prisma.$transaction(async (tx) => {
    let resolvedGuardianId = guardianId;

    if (resolvedGuardianId) {
      const existingGuardian = await tx.guardian.findUnique({ where: { id: resolvedGuardianId } });
      if (!existingGuardian) {
        throw new Error("Guardian record not found.");
      }

      await tx.guardian.update({
        where: { id: resolvedGuardianId },
        data: {
          name: guardianName,
          phoneNumber: guardianPhoneNumber,
          relationship: guardianRelationship,
          email: guardianEmailRaw || null,
          address: guardianAddressRaw || null
        }
      });
    } else {
      const createdGuardian = await tx.guardian.create({
        data: {
          name: guardianName,
          phoneNumber: guardianPhoneNumber,
          relationship: guardianRelationship,
          email: guardianEmailRaw || null,
          address: guardianAddressRaw || null
        }
      });
      resolvedGuardianId = createdGuardian.id;
    }

    if (!resolvedGuardianId) {
      throw new Error("Unable to resolve guardian record.");
    }

    if (studentId) {
      const existingStudent = await tx.student.findFirst({
        where: { id: studentId, centerId },
        select: { id: true }
      });

      if (!existingStudent) {
        throw new Error("Student record not found in the selected center.");
      }

      await tx.student.update({
        where: { id: studentId },
        data: {
          name: studentName,
          gradeLevel,
          gender,
          dateOfBirth,
          enrollmentDate,
          status,
          guardianId: resolvedGuardianId
        }
      });
    } else {
      await tx.student.create({
        data: {
          name: studentName,
          gradeLevel,
          gender,
          dateOfBirth,
          enrollmentDate,
          status,
          guardianId: resolvedGuardianId,
          centerId
        }
      });
    }
  });

  revalidatePath("/[locale]/admin/students", "page");
  return { success: true };
}

export async function logStudentInteraction(formData: FormData) {
  const user = await verifySession();
  assertRoleAllowed(user.role, [ROLE_SUPERADMIN, ROLE_DIRECTOR, ROLE_STAFF]);
  const centerId = await resolveActiveCenterId();

  const studentId = requiredString(formData.get("studentId"), "Student id");
  const interactionType = requiredString(formData.get("interactionType"), "Interaction type") as
    | "PARENT_MEETING"
    | "DISCIPLINARY_NOTE"
    | "ATTENDANCE_FOLLOWUP"
    | "UNIFORM_SUPPORT"
    | "GENERAL_NOTE";

  const title = requiredString(formData.get("title"), "Title");
  const notes = requiredString(formData.get("notes"), "Notes");

  const interactionDateRaw = String(formData.get("interactionDate") || "").trim();
  const interactionDate = interactionDateRaw ? parseDateValue(interactionDateRaw, "Interaction date") : new Date();

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      centerId
    },
    select: { id: true }
  });

  if (!student) {
    throw new Error("Student not found in the selected center.");
  }

  await prisma.studentInteraction.create({
    data: {
      studentId,
      centerId,
      interactionType,
      title,
      notes,
      interactionDate,
      performedBy: user.id
    }
  });

  revalidatePath("/[locale]/admin/students", "page");
  revalidatePath(`/[locale]/admin/students/${studentId}`, "page");
  revalidatePath("/[locale]/admin/activity", "page");
  return { success: true };
}
