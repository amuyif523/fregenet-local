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

  const [inventoryLogs, interactions, expenses, audits] = await Promise.all([
    prisma.inventoryLog.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        performedBy: true,
        logType: true,
        notes: true,
        item: { select: { name: true } }
      }
    }),
    prisma.studentInteraction.findMany({
      take: 100,
      orderBy: { interactionDate: "desc" },
      select: {
        interactionDate: true,
        performedBy: true,
        interactionType: true,
        title: true,
        notes: true,
        student: { select: { name: true } }
      }
    }),
    prisma.schoolExpense.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        performedBy: true,
        category: true,
        description: true,
        amount: true
      }
    }),
    prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        actorId: true,
        actionType: true,
        notes: true
      }
    })
  ]);

  const actorIds = new Set<string>();
  for (const row of inventoryLogs) {
    if (row.performedBy) actorIds.add(row.performedBy);
  }
  for (const row of interactions) {
    if (row.performedBy) actorIds.add(row.performedBy);
  }
  for (const row of expenses) {
    if (row.performedBy) actorIds.add(row.performedBy);
  }
  for (const row of audits) {
    if (row.actorId) actorIds.add(row.actorId);
  }

  const actors = await prisma.staffAccount.findMany({
    where: { id: { in: [...actorIds] } },
    select: {
      id: true,
      email: true,
      staff: { select: { name: true } }
    }
  });

  const actorMap = new Map(actors.map((actor) => [actor.id, actor.staff.name || actor.email]));

  const rows: ActivityRow[] = [
    ...inventoryLogs.map((log) => ({
      date: log.createdAt,
      actorId: log.performedBy,
      actorName: log.performedBy ? actorMap.get(log.performedBy) || log.performedBy : "Unknown",
      actionType: `Inventory ${readActionLabel(log.logType)}`,
      notes: log.notes || `Item: ${log.item.name}`
    })),
    ...interactions.map((entry) => ({
      date: entry.interactionDate,
      actorId: entry.performedBy,
      actorName: actorMap.get(entry.performedBy) || entry.performedBy,
      actionType: `Student ${readActionLabel(entry.interactionType)}`,
      notes: `${entry.title}: ${entry.notes}`
    })),
    ...expenses.map((expense) => ({
      date: expense.createdAt,
      actorId: expense.performedBy,
      actorName: expense.performedBy ? actorMap.get(expense.performedBy) || expense.performedBy : "Unknown",
      actionType: `Expense ${readActionLabel(expense.category)}`,
      notes: `${expense.description || "No description"} (ETB ${Number(expense.amount).toLocaleString()})`
    })),
    ...audits.map((audit) => ({
      date: audit.createdAt,
      actorId: audit.actorId,
      actorName: audit.actorId ? actorMap.get(audit.actorId) || audit.actorId : "System",
      actionType: readActionLabel(audit.actionType),
      notes: audit.notes
    }))
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 100);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-[#006D77]">Global Activity Feed</h1>
        <p className="mt-2 text-slate-600">Latest 100 actions across inventory, student CRM, finance expenses, and security overrides.</p>

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
                rows.map((row, index) => (
                  <tr key={`${row.date.toISOString()}-${index}`} className="hover:bg-slate-50/60">
                    <td className="p-4 text-slate-500">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(row.date)}</td>
                    <td className="p-4 font-semibold text-slate-800">{row.actorName}</td>
                    <td className="p-4 font-medium text-slate-700">{row.actionType}</td>
                    <td className="p-4 text-slate-600">{row.notes}</td>
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
