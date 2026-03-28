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

const engagements = [
  {
    id: 1, client: "Meridian Capital Partners", type: "M&A Due Diligence", status: "Active",
    value: 85000, start: "Oct 2024", end: "Jan 2025", lead: "Venu Vegi", completion: 62,
    description: "Full financial due diligence for $45M acquisition of SaaS target. Includes QoE, working capital analysis, and synergy modeling.",
    milestones: [
      { name: "Kickoff & Data Room Access", done: true },
      { name: "Management Interviews", done: true },
      { name: "QoE Report — Draft", done: true },
      { name: "Working Capital Analysis", done: false },
      { name: "Synergy Model", done: false },
      { name: "Final Report & Presentation", done: false },
    ],
    contacts: [
      { name: "Alex Rivera", role: "Managing Partner", email: "a.rivera@meridiancap.com" },
      { name: "Sarah Kim", role: "VP Finance", email: "s.kim@meridiancap.com" },
    ],
  },
  {
    id: 2, client: "Apex Ventures", type: "FP&A Implementation", status: "Active",
    value: 62000, start: "Nov 2024", end: "Feb 2025", lead: "Venu Vegi", completion: 38,
    description: "Build driver-based financial model, implement 3-statement model, and train finance team on scenario planning tools.",
    milestones: [
      { name: "Current State Assessment", done: true },
      { name: "Chart of Accounts Cleanup", done: true },
      { name: "3-Statement Model Build", done: false },
      { name: "Driver-Based Budget", done: false },
      { name: "Team Training", done: false },
    ],
    contacts: [
      { name: "James Chen", role: "CFO", email: "j.chen@apexventures.com" },
    ],
  },
  {
    id: 3, client: "Granite Hill Family Office", type: "Portfolio Reporting", status: "Active",
    value: 48000, start: "Sep 2024", end: "Dec 2024", lead: "Venu Vegi", completion: 88,
    description: "Monthly consolidated portfolio reporting package for 12 portfolio companies. KPI dashboards, investor letters.",
    milestones: [
      { name: "Data Collection Framework", done: true },
      { name: "KPI Dashboard Template", done: true },
      { name: "Q3 2024 Report", done: true },
      { name: "Oct 2024 Report", done: true },
      { name: "Nov 2024 Report", done: true },
      { name: "Q4 2024 Final Report", done: false },
    ],
    contacts: [
      { name: "Priya Patel", role: "Director of Investments", email: "p.patel@granitehill.com" },
    ],
  },
  {
    id: 4, client: "ClearPath Capital", type: "Strategic Finance Advisory", status: "Completed",
    value: 120000, start: "Jun 2024", end: "Nov 2024", lead: "Venu Vegi", completion: 100,
    description: "Series B fundraising preparation: financial model, investor narrative, KPI benchmarking, and data room build.",
    milestones: [
      { name: "Current Business Audit", done: true },
      { name: "Financial Model Build", done: true },
      { name: "Investor Narrative", done: true },
      { name: "Data Room Build", done: true },
      { name: "Investor Meeting Support", done: true },
    ],
    contacts: [
      { name: "Marcus Williams", role: "CEO", email: "m.williams@clearpath.com" },
    ],
  },
  {
    id: 5, client: "Strata Ventures", type: "M&A Sell-Side Advisory", status: "Pipeline",
    value: 150000, start: "Jan 2025", end: "Jun 2025", lead: "Venu Vegi", completion: 0,
    description: "Full sell-side process for a growth-stage SaaS company. CIM preparation, buyer outreach, LOI negotiation support.",
    milestones: [],
    contacts: [
      { name: "Lisa Nguyen", role: "Managing Director", email: "l.nguyen@stratavc.com" },
    ],
  },
  {
    id: 6, client: "NovaTech Solutions", type: "Financial Systems Implementation", status: "Pipeline",
    value: 75000, start: "Feb 2025", end: "May 2025", lead: "Venu Vegi", completion: 0,
    description: "ERP selection, implementation oversight, and financial reporting redesign for Series A company.",
    milestones: [],
    contacts: [],
  },
];

