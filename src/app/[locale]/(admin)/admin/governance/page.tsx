import { prisma } from "@/lib/prisma";
import GovernanceMemberManager from "@/components/admin/GovernanceMemberManager";

export default async function AdminGovernancePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  let members: Array<{
    id: string;
    name_en: string;
    name_am: string;
    role_en: string;
    role_am: string;
    bio_en: string | null;
    bio_am: string | null;
    imagePath: string | null;
    order: number;
    isBoardMember: boolean;
  }> = [];
  let loadError = false;

  try {
    members = await prisma.governanceMember.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name_en: true,
        name_am: true,
        role_en: true,
        role_am: true,
        bio_en: true,
        bio_am: true,
        imagePath: true,
        order: true,
        isBoardMember: true
      }
    });
  } catch (error) {
    console.error("[AdminGovernancePage] Failed to load governance members", error);
    loadError = true;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">Governance Manager</h1>
        <p className="mt-2 text-sm text-slate-600">Manage board and leadership profiles displayed on the public governance page.</p>
      </div>

      {loadError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Governance records are temporarily unavailable.
        </p>
      ) : (
        <GovernanceMemberManager locale={locale} members={members} />
      )}
    </section>
  );
}
