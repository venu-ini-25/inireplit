import { useState } from "react";
import { Briefcase, DollarSign, Clock, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { SlideOver } from "@/components/ui/SlideOver";
import { FilterBar } from "@/components/ui/FilterBar";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  LineChart, Line
} from "recharts";
import { useGetEngagements, useGetServicesOverview } from "@workspace/api-client-react";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  fpa: "FP&A / Modeling",
  strategic_finance: "Strategic Finance Advisory",
  corp_dev: "M&A / Corp Dev",
  due_diligence: "Due Diligence",
  valuation: "Valuation",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  proposal: "Pipeline",
  on_hold: "On Hold",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-success",
  completed: "bg-slate-100 text-slate-600",
  proposal: "bg-blue-50 text-primary",
  on_hold: "bg-amber-50 text-amber-700",
};

const TYPE_COLORS: Record<string, string> = {
  fpa: "#7C3AED",
  strategic_finance: "#22C55E",
  corp_dev: "#2563EB",
  due_diligence: "#0891B2",
  valuation: "#D97706",
};

const STATUS_FILTERS = ["All", "Active", "Pipeline", "Completed"];

const revenueMonthly = [
  { month: "Jul", rev: 38000 }, { month: "Aug", rev: 44000 }, { month: "Sep", rev: 52000 },
  { month: "Oct", rev: 48000 }, { month: "Nov", rev: 61000 }, { month: "Dec", rev: 72000 },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function ProfessionalServices() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: engagements = [], isLoading } = useGetEngagements();
  const { data: overview } = useGetServicesOverview();

  const filtered = engagements.filter((e) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Active") return e.status === "active";
    if (activeFilter === "Pipeline") return e.status === "proposal";
    if (activeFilter === "Completed") return e.status === "completed";
    return true;
  });

  const selected = engagements.find((e) => e.id === selectedId) ?? null;

  const revenueByType = (overview?.engagementsByType ?? []).map((t) => ({
    type: SERVICE_TYPE_LABELS[t.type] || t.type,
    value: t.revenue,
    color: TYPE_COLORS[t.type] || "#2563EB",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Professional Services</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Client engagements, advisory projects, and pipeline</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Engagements"
          value={overview ? String(overview.activeEngagements) : "—"}
          subtitle={`${engagements.filter(e => e.status === "proposal").length} in pipeline`}
          icon={<Briefcase className="w-4 h-4" />}
          iconBg="bg-blue-50 text-primary"
        />
        <KpiCard
          title="YTD Revenue"
          value={overview ? `$${(overview.totalRevenue / 1000).toFixed(0)}K` : "—"}
          change={overview?.revenueChange ?? 0}
          changeLabel="YoY"
          icon={<DollarSign className="w-4 h-4" />}
          iconBg="bg-green-50 text-success"
        />
        <KpiCard
          title="Pipeline Value"
          value={`$${(engagements.filter(e => e.status === "proposal").reduce((s, e) => s + e.fee, 0) / 1000).toFixed(0)}K`}
          subtitle="Pending projects"
          icon={<TrendingUp className="w-4 h-4" />}
          iconBg="bg-purple-50 text-purple-600"
        />
        <KpiCard
          title="Avg Engagement Size"
          value={overview ? `$${(overview.avgEngagementSize / 1000).toFixed(0)}K` : "—"}
          change={28.5}
          changeLabel="YoY"
          icon={<Clock className="w-4 h-4" />}
          iconBg="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Revenue by Engagement Type" subtitle="YTD — by service category">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueByType} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `$${v / 1000}K`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="type" width={140} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`$${(v / 1000).toFixed(0)}K`, "Revenue"]} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                {revenueByType.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Services Revenue" subtitle="Last 6 months — billed revenue">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueMonthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${v / 1000}K`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`$${(v / 1000).toFixed(0)}K`, "Revenue"]} />
              <Line type="monotone" dataKey="rev" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4, fill: "#2563EB" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Engagements</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} engagements — click for detail</p>
          </div>
          <FilterBar options={STATUS_FILTERS} active={activeFilter} onChange={setActiveFilter} />
        </div>
        <div className="divide-y divide-slate-50">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100" />
                    <div className="space-y-2">
                      <div className="h-4 w-40 bg-slate-100 rounded" />
                      <div className="h-3 w-28 bg-slate-100 rounded" />
                    </div>
                  </div>
                  <div className="h-6 w-20 bg-slate-100 rounded-full" />
                </div>
              ))
            : filtered.map((eng) => {
                const typeLabel = SERVICE_TYPE_LABELS[eng.serviceType] ?? eng.serviceType;
                const statusLabel = STATUS_LABELS[eng.status] ?? eng.status;
                const statusCls = STATUS_COLORS[eng.status] ?? "bg-slate-100 text-slate-600";
                const dateRange = `${fmtDate(eng.startDate)}${eng.endDate ? " – " + fmtDate(eng.endDate) : ""}`;
                return (
                  <div
                    key={eng.id}
                    onClick={() => setSelectedId(eng.id)}
                    className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                        {eng.clientName[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{eng.clientName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{typeLabel} · {dateRange}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {eng.progress > 0 && (
                        <div className="text-right hidden md:block">
                          <div className="text-xs text-muted-foreground mb-1">Completion</div>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full">
                              <div className="h-1.5 bg-primary rounded-full" style={{ width: `${eng.progress}%` }} />
                            </div>
                            <span className="text-xs font-medium text-slate-700">{eng.progress}%</span>
                          </div>
                        </div>
                      )}
                      <div className="text-right">
                        <div className="font-semibold text-slate-800">${(eng.fee / 1000).toFixed(0)}K</div>
                        <div className="text-xs text-muted-foreground">Contract value</div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCls}`}>{statusLabel}</span>
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>

      {selected && (
        <SlideOver
          open={!!selected}
          onClose={() => setSelectedId(null)}
          title={selected.clientName}
          subtitle={`${SERVICE_TYPE_LABELS[selected.serviceType] ?? selected.serviceType} · ${fmtDate(selected.startDate)}${selected.endDate ? " – " + fmtDate(selected.endDate) : ""}`}
          width="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Contract Value", `$${(selected.fee / 1000).toFixed(0)}K`],
                ["Status", STATUS_LABELS[selected.status] ?? selected.status],
                ["Lead", selected.lead],
              ].map(([k, v]) => (
                <div key={k} className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="font-semibold text-slate-800 mt-0.5">{v}</div>
                </div>
              ))}
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Scope of Work</h4>
              <p className="text-sm text-slate-700 leading-relaxed">{selected.description}</p>
            </div>

            {selected.progress > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-3">Progress</h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full">
                    <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${selected.progress}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{selected.progress}%</span>
                </div>
              </div>
            )}
          </div>
        </SlideOver>
      )}
    </div>
  );
}
