import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { getAdminSessionUser } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sessionUser = await getAdminSessionUser();
  const userRole = (sessionUser?.role || "STAFF") as string;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminShell locale={locale} userRole={userRole}>
        {children}
      </AdminShell>
    </section>
  );
}
