import { useState } from "react";
import { useGetDeals } from "@workspace/api-client-react";
import { SlideOver } from "@/components/ui/SlideOver";
import {
  CheckCircle2, Circle, Plus, FileText, TrendingUp, Clock, DollarSign,
  Users, BarChart2, AlertTriangle, Calendar, Download, Upload,
  ChevronRight, Target, Zap, Building2, ArrowUpRight, Layers,
  Search, Filter, MoreVertical, RefreshCw
} from "lucide-react";

type Deal = {
  id: string;
  companyName: string;
  industry: string;
  dealType: "acquisition" | "merger" | "investment" | "divestiture";
  stage: "sourcing" | "nda" | "due_diligence" | "negotiation" | "closing" | "closed" | "passed";
  dealSize: number;
  valuation: number;
  targetRevenue: number;
  assignedTo: string;
  priority: "high" | "medium" | "low";
  createdAt: string;
  updatedAt: string;
  closingDate?: string;
  ndaSigned: boolean;
  dataRoomAccess: boolean;
};

const DD_SECTIONS = [
  {
    category: "Governance & Legal",
    items: [
      "NDA executed",
      "LOI / term sheet agreed",
      "Legal entity structure verified",
      "IP & contracts reviewed",
      "Litigation & contingent liabilities",
    ],
  },
  {
    category: "Financial & Accounting",
    items: [
      "Financial statements (3yr) reviewed",
      "QoE analysis complete",
      "Working capital analysis",
      "Debt & liabilities schedule",
      "Revenue recognition policy reviewed",
      "Tax obligations and filings verified",
    ],
  },
  {
    category: "Commercial & Market",
    items: [
      "Customer concentration analysis",
      "Top 10 customer interviews",
      "Competitive landscape assessment",
      "Market size & growth validation",
      "Product roadmap & IP review",
    ],
  },
  {
    category: "People & Culture",
    items: [
      "Management interviews completed",
      "Org chart & key roles verified",
      "Employee & equity schedule",
      "Retention risk assessment",
      "Culture alignment evaluation",
    ],
  },
  {
    category: "Technology & Operations",
    items: [
      "Technical architecture review",
      "Data room access granted",
      "Security & compliance audit",
      "Infrastructure scalability assessment",
    ],
  },
  {
    category: "Closing & Integration",
    items: [
      "Final DD report drafted",
      "Board approval received",
      "Integration plan v1 complete",
      "Day 1 readiness checklist",
    ],
  },
];

const DD_ITEMS = DD_SECTIONS.flatMap((s) => s.items);

