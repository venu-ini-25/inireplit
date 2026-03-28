import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie
} from "recharts";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { Target, TrendingUp, MousePointer, BarChart2 } from "lucide-react";
import { useGetMarketingMetrics } from "@workspace/api-client-react";

export default function Marketing() {
  const { data, isLoading } = useGetMarketingMetrics();

  const cacByChannel = data?.cacByChannel ?? [];
  const leadFunnel = data?.leadFunnel ?? [];
  const campaigns = data?.campaigns ?? [];
  const attribution = data?.attribution ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marketing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">CAC by channel, lead funnel, campaign performance, attribution</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total MQLs" value={data ? data.totalMQLs.toLocaleString() : "—"} change={28.0} changeLabel="QoQ" icon={<MousePointer className="w-4 h-4" />} iconBg="bg-blue-50 text-primary" />
        <KpiCard title="Blended CAC" value={data ? `$${data.blendedCAC}` : "—"} change={-12.4} changeLabel="QoQ" isPositiveGood={false} icon={<Target className="w-4 h-4" />} iconBg="bg-green-50 text-success" />
        <KpiCard title="Marketing Pipeline" value={data ? `$${data.marketingPipelineM}M` : "—"} change={41.2} changeLabel="QoQ" icon={<BarChart2 className="w-4 h-4" />} iconBg="bg-purple-50 text-purple-600" />
        <KpiCard title="Avg Campaign ROI" value={data?.avgCampaignROI ?? "—"} change={18.9} changeLabel="QoQ" icon={<TrendingUp className="w-4 h-4" />} iconBg="bg-amber-50 text-amber-600" />
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
            const pct = i === 0 ? 100 : Math.round((stage.value / (leadFunnel[0]?.value ?? 1)) * 100);
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
                    → {Math.round(((leadFunnel[i + 1]?.value ?? 0) / (stage.value || 1)) * 100)}% conv.
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
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {[1,2,3,4,5,6].map(j => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}
                    </tr>
                  ))
                : campaigns.map((c, i) => (
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
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
