"use client";

import { useState, useTransition } from "react";
import { bulkImportStudentsFromCsv } from "@/lib/student-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ImportResult = {
  processed: number;
  createdStudents: number;
  updatedStudents: number;
  createdGuardians: number;
  failedRows: number;
  errors: Array<{ rowNumber: number; message: string }>;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function ImportStudentsClientPage() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-black text-[#006D77]">Bulk Import Students (CSV)</CardTitle>
          <CardDescription>
            Upload a CSV with headers: student_name, grade_level, gender, date_of_birth, enrollment_date, status, guardian_name,
            guardian_phone, guardian_relationship, guardian_email, guardian_address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
          )}

          {result && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Processed {result.processed} rows. Created {result.createdStudents} students, updated {result.updatedStudents} students,
              created {result.createdGuardians} guardians. Failed rows: {result.failedRows}.
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              startTransition(async () => {
                setErrorMessage(null);
                try {
                  const response = await bulkImportStudentsFromCsv(formData);
                  setResult(response);
                } catch (error: unknown) {
                  setErrorMessage(getErrorMessage(error, "Unable to import CSV."));
                }
              });
            }}
            className="space-y-4"
          >
            <input
              required
              type="file"
              name="file"
              accept=".csv,text/csv"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <Button type="submit" disabled={isPending}>
              {isPending ? "Importing..." : "Import CSV"}
            </Button>
          </form>

          {result && result.errors.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">Row Errors</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-800">
                {result.errors.slice(0, 50).map((rowError) => (
                  <li key={`${rowError.rowNumber}-${rowError.message}`}>Row {rowError.rowNumber}: {rowError.message}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