const DEAL_DETAILS: Record<string, {
  overview: string;
  thesis: string;
  ddComplete: number;
  financials: { arr: number; nrr: number; growth: number; ebitda: number };
  timeline: { phase: string; date: string; done: boolean }[];
  contacts: { name: string; role: string; email?: string }[];
  synergies: { type: string; value: string; confidence: string }[];
  docs: { name: string; type: string; date: string; size: string }[];
}> = {
  "Meridian Analytics": {
    overview: "SaaS analytics platform targeting enterprise finance teams. $45M all-cash acquisition. Strong ARR of $7.2M with 112% NRR.",
    thesis: "Cross-sell iNi platform to Meridian's 200+ enterprise customers. Accelerate product roadmap by 12 months with Meridian's analytics IP.",
    ddComplete: 16,
    financials: { arr: 7200000, nrr: 112, growth: 68, ebitda: -420000 },
    timeline: [
      { phase: "Initial Outreach", date: "Jan 10, 2025", done: true },
      { phase: "NDA Signed", date: "Jan 15, 2025", done: true },
      { phase: "Management Presentation", date: "Jan 28, 2025", done: true },
      { phase: "LOI Submitted", date: "Feb 10, 2025", done: true },
      { phase: "Due Diligence", date: "Feb–Mar 2025", done: false },
      { phase: "Final Offer", date: "Apr 2025", done: false },
      { phase: "Signing", date: "May 2025", done: false },
      { phase: "Closing", date: "Jun 2025", done: false },
    ],
    contacts: [
      { name: "Alex Rivera", role: "CEO", email: "alex@meridian.io" },
      { name: "Kim Park", role: "CFO", email: "kim@meridian.io" },
      { name: "Sarah Chen", role: "Lead Partner (iNi)", email: "sarah@inventninvest.com" },
    ],
    synergies: [
      { type: "Revenue Synergy", value: "$2.1M", confidence: "High" },
      { type: "Cost Elimination", value: "$840K", confidence: "Medium" },
      { type: "Customer Cross-sell", value: "$3.4M", confidence: "Medium" },
    ],
    docs: [
      { name: "NDA — Meridian Analytics.pdf", type: "NDA", date: "Jan 15, 2025", size: "180 KB" },
      { name: "LOI — Draft v2.docx", type: "LOI", date: "Feb 10, 2025", size: "240 KB" },
      { name: "Meridian — CIM.pdf", type: "CIM", date: "Feb 20, 2025", size: "4.2 MB" },
      { name: "QoE Report — EY.pdf", type: "QoE", date: "Mar 5, 2025", size: "2.8 MB" },
      { name: "Cap Table — Current.xlsx", type: "Cap Table", date: "Mar 12, 2025", size: "95 KB" },
    ],
  },
  "GreenRoute Logistics": {
    overview: "Supply chain SaaS with $14.8M ARR and dominant position in last-mile optimization. $78M acquisition in negotiation.",
    thesis: "Strategic fit: iNi's portfolio has 3 supply chain companies that would benefit from GreenRoute's integration.",
    ddComplete: 11,
    financials: { arr: 14800000, nrr: 108, growth: 42, ebitda: 1200000 },
    timeline: [
      { phase: "Initial Outreach", date: "Nov 5, 2024", done: true },
      { phase: "NDA Signed", date: "Nov 18, 2024", done: true },
      { phase: "Management Presentation", date: "Dec 10, 2024", done: true },
      { phase: "LOI Submitted", date: "Jan 20, 2025", done: true },
      { phase: "Due Diligence", date: "Feb–Mar 2025", done: true },
      { phase: "Negotiation", date: "Mar 2025", done: false },
      { phase: "Final Offer", date: "Apr 2025", done: false },
      { phase: "Closing", date: "Jun 2025", done: false },
    ],
    contacts: [
      { name: "Priya Nair", role: "Lead Partner (iNi)" },
      { name: "Tom Haines", role: "CEO (GreenRoute)" },
    ],
    synergies: [
      { type: "Revenue Synergy", value: "$4.2M", confidence: "High" },
      { type: "Platform Integration", value: "$1.8M", confidence: "Medium" },
    ],
    docs: [
      { name: "NDA — GreenRoute.pdf", type: "NDA", date: "Nov 18, 2024", size: "175 KB" },
      { name: "LOI — v1.docx", type: "LOI", date: "Jan 20, 2025", size: "220 KB" },
      { name: "GreenRoute — CIM.pdf", type: "CIM", date: "Jan 28, 2025", size: "5.1 MB" },
    ],
  },
  "Orbit DevOps": {
    overview: "Developer tools platform with $4.9M ARR growing 60% YoY. $18M Series B investment. Strong NRR of 128%.",
    thesis: "Investment in high-growth developer tools. Orbit's platform complements iNi's technical portfolio.",
    ddComplete: 22,
    financials: { arr: 4900000, nrr: 128, growth: 60, ebitda: -810000 },
    timeline: [
      { phase: "Initial Outreach", date: "Oct 1, 2024", done: true },
      { phase: "NDA Signed", date: "Oct 14, 2024", done: true },
      { phase: "Term Sheet", date: "Nov 5, 2024", done: true },
      { phase: "Due Diligence", date: "Nov–Dec 2024", done: true },
      { phase: "Legal Docs", date: "Jan 2025", done: true },
      { phase: "Final Closing", date: "Mar 28, 2025", done: false },
    ],
    contacts: [
      { name: "Sarah Chen", role: "Lead Partner (iNi)" },
      { name: "David Kim", role: "CEO (Orbit)" },
    ],
    synergies: [
      { type: "Investment Return", value: "3.5x targeted", confidence: "High" },
    ],
    docs: [
      { name: "Term Sheet — Orbit.pdf", type: "Term Sheet", date: "Nov 5, 2024", size: "310 KB" },
      { name: "Series B Agreement.pdf", type: "Investment", date: "Jan 20, 2025", size: "1.8 MB" },
      { name: "Cap Table — Orbit.xlsx", type: "Cap Table", date: "Feb 1, 2025", size: "88 KB" },
    ],
  },
  default: {
    overview: "Deal overview and details will be added once the engagement is scoped.",
    thesis: "Strategic rationale to be defined.",
    ddComplete: 0,
    financials: { arr: 0, nrr: 0, growth: 0, ebitda: 0 },
    timeline: [],
    contacts: [],
    synergies: [],
    docs: [{ name: "NDA — Executed.pdf", type: "NDA", date: "—", size: "—" }],
  },
};

