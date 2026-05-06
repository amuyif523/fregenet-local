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

export default function RechartsPie({ chartData }: { chartData: ChartRow[] }) {
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={chartData} dataKey="amount" nameKey="label" innerRadius={68} outerRadius={120} paddingAngle={2} stroke="transparent">
          {chartData.map((entry, index) => (
            <Cell key={entry.key} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Legend align="center" verticalAlign="bottom" />
        <RechartsTooltip formatter={formatTooltipValue} />
      </PieChart>
    </ResponsiveContainer>
  );
}