const revenueByType = [
  { type: "M&A Advisory", value: 205000, color: "#2563EB" },
  { type: "FP&A / Modeling", value: 142000, color: "#7C3AED" },
  { type: "Portfolio Reporting", value: 118000, color: "#0891B2" },
  { type: "Strategic Advisory", value: 168000, color: "#22C55E" },
  { type: "Systems Impl.", value: 98000, color: "#D97706" },
];

const revenueMonthly = [
  { month: "Jul", rev: 38000 }, { month: "Aug", rev: 44000 }, { month: "Sep", rev: 52000 },
  { month: "Oct", rev: 48000 }, { month: "Nov", rev: 61000 }, { month: "Dec", rev: 72000 },
];

const STATUS_FILTERS = ["All", "Active", "Pipeline", "Completed"];

const statusColor: Record<string, string> = {
  "Active": "bg-green-50 text-success",
  "Pipeline": "bg-blue-50 text-primary",
  "Completed": "bg-slate-100 text-slate-600",
};

export default function ProfessionalServices() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selected, setSelected] = useState<(typeof engagements)[0] | null>(null);

  const filtered = engagements.filter((e) => activeFilter === "All" || e.status === activeFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Professional Services</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Client engagements, advisory projects, and pipeline</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Active Engagements" value="3" subtitle="2 in pipeline" icon={<Briefcase className="w-4 h-4" />} iconBg="bg-blue-50 text-primary" />
        <KpiCard title="YTD Revenue" value="$315K" change={41.3} changeLabel="YoY" icon={<DollarSign className="w-4 h-4" />} iconBg="bg-green-50 text-success" />
        <KpiCard title="Pipeline Value" value="$225K" subtitle="Jan–Jun 2025 projects" icon={<TrendingUp className="w-4 h-4" />} iconBg="bg-purple-50 text-purple-600" />
        <KpiCard title="Avg Engagement Size" value="$90K" change={28.5} changeLabel="YoY" icon={<Clock className="w-4 h-4" />} iconBg="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Revenue by Engagement Type" subtitle="YTD 2024 — $731K total">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueByType} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `$${v / 1000}K`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="type" width={120} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
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
          {filtered.map((eng) => (
            <div
              key={eng.id}
              onClick={() => setSelected(eng)}
              className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                  {eng.client[0]}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{eng.client}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{eng.type} · {eng.start} – {eng.end}</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {eng.completion > 0 && (
                  <div className="text-right hidden md:block">
                    <div className="text-xs text-muted-foreground mb-1">Completion</div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full">
                        <div className="h-1.5 bg-primary rounded-full" style={{ width: `${eng.completion}%` }} />
                      </div>
                      <span className="text-xs font-medium text-slate-700">{eng.completion}%</span>
                    </div>
                  </div>
                )}
                <div className="text-right">
                  <div className="font-semibold text-slate-800">${(eng.value / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-muted-foreground">Contract value</div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[eng.status]}`}>{eng.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <SlideOver
          open={!!selected}
          onClose={() => setSelected(null)}
          title={selected.client}
          subtitle={`${selected.type} · ${selected.start} – ${selected.end}`}
          width="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Contract Value", `$${(selected.value / 1000).toFixed(0)}K`],
                ["Status", selected.status],
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

            {selected.milestones.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-3">Milestones</h4>
                <div className="space-y-2">
                  {selected.milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        m.done ? "border-success bg-success" : "border-slate-300 bg-white"
                      }`}>
                        {m.done && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                      </div>
                      <span className={`text-sm ${m.done ? "text-slate-500 line-through" : "text-slate-800"}`}>{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.contacts.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-3">Client Contacts</h4>
                <div className="space-y-2">
                  {selected.contacts.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                        {c.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-800">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.role} · {c.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SlideOver>
      )}
    </div>
  );
}
