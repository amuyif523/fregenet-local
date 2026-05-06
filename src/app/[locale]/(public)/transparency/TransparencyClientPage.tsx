"use client";

import dynamic from "next/dynamic";

type ChartRow = {
  key: string;
  label: string;
  amount: number;
  percent: number;
  perBirr: number;
};

const RechartsPie = dynamic(() => import("@/components/visual/RechartsPie"), { ssr: false });

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Total Donations</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(totalIncome)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Total Impact Spending</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(totalImpactSpending)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Utilization Ratio</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{(utilizationRatio * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-lg font-bold text-slate-900">Impact Allocation</h3>
        <div style={{ width: "100%", height: 320 }}>
          <RechartsPie chartData={chartData} />
        </div>
      </div>
    </div>
  );
}
