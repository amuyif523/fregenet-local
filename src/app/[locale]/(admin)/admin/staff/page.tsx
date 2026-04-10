import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import StaffClientPage from "./StaffClientPage";
import { getAdminSessionUser } from "@/lib/admin-auth";

export default async function StaffPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const sessionUser = await getAdminSessionUser();

  const cookieStore = await cookies();
  const rawCenterId = cookieStore.get("fregenet_center_id")?.value || "GLOBAL";
  const isGlobal = rawCenterId === "GLOBAL";

  const staffMembers = await prisma.staff.findMany({
    where: isGlobal ? {} : { centerId: rawCenterId },
    orderBy: { createdAt: "desc" }
  });

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#006D77]">Staff Directory</h1>
            <p className="mt-2 text-slate-600">
              {isGlobal 
                ? "Viewing all staff across all centers. Select a specific center to add staff or run payroll." 
                : `Manage staff forms and payroll for the local center.`}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <StaffClientPage 
            initialStaff={staffMembers.map((staff) => ({
              ...staff,
              baseSalary: Number(staff.baseSalary)
            }))}
            isGlobal={isGlobal} 
            centerId={rawCenterId}
            userRole={sessionUser?.role || "STAFF"}
          />
        </div>
      </div>
    </section>
  );
}
