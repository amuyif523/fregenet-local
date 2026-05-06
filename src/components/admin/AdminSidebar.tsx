"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Banknote, BriefcaseBusiness, Home, Mail, Newspaper, Users, ClipboardCheck } from "lucide-react";
import { canAccessAdminPath } from "@/lib/rbac";

const foundationItems = [
  { key: "overview", href: "", icon: Home, label: "overview" },
  { key: "donations", href: "/donations", icon: Banknote, label: "donations" },
  { key: "projects", href: "/projects", icon: BriefcaseBusiness, label: "projects" },
  { key: "newsletters", href: "/newsletters", icon: Newspaper, label: "newsletters" },
  { key: "messages", href: "/messages", icon: Mail, label: "messages" },
  { key: "governance", href: "/governance", icon: Users, label: "governance" },
  { key: "activity", href: "/activity", icon: ClipboardCheck, label: "activity" }
] as const;

export default function AdminSidebar({
  locale,
  userRole,
  mobile = false,
  onNavigate
}: {
  locale: string;
  userRole: string;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const onLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/admin/logout", {
        method: "POST",
        cache: "no-store"
      });
    } finally {
      onNavigate?.();
      router.replace(`/${locale}/admin/login`);
    }
  };

  return (
    <aside
      className={`flex ${mobile ? "h-full" : "min-h-[calc(100vh-8rem)]"} flex-col rounded-2xl border border-white/25 bg-gradient-to-b from-[#006D77]/85 to-[#00545c]/80 p-5 text-white shadow-xl backdrop-blur-md`}
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-white/80">{t("Admin.panel")}</p>

      <nav className="mt-4 flex-1 overflow-y-auto pr-1 pb-4 space-y-6 scrollbar-thin scrollbar-thumb-white/20">
        <div>
          <p className="px-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/50 mb-2">Foundation</p>
          <div className="space-y-1 text-sm font-semibold">
            {foundationItems.filter((item) => canAccessAdminPath(userRole, `/${locale}/admin${item.href}`)).map((item) => {
              const href = `/${locale}/admin${item.href}`;
              const Icon = item.icon;
              const isActive = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2 rounded-lg border-l-4 px-3 py-2 transition ${
                    isActive
                      ? "border-l-white bg-white text-[#00545c] shadow-sm"
                      : "border-l-transparent text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="size-4" />
                  {t(`Admin.${item.label}`)}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="mt-auto border-t border-white/20 pt-4">
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="mb-3 w-full rounded-lg border border-white/35 px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoggingOut ? `${t("Admin.logout")}...` : t("Admin.logout")}
        </button>
        <Link href={`/${locale}`} className="text-sm font-semibold text-white/90 underline underline-offset-4">
          {t("Admin.backToSite")}
        </Link>
      </div>
    </aside>
  );
}
