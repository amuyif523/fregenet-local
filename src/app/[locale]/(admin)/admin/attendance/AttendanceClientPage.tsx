"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Save, Users } from "lucide-react";
import { saveAttendanceSheet } from "@/lib/attendance-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type AttendanceStatus = "PRESENT" | "ABSENT" | "TARDY" | "EXCUSED";

export type AttendanceStudentRow = {
  studentId: string;
  studentName: string;
  gradeLevel: string;
  status: AttendanceStatus;
  notes: string;
};

type AttendanceState = Record<
  string,
  {
    status: AttendanceStatus;
    notes: string;
  }
>;

function toReadableLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ");
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function AttendanceClientPage({
  isGlobal,
  selectedDate,
  rows
}: {
  isGlobal: boolean;
  selectedDate: string;
  rows: AttendanceStudentRow[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const [state, setState] = useState<AttendanceState>(() => {
    const initial: AttendanceState = {};
    for (const row of rows) {
      initial[row.studentId] = { status: row.status, notes: row.notes || "" };
    }
    return initial;
  });

  const totalAbsent = useMemo(
    () => Object.values(state).filter((entry) => entry.status === "ABSENT").length,
    [state]
  );

  const totalPresent = useMemo(
    () => Object.values(state).filter((entry) => entry.status === "PRESENT").length,
    [state]
  );

  const selectedDateObj = new Date(`${selectedDate}T00:00:00.000Z`);
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const isFutureDate = selectedDateObj.getTime() > todayUtc.getTime();
  const isWeekend = selectedDateObj.getUTCDay() === 0 || selectedDateObj.getUTCDay() === 6;
  const attendanceLocked = isGlobal || isFutureDate || isWeekend;

  const updateDate = (dateValue: string) => {
    const params = new URLSearchParams();
    if (dateValue) {
      params.set("date", dateValue);
    }
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  };

  const markAllPresent = () => {
    setState((current) => {
      const next: AttendanceState = { ...current };
      for (const row of rows) {
        next[row.studentId] = {
          ...next[row.studentId],
          status: "PRESENT"
        };
      }
      return next;
    });
  };

  const onSave = () => {
    startTransition(async () => {
      setFeedback(null);
      try {
        await saveAttendanceSheet({
          date: selectedDate,
          entries: rows.map((row) => ({
            studentId: row.studentId,
            status: state[row.studentId]?.status || "PRESENT",
            notes: state[row.studentId]?.notes || ""
          }))
        });

        setFeedback({ text: "Attendance saved successfully." });
        router.refresh();
      } catch (error: unknown) {
        setFeedback({ error: true, text: getErrorMessage(error, "Unable to save attendance sheet.") });
      }
    });
  };

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-black text-[#006D77]">Daily Attendance</CardTitle>
          <CardDescription>
            {isGlobal
              ? "Select a specific center from the sidebar to manage attendance."
              : "Mark attendance by date and save class records atomically."}
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

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[240px_auto_auto_auto] md:items-end">
            <div>
              <Label htmlFor="attendanceDate">Date</Label>
              <Input
                id="attendanceDate"
                type="date"
                value={selectedDate}
                onChange={(event) => updateDate(event.target.value)}
                disabled={isGlobal}
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Present</p>
              <p className="font-bold text-emerald-700">{totalPresent}</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Absent</p>
              <p className="font-bold text-rose-700">{totalAbsent}</p>
            </div>

            <div className="flex gap-2 md:justify-end">
              <Button type="button" variant="outline" onClick={markAllPresent} disabled={attendanceLocked || rows.length === 0} className="gap-2">
                <Users className="size-4" /> Mark All Present
              </Button>
              <Button type="button" onClick={onSave} disabled={attendanceLocked || rows.length === 0 || isPending} className="gap-2">
                <Save className="size-4" /> {isPending ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </div>

          {!isGlobal && isFutureDate && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Attendance logging is disabled for future dates.
            </div>
          )}

          {!isGlobal && !isFutureDate && isWeekend && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Attendance logging is disabled on weekends (school not in session).
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-800">
                <tr>
                  <th className="p-4 font-bold">Student</th>
                  <th className="p-4 font-bold">Grade</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      {isGlobal ? "Attendance is unavailable in GLOBAL mode." : "No active students in this center."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.studentId} className="hover:bg-slate-50/60">
                      <td className="p-4 font-semibold text-slate-900">{row.studentName}</td>
                      <td className="p-4 text-slate-700">{row.gradeLevel}</td>
                      <td className="p-4">
                        <Select
                          value={state[row.studentId]?.status || "PRESENT"}
                          onChange={(event) => {
                            const status = event.target.value as AttendanceStatus;
                            setState((current) => ({
                              ...current,
                              [row.studentId]: {
                                ...current[row.studentId],
                                status
                              }
                            }));
                          }}
                          disabled={attendanceLocked}
                        >
                          <option value="PRESENT">Present</option>
                          <option value="ABSENT">Absent</option>
                          <option value="TARDY">Tardy</option>
                          <option value="EXCUSED">Excused</option>
                        </Select>
                      </td>
                      <td className="p-4">
                        <Input
                          value={state[row.studentId]?.notes || ""}
                          onChange={(event) => {
                            const notes = event.target.value;
                            setState((current) => ({
                              ...current,
                              [row.studentId]: {
                                ...current[row.studentId],
                                notes
                              }
                            }));
                          }}
                          placeholder={`Notes (${toReadableLabel(state[row.studentId]?.status || "PRESENT")})`}
                          disabled={attendanceLocked}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
