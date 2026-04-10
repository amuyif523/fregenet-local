"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type Locale, withLocale } from "@/lib/i18n-config";

export default function Footer() {
  const locale = useLocale() as Locale;
  const t = useTranslations();

  return (
    <footer className="mt-20 rounded-t-3xl bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <Image
            src="/images/branding/logo.png"
            alt="Fregenet Kidan Lehitsanat logo"
            width={156}
            height={50}
            className="mb-3"
          />
          <p className="mb-3 text-lg font-bold text-cyan-300">Fregenet Kidan Lehitsanat</p>
          <p className="text-sm leading-relaxed text-slate-300">{t("Footer.description")}</p>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">{t("Footer.contactInfo")}</p>
          <div className="space-y-3 text-sm text-slate-300">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-cyan-300" />
              <span>{t("Footer.address")}</span>
            </p>
            <p className="flex items-start gap-2">
              <Phone className="mt-0.5 size-4 shrink-0 text-cyan-300" />
              <span>+251 11 155 0000 / +251 91 123 4567</span>
            </p>
            <p className="flex items-start gap-2">
              <Send className="mt-0.5 size-4 shrink-0 text-cyan-300" />
              <span>{t("Footer.telegram")}</span>
            </p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">{t("Footer.linksTitle")}</p>
          <div className="space-y-2 text-sm text-slate-300">
            <Link href={withLocale("/projects", locale)} className="block transition hover:text-cyan-200">
              {t("Footer.projectsLink")}
            </Link>
            <Link href={withLocale("/news", locale)} className="block transition hover:text-cyan-200">
              {t("Footer.newsLink")}
            </Link>
            <Link href={withLocale("/governance", locale)} className="block transition hover:text-cyan-200">
              {t("Footer.governanceLink")}
            </Link>
            <Link href={withLocale("/contact", locale)} className="block transition hover:text-cyan-200">
              {t("Footer.contactLink")}
            </Link>
          </div>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
        {t("Footer.copyright", { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
}
