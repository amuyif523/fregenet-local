import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import StudentProfileClient, { type StudentInteractionRow } from "./StudentProfileClient";

export default async function StudentProfilePage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const cookieStore = await cookies();
  const rawCenterId = cookieStore.get("fregenet_center_id")?.value || "GLOBAL";
  const isGlobal = rawCenterId === "GLOBAL";

  const student = await prisma.student.findFirst({
    where: isGlobal ? { id } : { id, centerId: rawCenterId },
    include: {
      guardian: true,
      center: {
        select: {
          id: true,
          name: true
        }
      },
      interactions: {
        orderBy: { interactionDate: "desc" }
      }
    }
  });

  if (!student) {
    notFound();
  }

  const interactionRows: StudentInteractionRow[] = student.interactions.map((entry) => ({
    id: entry.id,
    interactionType: entry.interactionType,
    title: entry.title,
    notes: entry.notes,
    interactionDate: entry.interactionDate.toISOString(),
    performedBy: entry.performedBy
  }));

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#006D77]">Student Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Detailed academic and family context for student support decisions.</p>
        </div>
        <Link href={`/${locale}/admin/students`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Back To Directory
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{student.name}</CardTitle>
            <CardDescription>{student.center.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Grade Level</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{student.gradeLevel}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Gender</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{student.gender.toLowerCase()}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{student.status.toLowerCase()}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Date Of Birth</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{format(student.dateOfBirth, "PPP")}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Enrollment Date</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{format(student.enrollmentDate, "PPP")}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guardian Contact</CardTitle>
            <CardDescription>Shared family record for all siblings linked to this guardian.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Name</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{student.guardian.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Relationship</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{student.guardian.relationship.toLowerCase().replace("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Phone Number</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{student.guardian.phoneNumber}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{student.guardian.email || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Address</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{student.guardian.address || "-"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <StudentProfileClient studentId={student.id} isGlobal={isGlobal} interactions={interactionRows} />
    </section>
  );
}
