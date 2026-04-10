import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { extractPdfPath } from "@/lib/newsletter-files";

export const revalidate = 3600;

function createPreview(body: string | null) {
  if (!body) {
    return null;
  }

  const trimmed = body.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.length > 180 ? `${trimmed.slice(0, 180).trimEnd()}...` : trimmed;
}

export default async function NewsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const localeKey = locale === "am" ? "am" : "en";
  const formattedLocale = locale === "am" ? "am-ET" : "en-US";

  let newsletters: Array<{
    id: string;
    title_en: string;
    title_am: string;
    body_en: string | null;
    body_am: string | null;
    source: string | null;
    publishedAt: Date;
  }> = [];
  let loadError = false;

  try {
    newsletters = await prisma.newsletter.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title_en: true,
        title_am: true,
        body_en: true,
        body_am: true,
        source: true,
        publishedAt: true
      }
    });
  } catch {
    loadError = true;
  }

  const emptyMessage = locale === "am" ? "ማህደሩ በቅርቡ ይመጣል።" : "Archive coming soon.";

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-primary">News</h1>
      <p className="mt-3 max-w-3xl text-slate-700">Local publication archive for governance updates and community reports.</p>

      {loadError ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Newsletter data is temporarily unavailable. Please retry shortly.
        </p>
      ) : null}

      {!loadError && newsletters.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-teal-200 bg-gradient-to-r from-[#E7F6F7] to-[#F2FBFB] p-5">
          <p className="text-sm font-bold text-[#005B63]">{locale === "am" ? "ባዶ ማህደር" : "Empty Archive"}</p>
          <p className="mt-1 text-sm text-slate-600">{emptyMessage}</p>
        </div>
      ) : null}

      {!loadError && newsletters.length > 0 ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {newsletters.map((item) => {
            const localizedTitle = item[`title_${localeKey}` as keyof Pick<typeof item, "title_en" | "title_am">];
            const localizedBody = item[`body_${localeKey}` as keyof Pick<typeof item, "body_en" | "body_am">];
            const preview = createPreview(localizedBody);
            const pdfPath = extractPdfPath(item.source);
            const detailPath = `/${locale}/news/${item.id}`;
            const publicationMonth = new Intl.DateTimeFormat(formattedLocale, {
              month: "long",
              year: "numeric"
            }).format(item.publishedAt);

            return (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{publicationMonth}</p>
                <Link href={detailPath} className="mt-2 block text-xl font-black text-slate-900 hover:text-primary">
                  {localizedTitle}
                </Link>
                {preview ? <p className="mt-2 text-sm text-slate-600">{preview}</p> : null}

                <div className="mt-4 flex items-center gap-4">
                  <Link href={detailPath} className="text-sm font-bold text-primary hover:text-cyan-700">
                    Read more
                  </Link>
                  {pdfPath ? (
                    <Link
                      href={pdfPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
                      aria-label={`Download PDF for ${localizedTitle}`}
                    >
                      <Download className="size-4" />
                      Download
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
