"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { logStudentInteraction } from "@/lib/student-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type StudentInteractionRow = {
  id: string;
  interactionType: "PARENT_MEETING" | "DISCIPLINARY_NOTE" | "ATTENDANCE_FOLLOWUP" | "UNIFORM_SUPPORT" | "GENERAL_NOTE";
  title: string;
  notes: string;
  interactionDate: string;
  performedBy: string;
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

export default function StudentProfileClient({
  studentId,
  isGlobal,
  interactions
}: {
  studentId: string;
  isGlobal: boolean;
  interactions: StudentInteractionRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  const onSubmitInteraction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("studentId", studentId);

    startTransition(async () => {
      setFeedback(null);
      try {
        await logStudentInteraction(formData);
        setFeedback({ text: "Interaction recorded successfully." });
        router.refresh();
      } catch (error: unknown) {
        setFeedback({ error: true, text: readErrorMessage(error, "Unable to log interaction.") });
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Interaction Log</CardTitle>
          <CardDescription>CRM memory for parent communication, attendance follow-ups, and student support notes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-800">
                <tr>
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold">Type</th>
                  <th className="p-4 font-bold">Title</th>
                  <th className="p-4 font-bold">Notes</th>
                  <th className="p-4 font-bold">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {interactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">No interactions logged for this student yet.</td>
                  </tr>
                ) : (
                  interactions.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/60">
                      <td className="p-4 text-slate-500">{format(parseISO(entry.interactionDate), "MMM d, yyyy h:mm a")}</td>
                      <td className="p-4 text-slate-700">{toReadableLabel(entry.interactionType)}</td>
                      <td className="p-4 font-semibold text-slate-800">{entry.title}</td>
                      <td className="p-4 text-slate-600">{entry.notes}</td>
                      <td className="p-4 text-slate-500">{entry.performedBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log Interaction</CardTitle>
          <CardDescription>
            {isGlobal
              ? "Switch to a specific center to log interactions."
              : "Document meetings, disciplinary notes, attendance follow-up, and support actions."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedback && (
            <div
              className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                feedback.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {feedback.text}
            </div>
          )}

          <form onSubmit={onSubmitInteraction} className="space-y-4">
            <input type="hidden" name="studentId" value={studentId} />

            <div>
              <Label htmlFor="interactionType">Interaction Type</Label>
              <Select id="interactionType" name="interactionType" defaultValue="PARENT_MEETING" required disabled={isGlobal}>
                <option value="PARENT_MEETING">Parent Meeting</option>
                <option value="DISCIPLINARY_NOTE">Disciplinary Note</option>
                <option value="ATTENDANCE_FOLLOWUP">Attendance Follow-up</option>
                <option value="UNIFORM_SUPPORT">Uniform Support</option>
                <option value="GENERAL_NOTE">General Note</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required disabled={isGlobal} placeholder="Short subject for this interaction" />
            </div>

            <div>
              <Label htmlFor="interactionDate">Interaction Date (Optional)</Label>
              <Input id="interactionDate" name="interactionDate" type="datetime-local" disabled={isGlobal} />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={5} required disabled={isGlobal} placeholder="Detailed context and follow-up actions" />
            </div>

            <Button type="submit" disabled={isPending || isGlobal} className="w-full">
              {isPending ? "Saving..." : "Log Interaction"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
