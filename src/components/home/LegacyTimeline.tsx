"use client";

import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/home/RevealOnScroll";

const years = ["2004", "2010", "2026"] as const;

export default function LegacyTimeline() {
  const t = useTranslations();

  return (
    <RevealOnScroll>
      <section className="py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">{t("Legacy.title")}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {years.map((year, index) => (
              <div key={year} className="relative rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
                {index < years.length - 1 ? (
                  <span className="pointer-events-none absolute -right-3 top-1/2 hidden h-0.5 w-6 -translate-y-1/2 bg-primary/30 md:block" />
                ) : null}
                <p className="text-xl font-black text-primary">{year}</p>
                <p className="mt-2 text-sm text-slate-700">{t(`Legacy.events.${year}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
}
