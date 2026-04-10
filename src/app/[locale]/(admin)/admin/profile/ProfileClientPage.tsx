"use client";

import { useTransition, useState } from "react";
import { changeMyPassword } from "@/lib/profile-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function ProfileClientPage({
  email,
  role,
  staff
}: {
  email: string;
  role: "SUPERADMIN" | "DIRECTOR" | "FINANCE" | "ADMIN" | "STAFF";
  staff: {
    id: string;
    name: string;
    role: "TEACHER" | "ADMIN" | "SUPPORT";
    pensionNumber: string | null;
    centerName: string;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setFeedback(null);
      try {
        await changeMyPassword(formData);
        setFeedback({ text: "Password updated successfully." });
        event.currentTarget.reset();
      } catch (error: unknown) {
        setFeedback({ error: true, text: getErrorMessage(error, "Unable to change password.") });
      }
    });
  };

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-black text-[#006D77]">My Profile</CardTitle>
          <CardDescription>View your staff identity and update your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Name</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{staff.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Account Email</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{email}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Account Role</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{role}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Staff Role</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{staff.role}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Assigned Center</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{staff.centerName}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Pension Number</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{staff.pensionNumber || "-"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Use a strong password and rotate it regularly.</CardDescription>
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

          <form onSubmit={onSubmit} className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" name="currentPassword" type="password" required />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" name="newPassword" type="password" required minLength={8} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} />
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
