import { promises as fs } from "node:fs";
import path from "node:path";
import { verifySession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { ROLE_DIRECTOR, ROLE_SUPERADMIN, assertRoleAllowed } from "@/lib/rbac";

type HealthCheck = {
  label: string;
  status: "OK" | "FAIL";
  detail: string;
};

async function checkDatabaseConnection(): Promise<HealthCheck> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      label: "Database Connection",
      status: "OK",
      detail: "Connected and responding to queries."
    };
  } catch (error: unknown) {
    return {
      label: "Database Connection",
      status: "FAIL",
      detail: error instanceof Error ? error.message : "Unable to connect to database."
    };
  }
}

async function checkUploadsWritePermissions(): Promise<HealthCheck> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const testFile = path.join(uploadsDir, `.healthcheck-${Date.now()}.tmp`);

  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(testFile, "health-check", "utf8");
    await fs.unlink(testFile);

    return {
      label: "Uploads Directory Write Access",
      status: "OK",
      detail: "Write test succeeded for /public/uploads."
    };
  } catch (error: unknown) {
    return {
      label: "Uploads Directory Write Access",
      status: "FAIL",
      detail: error instanceof Error ? error.message : "Cannot write to /public/uploads."
    };
  }
}

async function checkSuperadminPresence(): Promise<HealthCheck> {
  try {
    const superadmin = await prisma.staffAccount.findFirst({
      where: { role: "SUPERADMIN" },
      select: { id: true, email: true }
    });

    if (!superadmin) {
      return {
        label: "SUPERADMIN Account",
        status: "FAIL",
        detail: "No SUPERADMIN account found."
      };
    }

    return {
      label: "SUPERADMIN Account",
      status: "OK",
      detail: `Found SUPERADMIN: ${superadmin.email}`
    };
  } catch (error: unknown) {
    return {
      label: "SUPERADMIN Account",
      status: "FAIL",
      detail: error instanceof Error ? error.message : "Unable to verify SUPERADMIN account."
    };
  }
}

export default async function HealthPage() {
  const user = await verifySession();
  assertRoleAllowed(user.role, [ROLE_SUPERADMIN, ROLE_DIRECTOR]);

  const checks = await Promise.all([
    checkDatabaseConnection(),
    checkUploadsWritePermissions(),
    checkSuperadminPresence()
  ]);

  const allHealthy = checks.every((check) => check.status === "OK");

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-[#006D77]">System Health</h1>
        <p className="mt-2 text-slate-600">Hidden operational checks for deployment smoke testing.</p>

        <div className="mt-4 inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset">
          <span className={allHealthy ? "text-emerald-700 ring-emerald-300" : "text-rose-700 ring-rose-300"}>
            {allHealthy ? "Overall Status: HEALTHY" : "Overall Status: ATTENTION REQUIRED"}
          </span>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-800">
              <tr>
                <th className="p-4 font-bold">Check</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {checks.map((check) => (
                <tr key={check.label}>
                  <td className="p-4 font-semibold text-slate-800">{check.label}</td>
                  <td className="p-4">
                    <span
                      className={
                        check.status === "OK"
                          ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700"
                          : "rounded-full bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700"
                      }
                    >
                      {check.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">{check.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
