import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { Users, Flame, Clock, TrendingDown } from "lucide-react";

const headcountTrend = [
  { month: "Jan", hc: 48 }, { month: "Feb", hc: 52 }, { month: "Mar", hc: 55 },
  { month: "Apr", hc: 58 }, { month: "May", hc: 62 }, { month: "Jun", hc: 67 },
  { month: "Jul", hc: 71 }, { month: "Aug", hc: 74 }, { month: "Sep", hc: 78 },
  { month: "Oct", hc: 82 }, { month: "Nov", hc: 85 }, { month: "Dec", hc: 89 },
];

const burnRunway = [
  { month: "Jan", burn: 2.1, runway: 22 }, { month: "Feb", burn: 2.3, runway: 20 },
  { month: "Mar", burn: 2.4, runway: 19 }, { month: "Apr", burn: 2.6, runway: 18 },
  { month: "May", burn: 2.7, runway: 18 }, { month: "Jun", burn: 2.9, runway: 17 },
  { month: "Jul", burn: 3.0, runway: 17 }, { month: "Aug", burn: 3.1, runway: 16 },
  { month: "Sep", burn: 3.2, runway: 16 }, { month: "Oct", burn: 3.3, runway: 15 },
  { month: "Nov", burn: 3.4, runway: 15 }, { month: "Dec", burn: 3.5, runway: 14 },
];

const unitEcon = [
  { metric: "Revenue per Employee", value: "$287K", prev: "$264K", delta: 8.7, good: true },
  { metric: "Gross Margin", value: "81.4%", prev: "78.2%", delta: 3.2, good: true },
  { metric: "CAC Payback Period", value: "14 months", prev: "18 months", delta: -22.2, good: true },
  { metric: "ARR per Sales Rep", value: "$1.4M", prev: "$1.1M", delta: 27.3, good: true },
  { metric: "Support Tickets / Employee", value: "4.2", prev: "5.1", delta: -17.6, good: true },
  { metric: "G&A as % of Revenue", value: "11.2%", prev: "13.8%", delta: -18.8, good: true },
  { metric: "Net Revenue Retention", value: "118%", prev: "112%", delta: 5.4, good: true },
  { metric: "Magic Number", value: "1.4x", prev: "1.1x", delta: 27.3, good: true },
];

export default function Operations() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Operations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Headcount, burn rate, runway, and unit economics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Headcount" value="89" change={21.9} changeLabel="YoY" icon={<Users className="w-4 h-4" />} iconBg="bg-blue-50 text-primary" />
        <KpiCard title="Monthly Burn" value="$3.5M" change={66.7} changeLabel="YoY" isPositiveGood={false} icon={<Flame className="w-4 h-4" />} iconBg="bg-red-50 text-destructive" />
        <KpiCard title="Cash Runway" value="14 months" subtitle="At current burn" icon={<Clock className="w-4 h-4" />} iconBg="bg-amber-50 text-amber-600" />
        <KpiCard title="Gross Margin" value="81.4%" change={3.2} changeLabel="YoY" icon={<TrendingDown className="w-4 h-4" />} iconBg="bg-green-50 text-success" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Headcount Growth" subtitle="Monthly employee count — FY 2024">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={headcountTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[40, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="hc" name="Headcount" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3, fill: "#2563EB" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Burn Rate & Runway" subtitle="Monthly burn ($M) vs runway (months)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={burnRunway}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="burn" orientation="left" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}M`} />
              <YAxis yAxisId="rwy" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}mo`} />
              <Tooltip />
              <Bar yAxisId="burn" dataKey="burn" name="Burn ($M)" fill="#EF4444" radius={[3, 3, 0, 0]} barSize={14} opacity={0.8} />
              <Bar yAxisId="rwy" dataKey="runway" name="Runway (mo)" fill="#2563EB" radius={[3, 3, 0, 0]} barSize={14} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-slate-800">Unit Economics Dashboard</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Key operational efficiency metrics — Q4 2024 vs Q4 2023</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-muted-foreground text-xs">
                <th className="text-left px-6 py-3 font-medium">Metric</th>
                <th className="text-right px-4 py-3 font-medium">Current</th>
                <th className="text-right px-4 py-3 font-medium">Prior Year</th>
                <th className="text-right px-4 py-3 font-medium">YoY Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {unitEcon.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-800">{row.metric}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{row.value}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{row.prev}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium text-xs ${row.delta > 0 && row.good ? "text-success" : row.delta < 0 && row.good ? "text-success" : "text-destructive"}`}>
                      {row.delta > 0 ? "+" : ""}{row.delta}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
