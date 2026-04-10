import { prisma } from "@/lib/prisma";
import ProjectAdminManager from "@/components/admin/ProjectAdminManager";

export default async function AdminProjectsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let projects: Array<{
    id: string;
    title_en: string;
    title_am: string;
    slug: string;
    summary_en: string;
    summary_am: string;
    body_en: string | null;
    body_am: string | null;
    status: "ACTIVE" | "COMPLETED";
    coverImage: string | null;
  }> = [];
  let loadError = false;

  try {
    projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title_en: true,
        title_am: true,
        slug: true,
        summary_en: true,
        summary_am: true,
        body_en: true,
        body_am: true,
        status: true,
        coverImage: true
      }
    });
  } catch (error) {
    console.error("[AdminProjectsPage] Failed to load project records", error);
    loadError = true;
  }

  return <ProjectAdminManager locale={locale} projects={projects} loadError={loadError} />;
}
