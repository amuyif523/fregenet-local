"use client";

import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminShell({ 
  locale, 
  activeCenter,
  centers,
  userRole,
  children 
}: { 
  locale: string; 
  activeCenter: string;
  centers: Array<{id: string; name: string}>;
  userRole: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isLoginRoute = pathname?.endsWith("/login") ?? false;

  if (isLoginRoute) {
    return <div>{children}</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
        >
          <Menu className="size-4" />
          Menu
        </button>
      </div>

      <div className="hidden lg:block">
        <AdminSidebar locale={locale} activeCenter={activeCenter} centers={centers} userRole={userRole} />
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute left-3 top-3 bottom-3 w-[85%] max-w-xs">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-full border border-white/30 bg-white/10 p-2 text-white"
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
            <AdminSidebar locale={locale} activeCenter={activeCenter} centers={centers} userRole={userRole} onNavigate={() => setIsOpen(false)} mobile />
          </div>
        </div>
      ) : null}

      <div>{children}</div>
    </div>
  );
}
