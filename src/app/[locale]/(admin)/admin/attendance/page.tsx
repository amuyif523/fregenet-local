import { cookies } from "next/headers";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import AttendanceClientPage, { type AttendanceStudentRow } from "./AttendanceClientPage";

function normalizeDateInput(dateValue: string) {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return new Date(parsed.toISOString().slice(0, 10));
}

export default async function AttendancePage({
  searchParams
}: {
  searchParams?: Promise<{ date?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const dateParam = (resolvedSearchParams.date || "").trim();

  const selectedDateObj = dateParam ? normalizeDateInput(dateParam) : new Date();
  const selectedDate = format(selectedDateObj, "yyyy-MM-dd");

  const cookieStore = await cookies();
  const rawCenterId = cookieStore.get("fregenet_center_id")?.value || "GLOBAL";
  const isGlobal = rawCenterId === "GLOBAL";

  if (isGlobal) {
    return <AttendanceClientPage isGlobal selectedDate={selectedDate} rows={[]} />;
  }

  const normalizedDate = new Date(selectedDate);

  const [students, existingAttendance] = await Promise.all([
    prisma.student.findMany({
      where: {
        centerId: rawCenterId,
        status: "ACTIVE"
      },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        gradeLevel: true
      }
    }),
    prisma.attendance.findMany({
      where: {
        centerId: rawCenterId,
        date: normalizedDate
      },
      select: {
        studentId: true,
        status: true,
        notes: true
      }
    })
  ]);

  const existingMap = new Map(existingAttendance.map((entry) => [entry.studentId, entry]));

  const rows: AttendanceStudentRow[] = students.map((student) => {
    const existing = existingMap.get(student.id);
    return {
      studentId: student.id,
      studentName: student.name,
      gradeLevel: student.gradeLevel,
      status: existing?.status || "PRESENT",
      notes: existing?.notes || ""
    };
  });

  return <AttendanceClientPage isGlobal={false} selectedDate={selectedDate} rows={rows} />;
}
