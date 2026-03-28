import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell
} from "recharts";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { Users, Star, TrendingDown, Activity } from "lucide-react";
import { useGetProductMetrics } from "@workspace/api-client-react";

const cohorts = [
  { cohort: "Jan '24", m0: "100%", m1: "88%", m2: "79%", m3: "74%", m6: "68%", m12: "61%" },
  { cohort: "Apr '24", m0: "100%", m1: "90%", m2: "82%", m3: "76%", m6: "71%", m12: "—" },
  { cohort: "Jul '24", m0: "100%", m1: "91%", m2: "84%", m3: "79%", m6: "—", m12: "—" },
  { cohort: "Oct '24", m0: "100%", m1: "93%", m2: "86%", m3: "—", m6: "—", m12: "—" },
];

const colorByPct = (v: string) => {
  if (v === "—") return "text-slate-300";
  const n = parseFloat(v);
  if (n >= 85) return "text-success font-semibold";
  if (n >= 70) return "text-primary";
  if (n >= 60) return "text-amber-600";
  return "text-destructive";
};

export default function Product() {
  const { data, isLoading } = useGetProductMetrics();

  const engagementTrend = data?.engagementTrend ?? [];
  const featureAdoption = data?.featureAdoption ?? [];
  const churnWaterfall = data?.churnWaterfall ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Product</h1>
        <p className="text-sm text-muted-foreground mt-0.5">DAU/MAU, feature adoption, NPS, retention cohorts</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="DAU" value={data ? data.dauCount.toLocaleString() : "—"} change={133} changeLabel="YoY" icon={<Users className="w-4 h-4" />} iconBg="bg-blue-50 text-primary" />
        <KpiCard title="MAU" value={data ? data.mauCount.toLocaleString() : "—"} change={81.5} changeLabel="YoY" icon={<Activity className="w-4 h-4" />} iconBg="bg-purple-50 text-purple-600" />
        <KpiCard title="NPS Score" value="62" change={14.8} changeLabel="vs last quarter" icon={<Star className="w-4 h-4" />} iconBg="bg-green-50 text-success" />
        <KpiCard title="Logo Churn" value={data ? `${data.churnRatePct}%` : "—"} change={-1.8} changeLabel="YoY" isPositiveGood={false} icon={<TrendingDown className="w-4 h-4" />} iconBg="bg-red-50 text-destructive" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="DAU / MAU Trend" subtitle="Daily and monthly active users — 2024">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={engagementTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => [v.toLocaleString(), ""]} />
              <Line type="monotone" dataKey="dau" name="DAU" stroke="#2563EB" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="mau" name="MAU" stroke="#7C3AED" strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-0.5 bg-primary rounded" />DAU</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-0.5 bg-purple-600 rounded" />MAU</div>
          </div>
        </ChartCard>

        <ChartCard title="Feature Adoption Rate" subtitle="% of active users using each feature">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={featureAdoption} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="feature" width={140} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Adoption"]} />
              <Bar dataKey="adoption" radius={[0, 3, 3, 0]}>
                {featureAdoption.map((d, i) => (
                  <Cell key={i} fill={d.adoption >= 70 ? "#22C55E" : d.adoption >= 50 ? "#2563EB" : "#94A3B8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Customer Waterfall" subtitle="Net customer movement — MoM Dec 2024 → Jan 2025">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={churnWaterfall} barSize={48}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[290, 360]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: number) => [Math.abs(v), ""]} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {churnWaterfall.map((d, i) => (
                <Cell key={i} fill={d.type === "base" ? "#2563EB" : d.type === "pos" ? "#22C55E" : "#EF4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-primary" />Base</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-success" />Growth</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-destructive" />Churn/Contraction</div>
        </div>
      </ChartCard>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-slate-800">Cohort Retention Analysis</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Percentage of customers still active at each time milestone</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-muted-foreground text-xs">
                {["Cohort", "Month 0", "Month 1", "Month 2", "Month 3", "Month 6", "Month 12"].map((h) => (
                  <th key={h} className="text-center px-5 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cohorts.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 text-center font-medium text-slate-800">{row.cohort}</td>
                  {[row.m0, row.m1, row.m2, row.m3, row.m6, row.m12].map((v, j) => (
                    <td key={j} className={`px-5 py-3 text-center text-sm ${colorByPct(v)}`}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
