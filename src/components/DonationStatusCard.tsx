"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

type StatusResponse = {
  tx_ref: string;
  status: string;
  amount: string;
  paidAt: string | null;
};

export default function DonationStatusCard({
  locale,
  txRef,
  statusToken
}: {
  locale: string;
  txRef: string | null;
  statusToken: string | null;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!txRef) {
      return;
    }

    let active = true;

    const loadStatus = async () => {
      try {
        const params = new URLSearchParams({ tx_ref: txRef });

        if (statusToken) {
          params.set("status_token", statusToken);
        }

        const response = await fetch(`/api/donate/status?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Unable to fetch donation status.");
        }

        const data = (await response.json()) as StatusResponse;

        if (!active) {
          return;
        }

        setStatus(data.status.toUpperCase());
      } catch (statusError) {
        if (!active) {
          return;
        }

        const message = statusError instanceof Error ? statusError.message : "Status check failed.";
        setError(message);
      }
    };

    loadStatus();

    const interval = setInterval(() => {
      if (status !== "COMPLETED") {
        loadStatus();
      }
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [status, statusToken, txRef]);

  const statusLabel = useMemo(() => {
    if (status === "COMPLETED") {
      return "Verified";
    }

    if (status === "PENDING") {
      return "Verifying with Chapa...";
    }

    if (status === "FAILED") {
      return "Verification Failed";
    }

    return "Verifying with Chapa...";
  }, [status]);

  const badgeClass =
    status === "COMPLETED"
      ? "bg-teal-100 text-teal-700"
      : status === "FAILED"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full rounded-3xl border border-amber-200 bg-amber-50 p-10 text-center">
        <CheckCircle2 className="mx-auto mb-4 size-16 text-[#C9992F]" />
        <h1 className="text-3xl font-black text-slate-900">Thank You for Your Support</h1>
        <p className="mt-3 text-slate-700">Your ETB donation is being reconciled.</p>

        <div className="mt-6 inline-flex items-center justify-center">
          <span className={`${badgeClass} rounded-full px-4 py-2 text-sm font-bold`}>{statusLabel}</span>
        </div>

        {txRef ? <p className="mt-4 font-mono text-xs text-slate-600">{txRef}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        <Link
          href={`/${locale}`}
          className="mt-8 inline-flex rounded-xl bg-[#C9992F] px-6 py-3 font-bold text-slate-900 transition hover:brightness-95"
        >
          Return Home
        </Link>
      </div>
    </section>
  );
}
