"use client";

import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/home/RevealOnScroll";

const statValues = ["21+", "600+", "15,000 ETB"];
const statKeys = ["years", "students", "sponsorship"] as const;

export default function ImpactStats() {
  const t = useTranslations();

  return (
    <RevealOnScroll>
      <section className="section-tibeb border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 sm:grid-cols-3">
          {statValues.map((value, index) => (
            <div
              key={value}
              className="rounded-2xl border border-cyan-100 border-t-2 border-t-primary bg-white p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <p className="text-3xl font-black text-primary">{value}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                {t(`Stats.${statKeys[index]}`)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </RevealOnScroll>
  );
}
