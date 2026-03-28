import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Droplets, Download } from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { FilterBar } from "@/components/ui/FilterBar";
import { useState } from "react";
import { useGetCashFlowMetrics } from "@workspace/api-client-react";

const fmt = (v: number) =>
  v >= 0 ? `$${(v / 1000).toFixed(0)}K` : `-$${(Math.abs(v) / 1000).toFixed(0)}K`;

const PERIODS = ["Monthly", "Quarterly", "Annual"] as const;
type Period = (typeof PERIODS)[number];

export default function FinanceCashFlow() {
  const [period, setPeriod] = useState<Period>("Monthly");
  const { data, isLoading } = useGetCashFlowMetrics({ period });

  const monthly = data?.monthly ?? [];
  const waterfall = data?.waterfall ?? [];
  const breakdown = data?.breakdown ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cash Flow</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Liquidity, runway, and cash movement — FY 2024</p>
        </div>
        <div className="flex items-center gap-3">
          <FilterBar options={[...PERIODS]} active={period} onChange={(v) => setPeriod(v as Period)} />
          <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-md text-sm text-muted-foreground hover:bg-slate-50">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Cash Inflows"
          value={data ? `$${data.totalInflowsM}M` : "—"}
          change={18.3}
          changeLabel="YoY"
          icon={<TrendingUp className="w-4 h-4" />}
          iconBg="bg-blue-50 text-primary"
        />
        <KpiCard
          title="Total Cash Outflows"
          value={data ? `$${data.totalOutflowsM}M` : "—"}
          change={12.6}
          changeLabel="YoY"
          isPositiveGood={false}
          icon={<TrendingDown className="w-4 h-4" />}
          iconBg="bg-red-50 text-destructive"
        />
        <KpiCard
          title="Net Cash Flow"
          value={data ? `$${data.netCashFlowM}M` : "—"}
          change={34.1}
          changeLabel="YoY"
          icon={<DollarSign className="w-4 h-4" />}
          iconBg="bg-green-50 text-success"
        />
        <KpiCard
          title="Cash on Hand"
          value={data ? `$${data.cashOnHandM}M` : "—"}
          subtitle="At current burn rate"
          icon={<Droplets className="w-4 h-4" />}
          iconBg="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Cash Flow Trend" subtitle="Monthly inflows vs outflows ($000s)">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="cfIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cfOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${v / 1000}K`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
              <Area type="monotone" dataKey="inflows" name="Inflows" stroke="#2563EB" strokeWidth={2} fill="url(#cfIn)" />
              <Area type="monotone" dataKey="outflows" name="Outflows" stroke="#EF4444" strokeWidth={2} fill="url(#cfOut)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-0.5 bg-primary rounded" />Inflows</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-0.5 bg-destructive rounded" />Outflows</div>
          </div>
        </ChartCard>

        <ChartCard title="Cash Bridge" subtitle="Operating · Investing · Financing activities ($000s)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={waterfall} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${v / 1000}K`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`$${Math.abs(v).toLocaleString()}`, ""]} />
              <ReferenceLine y={0} stroke="#e2e8f0" />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {waterfall.map((entry, i) => (
                  <Cell key={i} fill={entry.type === "balance" ? "#2563EB" : entry.value >= 0 ? "#22C55E" : "#EF4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            {[["#2563EB","Balance"],["#22C55E","Inflow"],["#EF4444","Outflow"]].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{l}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Cash Flow Statement</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Operating, Investing & Financing activities by quarter</p>
          </div>
          <button className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"><Download className="w-3.5 h-3.5" /> Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-muted-foreground text-xs">
                <th className="text-left px-6 py-3 font-medium">Category</th>
                <th className="text-left px-3 py-3 font-medium">Type</th>
                <th className="text-right px-4 py-3 font-medium">Q1</th>
                <th className="text-right px-4 py-3 font-medium">Q2</th>
                <th className="text-right px-4 py-3 font-medium">Q3</th>
                <th className="text-right px-4 py-3 font-medium">Q4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-3"><div className="h-4 w-40 bg-slate-100 rounded animate-pulse" /></td>
                      <td className="px-3 py-3"><div className="h-4 w-16 bg-slate-100 rounded animate-pulse" /></td>
                      {[0,1,2,3].map(j => <td key={j} className="px-4 py-3"><div className="h-4 w-12 bg-slate-100 rounded animate-pulse ml-auto" /></td>)}
                    </tr>
                  ))
                : breakdown.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-800">{row.category}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.type === "Operating" ? "bg-blue-50 text-primary" :
                          row.type === "Investing" ? "bg-purple-50 text-purple-700" :
                          "bg-amber-50 text-amber-700"
                        }`}>{row.type}</span>
                      </td>
                      {[row.q1, row.q2, row.q3, row.q4].map((v, j) => (
                        <td key={j} className={`px-4 py-3 text-right font-mono text-xs ${v < 0 ? "text-destructive" : "text-success"}`}>
                          {fmt(v)}
                        </td>
                      ))}
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
