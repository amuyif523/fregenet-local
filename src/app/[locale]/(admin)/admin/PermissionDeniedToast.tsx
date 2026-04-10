"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function PermissionDeniedToast({ show }: { show: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  useEffect(() => {
    if (!show) {
      return;
    }

    const timeout = setTimeout(() => {
      setVisible(false);

      const params = new URLSearchParams(searchParams.toString());
      params.delete("denied");
      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(nextUrl, { scroll: false });
    }, 2800);

    return () => clearTimeout(timeout);
  }, [pathname, router, searchParams, show]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-lg">
      Permission Denied
    </div>
  );
}
