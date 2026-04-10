import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { extractPdfPath } from "@/lib/newsletter-files";

export const revalidate = 3600;

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const localeKey = locale === "am" ? "am" : "en";

  const item = await prisma.newsletter.findFirst({
    where: { id, isPublished: true },
    select: {
      title_en: true,
      title_am: true,
      body_en: true,
      body_am: true
    }
  });

  const fallbackTitle = locale === "am" ? "ፍሬገነት ዜና" : "Fregenet News";
  const localizedTitle =
    item?.[`title_${localeKey}` as keyof Pick<typeof item, "title_en" | "title_am">] ?? fallbackTitle;
  const localizedBody =
    item?.[`body_${localeKey}` as keyof Pick<typeof item, "body_en" | "body_am">] ?? "";
  const description = localizedBody.trim().slice(0, 160);

  return {
    title: localizedTitle,
    description: description || fallbackTitle,
    openGraph: {
      title: localizedTitle,
      description: description || fallbackTitle,
      type: "article"
    },
    twitter: {
      card: "summary_large_image",
      title: localizedTitle,
      description: description || fallbackTitle
    }
  };
}

export default async function NewsDetailPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const localeKey = locale === "am" ? "am" : "en";

  const item = await prisma.newsletter.findFirst({
    where: { id, isPublished: true },
    select: {
      id: true,
      title_en: true,
      title_am: true,
      body_en: true,
      body_am: true,
      source: true,
      createdAt: true
    }
  });

  if (!item) {
    notFound();
  }

  const localizedTitle = item[`title_${localeKey}` as keyof Pick<typeof item, "title_en" | "title_am">];
  const localizedBody = item[`body_${localeKey}` as keyof Pick<typeof item, "body_en" | "body_am">] ?? "";
  const pdfPath = extractPdfPath(item.source);
  const backLabel = locale === "am" ? "ወደ ዜና ተመለስ" : "Back to News";
  const downloadLabel = locale === "am" ? "የPDF ስሪት አውርድ" : "Download PDF Version";

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <Link
        href={`/${locale}/news`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        {backLabel}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_280px]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-black text-slate-900">{localizedTitle}</h1>
          <div className="mt-6 whitespace-pre-wrap text-base leading-7 text-slate-700">{localizedBody}</div>
        </article>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-5">
          {pdfPath ? (
            <Link
              href={pdfPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#006D77] px-4 py-3 text-sm font-bold text-white hover:bg-[#005B63]"
            >
              <Download className="size-4" />
              {downloadLabel}
            </Link>
          ) : (
            <p className="text-sm text-slate-600">No downloadable PDF is available for this publication.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
