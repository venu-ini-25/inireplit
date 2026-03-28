import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  LineChart, Line, ReferenceLine
} from "recharts";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { TrendingUp, DollarSign, Target, Users } from "lucide-react";

const arrBridge = [
  { name: "Open ARR", value: 8200, type: "base" },
  { name: "New Logos", value: 1840, type: "pos" },
  { name: "Expansion", value: 920, type: "pos" },
  { name: "Contraction", value: -380, type: "neg" },
  { name: "Churn", value: -480, type: "neg" },
  { name: "Close ARR", value: 10100, type: "base" },
];

const pipeline = [
  { stage: "Prospecting", count: 124, value: 4800 },
  { stage: "Qualified", count: 68, value: 3200 },
  { stage: "Demo/Eval", count: 41, value: 2400 },
  { stage: "Proposal", count: 22, value: 1800 },
  { stage: "Negotiation", count: 11, value: 1200 },
  { stage: "Closed Won", count: 8, value: 960 },
];

const bookings = [
  { month: "Jan", quota: 600, actual: 520 },
  { month: "Feb", quota: 650, actual: 640 },
  { month: "Mar", quota: 700, actual: 760 },
  { month: "Apr", quota: 750, actual: 710 },
  { month: "May", quota: 800, actual: 840 },
  { month: "Jun", quota: 850, actual: 900 },
  { month: "Jul", quota: 900, actual: 870 },
  { month: "Aug", quota: 950, actual: 980 },
  { month: "Sep", quota: 1000, actual: 1080 },
  { month: "Oct", quota: 1050, actual: 1020 },
  { month: "Nov", quota: 1100, actual: 1180 },
  { month: "Dec", quota: 1150, actual: 1240 },
];

const deals = [
  { company: "Meridian Analytics", stage: "Negotiation", arr: "$280K", owner: "J. Park", close: "Dec 31", score: 82 },
  { company: "Apex Capital Partners", stage: "Proposal", arr: "$420K", owner: "S. Chen", close: "Jan 15", score: 74 },
  { company: "NovaTech Solutions", stage: "Demo/Eval", arr: "$190K", owner: "R. Patel", close: "Jan 30", score: 61 },
  { company: "Granite Hill Family Office", stage: "Qualified", arr: "$560K", owner: "J. Park", close: "Feb 10", score: 58 },
  { company: "Strata Ventures", stage: "Proposal", arr: "$240K", owner: "M. Liu", close: "Jan 20", score: 77 },
  { company: "ClearPath Capital", stage: "Negotiation", arr: "$380K", owner: "S. Chen", close: "Dec 28", score: 88 },
];

const stageColor: Record<string, string> = {
  "Prospecting": "bg-slate-100 text-slate-600",
  "Qualified": "bg-blue-50 text-primary",
  "Demo/Eval": "bg-purple-50 text-purple-700",
  "Proposal": "bg-amber-50 text-amber-700",
  "Negotiation": "bg-orange-50 text-orange-700",
  "Closed Won": "bg-green-50 text-success",
};

export default function Sales() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sales</h1>
        <p className="text-sm text-muted-foreground mt-0.5">ARR bridge, pipeline, bookings vs quota, deal summary</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="ARR (Close)" value="$10.1M" change={23.2} changeLabel="vs Open ARR" icon={<TrendingUp className="w-4 h-4" />} iconBg="bg-blue-50 text-primary" />
        <KpiCard title="Total Pipeline" value="$14.4M" change={31.5} changeLabel="QoQ" icon={<DollarSign className="w-4 h-4" />} iconBg="bg-green-50 text-success" />
        <KpiCard title="Quota Attainment" value="108%" change={8.0} changeLabel="vs quota" icon={<Target className="w-4 h-4" />} iconBg="bg-amber-50 text-amber-600" />
        <KpiCard title="Active Reps" value="7" subtitle="Avg $1.44M ARR/rep" icon={<Users className="w-4 h-4" />} iconBg="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="ARR Bridge" subtitle="Period movement ($000s)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={arrBridge} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}M`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <ReferenceLine y={0} stroke="#e2e8f0" />
              <Tooltip formatter={(v: number) => [`$${Math.abs(v).toLocaleString()}K`, ""]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {arrBridge.map((d, i) => <Cell key={i} fill={d.type === "base" ? "#2563EB" : d.value >= 0 ? "#22C55E" : "#EF4444"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Bookings vs Quota" subtitle="Monthly ($000s) — FY 2024">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bookings} barGap={2} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${v}K`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}K`, ""]} />
              <Bar dataKey="quota" name="Quota" fill="#E2E8F0" radius={[3, 3, 0, 0]} />
              <Bar dataKey="actual" name="Actual" radius={[3, 3, 0, 0]}>
                {bookings.map((d, i) => <Cell key={i} fill={d.actual >= d.quota ? "#22C55E" : "#EF4444"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-slate-200" />Quota</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-success" />Attained</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-destructive" />Below Quota</div>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-slate-800">Pipeline by Stage</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Deals and value across funnel</p>
          </div>
          <div className="divide-y divide-slate-50">
            {pipeline.map((s, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50">
                <div>
                  <div className="text-sm font-medium text-slate-800">{s.stage}</div>
                  <div className="text-xs text-muted-foreground">{s.count} deals</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-800">${s.value.toLocaleString()}K</div>
                  <div className="w-24 h-1.5 bg-slate-100 rounded mt-1">
                    <div className="h-1.5 bg-primary rounded" style={{ width: `${(s.value / 4800) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-3 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-slate-800">Deal Summary</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Active opportunities — top 6 by close probability</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-muted-foreground text-xs">
                  <th className="text-left px-5 py-3 font-medium">Company</th>
                  <th className="text-left px-3 py-3 font-medium">Stage</th>
                  <th className="text-right px-3 py-3 font-medium">ARR</th>
                  <th className="text-left px-3 py-3 font-medium">Owner</th>
                  <th className="text-left px-3 py-3 font-medium">Close</th>
                  <th className="text-right px-3 py-3 font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {deals.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-800 text-xs">{d.company}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColor[d.stage] || "bg-slate-100 text-slate-600"}`}>{d.stage}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-slate-800">{d.arr}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{d.owner}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{d.close}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={`font-bold text-sm ${d.score >= 80 ? "text-success" : d.score >= 65 ? "text-primary" : "text-amber-600"}`}>{d.score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
