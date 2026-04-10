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

function parseIsoDateString(value: string, fieldName: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date (YYYY-MM-DD).`);
  }
  return parsed;
}

function normalizePhone(value: string) {
  return value.replace(/[\s\-()]/g, "").trim();
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvContent(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const rows = lines.slice(1).map((line, index) => ({
    rowNumber: index + 2,
    values: parseCsvLine(line)
  }));

  return { headers, rows };
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

export async function bulkImportStudentsFromCsv(formData: FormData) {
  const user = await verifySession();
  assertRoleAllowed(user.role, [ROLE_SUPERADMIN, ROLE_DIRECTOR, ROLE_STAFF]);

  const centerId = await resolveActiveCenterId();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("CSV file is required.");
  }

  if (file.size === 0) {
    throw new Error("CSV file is empty.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("CSV file is too large. Maximum supported size is 5MB.");
  }

  const content = await file.text();
  const { headers, rows } = parseCsvContent(content);

  const requiredHeaders = [
    "student_name",
    "grade_level",
    "gender",
    "date_of_birth",
    "enrollment_date",
    "guardian_name",
    "guardian_phone"
  ];

  for (const requiredHeader of requiredHeaders) {
    if (!headers.includes(requiredHeader)) {
      throw new Error(`Missing required CSV header: ${requiredHeader}`);
    }
  }

  const indexByHeader = new Map(headers.map((header, index) => [header, index]));

  const guardianRows = await prisma.guardian.findMany({
    select: { id: true, phoneNumber: true }
  });

  const guardianByPhone = new Map<string, { id: string }>();
  for (const guardian of guardianRows) {
    const normalized = normalizePhone(guardian.phoneNumber);
    if (normalized) {
      guardianByPhone.set(normalized, { id: guardian.id });
    }
  }

  let createdStudents = 0;
  let updatedStudents = 0;
  let createdGuardians = 0;
  const errors: Array<{ rowNumber: number; message: string }> = [];

  const readCell = (cells: string[], header: string) => {
    const index = indexByHeader.get(header);
    if (index === undefined) {
      return "";
    }
    return String(cells[index] ?? "").trim();
  };

  for (const row of rows) {
    try {
      const studentName = readCell(row.values, "student_name");
      const gradeLevel = readCell(row.values, "grade_level");
      const gender = readCell(row.values, "gender").toUpperCase() as "MALE" | "FEMALE" | "OTHER";
      const dateOfBirth = parseIsoDateString(readCell(row.values, "date_of_birth"), "date_of_birth");
      const enrollmentDate = parseIsoDateString(readCell(row.values, "enrollment_date"), "enrollment_date");
      const status = (readCell(row.values, "status") || "ACTIVE").toUpperCase() as "ACTIVE" | "INACTIVE" | "ALUMNI" | "DROPPED";

      const guardianName = readCell(row.values, "guardian_name");
      const guardianPhoneRaw = readCell(row.values, "guardian_phone");
      const guardianRelationship = (readCell(row.values, "guardian_relationship") || "LEGAL_GUARDIAN").toUpperCase() as
        | "MOTHER"
        | "FATHER"
        | "LEGAL_GUARDIAN";
      const guardianEmail = readCell(row.values, "guardian_email") || null;
      const guardianAddress = readCell(row.values, "guardian_address") || null;

      if (!studentName || !gradeLevel || !guardianName || !guardianPhoneRaw) {
        throw new Error("Missing required student or guardian fields.");
      }

      if (!["MALE", "FEMALE", "OTHER"].includes(gender)) {
        throw new Error("gender must be MALE, FEMALE, or OTHER.");
      }

      if (!["ACTIVE", "INACTIVE", "ALUMNI", "DROPPED"].includes(status)) {
        throw new Error("status must be ACTIVE, INACTIVE, ALUMNI, or DROPPED.");
      }

      if (!["MOTHER", "FATHER", "LEGAL_GUARDIAN"].includes(guardianRelationship)) {
        throw new Error("guardian_relationship must be MOTHER, FATHER, or LEGAL_GUARDIAN.");
      }

      const normalizedPhone = normalizePhone(guardianPhoneRaw);
      if (!normalizedPhone) {
        throw new Error("guardian_phone is invalid.");
      }

      let guardianId = guardianByPhone.get(normalizedPhone)?.id;

      if (!guardianId) {
        const createdGuardian = await prisma.guardian.create({
          data: {
            name: guardianName,
            phoneNumber: guardianPhoneRaw,
            relationship: guardianRelationship,
            email: guardianEmail,
            address: guardianAddress
          },
          select: { id: true }
        });

        guardianId = createdGuardian.id;
        guardianByPhone.set(normalizedPhone, { id: guardianId });
        createdGuardians += 1;
      } else {
        await prisma.guardian.update({
          where: { id: guardianId },
          data: {
            name: guardianName,
            relationship: guardianRelationship,
            email: guardianEmail,
            address: guardianAddress
          }
        });
      }

      const existingStudent = await prisma.student.findFirst({
        where: {
          centerId,
          name: studentName,
          dateOfBirth
        },
        select: { id: true }
      });

      if (existingStudent) {
        await prisma.student.update({
          where: { id: existingStudent.id },
          data: {
            gradeLevel,
            gender,
            enrollmentDate,
            status,
            guardianId
          }
        });
        updatedStudents += 1;
      } else {
        await prisma.student.create({
          data: {
            centerId,
            name: studentName,
            gradeLevel,
            gender,
            dateOfBirth,
            enrollmentDate,
            status,
            guardianId
          }
        });
        createdStudents += 1;
      }
    } catch (error: unknown) {
      errors.push({
        rowNumber: row.rowNumber,
        message: error instanceof Error ? error.message : "Unknown import error"
      });
    }
  }

  revalidatePath("/[locale]/admin/students", "page");
  revalidatePath("/[locale]/admin/students/import", "page");
  revalidatePath("/[locale]/admin/activity", "page");

  return {
    processed: rows.length,
    createdStudents,
    updatedStudents,
    createdGuardians,
    failedRows: errors.length,
    errors
  };
}
