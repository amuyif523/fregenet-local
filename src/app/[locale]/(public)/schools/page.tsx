import Image from "next/image";
import { getTranslations } from "next-intl/server";

const blurDataURL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMicgaGVpZ2h0PSc4Jz48cmVjdCB3aWR0aD0nMTInIGhlaWdodD0nOCcgZmlsbD0nI2U2ZjRmMScvPjwvc3ZnPg==";

export default async function SchoolsPage() {
  const t = await getTranslations();

  const schools = [
    {
      title: t("SchoolsSpotlight.addis.title"),
      description: t("SchoolsSpotlight.addis.description"),
      image: "/images/schools/addis-pilot.webp",
      alt: "Fregenet Kidan Lehitsanat students at Addis Pilot School"
    },
    {
      title: t("SchoolsSpotlight.bishoftu.title"),
      description: t("SchoolsSpotlight.bishoftu.description"),
      image: "/images/schools/bishoftu-center.webp",
      alt: "Fregenet Kidan Lehitsanat learners at the Bishoftu learning center"
    }
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-primary">{t("Nav.schools")}</h1>
      <p className="mt-3 max-w-3xl text-slate-700">{t("SchoolsSpotlight.subtitle")}</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {schools.map((school) => (
          <article key={school.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Image
              src={school.image}
              alt={school.alt}
              width={1200}
              height={800}
              sizes="(max-width: 768px) 100vw, 50vw"
              placeholder="blur"
              blurDataURL={blurDataURL}
              className="h-64 w-full object-cover"
            />
            <div className="p-6">
              <h2 className="text-2xl font-black text-slate-900">{school.title}</h2>
              <p className="mt-2 text-slate-700">{school.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
