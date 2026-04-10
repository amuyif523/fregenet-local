import { prisma } from "@/lib/prisma";
import NewsletterAdminManager from "@/components/admin/NewsletterAdminManager";

export default async function AdminNewslettersPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let newsletters: Array<{
    id: string;
    title_en: string;
    title_am: string;
    body_en: string | null;
    body_am: string | null;
    email: string;
    isPublished: boolean;
    publishedAt: Date;
    source: string | null;
  }> = [];
  let loadError = false;

  try {
    newsletters = await prisma.newsletter.findMany({
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title_en: true,
        title_am: true,
        body_en: true,
        body_am: true,
        email: true,
        isPublished: true,
        publishedAt: true,
        source: true
      }
    });
  } catch {
    loadError = true;
  }

  return <NewsletterAdminManager locale={locale} newsletters={newsletters} loadError={loadError} />;
}
