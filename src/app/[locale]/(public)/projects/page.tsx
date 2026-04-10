import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";

function resolveLocalImagePath(path: string | null) {
  return path && path.startsWith("/uploads/") ? path : null;
}

export default async function ProjectsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = await getTranslations();
  const { locale } = await params;

  let projects: Array<{
    id: string;
    title_en: string;
    title_am: string;
    slug: string;
    summary_en: string;
    summary_am: string;
    status: "ACTIVE" | "COMPLETED";
    body_en: string | null;
    body_am: string | null;
    coverImage: string | null;
  }> = [];
  let loadError = false;

  try {
    projects = await prisma.project.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title_en: true,
        title_am: true,
        slug: true,
        summary_en: true,
        summary_am: true,
        status: true,
        body_en: true,
        body_am: true,
        coverImage: true
      }
    });
  } catch {
    loadError = true;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-primary">{t("Nav.projects")}</h1>

      {loadError ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Project data is temporarily unavailable. Please retry shortly.
        </p>
      ) : null}

      {!loadError && projects.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-teal-200 bg-gradient-to-r from-[#E7F6F7] to-[#F2FBFB] p-5">
          <p className="text-sm font-bold text-[#005B63]">No data found in the project archive</p>
          <p className="mt-1 text-sm text-slate-600">Published projects will appear here once the next local milestone is released.</p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const imageSrc = resolveLocalImagePath(project.coverImage);
          const localeKey = locale === "am" ? "am" : "en";
          const localizedTitle = project[`title_${localeKey}` as keyof Pick<typeof project, "title_en" | "title_am">];
          const localizedSummary =
            project[`summary_${localeKey}` as keyof Pick<typeof project, "summary_en" | "summary_am">];
          const localizedBody = project[`body_${localeKey}` as keyof Pick<typeof project, "body_en" | "body_am">];

          return (
            <article key={project.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {imageSrc ? (
                <div className="relative h-52">
                  <Image src={imageSrc} alt={localizedTitle} fill className="object-cover" />
                </div>
              ) : (
                <div className="h-52 bg-gradient-to-br from-[#006D77] to-[#83C5BE]" />
              )}

              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{project.status}</p>
                <h2 className="mt-2 text-xl font-black text-slate-900">{localizedTitle}</h2>
                <p className="mt-2 text-sm text-slate-700">{localizedSummary}</p>
                {localizedBody ? <p className="mt-2 text-sm text-slate-600">{localizedBody}</p> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
