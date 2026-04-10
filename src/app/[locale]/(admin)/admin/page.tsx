import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";

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
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();

  const [donationAggregate, totalProjects, latestDonations, latestProjects, latestNewsletters] = await Promise.all([
    prisma.donation.aggregate({
      _sum: { amount: true },
      where: { paymentStatus: "COMPLETED" }
    }),
    prisma.project.count(),
    prisma.donation.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
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

  const donationTotal = Number(donationAggregate._sum.amount ?? 0);

  const recentActivity = [
    ...latestDonations.map((entry) => ({
      id: `donation-${entry.id}`,
      date: entry.createdAt,
      label: t("Admin.donationActivity", {
        status: entry.paymentStatus.toLowerCase(),
        donor: entry.donorName || t("Admin.anonymous")
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

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-[#006D77]">{t("Admin.dashboardTitle")}</h1>
        <p className="mt-3 text-slate-600">{t("Admin.dashboardSubtitle")}</p>

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

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/${locale}/admin/donations`}
            className="rounded-lg bg-[#006D77] px-4 py-2 text-sm font-semibold text-white"
          >
            {t("Admin.openDonationLedger")}
          </Link>
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
