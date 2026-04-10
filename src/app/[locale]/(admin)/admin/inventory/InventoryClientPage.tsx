"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Search } from "lucide-react";
import { issueItem, restockItem } from "@/lib/inventory-actions";

const CATEGORY_OPTIONS = ["ALL", "STATIONERY", "UNIFORM", "TEXTBOOK", "ASSET", "MIXED"] as const;

type CategoryFilter = (typeof CATEGORY_OPTIONS)[number];

export type InventoryTableRow = {
  id: string;
  name: string;
  category: "STATIONERY" | "UNIFORM" | "TEXTBOOK" | "ASSET" | "MIXED";
  quantity: number;
  minStock: number;
  centerName: string;
  isGlobalAggregate: boolean;
};

export type InventoryLogRow = {
  id: string;
  itemName: string;
  itemCategory: "STATIONERY" | "UNIFORM" | "TEXTBOOK" | "ASSET";
  centerName: string;
  logType: "RESTOCK" | "ISSUE";
  quantityDelta: number;
  quantityAfter: number;
  recipientName: string | null;
  notes: string | null;
  performedBy: string;
  createdAt: string;
};

function categoryLabel(value: string) {
  return value.toLowerCase().replace("_", " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

type ActionMode = "RESTOCK" | "ISSUE";

function readErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function InventoryClientPage({
  rows,
  logs,
  isGlobal
}: {
  rows: InventoryTableRow[];
  logs: InventoryLogRow[];
  isGlobal: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [activeAction, setActiveAction] = useState<ActionMode | null>(null);
  const [selectedRow, setSelectedRow] = useState<InventoryTableRow | null>(null);
  const [feedback, setFeedback] = useState<{ error?: boolean; text: string } | null>(null);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        row.name.toLowerCase().includes(normalizedQuery) ||
        row.centerName.toLowerCase().includes(normalizedQuery);
      const matchesCategory = categoryFilter === "ALL" || row.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [rows, query, categoryFilter]);

  const handleCloseModal = () => {
    setActiveAction(null);
    setSelectedRow(null);
  };

  const openAction = (row: InventoryTableRow, mode: ActionMode) => {
    setSelectedRow(row);
    setActiveAction(mode);
  };

  const onRestock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRow) return;

    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const notes = String(formData.get("notes") || "");
    const totalCostRaw = formData.get("totalCost");
    const totalCost = typeof totalCostRaw === "string" && totalCostRaw.trim() ? Number(totalCostRaw) : undefined;

    startTransition(async () => {
      setFeedback(null);
      try {
        await restockItem(selectedRow.id, amount, notes, totalCost);
        setFeedback({ text: `${selectedRow.name} restocked successfully.` });
        handleCloseModal();
        router.refresh();
      } catch (error: unknown) {
        setFeedback({ error: true, text: readErrorMessage(error, "Restock failed.") });
      }
    });
  };

  const onIssue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRow) return;

    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const recipientName = String(formData.get("recipientName") || "");
    const notes = String(formData.get("notes") || "");

    startTransition(async () => {
      setFeedback(null);
      try {
        await issueItem(selectedRow.id, amount, recipientName, notes);
        setFeedback({ text: `${selectedRow.name} issued successfully.` });
        handleCloseModal();
        router.refresh();
      } catch (error: unknown) {
        setFeedback({ error: true, text: readErrorMessage(error, "Issue transaction failed.") });
      }
    });
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-[#006D77]">Inventory & Resource Management</h1>
        <p className="mt-2 text-slate-600">
          {isGlobal
            ? "Consolidated inventory view across all centers, grouped by item name."
            : "Track stock levels, issue supplies, and monitor low-stock alerts for this center."}
        </p>

        {feedback && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              feedback.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {feedback.text}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by item or center"
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-[#006D77] focus:outline-none focus:ring-1 focus:ring-[#006D77]"
            />
          </label>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#006D77] focus:outline-none focus:ring-1 focus:ring-[#006D77]"
          >
            {CATEGORY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value === "ALL" ? "All categories" : categoryLabel(value)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-800">
              <tr>
                <th className="p-4 font-bold">Name</th>
                <th className="p-4 font-bold">Category</th>
                <th className="p-4 font-bold">Quantity</th>
                <th className="p-4 font-bold">Min Stock</th>
                <th className="p-4 font-bold">Center</th>
                {!isGlobal && <th className="p-4 text-right font-bold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={isGlobal ? 5 : 6} className="p-6 text-center text-slate-500">
                    No inventory records found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isLowStock = row.quantity <= row.minStock;
                  return (
                    <tr key={row.id} className={isLowStock ? "bg-red-50/70" : "hover:bg-slate-50/60"}>
                      <td className="p-4 font-semibold text-slate-900">{row.name}</td>
                      <td className="p-4 uppercase tracking-wide text-slate-700">{categoryLabel(row.category)}</td>
                      <td className="p-4">
                        <span className={`font-semibold ${isLowStock ? "text-red-700" : "text-slate-800"}`}>{row.quantity}</span>
                        {isLowStock && <AlertTriangle className="ml-2 inline size-4 text-red-500" />}
                      </td>
                      <td className="p-4 font-medium text-slate-700">{row.minStock}</td>
                      <td className="p-4 text-slate-500">{row.centerName}</td>
                      {!isGlobal && (
                        <td className="p-4">
                    <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => openAction(row, "RESTOCK")}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <ArrowUpFromLine className="size-3.5" /> Restock
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => openAction(row, "ISSUE")}
                              className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                            >
                              <ArrowDownToLine className="size-3.5" /> {row.category === "ASSET" ? "Assign" : "Issue"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#006D77]">Inventory Movement Log</h2>
        <p className="mt-1 text-sm text-slate-500">Audit trail of all stock increases and issuances.</p>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-800">
              <tr>
                <th className="p-4 font-bold">Date</th>
                <th className="p-4 font-bold">Item</th>
                <th className="p-4 font-bold">Type</th>
                <th className="p-4 font-bold">Delta</th>
                <th className="p-4 font-bold">After</th>
                <th className="p-4 font-bold">Recipient</th>
                <th className="p-4 font-bold">Notes</th>
                <th className="p-4 font-bold">Performed By</th>
                {isGlobal && <th className="p-4 font-bold">Center</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={isGlobal ? 9 : 8} className="p-6 text-center text-slate-500">
                    No inventory movements recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="p-4 text-slate-500">{formatDate(log.createdAt)}</td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-900">{log.itemName}</p>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{categoryLabel(log.itemCategory)}</p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          log.logType === "RESTOCK" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {log.logType}
                      </span>
                    </td>
                    <td className={`p-4 font-semibold ${log.quantityDelta > 0 ? "text-emerald-700" : "text-orange-700"}`}>
                      {log.quantityDelta > 0 ? `+${log.quantityDelta}` : log.quantityDelta}
                    </td>
                    <td className="p-4 font-medium text-slate-700">{log.quantityAfter}</td>
                    <td className="p-4 text-slate-500">{log.recipientName || "-"}</td>
                    <td className="p-4 text-slate-500">{log.notes || "-"}</td>
                    <td className="p-4 text-slate-500">{log.performedBy}</td>
                    {isGlobal && <td className="p-4 text-slate-500">{log.centerName}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeAction && selectedRow && !isGlobal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900">
              {activeAction === "RESTOCK" ? "Restock Item" : selectedRow.category === "ASSET" ? "Assign Asset" : "Issue Item"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{selectedRow.name}</p>

            {activeAction === "RESTOCK" ? (
              <form onSubmit={onRestock} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    min={1}
                    step={1}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#006D77] focus:outline-none focus:ring-1 focus:ring-[#006D77]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Total Cost (ETB, Optional)</label>
                  <input
                    type="number"
                    name="totalCost"
                    min={0}
                    step="0.01"
                    placeholder="If entered, a Finance expense will be recorded"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#006D77] focus:outline-none focus:ring-1 focus:ring-[#006D77]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Notes (Optional)</label>
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="Document delivery source or reason for stock increase"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#006D77] focus:outline-none focus:ring-1 focus:ring-[#006D77]"
                  />
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isPending ? "Saving..." : "Confirm Restock"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={onIssue} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    min={1}
                    step={1}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#006D77] focus:outline-none focus:ring-1 focus:ring-[#006D77]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    {selectedRow.category === "ASSET" ? "Assigned To" : "Recipient Name"}
                  </label>
                  <input
                    name="recipientName"
                    required
                    placeholder="e.g. Grade 5 Homeroom / Staff Name"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#006D77] focus:outline-none focus:ring-1 focus:ring-[#006D77]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Notes</label>
                  <textarea
                    name="notes"
                    rows={3}
                    required
                    placeholder={
                      selectedRow.category === "ASSET"
                        ? "Document assignment details (asset tag, condition, expected return)"
                        : "Document consumable use details and recipient context"
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#006D77] focus:outline-none focus:ring-1 focus:ring-[#006D77]"
                  />
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    {isPending ? "Saving..." : selectedRow.category === "ASSET" ? "Confirm Assignment" : "Confirm Issue"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
