import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { KpiCard } from "@/components/ui/KpiCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageTabs } from "@/components/ui/PageTabs";
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell
} from "recharts";
import { useGetPortfolioCompany } from "@workspace/api-client-react";

function fmtArrValue(v: string | number | undefined | null): string {
  if (v == null) return "—";
  if (typeof v === "string" && v.startsWith("$")) return v;
  const num = typeof v === "string" ? parseFloat(v.replace(/[$,]/g, "")) : v;
  if (isNaN(num)) return String(v);
  return num >= 1_000_000 ? `$${(num / 1_000_000).toFixed(1)}M` : `$${(num / 1000).toFixed(0)}K`;
}

const docTypeColor: Record<string, string> = {
  "Legal": "bg-purple-50 text-purple-700",
  "Financial": "bg-blue-50 text-primary",
  "Presentation": "bg-amber-50 text-amber-700",
  "Other": "bg-slate-100 text-slate-600",
};

const TABS = ["KPIs", "Cap Table", "Documents", "Notes"];

const documents = [
  { name: "Series B Term Sheet", type: "Legal", date: "Sep 15, 2024", size: "2.4 MB" },
  { name: "Audited Financials FY2023", type: "Financial", date: "Mar 1, 2024", size: "8.1 MB" },
  { name: "Board Deck Q3 2024", type: "Presentation", date: "Oct 20, 2024", size: "5.6 MB" },
  { name: "NDA — Executed", type: "Legal", date: "Jan 10, 2024", size: "0.8 MB" },
  { name: "Data Room Index", type: "Other", date: "Nov 1, 2024", size: "0.3 MB" },
];

