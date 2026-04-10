"use client";

import { useState, useTransition } from "react";
import { Plus, TrendingUp, TrendingDown, Trash2, Edit2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { upsertSchoolExpense, deleteSchoolExpense } from "@/lib/finance-actions";

type SummaryProps = {
  totalIncome: number;
  totalOpsExpense: number;
  totalStaffCosts: number;
  netBalance: number;
};

type TrendData = {
  name: string;
  income: number;
  outflow: number;
};

type PieData = {
  name: string;
  value: number;
};

type Expense = {
  id: string;
  amount: any;
  category: "FOOD_PROGRAM" | "UTILITIES" | "MAINTENANCE" | "CONSTRUCTION" | "SUPPLIES";
  description: string | null;
  createdAt: Date;
};

const PIE_COLORS = ["#006D77", "#83C5BE", "#E29578", "#FFDDD2", "#00545c"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(value);
}

export default function FinanceClientPage({
  isGlobal,
  centerId,
  summary,
  trendData,
  pieData,
  expenses
}: {
  isGlobal: boolean;
  centerId: string;
  summary: SummaryProps;
  trendData: TrendData[];
  pieData: PieData[];
  expenses: Expense[];
}) {
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    startTransition(async () => {
      await deleteSchoolExpense(id);
    });
  };

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("centerId", centerId);

    if (editingExpense) {
      formData.append("expenseId", editingExpense.id);
    }

    startTransition(async () => {
      try {
        await upsertSchoolExpense(formData);
        setIsFormOpen(false);
        setEditingExpense(null);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-[#006D77]">Financial Pulse</h1>
        <p className="text-slate-600">
          {isGlobal 
            ? "Consolidated transparency health across The Fregenet Foundation and all school centers." 
            : `Live tracking for center operations.`}
        </p>
      </div>

      {/* TOP SUMMARY CARDS */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Total Income</p>
          <p className="mt-2 text-2xl font-black text-[#006D77]">{formatCurrency(summary.totalIncome)}</p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Ops Expense</p>
          <p className="mt-2 text-2xl font-black text-rose-900">{formatCurrency(summary.totalOpsExpense)}</p>
        </div>
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Staff Costs</p>
          <p className="mt-2 text-2xl font-black text-orange-900">{formatCurrency(summary.totalStaffCosts)}</p>
        </div>
        <div className={`rounded-xl border ${summary.netBalance >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"} p-4 `}>
          <p className={`text-xs font-bold uppercase tracking-wider ${summary.netBalance >= 0 ? "text-emerald-700" : "text-red-700"}`}>Net Balance</p>
          <div className="mt-2 flex items-center gap-2">
            <p className={`text-2xl font-black ${summary.netBalance >= 0 ? "text-emerald-900" : "text-red-900"}`}>{formatCurrency(summary.netBalance)}</p>
            {summary.netBalance >= 0 ? <TrendingUp className="size-5 text-emerald-600" /> : <TrendingDown className="size-5 text-red-600" />}
          </div>
        </div>
      </div>

      {/* VISUAL ANALYTICS */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Cash Flow Trend (Area Chart) spans 2 columns */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-6 text-lg font-bold text-slate-800">Cash Flow Trend (Last 6 Months)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006D77" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#006D77" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E29578" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E29578" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" tickFormatter={(value) => `${value / 1000}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Legend />
                <Area type="monotone" name="Income" dataKey="income" stroke="#006D77" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" name="Outflow" dataKey="outflow" stroke="#E29578" strokeWidth={2} fillOpacity={1} fill="url(#colorOutflow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spending Breakdown (Pie Chart) spans 1 column */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <h2 className="mb-2 text-lg font-bold text-slate-800">Expense Breakdown</h2>
          <div className="flex-1 min-h-[250px] w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No operational expenses recorded.</div>
            )}
          </div>
        </div>
      </div>

      {/* OPERATIONS EXPENSE LEDGER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#006D77]">Operational Expense Ledger</h2>
            <p className="text-sm text-slate-500">Log routine maintenance, food, and overhead.</p>
          </div>
          <button
            onClick={() => { setEditingExpense(null); setIsFormOpen(true); }}
            className={`flex items-center gap-2 rounded-lg bg-[#006D77] px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 ${isGlobal ? 'opacity-0 pointer-events-none' : ''}`}
          >
            <Plus className="size-4" /> Add Row
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-800 border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold">Category</th>
                <th className="p-4 font-bold">Details</th>
                <th className="p-4 font-bold">Amount</th>
                <th className="p-4 font-bold">Date</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">No organizational expenses found in scope.</td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="transition hover:bg-slate-50/50">
                    <td className="p-4 font-semibold text-slate-800">{(exp.category).replace("_", " ")}</td>
                    <td className="p-4 text-slate-500">{exp.description || "-"}</td>
                    <td className="p-4 font-semibold text-rose-700">{formatCurrency(Number(exp.amount))}</td>
                    <td className="p-4 font-medium">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(exp.createdAt))}</td>
                    <td className="p-4 text-right">
                      {!isGlobal && (
                        <div className="flex justify-end gap-3">
                          <button
                            disabled={isPending}
                            onClick={() => { setEditingExpense(exp); setIsFormOpen(true); }}
                            className="text-[#006D77] hover:text-teal-700 disabled:opacity-50"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            disabled={isPending}
                            onClick={() => handleDelete(exp.id)}
                            className="text-rose-500 hover:text-rose-700 disabled:opacity-50"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXPENSE FORM MODAL */}
      {isFormOpen && !isGlobal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">{editingExpense ? "Edit Expense Entry" : "Create Expense Entry"}</h2>
            <form onSubmit={submitForm} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Amount (ETB)</label>
                <input required type="number" step="0.01" name="amount" defaultValue={editingExpense ? Number(editingExpense.amount) : ""} className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-[#006D77] focus:outline-none focus:ring-1 focus:ring-[#006D77]" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Category</label>
                <select required name="category" defaultValue={editingExpense?.category || "UTILITIES"} className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-[#006D77] focus:outline-none focus:ring-1 focus:ring-[#006D77]">
                  <option value="FOOD_PROGRAM">Food Program</option>
                  <option value="UTILITIES">Utilities</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="CONSTRUCTION">Construction</option>
                  <option value="SUPPLIES">Supplies / Operational</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Description (Optional)</label>
                <textarea name="description" rows={3} defaultValue={editingExpense?.description || ""} className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-[#006D77] focus:outline-none focus:ring-1 focus:ring-[#006D77]"></textarea>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" disabled={isPending} onClick={() => setIsFormOpen(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={isPending} className="rounded-lg bg-[#006D77] px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                  {isPending ? "Saving..." : "Commit Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
