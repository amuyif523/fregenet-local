"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth-guard";
import { ROLE_DIRECTOR, ROLE_STAFF, ROLE_SUPERADMIN, assertRoleAllowed } from "@/lib/rbac";

type AttendanceEntryInput = {
  studentId: string;
  status: "PRESENT" | "ABSENT" | "TARDY" | "EXCUSED";
  notes?: string;
};

function assertCenterScope(centerId: string) {
  if (!centerId || centerId === "GLOBAL") {
    throw new Error("Please select a specific center to manage attendance.");
  }
}

async function resolveActiveCenterId() {
  const cookieStore = await cookies();
  const centerId = cookieStore.get("fregenet_center_id")?.value || "GLOBAL";
  assertCenterScope(centerId);
  return centerId;
}

function parseSheetDate(dateValue: string) {
  const parsed = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid attendance date.");
  }

  return parsed;
}

function assertSchoolSessionDate(date: Date) {
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  if (date.getTime() > todayUtc.getTime()) {
    throw new Error("Attendance cannot be logged for future dates.");
  }

  if (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    throw new Error("Attendance cannot be logged on weekends.");
  }
}

export async function saveAttendanceSheet(input: { date: string; entries: AttendanceEntryInput[] }) {
  const user = await verifySession();
  assertRoleAllowed(user.role, [ROLE_SUPERADMIN, ROLE_DIRECTOR, ROLE_STAFF]);
  const centerId = await resolveActiveCenterId();

  if (!input?.date) {
    throw new Error("Attendance date is required.");
  }

  if (!Array.isArray(input.entries) || input.entries.length === 0) {
    throw new Error("Attendance entries are required.");
  }

  const attendanceDate = parseSheetDate(input.date);
  assertSchoolSessionDate(attendanceDate);
  const uniqueStudentIds = [...new Set(input.entries.map((entry) => entry.studentId))];

  await prisma.$transaction(async (tx) => {
    const students = await tx.student.findMany({
      where: {
        id: { in: uniqueStudentIds },
        centerId,
        status: "ACTIVE"
      },
      select: { id: true }
    });

    const validStudentIds = new Set(students.map((student) => student.id));
    if (validStudentIds.size !== uniqueStudentIds.length) {
      throw new Error("One or more attendance rows include students outside this active center.");
    }

    for (const entry of input.entries) {
      await tx.attendance.upsert({
        where: {
          studentId_date: {
            studentId: entry.studentId,
            date: attendanceDate
          }
        },
        create: {
          studentId: entry.studentId,
          centerId,
          date: attendanceDate,
          status: entry.status,
          notes: entry.notes?.trim() || null,
          performedBy: user.id
        },
        update: {
          status: entry.status,
          notes: entry.notes?.trim() || null,
          performedBy: user.id
        }
      });
    }
  });

  revalidatePath("/[locale]/admin/attendance", "page");
  revalidatePath("/[locale]/admin/students", "page");
  return { success: true };
}
