import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import PermissionDeniedToast from "./PermissionDeniedToast";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value);
}

export default async function AdminPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ denied?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const showDeniedToast = query.denied === "1";
  const t = await getTranslations();

  const cookieStore = await cookies();
  const rawCenterId = cookieStore.get("fregenet_center_id")?.value || "GLOBAL";
  
  // Conditionally build the where clause for multi-center scoping
  const centerScope = rawCenterId !== "GLOBAL" ? { centerId: rawCenterId } : {};

  // Fetch Foundation Data (Unscoped)
  const [donationAggregate, totalProjects, latestDonations, latestProjects, latestNewsletters] = await Promise.all([
    prisma.donation.aggregate({
      _sum: { amount: true },
      // Apply centerScope here to donations if they can be scoped
      where: { paymentStatus: "COMPLETED", ...centerScope }
    }),
    prisma.project.count(), // Projects are always global
    prisma.donation.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
      where: centerScope,
      select: { id: true, createdAt: true, amount: true, donorName: true, paymentStatus: true }
    }),
    prisma.project.findMany({
      take: 4,
      orderBy: { updatedAt: "desc" },
      select: { id: true, updatedAt: true, title_en: true, title_am: true, status: true }
    }),
    prisma.newsletter.findMany({
      take: 4,
      orderBy: { updatedAt: "desc" },
      select: { id: true, updatedAt: true, title_en: true, title_am: true, isPublished: true }
    })
  ]);

  // Fetch ERP Data (Scoped)
  const [staffCount, studentCount, expenseAggregate] = await Promise.all([
    prisma.staff.count({ where: { isActive: true, ...centerScope } }),
    prisma.student.count({ where: { status: "ACTIVE", ...centerScope } }),
    prisma.schoolExpense.aggregate({
      _sum: { amount: true },
      where: centerScope
    })
  ]);

  const donationTotal = Number(donationAggregate._sum.amount ?? 0);
  const expenseTotal = Number(expenseAggregate._sum.amount ?? 0);

  const recentActivity = [
    ...latestDonations.map((entry) => ({
      id: `donation-${entry.id}`,
      date: entry.createdAt,
      label: t("Admin.donationActivity", {
        status: entry.paymentStatus.toLowerCase(),
        donor: entry.donorName || t.has("Admin.anonymous") ? t("Admin.anonymous") : "Anonymous"
      }),
      detail: formatCurrency(Number(entry.amount))
    })),
    ...latestProjects.map((entry) => ({
      id: `project-${entry.id}`,
      date: entry.updatedAt,
      label: t("Admin.projectUpdated", {
        status: entry.status.toLowerCase()
      }),
      detail: locale === "am" ? entry.title_am : entry.title_en
    })),
    ...latestNewsletters.map((entry) => ({
      id: `newsletter-${entry.id}`,
      date: entry.updatedAt,
      label: entry.isPublished ? t("Admin.newsletterPublished") : t("Admin.newsletterDraft"),
      detail: locale === "am" ? entry.title_am : entry.title_en
    }))
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  const isGlobal = rawCenterId === "GLOBAL";

  return (
    <section className="space-y-6">
      <PermissionDeniedToast show={showDeniedToast} />
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-[#006D77]">
          {isGlobal ? t("Admin.dashboardTitle") : "Center Dashboard"}
        </h1>
        <p className="mt-3 text-slate-600">
          {isGlobal 
            ? t("Admin.dashboardSubtitle") 
            : `Viewing statistics for ${rawCenterId}`}
        </p>

        {isGlobal ? (
          // Global Foundation View
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">{t("Admin.totalDonations")}</p>
              <p className="mt-2 text-2xl font-black text-[#006D77]">{formatCurrency(donationTotal)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">{t("Admin.totalProjects")}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{totalProjects}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">{t("Admin.recentActivities")}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{recentActivity.length}</p>
            </div>
          </div>
        ) : (
          // School ERP View
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Total Students</p>
              <p className="mt-2 text-2xl font-black text-blue-900">{studentCount}</p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Active Staff</p>
              <p className="mt-2 text-2xl font-black text-indigo-900">{staffCount}</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-700">Total Expenses</p>
              <p className="mt-2 text-2xl font-black text-rose-900">{formatCurrency(expenseTotal)}</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/${locale}/admin/donations${isGlobal ? "" : `?centerId=${rawCenterId}`}`}
            className="rounded-lg bg-[#006D77] px-4 py-2 text-sm font-semibold text-white"
          >
            {t("Admin.openDonationLedger")}
          </Link>
          {isGlobal && (
            <>
              <Link
                href={`/${locale}/admin/projects`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {t("Admin.manageProjects")}
              </Link>
              <Link
                href={`/${locale}/admin/newsletters`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {t("Admin.manageNewsletters")}
              </Link>
            </>
          )}
          {!isGlobal && (
            <Link
              href={`/${locale}/admin/staff`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Manage Staff
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-[#006D77]">{t("Admin.recentActivity")}</h2>

        {recentActivity.length === 0 ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t("Admin.noRecentActivity")}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{formatDate(item.date, locale)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
