"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Search, Flag } from "lucide-react";
import { upsertStudentWithGuardian } from "@/lib/student-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type StudentDirectoryRow = {
  id: string;
  name: string;
  gradeLevel: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  enrollmentDate: string;
  status: "ACTIVE" | "INACTIVE" | "ALUMNI" | "DROPPED";
  guardianName: string;
  guardianPhoneNumber: string;
  centerName: string;
  hasRetentionAlert: boolean;
};

type SummaryCard = {
  centerId: string;
  centerName: string;
  totalEnrollment: number;
};

function toReadableLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ");
}

function readErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function StudentDirectoryClientPage({
  locale,
  isGlobal,
  query,
  selectedGrade,
  availableGrades,
  students,
  globalEnrollmentSummary
}: {
  locale: string;
  isGlobal: boolean;
  query: string;
  selectedGrade: string;
  availableGrades: string[];
  students: StudentDirectoryRow[];
  globalEnrollmentSummary: SummaryCard[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  const totalEnrollment = globalEnrollmentSummary.reduce((sum, card) => sum + card.totalEnrollment, 0);

  const applyFilters = (formData: FormData) => {
    const nextQ = String(formData.get("q") || "").trim();
    const nextGrade = String(formData.get("grade") || "").trim();

    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextGrade) params.set("grade", nextGrade);

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  };

  const resetFilters = () => {
    router.push(pathname);
  };

  const onCreateStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      setFeedback(null);
      try {
        await upsertStudentWithGuardian(formData);
        setFeedback({ text: "Student and guardian profile created successfully." });
        setIsFormOpen(false);
        router.refresh();
      } catch (error: unknown) {
        setFeedback({ error: true, text: readErrorMessage(error, "Unable to save student record.") });
      }
    });
  };

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-black text-[#006D77]">Student & Family CRM</CardTitle>
          <CardDescription>
            {isGlobal
              ? "Global enrollment visibility across all centers. Choose a specific center to add or edit student records."
              : "Manage student records, guardian relationships, and school-family interactions for this center."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedback && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                feedback.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {feedback.text}
            </div>
          )}

          {isGlobal && (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Total Enrollment</p>
                <p className="mt-2 text-2xl font-black text-indigo-900">{totalEnrollment}</p>
              </div>
              {globalEnrollmentSummary.map((entry) => (
                <div key={entry.centerId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">{entry.centerName}</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{entry.totalEnrollment}</p>
                </div>
              ))}
            </div>
          )}

          <form
            action={applyFilters}
            className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_220px_auto_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input name="q" defaultValue={query} placeholder="Search student by name" className="bg-white pl-10" />
            </div>
            <Select name="grade" defaultValue={selectedGrade || ""}>
              <option value="">All grades</option>
              {availableGrades.map((gradeValue) => (
                <option key={gradeValue} value={gradeValue}>
                  Grade {gradeValue}
                </option>
              ))}
            </Select>
            <Button type="submit" className="w-full md:w-auto">
              Apply
            </Button>
            <Button type="button" variant="outline" onClick={resetFilters} className="w-full md:w-auto">
              Reset
            </Button>
          </form>

          <div className="flex items-center justify-end">
            <Button onClick={() => setIsFormOpen(true)} disabled={isGlobal} className="gap-2">
              <Plus className="size-4" /> Add Student
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-800">
                <tr>
                  <th className="p-4 font-bold">Student</th>
                  <th className="p-4 font-bold">Grade</th>
                  <th className="p-4 font-bold">Gender</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Enrollment</th>
                  <th className="p-4 font-bold">Guardian</th>
                  {isGlobal && <th className="p-4 font-bold">Center</th>}
                  <th className="p-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={isGlobal ? 8 : 7} className="p-6 text-center text-slate-500">
                      No students found for the current filter.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/60">
                      <td className="p-4 font-semibold text-slate-900">
                        <div className="inline-flex items-center gap-2">
                          <span>{student.name}</span>
                          {student.hasRetentionAlert && (
                            <span
                              title="Retention alert: more than 3 consecutive absences"
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
                            >
                              <Flag className="size-3" /> Alert
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{student.gradeLevel}</td>
                      <td className="p-4">{toReadableLabel(student.gender)}</td>
                      <td className="p-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {toReadableLabel(student.status)}
                        </span>
                      </td>
                      <td className="p-4">{format(parseISO(student.enrollmentDate), "MMM d, yyyy")}</td>
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{student.guardianName}</p>
                        <p className="text-xs text-slate-500">{student.guardianPhoneNumber}</p>
                      </td>
                      {isGlobal && <td className="p-4 text-slate-500">{student.centerName}</td>}
                      <td className="p-4 text-right">
                        <Link href={`/${locale}/admin/students/${student.id}`} className="text-sm font-semibold text-[#006D77] hover:underline">
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {isFormOpen && !isGlobal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Add Student</CardTitle>
              <CardDescription>Create student profile with a linked guardian record.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onCreateStudent} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Student Name</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div>
                    <Label htmlFor="gradeLevel">Grade Level</Label>
                    <Input id="gradeLevel" name="gradeLevel" required placeholder="e.g. 1, 2, KG" />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select id="gender" name="gender" defaultValue="MALE" required>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select id="status" name="status" defaultValue="ACTIVE" required>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="ALUMNI">Alumni</option>
                      <option value="DROPPED">Dropped</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
                  </div>
                  <div>
                    <Label htmlFor="enrollmentDate">Enrollment Date</Label>
                    <Input id="enrollmentDate" name="enrollmentDate" type="date" required />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-3 text-sm font-bold text-slate-800">Guardian Information</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="guardianName">Guardian Name</Label>
                      <Input id="guardianName" name="guardianName" required />
                    </div>
                    <div>
                      <Label htmlFor="guardianPhoneNumber">Phone Number</Label>
                      <Input id="guardianPhoneNumber" name="guardianPhoneNumber" required />
                    </div>
                    <div>
                      <Label htmlFor="guardianRelationship">Relationship</Label>
                      <Select id="guardianRelationship" name="guardianRelationship" defaultValue="MOTHER" required>
                        <option value="MOTHER">Mother</option>
                        <option value="FATHER">Father</option>
                        <option value="LEGAL_GUARDIAN">Legal Guardian</option>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="guardianEmail">Email (Optional)</Label>
                      <Input id="guardianEmail" name="guardianEmail" type="email" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="guardianAddress">Address (Optional)</Label>
                      <Textarea id="guardianAddress" name="guardianAddress" rows={3} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving..." : "Save Student"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
