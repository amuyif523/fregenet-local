"use client";

import { BookOpen, Bus, PencilLine, Shirt, Utensils } from "lucide-react";
import { useTranslations } from "next-intl";
import RevealOnScroll from "@/components/home/RevealOnScroll";

export default function SupportGrid() {
  const t = useTranslations();

  const pillars = [
    { icon: Utensils, label: t("Holistic.meals") },
    { icon: Shirt, label: t("Holistic.uniforms") },
    { icon: PencilLine, label: t("Holistic.stationery") },
    { icon: BookOpen, label: t("Holistic.textbooks") },
    { icon: Bus, label: t("Holistic.transport") }
  ];

  return (
    <RevealOnScroll>
      <section className="section-tibeb py-16">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="mx-auto grid max-w-6xl items-stretch gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {pillars.map((pillar) => (
              <div
                key={pillar.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <pillar.icon className="mx-auto size-8 text-primary" />
                <p className="mt-3 text-sm font-semibold text-slate-700">{pillar.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
}