export default function PortfolioDetail() {
  const [, params] = useRoute("/portfolio/:id");
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("KPIs");

  const id = params?.id ?? "co_001";
  const { data: company, isLoading } = useGetPortfolioCompany(id);

  const arrTrend = company?.arrTrend ?? [];
  const headcountTrend = company?.headcountTrend ?? [];
  const burnTrend = company?.burnTrend ?? [];
  const capTable = company?.capTable ?? [];

  const valuation = company ? `$${(company.valuation / 1000000).toFixed(0)}M` : "—";
  const stageLabel = company?.stage?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "—";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/portfolio")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Portfolio
          </button>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-slate-100 rounded-lg w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[0,1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/portfolio")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portfolio
        </button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white font-bold flex items-center justify-center text-sm">
              {company?.name?.[0] ?? "?"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{company?.name ?? "—"}</h1>
              <p className="text-sm text-muted-foreground">{company?.industry ?? "—"} · {stageLabel} · Founded {company?.founded ?? "—"}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-md text-sm text-muted-foreground hover:bg-slate-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90">
            <ExternalLink className="w-4 h-4" /> Data Room
          </button>
        </div>
      </div>

      <PageTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "KPIs" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="ARR" value={fmtArrValue(company?.arr)} change={company?.arrGrowthPct ?? 0} changeLabel="YoY growth" />
            <KpiCard title="IRR" value={company?.irr ?? "—"} change={3.1} changeLabel="vs target" />
            <KpiCard title="MOIC" value={company?.moic ?? "—"} subtitle="Multiple on invested capital" />
            <KpiCard title="Valuation" value={valuation} subtitle={`Last valued: ${company?.lastValDate ?? "—"}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="ARR Trend" subtitle="Quarterly ARR ($M)">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={arrTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="q" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`$${v}M`, "ARR"]} />
                  <Line type="monotone" dataKey="v" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4, fill: "#2563EB" }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Headcount Growth" subtitle="Employees by quarter">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={headcountTrend} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="q" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [v, "Employees"]} />
                  <Bar dataKey="v" name="Headcount" fill="#7C3AED" radius={[3, 3, 0, 0]}>
                    {headcountTrend.map((_, i) => (
                      <Cell key={i} fill={i === headcountTrend.length - 1 ? "#7C3AED" : "#A78BFA"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Monthly Burn Rate" subtitle="Net cash burn ($M/quarter)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={burnTrend} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="q" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [`$${v}M`, "Burn"]} />
                  <Bar dataKey="v" name="Burn Rate" radius={[3, 3, 0, 0]}>
                    {burnTrend.map((d, i) => (
                      <Cell key={i} fill={d.v > 1.5 ? "#EF4444" : d.v > 1.0 ? "#D97706" : "#22C55E"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-success" />&lt;$1M</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />$1–1.5M</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-sm bg-destructive" />&gt;$1.5M</div>
              </div>
            </ChartCard>

            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Company Overview</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Ownership", company?.ownership ?? "—"],
                  ["Employees", String(company?.employees ?? "—")],
                  ["Stage", stageLabel],
                  ["Industry", company?.industry ?? "—"],
                  ["Founded", String(company?.founded ?? "—")],
                  ["Valuation", valuation],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">{k}</span>
                    <span className="font-semibold text-slate-800">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground mb-2">Co-investors</div>
                <div className="flex flex-wrap gap-2">
                  {(company?.investors ?? []).map((inv) => (
                    <span key={inv} className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-medium">{inv}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "Cap Table" && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">Capitalization Table</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Fully diluted — {company?.name ?? "—"}</p>
            </div>
            <button className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-muted-foreground text-xs">
                <th className="text-left px-6 py-3 font-medium">Holder</th>
                <th className="text-left px-4 py-3 font-medium">Share Class</th>
                <th className="text-right px-4 py-3 font-medium">Shares</th>
                <th className="text-right px-4 py-3 font-medium">Ownership %</th>
                <th className="text-right px-4 py-3 font-medium">Investment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {capTable.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 font-medium text-slate-800">{row.investor}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      row.shareClass === "Common" ? "bg-slate-100 text-slate-600" :
                      row.shareClass?.includes("ESOP") || row.shareClass?.includes("Pool") ? "bg-amber-50 text-amber-700" :
                      "bg-blue-50 text-primary"
                    }`}>{row.shareClass}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{row.shares.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{row.percentage.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {row.investmentAmount > 0 ? `$${(row.investmentAmount / 1000000).toFixed(1)}M` : "—"}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="px-6 py-3 text-slate-800">Total</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right font-mono text-xs text-slate-800">
                  {capTable.reduce((s, r) => s + r.shares, 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-slate-800">100.0%</td>
                <td className="px-4 py-3 text-right text-xs text-slate-800">
                  ${(capTable.reduce((s, r) => s + r.investmentAmount, 0) / 1000000).toFixed(1)}M
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {tab === "Documents" && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">Document Library</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{documents.length} documents — secure data room</p>
            </div>
            <button className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/90">
              + Upload
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {documents.map((doc, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Download className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{doc.name}</div>
                    <div className="text-xs text-muted-foreground">{doc.date} · {doc.size}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${docTypeColor[doc.type] || "bg-slate-100 text-slate-600"}`}>{doc.type}</span>
                  <button className="text-xs text-primary font-medium hover:underline">Download</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Notes" && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Investment Notes</h3>
            <button className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/90">+ Add Note</button>
          </div>
          <div className="space-y-4">
            {[
              { author: "Venu Vegi", date: "Dec 15, 2024", content: "Board meeting: Strong Q3 results. ARR up 94% YoY. Discussed Series C timing for Q2 2025. Team scaling Engineering by 40% next quarter." },
              { author: "Venu Vegi", date: "Oct 22, 2024", content: "Due diligence follow-up: Reviewed updated cap table post-Series B. Verified liquidation preferences. No structural concerns. Recommend maintaining ownership through any secondary offers." },
              { author: "Venu Vegi", date: "Aug 8, 2024", content: "Intro call with new CFO hire. Strong background from Stripe. They're implementing Workday and Looker. Will help standardize reporting for Series C readiness." },
            ].map((n, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">V</div>
                    <span className="text-sm font-medium text-slate-800">{n.author}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{n.date}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
