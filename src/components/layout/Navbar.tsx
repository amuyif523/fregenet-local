"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type Locale, withLocale } from "@/lib/i18n-config";

const navMap = [
  { key: "home", href: "/" },
  { key: "schools", href: "/schools" },
  { key: "projects", href: "/projects" },
  { key: "news", href: "/news" },
  { key: "governance", href: "/governance" },
  { key: "contact", href: "/contact" }
] as const;

export default function Navbar() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onLocaleChange = (nextLocale: Locale) => {
    const targetPath = withLocale(pathname, nextLocale);
    const query = searchParams.toString();
    router.push(query ? `${targetPath}?${query}` : targetPath);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href={withLocale("/", locale)} className="flex items-center" aria-label="Fregenet Kidan Lehitsanat home">
          <Image src="/images/branding/logo.png" alt="Fregenet Kidan Lehitsanat logo" width={124} height={40} priority />
        </Link>

        <div className="hidden items-center gap-6 text-sm font-semibold text-slate-700 md:flex">
          {navMap.map((item) => (
            <Link key={item.href} href={withLocale(item.href, locale)} className="transition hover:text-primary">
              {t(`Nav.${item.key}`)}
            </Link>
          ))}
          <Link
            href={withLocale("/donate", locale)}
            className="rounded-full bg-primary px-5 py-2 text-white shadow-[0_0_0_0_rgba(13,148,136,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-cyan-800 hover:shadow-[0_0_18px_rgba(13,148,136,0.45)] animate-[pulse_2.8s_ease-in-out_infinite]"
          >
            {t("Nav.donate")}
          </Link>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-slate-200 p-1">
          <Globe className="ml-1 size-4 text-slate-500" />
          <LangButton active={locale === "en"} onClick={() => onLocaleChange("en")} label="EN" />
          <LangButton active={locale === "am"} onClick={() => onLocaleChange("am")} label="AM" />
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-3 md:hidden sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-slate-700">
          {navMap.map((item) => (
            <Link key={item.href} href={withLocale(item.href, locale)} className="transition hover:text-primary">
              {t(`Nav.${item.key}`)}
            </Link>
          ))}
          <Link
            href={withLocale("/donate", locale)}
            className="rounded-full bg-primary px-4 py-1.5 text-white transition-all duration-300 hover:bg-cyan-800"
          >
            {t("Nav.donate")}
          </Link>
        </div>
      </div>
    </nav>
  );
}

function LangButton({
  active,
  onClick,
  label
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-bold transition ${
        active ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}
