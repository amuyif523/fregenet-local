"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SyncResult = {
  scanned: number;
  verified: number;
  completed: number;
  failedVerification: number;
  amountMismatch: number;
  statusMismatch: number;
  alreadyResolved: number;
};

export default function SyncPendingPaymentsButton() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setIsSyncing(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/donations/sync", {
        method: "POST"
      });

      const payload = (await response.json()) as SyncResult | { error?: string };

      if (!response.ok) {
        const errorMessage = "error" in payload && payload.error ? payload.error : "Sync failed.";
        setMessage(errorMessage);
        return;
      }

      const result = payload as SyncResult;
      setMessage(
        `Sync report: scanned ${result.scanned}, verified ${result.verified}, completed ${result.completed}, failed verification ${result.failedVerification}, amount mismatch ${result.amountMismatch}, status mismatch ${result.statusMismatch}, already resolved ${result.alreadyResolved}.`
      );
      router.refresh();
    } catch {
      setMessage("Unable to sync at the moment. Please retry.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={isSyncing}
        className="inline-flex items-center justify-center rounded-xl bg-[#006D77] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#005B63] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSyncing ? "Syncing..." : "Sync Pending Payments"}
      </button>
      {message ? <p className="text-xs font-semibold text-slate-600">{message}</p> : null}
    </div>
  );
}
