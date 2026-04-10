"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { type Locale, withLocale } from "@/lib/i18n-config";
import RevealOnScroll from "@/components/home/RevealOnScroll";

export default function Hero() {
  const t = useTranslations();
  const locale = useLocale() as Locale;

  return (
    <RevealOnScroll>
      <section className="relative overflow-hidden bg-gradient-to-br from-mist via-white to-cyan-50 py-16">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 lg:grid-cols-2">
          <div>
            <div className="h-1 w-14 rounded-full bg-[#FFB703]" />
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-primary sm:text-5xl lg:text-6xl">
              {t("Hero.title")}
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-700 sm:text-lg">{t("Hero.subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={withLocale("/donate", locale)}
                className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white"
              >
                {t("Nav.donate")}
              </Link>
              <Link
                href={withLocale("/schools", locale)}
                className="rounded-xl border border-primary/25 bg-transparent px-6 py-3 text-sm font-bold text-primary transition-colors duration-300 hover:bg-primary/10"
              >
                {t("Nav.schools")}
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-2 top-1/2 -z-10 h-52 w-52 -translate-y-1/2 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute -left-5 -top-5 h-24 w-24 rounded-full bg-secondary/30 blur-2xl" />
            <div className="absolute -bottom-10 -right-4 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border-8 border-white shadow-2xl">
              <Image
                src="/images/hero/students-hero.webp"
                alt="Fregenet Kidan Lehitsanat students in Addis Ababa"
                width={960}
                height={720}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>
    </RevealOnScroll>
  );
}
