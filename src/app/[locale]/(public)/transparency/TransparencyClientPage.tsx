"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";

type ChartRow = {
  key: string;
  label: string;
  amount: number;
  percent: number;
  perBirr: number;
};

const COLORS = ["#006D77", "#83C5BE", "#E29578", "#FFDDD2", "#3A7D44"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", maximumFractionDigits: 2 }).format(value);
}

function formatTooltipValue(value: number | string | ReadonlyArray<string | number> | undefined) {
  const normalized = Array.isArray(value) ? value[0] : value;
  return formatCurrency(Number(normalized ?? 0));
}

export default function TransparencyClientPage({
  totalIncome,
  totalImpactSpending,
  utilizationRatio,
  chartData
}: {
  totalIncome: number;
  totalImpactSpending: number;
  utilizationRatio: number;
  chartData: ChartRow[];
}) {
  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#006D77]">Public Transparency</p>
        <h1 className="mt-2 text-4xl font-black text-slate-900">How Every 1 ETB Is Used</h1>
        <p className="mt-3 max-w-3xl text-slate-600">Live impact allocation across payroll and operational spending categories.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Total Income</p>
          <p className="mt-2 text-2xl font-black text-teal-900">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Impact Spending</p>
          <p className="mt-2 text-2xl font-black text-rose-900">{formatCurrency(totalImpactSpending)}</p>
        </div>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Utilization Ratio</p>
          <p className="mt-2 text-2xl font-black text-indigo-900">{(utilizationRatio * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Spending Distribution</h2>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="amount" nameKey="label" cx="50%" cy="50%" innerRadius={80} outerRadius={125} paddingAngle={2}>
                  {chartData.map((entry, index) => (
                    <Cell key={entry.key} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={formatTooltipValue} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Per 1 ETB Breakdown</h2>
          <div className="space-y-3">
            {chartData.map((row) => (
              <div key={row.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-800">{row.label}</p>
                <p className="mt-1 text-xs text-slate-600">{row.percent.toFixed(1)}% of total impact spending</p>
                <p className="mt-1 text-sm font-bold text-[#006D77]">{row.perBirr.toFixed(2)} ETB of every 1 ETB</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
