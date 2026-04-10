"use client";

import { ArrowUpRight, Building2, FlaskConical } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useLocale } from "next-intl";
import Image from "next/image";
import RevealOnScroll from "@/components/home/RevealOnScroll";
import { type Locale, withLocale } from "@/lib/i18n-config";

export default function SchoolSpotlight() {
  const t = useTranslations();
  const locale = useLocale() as Locale;

  const schools = [
    {
      name: t("SchoolsSpotlight.addis.title"),
      description: t("SchoolsSpotlight.addis.description"),
      icon: Building2,
      image: "/images/schools/addis-pilot.webp",
      alt: "Fregenet Kidan Lehitsanat students at Addis Pilot School"
    },
    {
      name: t("SchoolsSpotlight.bishoftu.title"),
      description: t("SchoolsSpotlight.bishoftu.description"),
      icon: FlaskConical,
      image: "/images/schools/bishoftu-center.webp",
      alt: "Fregenet Kidan Lehitsanat learners at the Bishoftu learning center"
    }
  ];

  return (
    <RevealOnScroll>
      <section className="py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">{t("SchoolsSpotlight.title")}</h2>
          <p className="mt-3 max-w-2xl text-slate-600">{t("SchoolsSpotlight.subtitle")}</p>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {schools.map((school) => (
              <article
                key={school.name}
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <Image
                    src={school.image}
                    alt={school.alt}
                    width={960}
                    height={640}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="h-44 w-full object-cover"
                  />
                </div>
                <school.icon className="size-9 text-primary" />
                <h3 className="mt-5 text-2xl font-bold text-slate-900">{school.name}</h3>
                <p className="mt-3 text-slate-600">{school.description}</p>
                <Link
                  href={withLocale("/schools", locale)}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#FFB703] transition hover:text-amber-500"
                >
                  {t("SchoolsSpotlight.learnMore")}
                  <ArrowUpRight className="size-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
}
