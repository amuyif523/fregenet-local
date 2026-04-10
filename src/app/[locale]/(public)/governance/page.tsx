import Image from "next/image";
import { prisma } from "@/lib/prisma";

export default async function GovernancePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const localeKey = locale === "am" ? "am" : "en";

  let members: Array<{
    id: string;
    name_en: string;
    name_am: string;
    role_en: string;
    role_am: string;
    bio_en: string | null;
    bio_am: string | null;
    imagePath: string | null;
    order: number;
    isBoardMember: boolean;
  }> = [];

  try {
    members = await prisma.governanceMember.findMany({
      where: { isBoardMember: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name_en: true,
        name_am: true,
        role_en: true,
        role_am: true,
        bio_en: true,
        bio_am: true,
        imagePath: true,
        order: true,
        isBoardMember: true
      }
    });
  } catch (error) {
    console.error("[GovernancePage] Failed to load governance members", error);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-primary">Governance & Leadership</h1>
      <p className="mt-3 max-w-3xl text-slate-700">
        Our board and local operational team are committed to transparent stewardship and measurable community impact.
      </p>

      {members.length === 0 ? (
        <p className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Leadership information coming soon.
        </p>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {members.map((member) => {
            const localizedName = member[`name_${localeKey}` as keyof Pick<typeof member, "name_en" | "name_am">];
            const localizedRole = member[`role_${localeKey}` as keyof Pick<typeof member, "role_en" | "role_am">];
            const localizedBio = member[`bio_${localeKey}` as keyof Pick<typeof member, "bio_en" | "bio_am">];

            return (
              <article key={member.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                {member.imagePath ? (
                  <div className="overflow-hidden rounded-xl">
                    <Image src={member.imagePath} alt={localizedName} width={800} height={900} className="h-72 w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-72 rounded-xl bg-gradient-to-br from-[#006D77] to-[#83C5BE]" />
                )}
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">{localizedRole}</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">{localizedName}</h2>
                {localizedBio ? <p className="mt-2 text-sm text-slate-700">{localizedBio}</p> : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
