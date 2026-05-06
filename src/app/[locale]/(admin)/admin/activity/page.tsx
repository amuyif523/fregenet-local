import { verifySession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { ROLE_DIRECTOR, ROLE_FINANCE, ROLE_SUPERADMIN, assertRoleAllowed } from "@/lib/rbac";

type ActivityRow = {
  date: Date;
  actorId: string | null;
  actorName: string;
  actionType: string;
  notes: string;
};

function readActionLabel(action: string) {
  return action
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function ActivityPage() {
  const user = await verifySession();
  assertRoleAllowed(user.role, [ROLE_SUPERADMIN, ROLE_DIRECTOR, ROLE_FINANCE]);

  const audits = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      actorId: true,
      actionType: true,
      notes: true
    }
  });

  const actorIds = new Set<string>();
  for (const row of audits) {
    if (row.actorId) actorIds.add(row.actorId);
  }

  const actors = await prisma.user.findMany({
    where: { id: { in: [...actorIds] } },
    select: {
      id: true,
      email: true
    }
  });

  const actorMap = new Map(actors.map((actor) => [actor.id, actor.email]));

  const rows: ActivityRow[] = audits.map((audit) => ({
    date: audit.createdAt,
    actorId: audit.actorId,
    actorName: audit.actorId ? actorMap.get(audit.actorId) || audit.actorId : "System",
    actionType: readActionLabel(audit.actionType),
    notes: audit.notes
  }));

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-[#006D77]">Global Activity Feed</h1>
        <p className="mt-2 text-slate-600">Latest 100 audit log entries.</p>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-800">
              <tr>
                <th className="p-4 font-bold">Date</th>
                <th className="p-4 font-bold">Actor</th>
                <th className="p-4 font-bold">Action Type</th>
                <th className="p-4 font-bold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">No activity records found.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-4">{row.date.toLocaleDateString()} {row.date.toLocaleTimeString()}</td>
                    <td className="p-4">{row.actorName}</td>
                    <td className="p-4 font-semibold text-slate-800">{row.actionType}</td>
                    <td className="p-4 text-slate-700">{row.notes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