const PIPELINE_SUMMARY = {
  totalDeals: 5,
  totalValue: 273000000,
  avgDDProgress: 52,
  closingThisQ: 2,
};

export default function MASupport() {
  const { data: deals, isLoading } = useGetDeals();
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "dd" | "timeline" | "financials" | "synergies" | "docs" | "contacts">("overview");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");

  const stages: { id: Deal["stage"]; name: string; dot: string; bg: string }[] = [
    { id: "sourcing", name: "Sourcing", dot: "bg-slate-400", bg: "bg-slate-50" },
    { id: "nda", name: "NDA Signed", dot: "bg-blue-500", bg: "bg-blue-50" },
    { id: "due_diligence", name: "Due Diligence", dot: "bg-amber-500", bg: "bg-amber-50" },
    { id: "negotiation", name: "Negotiation", dot: "bg-purple-500", bg: "bg-purple-50" },
    { id: "closing", name: "Closing", dot: "bg-green-500", bg: "bg-green-50" },
  ];

  const detail = selectedDeal
    ? DEAL_DETAILS[selectedDeal.companyName] ?? DEAL_DETAILS["default"]
    : null;

  const fmt = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v}`;
  };

  const fmtShort = (v: number) => {
    if (v >= 1000000000) return `$${(v / 1000000000).toFixed(1)}B`;
    if (v >= 1000000) return `$${(v / 1000000).toFixed(0)}M`;
    return fmt(v);
  };

  const filteredDeals = (deals || []).filter((d: Deal) =>
    !search || d.companyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">M&A Support</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Deal pipeline, due diligence, advisory workflow, and integration tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add Deal
          </button>
        </div>
      </div>

      {/* Pipeline KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Deals", value: PIPELINE_SUMMARY.totalDeals, icon: Layers, color: "text-primary", bg: "bg-blue-50" },
          { label: "Total Deal Value", value: fmtShort(PIPELINE_SUMMARY.totalValue), icon: DollarSign, color: "text-success", bg: "bg-green-50" },
          { label: "Avg DD Progress", value: `${PIPELINE_SUMMARY.avgDDProgress}%`, icon: BarChart2, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Closing This Q", value: PIPELINE_SUMMARY.closingThisQ, icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
              <div className="text-xl font-black text-slate-800">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* View controls + search */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deals..."
              className="pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:border-primary/50 w-52"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {(["kanban", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                view === v ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {v === "kanban" ? "Pipeline View" : "List View"}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban pipeline */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 420 }}>
          {stages.map((stage) => {
            const stageDeals = filteredDeals.filter((d: Deal) => d.stage === stage.id);
            const stageValue = stageDeals.reduce((sum: number, d: Deal) => sum + d.dealSize, 0);
            return (
              <div key={stage.id} className="w-72 shrink-0 flex flex-col bg-slate-50/70 rounded-2xl border border-border p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                    {stage.name}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">{fmt(stageValue)}</span>
                    <span className="text-xs font-medium text-slate-500 bg-white px-1.5 py-0.5 rounded-full border border-slate-200 shadow-sm">
                      {stageDeals.length}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-0.5">
                  {isLoading ? (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 animate-pulse h-28" />
                  ) : (
                    stageDeals.map((deal: Deal) => {
                      const dealDetail = DEAL_DETAILS[deal.companyName] ?? DEAL_DETAILS["default"];
                      const ddPct = Math.round((dealDetail.ddComplete / DD_ITEMS.length) * 100);
                      return (
                        <div
                          key={deal.id}
                          onClick={() => { setSelectedDeal(deal); setActiveTab("overview"); }}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-sm line-clamp-1">
                              {deal.companyName}
                            </h4>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              deal.priority === "high" ? "bg-red-50 text-red-600" :
                              deal.priority === "medium" ? "bg-amber-50 text-amber-600" :
                              "bg-slate-100 text-slate-500"
                            }`}>{deal.priority}</span>
                          </div>
                          <div className="text-sm font-bold text-primary mb-1">{fmt(deal.dealSize)}</div>
                          <div className="text-[11px] text-muted-foreground mb-3">{deal.industry}</div>
                          {ddPct > 0 && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-slate-400">DD Progress</span>
                                <span className="text-[10px] font-semibold text-slate-600">{ddPct}%</span>
                              </div>
                              <div className="w-full h-1 bg-slate-100 rounded-full">
                                <div className="h-1 bg-primary rounded-full transition-all" style={{ width: `${ddPct}%` }} />
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                              <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">
                                {deal.assignedTo?.charAt(0) ?? "?"}
                              </div>
                              {deal.assignedTo?.split(" ")[0] ?? "—"}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {new Date(deal.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <button className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary py-2 rounded-lg hover:bg-white border border-dashed border-slate-200 hover:border-primary/30 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Add deal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Stage</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Deal Size</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Assigned</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">DD Progress</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Updated</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((deal: Deal, i: number) => {
                const dd = DEAL_DETAILS[deal.companyName] ?? DEAL_DETAILS["default"];
                const ddPct = Math.round((dd.ddComplete / DD_ITEMS.length) * 100);
                const stageInfo = stages.find((s) => s.id === deal.stage);
                return (
                  <tr
                    key={deal.id}
                    onClick={() => { setSelectedDeal(deal); setActiveTab("overview"); }}
                    className={`border-b border-slate-50 hover:bg-blue-50/30 cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}
                  >
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-800">{deal.companyName}</div>
                      <div className="text-xs text-muted-foreground">{deal.industry}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${stageInfo?.dot}`} />
                        <span className="text-xs text-slate-600">{stageInfo?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">{fmt(deal.dealSize)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">
                          {deal.assignedTo?.charAt(0)}
                        </div>
                        <span className="text-xs">{deal.assignedTo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        deal.priority === "high" ? "bg-red-50 text-red-600" :
                        deal.priority === "medium" ? "bg-amber-50 text-amber-600" :
                        "bg-slate-100 text-slate-500"
                      }`}>{deal.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-1.5 bg-primary rounded-full" style={{ width: `${ddPct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{ddPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(deal.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-3 py-3">
                      <button className="p-1 text-muted-foreground hover:text-foreground rounded">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Deal slide-over */}
      {selectedDeal && detail && (
        <SlideOver
          open={!!selectedDeal}
          onClose={() => setSelectedDeal(null)}
          title={selectedDeal.companyName}
          subtitle={`${selectedDeal.dealType?.replace("_", " ") ?? "M&A"} · ${fmt(selectedDeal.dealSize)} · ${stages.find(s => s.id === selectedDeal.stage)?.name}`}
          width="lg"
        >
          {/* Tab nav */}
          <div className="flex gap-1 mb-5 border-b border-border pb-0 -mx-6 px-6 overflow-x-auto">
            {([
              ["overview", "Overview"],
              ["dd", "Due Diligence"],
              ["timeline", "Timeline"],
              ["financials", "Financials"],
              ["synergies", "Synergies"],
              ["docs", "Documents"],
              ["contacts", "Contacts"],
            ] as [typeof activeTab, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all -mb-px ${
                  activeTab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Deal Size", fmt(selectedDeal.dealSize)],
                  ["Priority", selectedDeal.priority?.toUpperCase()],
                  ["Assigned To", selectedDeal.assignedTo?.split(" ")[0]],
                  ["NDA Signed", selectedDeal.ndaSigned ? "Yes" : "No"],
                  ["Data Room", selectedDeal.dataRoomAccess ? "Granted" : "Pending"],
                  ["DD Complete", `${detail.ddComplete}/${DD_ITEMS.length} items`],
                ].map(([k, v]) => (
                  <div key={k} className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{k}</div>
                    <div className="font-semibold text-slate-800 mt-0.5 text-sm">{v}</div>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">Deal Overview</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{detail.overview}</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">Investment Thesis</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{detail.thesis}</p>
              </div>
              {/* DD progress bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-slate-800 text-sm">Due Diligence Progress</h4>
                  <span className="text-xs text-muted-foreground">{detail.ddComplete}/{DD_ITEMS.length}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-primary rounded-full transition-all"
                    style={{ width: `${(detail.ddComplete / DD_ITEMS.length) * 100}%` }}
                  />
                </div>
              </div>
              {/* Recent activity */}
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">Recent Activity</h4>
                <div className="space-y-2">
                  {[
                    { action: "QoE report uploaded", by: "Sarah C.", time: "2h ago" },
                    { action: "DD checklist updated (16/24)", by: "Sarah C.", time: "1d ago" },
                    { action: "LOI signed by target", by: "System", time: "3d ago" },
                  ].map((act, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <span className="font-medium text-slate-700">{act.action}</span>
                        <span className="text-muted-foreground"> · {act.by} · {act.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Due Diligence tab */}
          {activeTab === "dd" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-800">DD Progress</div>
                  <div className="text-xs text-muted-foreground">{detail.ddComplete} of {DD_ITEMS.length} items complete</div>
                </div>
                <div className="text-2xl font-black text-primary">{Math.round((detail.ddComplete / DD_ITEMS.length) * 100)}%</div>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${(detail.ddComplete / DD_ITEMS.length) * 100}%` }} />
              </div>
              {(() => {
                let globalIdx = 0;
                return DD_SECTIONS.map((section) => (
                  <div key={section.category} className="bg-slate-50 rounded-xl p-4">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center justify-between">
                      {section.category}
                      <span className="font-normal text-muted-foreground">
                        {section.items.filter((_, j) => globalIdx + j < detail.ddComplete).length}/{section.items.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {section.items.map((item) => {
                        const done = globalIdx < detail.ddComplete;
                        globalIdx++;
                        return (
                          <div key={item} className="flex items-center gap-2.5">
                            {done ? (
                              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                            <span className={`text-xs ${done ? "text-slate-400 line-through" : "text-slate-700"}`}>{item}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Timeline tab */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">Deal Timeline</h4>
              {detail.timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">No timeline events set yet.</p>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute left-1.5 top-1 bottom-1 w-px bg-slate-200" />
                  {detail.timeline.map((ev, i) => (
                    <div key={i} className="relative mb-5">
                      <div className={`absolute -left-4 w-3.5 h-3.5 rounded-full border-2 ${ev.done ? "bg-primary border-primary" : "bg-white border-slate-300"}`} />
                      <div className={`p-3 rounded-xl border ${ev.done ? "border-primary/20 bg-blue-50" : "border-slate-200 bg-white"}`}>
                        <div className={`text-xs font-bold ${ev.done ? "text-primary" : "text-slate-500"}`}>{ev.phase}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{ev.date}</div>
                        {ev.done && <div className="text-[10px] text-success font-semibold mt-1">✓ Completed</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Financials tab */}
          {activeTab === "financials" && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">Target Financials</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "ARR", value: fmt(detail.financials.arr), icon: TrendingUp, color: "text-primary" },
                  { label: "NRR", value: `${detail.financials.nrr}%`, icon: ArrowUpRight, color: detail.financials.nrr >= 100 ? "text-success" : "text-red-500" },
                  { label: "YoY Growth", value: `${detail.financials.growth}%`, icon: BarChart2, color: "text-success" },
                  { label: "EBITDA", value: fmt(Math.abs(detail.financials.ebitda)), icon: DollarSign, color: detail.financials.ebitda >= 0 ? "text-success" : "text-red-500" },
                ].map((f) => (
                  <div key={f.label} className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <f.icon className={`w-4 h-4 ${f.color}`} />
                      <span className="text-xs text-muted-foreground">{f.label}</span>
                    </div>
                    <div className={`text-xl font-black ${f.color}`}>{f.value}</div>
                    {f.label === "EBITDA" && <div className="text-[10px] text-muted-foreground">{detail.financials.ebitda < 0 ? "Loss" : "Profit"}</div>}
                  </div>
                ))}
              </div>
              <div className="bg-slate-800 rounded-xl p-4 text-white">
                <div className="text-xs text-slate-400 mb-2">Valuation Analysis</div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-black">{fmt(selectedDeal.dealSize)}</div>
                    <div className="text-xs text-slate-400">Deal Size</div>
                  </div>
                  <div>
                    <div className="text-lg font-black">
                      {detail.financials.arr > 0 ? `${(selectedDeal.dealSize / detail.financials.arr).toFixed(1)}x` : "—"}
                    </div>
                    <div className="text-xs text-slate-400">ARR Multiple</div>
                  </div>
                  <div>
                    <div className="text-lg font-black">
                      {selectedDeal.valuation > 0 ? `${(selectedDeal.dealSize / selectedDeal.valuation * 100).toFixed(0)}%` : "—"}
                    </div>
                    <div className="text-xs text-slate-400">Premium</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Synergies tab */}
          {activeTab === "synergies" && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">Synergy Analysis</h4>
              {detail.synergies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No synergies modeled yet.</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {detail.synergies.map((s, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">{s.type}</div>
                          <div className={`text-xs font-semibold mt-0.5 ${s.confidence === "High" ? "text-success" : "text-amber-600"}`}>
                            {s.confidence} confidence
                          </div>
                        </div>
                        <div className="text-lg font-black text-primary">{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="text-xs font-semibold text-primary mb-1">Total Modeled Synergies</div>
                    <div className="text-2xl font-black text-primary">
                      {fmt(detail.synergies.reduce((sum, s) => {
                        const num = parseFloat(s.value.replace(/[$MK,x]/g, ""));
                        if (s.value.includes("M")) return sum + num * 1000000;
                        if (s.value.includes("K")) return sum + num * 1000;
                        return sum;
                      }, 0))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Documents tab */}
          {activeTab === "docs" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">Document Vault</h4>
                <button className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
                  <Upload className="w-3.5 h-3.5" /> Upload
                </button>
              </div>
              <div className="space-y-2">
                {detail.docs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/20 hover:bg-blue-50/30 transition-all group">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{doc.name}</div>
                      <div className="text-xs text-muted-foreground">{doc.type} · {doc.date} · {doc.size}</div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-xs text-primary font-semibold hover:underline">View</button>
                      <button className="text-xs text-muted-foreground hover:text-foreground"><Download className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contacts tab */}
          {activeTab === "contacts" && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">Key Contacts</h4>
              {detail.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts added yet.</p>
              ) : (
                <div className="space-y-2">
                  {detail.contacts.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-sm shrink-0">
                        {c.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800 text-sm">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.role}</div>
                        {c.email && <a href={`mailto:${c.email}`} className="text-xs text-primary hover:underline">{c.email}</a>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SlideOver>
      )}
    </div>
  );
}
