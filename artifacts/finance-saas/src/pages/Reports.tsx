import { useState } from "react";
import { FileText, Download, Share2, MoreVertical, Search } from "lucide-react";
import { useGetReports } from "@workspace/api-client-react";
import { FilterBar } from "@/components/ui/FilterBar";
import { ChartCard } from "@/components/ui/ChartCard";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from "recharts";

const benchmarkData = [
  { metric: "Gross Margin", company: 81, peer: 74, top: 85 },
  { metric: "Net Rev Retention", company: 118, peer: 108, top: 125 },
  { metric: "CAC Payback", company: 14, peer: 20, top: 10 },
  { metric: "ARR Growth", company: 94, peer: 60, top: 110 },
  { metric: "Magic Number", company: 1.4, peer: 0.9, top: 1.8 },
  { metric: "Rule of 40", company: 68, peer: 42, top: 82 },
];

const radarData = [
  { subject: "Gross Margin", A: 81, B: 74, fullMark: 100 },
  { subject: "NRR", A: 94, B: 80, fullMark: 100 },
  { subject: "Efficiency", A: 72, B: 55, fullMark: 100 },
  { subject: "Growth", A: 85, B: 60, fullMark: 100 },
  { subject: "Retention", A: 88, B: 70, fullMark: 100 },
  { subject: "Burn Rate", A: 68, B: 52, fullMark: 100 },
];

const CATEGORIES = ["All Reports", "Financial", "Operational", "Portfolio", "M&A"];
const STATUSES = ["All Statuses", "completed", "processing", "draft"];

export default function Reports() {
  const { data: reports, isLoading } = useGetReports();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Reports");
  const [status, setStatus] = useState("All Statuses");

  const filtered = reports?.filter((r) => {
    const matchCat = category === "All Reports" || r.type?.toLowerCase().includes(category.toLowerCase().split(" ")[0]);
    const matchSearch = search === "" || r.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "All Statuses" || r.status === status;
    return matchCat && matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Benchmark analysis, financial reports, and investor exports</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
          Generate Report
        </button>
      </div>

      {/* Benchmark section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Performance vs Peers" subtitle="iNi portfolio vs SaaS peer median (indexed)">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <Radar name="Portfolio" dataKey="A" stroke="#2563EB" fill="#2563EB" fillOpacity={0.25} />
              <Radar name="Peer Median" dataKey="B" stroke="#94A3B8" fill="#94A3B8" fillOpacity={0.15} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-1 bg-primary rounded" />Portfolio</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-1 bg-slate-400 rounded" />Peer Median</div>
          </div>
        </ChartCard>

        <ChartCard title="KPI Benchmarks" subtitle="Portfolio vs peer median vs top quartile">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-slate-100">
                  <th className="text-left py-2 font-medium">Metric</th>
                  <th className="text-right py-2 font-medium text-primary">Portfolio</th>
                  <th className="text-right py-2 font-medium">Peer Median</th>
                  <th className="text-right py-2 font-medium text-success">Top Quartile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {benchmarkData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2.5 text-slate-700">{row.metric}</td>
                    <td className="py-2.5 text-right font-bold text-primary">{row.company}{row.metric.includes("Margin") || row.metric.includes("Growth") || row.metric.includes("Rule") ? "%" : row.metric.includes("Payback") ? "mo" : "x"}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{row.peer}{row.metric.includes("Margin") || row.metric.includes("Growth") || row.metric.includes("Rule") ? "%" : row.metric.includes("Payback") ? "mo" : "x"}</td>
                    <td className="py-2.5 text-right font-medium text-success">{row.top}{row.metric.includes("Margin") || row.metric.includes("Growth") || row.metric.includes("Rule") ? "%" : row.metric.includes("Payback") ? "mo" : "x"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* Report list */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
              placeholder="Search reports..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-md text-sm outline-none transition-all focus:border-primary"
            />
          </div>
          <FilterBar options={CATEGORIES} active={category} onChange={setCategory} />
          <FilterBar options={STATUSES} active={status} onChange={setStatus} />
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-slate-50">
              <th className="px-6 py-4">Report Name</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Date Generated</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><div className="h-5 w-48 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-5 w-20 bg-slate-100 rounded-full animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-5 w-8 bg-slate-100 rounded ml-auto animate-pulse" /></td>
                </tr>
              ))
            ) : filtered?.map((report) => (
              <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-50 text-primary flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{report.title}</p>
                      <p className="text-xs text-muted-foreground">{report.companyId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">{report.type}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    report.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}>{report.status}</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{new Date(report.generatedAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2 text-muted-foreground">
                    <button className="p-1.5 hover:text-primary hover:bg-blue-50 rounded transition-colors" title="Download"><Download className="w-4 h-4" /></button>
                    <button className="p-1.5 hover:text-primary hover:bg-blue-50 rounded transition-colors" title="Share"><Share2 className="w-4 h-4" /></button>
                    <button className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors" title="More"><MoreVertical className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
