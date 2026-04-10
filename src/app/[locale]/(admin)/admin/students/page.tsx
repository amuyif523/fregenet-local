import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import StudentDirectoryClientPage, { type StudentDirectoryRow } from "./StudentDirectoryClientPage";

export default async function StudentsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string; grade?: string }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const query = (resolvedSearchParams.q || "").trim();
  const grade = (resolvedSearchParams.grade || "").trim();

  const cookieStore = await cookies();
  const rawCenterId = cookieStore.get("fregenet_center_id")?.value || "GLOBAL";
  const isGlobal = rawCenterId === "GLOBAL";

  const centerWhere = isGlobal ? {} : { centerId: rawCenterId };

  const whereClause = {
    ...centerWhere,
    ...(query ? { name: { contains: query } } : {}),
    ...(grade ? { gradeLevel: grade } : {})
  };

  const [students, availableGrades, globalCenterSummary] = await Promise.all([
    prisma.student.findMany({
      where: whereClause,
      include: {
        attendanceRecords: {
          select: { status: true },
          orderBy: { date: "desc" },
          take: 3
        },
        guardian: {
          select: {
            name: true,
            phoneNumber: true
          }
        },
        center: {
          select: {
            name: true
          }
        }
      },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }]
    }),
    prisma.student.groupBy({
      by: ["gradeLevel"],
      _count: { _all: true },
      where: centerWhere,
      orderBy: { gradeLevel: "asc" }
    }),
    isGlobal
      ? prisma.student.groupBy({
          by: ["centerId"],
          _count: { _all: true },
          orderBy: { centerId: "asc" }
        })
      : Promise.resolve([])
  ]);

  const centersById = isGlobal
    ? await prisma.schoolCenter.findMany({ select: { id: true, name: true } })
    : [];

  const centerNameMap = new Map(centersById.map((center) => [center.id, center.name]));

  const rows: StudentDirectoryRow[] = students.map((student) => {
    const hasThreeConsecutiveAbsences =
      student.attendanceRecords.length === 3 &&
      student.attendanceRecords.every((record) => record.status === "ABSENT");

    return {
      id: student.id,
      name: student.name,
      gradeLevel: student.gradeLevel,
      gender: student.gender,
      enrollmentDate: student.enrollmentDate.toISOString(),
      status: student.status,
      guardianName: student.guardian.name,
      guardianPhoneNumber: student.guardian.phoneNumber,
      centerName: student.center.name,
      hasRetentionAlert: hasThreeConsecutiveAbsences
    };
  });

  const summaryCards = globalCenterSummary.map((summary) => ({
    centerId: summary.centerId,
    centerName: centerNameMap.get(summary.centerId) || summary.centerId,
    totalEnrollment: summary._count._all
  }));

  return (
    <StudentDirectoryClientPage
      locale={locale}
      isGlobal={isGlobal}
      query={query}
      selectedGrade={grade}
      availableGrades={availableGrades.map((entry) => entry.gradeLevel)}
      students={rows}
      globalEnrollmentSummary={summaryCards}
    />
  );
}
