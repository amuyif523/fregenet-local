"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Banknote, BriefcaseBusiness, Home, Mail, Newspaper, Users, Package, DollarSign, GraduationCap } from "lucide-react";
import { setCenterScope } from "@/lib/center-actions";

const foundationItems = [
  { key: "overview", href: "", icon: Home, label: "overview" },
  { key: "donations", href: "/donations", icon: Banknote, label: "donations" },
  { key: "projects", href: "/projects", icon: BriefcaseBusiness, label: "projects" },
  { key: "newsletters", href: "/newsletters", icon: Newspaper, label: "newsletters" },
  { key: "messages", href: "/messages", icon: Mail, label: "messages" },
  { key: "governance", href: "/governance", icon: Users, label: "governance" }
] as const;

const schoolItems = [
  { key: "staff", href: "/staff", icon: Users, label: "staff" },
  { key: "inventory", href: "/inventory", icon: Package, label: "inventory" },
  { key: "finance", href: "/finance", icon: DollarSign, label: "finance" },
  { key: "students", href: "/students", icon: GraduationCap, label: "students" }
] as const;

export default function AdminSidebar({
  locale,
  activeCenter,
  centers,
  userRole,
  mobile = false,
  onNavigate
}: {
  locale: string;
  activeCenter: string;
  centers: Array<{id: string; name: string}>;
  userRole: string;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCenterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCenterId = e.target.value;
    startTransition(async () => {
      await setCenterScope(newCenterId);
      const params = new URLSearchParams(searchParams.toString());
      if (newCenterId === "GLOBAL") {
         params.delete("centerId");
      } else {
         params.set("centerId", newCenterId);
      }
      router.push(`${pathname}?${params.toString()}`);
      if (onNavigate) onNavigate();
    });
  };

  const showGlobal = userRole === "admin" || userRole === "ADMIN" || userRole === "SUPERADMIN" || userRole === "DIRECTOR";

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
      
      <div className="mt-5 mb-1">
         <select 
           value={activeCenter} 
           onChange={handleCenterChange} 
           disabled={isPending}
           className="w-full rounded-lg border border-white/30 bg-white/10 p-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
         >
           {showGlobal && <option value="GLOBAL" className="text-slate-900">Global Foundation</option>}
           {centers.map(c => (
              <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>
           ))}
         </select>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto pr-1 pb-4 space-y-6 scrollbar-thin scrollbar-thumb-white/20">
        <div>
          <p className="px-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/50 mb-2">Foundation</p>
          <div className="space-y-1 text-sm font-semibold">
            {foundationItems.map((item) => {
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

        <div>
           <p className="px-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/50 mb-2">School ERP</p>
           <div className="space-y-1 text-sm font-semibold">
            {schoolItems.map((item) => {
              const href = `/${locale}/admin${item.href}`;
              const Icon = item.icon;
              const isActive = pathname === href || pathname.startsWith(href);

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
                  {/* Note: since translation files might not have these yet, we fall back to generic label if missing */}
                  {t.has(`Admin.${item.label}`) ? t(`Admin.${item.label}`) : item.label.charAt(0).toUpperCase() + item.label.slice(1)}
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
