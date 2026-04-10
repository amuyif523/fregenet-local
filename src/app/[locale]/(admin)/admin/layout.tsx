import type { ReactNode } from "react";
import { cookies } from "next/headers";
import AdminShell from "@/components/admin/AdminShell";
import { prisma } from "@/lib/prisma";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { clearCenterScope } from "@/lib/center-actions";

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

  const centers = await prisma.schoolCenter.findMany({
    where: { isActive: true },
    select: { id: true, name: true }
  });

  const cookieStore = await cookies();
  const rawCenterId = cookieStore.get("fregenet_center_id")?.value;

  let activeCenter = "GLOBAL";

  if (rawCenterId && rawCenterId !== "GLOBAL") {
    const isValid = centers.some(c => c.id === rawCenterId);
    if (!isValid) {
      await clearCenterScope();
      activeCenter = "GLOBAL";
    } else {
      activeCenter = rawCenterId;
    }
  }

  // RBAC fallback for GLOBAL
  if (activeCenter === "GLOBAL" && userRole !== "admin" && userRole !== "ADMIN" && userRole !== "SUPERADMIN" && userRole !== "DIRECTOR") {
    // Force them into the first center if they don't have global rights
    if (centers.length > 0) {
      activeCenter = centers[0].id;
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminShell locale={locale} activeCenter={activeCenter} centers={centers} userRole={userRole}>
        {children}
      </AdminShell>
    </section>
  );
}
