import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

function formatDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

export default async function AdminMessagesPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();

  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-[#006D77]">{t("Admin.messages")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("Admin.messagesSubtitle")}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-5 text-sm text-teal-800">{t("Admin.noMessages")}</div>
        ) : (
          <div className="space-y-4">
            {messages.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-900">{item.subject}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      item.status === "UNREAD" ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{item.message}</p>
                <p className="mt-3 text-xs text-slate-500">
                  {item.name} • {item.email} • {formatDate(item.createdAt, locale)}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
