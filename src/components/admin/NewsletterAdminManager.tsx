"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Inbox, Pencil, Trash2 } from "lucide-react";
import NewsletterForm from "@/components/admin/NewsletterForm";
import { deleteNewsletterAction } from "@/app/[locale]/(admin)/admin/actions";
import { extractPdfPath } from "@/lib/newsletter-files";

type NewsletterRecord = {
  id: string;
  title_en: string;
  title_am: string;
  body_en: string | null;
  body_am: string | null;
  email: string;
  isPublished: boolean;
  publishedAt: Date | string;
  source: string | null;
};

function formatDayWithOrdinal(day: number) {
  if (day >= 11 && day <= 13) {
    return `${day}th`;
  }

  const tail = day % 10;
  if (tail === 1) {
    return `${day}st`;
  }
  if (tail === 2) {
    return `${day}nd`;
  }
  if (tail === 3) {
    return `${day}rd`;
  }
  return `${day}th`;
}

function formatPublishedDate(value: Date | string, locale: string) {
  const date = new Date(value);
  const month = new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-US", { month: "long" }).format(date);
  const year = date.getFullYear();
  return `${month} ${formatDayWithOrdinal(date.getDate())}, ${year}`;
}

export default function NewsletterAdminManager({
  locale,
  newsletters,
  loadError
}: {
  locale: string;
  newsletters: NewsletterRecord[];
  loadError: boolean;
}) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => newsletters.find((item) => item.id === selectedItemId) ?? null,
    [newsletters, selectedItemId]
  );

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-[#006D77]">Newsletter Manager</h1>
        <p className="mt-2 text-sm text-slate-600">Upload local PDF newsletters to public/uploads/local/.</p>
        <NewsletterForm locale={locale} selectedItem={selectedItem} onClearSelection={() => setSelectedItemId(null)} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-[#006D77]">Saved Newsletter Records</h2>

        {loadError ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Newsletter records are temporarily unavailable.
          </p>
        ) : null}

        {!loadError && newsletters.length === 0 ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            <Inbox className="size-5 text-slate-400" />
            <p>No records found. Create your first newsletter to get started.</p>
          </div>
        ) : null}

        {!loadError && newsletters.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {newsletters.map((item) => {
                  const localizedTitle = locale === "am" ? item.title_am : item.title_en;
                  const pdfPath = extractPdfPath(item.source);
                  const isSelected = selectedItemId === item.id;

                  return (
                    <tr key={item.id} className={isSelected ? "bg-teal-50/50" : undefined}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{localizedTitle}</td>
                      <td className="px-4 py-3 text-slate-700">{formatPublishedDate(item.publishedAt, locale)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                            item.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.isPublished ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedItemId(item.id)}
                            className="inline-flex items-center rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-[#006D77] hover:text-[#006D77]"
                            aria-label={`Edit ${localizedTitle}`}
                            title="Edit"
                          >
                            <Pencil className="size-4" />
                          </button>

                          {pdfPath ? (
                            <Link
                              href={pdfPath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-[#006D77] hover:text-[#006D77]"
                              aria-label={`View PDF for ${localizedTitle}`}
                              title="View PDF"
                            >
                              <ExternalLink className="size-4" />
                            </Link>
                          ) : null}

                          <form action={deleteNewsletterAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="locale" value={locale} />
                            <button
                              type="submit"
                              className="inline-flex items-center rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                              aria-label={`Delete ${localizedTitle}`}
                              title="Delete newsletter"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
