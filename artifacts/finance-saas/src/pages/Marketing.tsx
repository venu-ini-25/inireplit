import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  LineChart, Line, PieChart, Pie
} from "recharts";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { Target, TrendingUp, MousePointer, BarChart2 } from "lucide-react";

const cacByChannel = [
  { channel: "Organic / SEO", cac: 420, leads: 340, color: "#22C55E" },
  { channel: "Content / Blog", cac: 580, leads: 210, color: "#2563EB" },
  { channel: "Paid Search", cac: 1240, leads: 480, color: "#EF4444" },
  { channel: "Social Ads", cac: 980, leads: 290, color: "#D97706" },
  { channel: "Webinars", cac: 720, leads: 160, color: "#7C3AED" },
  { channel: "Partner Referral", cac: 380, leads: 120, color: "#0891B2" },
];

const leadFunnel = [
  { stage: "Website Visits", value: 48200 },
  { stage: "MQL", value: 1600 },
  { stage: "SQL", value: 480 },
  { stage: "Opportunity", value: 192 },
  { stage: "Closed Won", value: 64 },
];

const campaigns = [
  { name: "Q4 ABM Campaign", channel: "Email", spend: 12000, leads: 184, pipeline: 820000, roi: "6.8x" },
  { name: "Finance Summit Sponsorship", channel: "Event", spend: 25000, leads: 96, pipeline: 640000, roi: "2.6x" },
  { name: "CFO Playbook Content", channel: "Content", spend: 8000, leads: 210, pipeline: 440000, roi: "5.5x" },
  { name: "Google Ads — FinanceSaaS", channel: "Paid Search", spend: 18000, leads: 380, pipeline: 560000, roi: "3.1x" },
  { name: "LinkedIn Retargeting", channel: "Social", spend: 9000, leads: 142, pipeline: 320000, roi: "3.6x" },
  { name: "Partner Co-Marketing", channel: "Partner", spend: 6000, leads: 88, pipeline: 290000, roi: "4.8x" },
];

const attribution = [
  { name: "Organic / SEO", value: 28, color: "#22C55E" },
  { name: "Paid Search", value: 24, color: "#EF4444" },
  { name: "Content", value: 19, color: "#2563EB" },
  { name: "Social", value: 14, color: "#D97706" },
  { name: "Events", value: 9, color: "#7C3AED" },
  { name: "Partner", value: 6, color: "#0891B2" },
];

export default function Marketing() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marketing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">CAC by channel, lead funnel, campaign performance, attribution</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total MQLs" value="1,600" change={28.0} changeLabel="QoQ" icon={<MousePointer className="w-4 h-4" />} iconBg="bg-blue-50 text-primary" />
        <KpiCard title="Blended CAC" value="$740" change={-12.4} changeLabel="QoQ" isPositiveGood={false} icon={<Target className="w-4 h-4" />} iconBg="bg-green-50 text-success" />
        <KpiCard title="Marketing Pipeline" value="$3.1M" change={41.2} changeLabel="QoQ" icon={<BarChart2 className="w-4 h-4" />} iconBg="bg-purple-50 text-purple-600" />
        <KpiCard title="Avg Campaign ROI" value="4.4x" change={18.9} changeLabel="QoQ" icon={<TrendingUp className="w-4 h-4" />} iconBg="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ChartCard title="CAC by Channel" subtitle="Customer acquisition cost ($)" className="col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cacByChannel} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="channel" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "CAC"]} />
              <Bar dataKey="cac" radius={[4, 4, 0, 0]}>
                {cacByChannel.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pipeline Attribution" subtitle="Closed-won attribution by channel">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={attribution} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                {attribution.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`, ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
            {attribution.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="truncate">{d.name} ({d.value}%)</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Lead Funnel</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Conversion across all funnel stages — Q4 2024</p>
          </div>
        </div>
        <div className="px-6 py-4 flex items-center gap-3">
          {leadFunnel.map((stage, i) => {
            const pct = i === 0 ? 100 : Math.round((stage.value / leadFunnel[0].value) * 100);
            return (
              <div key={i} className="flex-1">
                <div className="text-xs text-muted-foreground mb-1">{stage.stage}</div>
                <div className="h-10 rounded-md flex items-center justify-center font-bold text-sm text-white"
                  style={{ background: `hsl(${220 - i * 30}, 70%, ${50 + i * 3}%)` }}>
                  {stage.value.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1 text-center">{pct}%</div>
                {i < leadFunnel.length - 1 && (
                  <div className="text-xs text-muted-foreground text-center">
                    → {Math.round((leadFunnel[i + 1].value / stage.value) * 100)}% conv.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-slate-800">Campaign Performance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Active campaigns — spend, leads, pipeline, and ROI</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-muted-foreground text-xs">
                <th className="text-left px-6 py-3 font-medium">Campaign</th>
                <th className="text-left px-4 py-3 font-medium">Channel</th>
                <th className="text-right px-4 py-3 font-medium">Spend</th>
                <th className="text-right px-4 py-3 font-medium">Leads</th>
                <th className="text-right px-4 py-3 font-medium">Pipeline</th>
                <th className="text-right px-4 py-3 font-medium">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {campaigns.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-primary">{c.channel}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-mono">${c.spend.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-xs font-mono">{c.leads}</td>
                  <td className="px-4 py-3 text-right text-xs font-mono">${(c.pipeline / 1000).toFixed(0)}K</td>
                  <td className="px-4 py-3 text-right font-semibold text-success text-sm">{c.roi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
