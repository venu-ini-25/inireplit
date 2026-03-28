import { useState } from "react";
import { useGetDeals, useGetDeal, useGetDealPipelineSummary } from "@workspace/api-client-react";
import { SlideOver } from "@/components/ui/SlideOver";
import {
  CheckCircle2, Circle, Plus, FileText, TrendingUp, Clock, DollarSign,
  Users, BarChart2, AlertTriangle, Calendar, Download, Upload,
  ChevronRight, Target, Zap, Building2, ArrowUpRight, Layers,
  Search, Filter, MoreVertical,
} from "lucide-react";

type Deal = {
  id: string;
  companyName: string;
  industry: string;
  dealType: string;
  stage: string;
  dealSize: number;
  valuation: number;
  targetRevenue: number;
  assignedTo: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  closingDate?: string;
  ndaSigned: boolean;
  dataRoomAccess: boolean;
};

const STAGES: { id: string; name: string; dot: string }[] = [
  { id: "sourcing", name: "Sourcing", dot: "bg-slate-400" },
  { id: "nda", name: "NDA Signed", dot: "bg-blue-500" },
  { id: "due_diligence", name: "Due Diligence", dot: "bg-amber-500" },
  { id: "negotiation", name: "Negotiation", dot: "bg-purple-500" },
  { id: "closing", name: "Closing", dot: "bg-green-500" },
];

export default function MASupport() {
  const { data: deals = [], isLoading } = useGetDeals();
  const { data: pipeline } = useGetDealPipelineSummary();
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "dd" | "timeline" | "financials" | "synergies" | "docs" | "contacts">("overview");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");

  const { data: dealDetail } = useGetDeal(selectedDealId ?? "deal_001", {
    query: { enabled: !!selectedDealId },
  });

  const selectedDeal = selectedDealId ? (deals as Deal[]).find((d) => d.id === selectedDealId) ?? null : null;

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

  const filteredDeals = (deals as Deal[]).filter(
    (d) => !search || d.companyName.toLowerCase().includes(search.toLowerCase())
  );

  const activePipelineValue = pipeline?.byStage
    ? pipeline.byStage
        .filter((s) => !["passed", "closed"].includes(s.stage))
        .reduce((sum, s) => sum + s.value, 0)
    : 0;

  const activeDeals = (deals as Deal[]).filter((d) => !["passed", "closed"].includes(d.stage));
  const closingThisQ = (deals as Deal[]).filter((d) => ["closing", "closed"].includes(d.stage)).length;
  const avgDDPct =
    dealDetail && activeDeals.length > 0
      ? Math.round(
          activeDeals.reduce((sum, d) => {
            const total = dealDetail?.dueDiligenceItems?.length ?? 24;
            const done = dealDetail?.dueDiligenceItems?.filter((i: {status: string}) => i.status === "completed").length ?? 0;
            return sum + Math.round((done / total) * 100);
          }, 0) / activeDeals.length
        )
      : 52;

  const getDDProgress = (dealId: string) => {
    if (dealDetail && selectedDealId === dealId) {
      const total = dealDetail.dueDiligenceItems.length;
      const done = dealDetail.dueDiligenceItems.filter((i: {status: string}) => i.status === "completed").length;
      return { done, total, pct: Math.round((done / total) * 100) };
    }
    return { done: 0, total: 24, pct: 0 };
  };

  const handleSelectDeal = (deal: Deal) => {
    setSelectedDealId(deal.id);
    setActiveTab("overview");
  };

  const stageInfo = (id: string) => STAGES.find((s) => s.id === id);

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
          { label: "Active Deals", value: activeDeals.length || pipeline?.totalDeals || 5, icon: Layers, color: "text-primary", bg: "bg-blue-50" },
          { label: "Total Deal Value", value: fmtShort(activePipelineValue || pipeline?.totalValue || 273000000), icon: DollarSign, color: "text-success", bg: "bg-green-50" },
          { label: "Avg DD Progress", value: `${avgDDPct}%`, icon: BarChart2, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Closing This Q", value: closingThisQ || 2, icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
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

      {/* Controls */}
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

      {/* Kanban */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 420 }}>
          {STAGES.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stage === stage.id);
            const stageValue = stageDeals.reduce((sum, d) => sum + d.dealSize, 0);
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
                <div className="flex flex-col gap-3 overflow-y-auto flex-1">
                  {isLoading ? (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 animate-pulse h-28" />
                  ) : (
                    stageDeals.map((deal) => {
                      const isSelected = selectedDealId === deal.id;
                      const ddProg = isSelected ? getDDProgress(deal.id) : null;
                      return (
                        <div
                          key={deal.id}
                          onClick={() => handleSelectDeal(deal)}
                          className={`bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                            isSelected ? "border-primary/40 ring-1 ring-primary/20" : "border-slate-200 hover:border-primary/30"
                          }`}
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
                          {ddProg && ddProg.pct > 0 && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-slate-400">DD Progress</span>
                                <span className="text-[10px] font-semibold text-slate-600">{ddProg.pct}%</span>
                              </div>
                              <div className="w-full h-1 bg-slate-100 rounded-full">
                                <div className="h-1 bg-primary rounded-full transition-all" style={{ width: `${ddProg.pct}%` }} />
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Updated</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((deal, i) => {
                const info = stageInfo(deal.stage);
                return (
                  <tr
                    key={deal.id}
                    onClick={() => handleSelectDeal(deal)}
                    className={`border-b border-slate-50 hover:bg-blue-50/30 cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}
                  >
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-800">{deal.companyName}</div>
                      <div className="text-xs text-muted-foreground">{deal.industry}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${info?.dot ?? "bg-slate-300"}`} />
                        <span className="text-xs text-slate-600">{info?.name ?? deal.stage}</span>
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

      {/* Deal slide-over — driven by useGetDeal API */}
      {selectedDeal && (
        <SlideOver
          open={!!selectedDeal}
          onClose={() => setSelectedDealId(null)}
          title={selectedDeal.companyName}
          subtitle={`${selectedDeal.dealType?.replace("_", " ") ?? "M&A"} · ${fmt(selectedDeal.dealSize)} · ${stageInfo(selectedDeal.stage)?.name ?? selectedDeal.stage}`}
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

          {!dealDetail ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Overview */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ["Deal Size", fmt(selectedDeal.dealSize)],
                      ["Priority", selectedDeal.priority?.toUpperCase()],
                      ["Assigned To", selectedDeal.assignedTo?.split(" ")[0]],
                      ["NDA Signed", selectedDeal.ndaSigned ? "Yes" : "No"],
                      ["Data Room", selectedDeal.dataRoomAccess ? "Granted" : "Pending"],
                      ["DD Complete", `${dealDetail.dueDiligenceItems.filter((i: {status: string}) => i.status === "completed").length}/${dealDetail.dueDiligenceItems.length} items`],
                    ].map(([k, v]) => (
                      <div key={k} className="p-3 bg-slate-50 rounded-xl">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{k}</div>
                        <div className="font-semibold text-slate-800 mt-0.5 text-sm">{v}</div>
                      </div>
                    ))}
                  </div>
                  {dealDetail.overview && (
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm mb-2">Deal Overview</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{dealDetail.overview}</p>
                    </div>
                  )}
                  {dealDetail.thesis && (
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm mb-2">Investment Thesis</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{dealDetail.thesis}</p>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="font-bold text-slate-800 text-sm">Due Diligence Progress</h4>
                      <span className="text-xs text-muted-foreground">
                        {dealDetail.dueDiligenceItems.filter((i: {status: string}) => i.status === "completed").length}/{dealDetail.dueDiligenceItems.length}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-primary rounded-full transition-all"
                        style={{
                          width: `${(dealDetail.dueDiligenceItems.filter((i: {status: string}) => i.status === "completed").length / dealDetail.dueDiligenceItems.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-2">Recent Timeline</h4>
                    <div className="space-y-2">
                      {dealDetail.timeline.slice(-3).reverse().map((ev: {event: string; description: string; date: string}, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div>
                            <span className="font-medium text-slate-700">{ev.event}</span>
                            <span className="text-muted-foreground"> · {new Date(ev.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Due Diligence */}
              {activeTab === "dd" && (
                <div className="space-y-4">
                  {(() => {
                    const total = dealDetail.dueDiligenceItems.length;
                    const done = dealDetail.dueDiligenceItems.filter((i: {status: string}) => i.status === "completed").length;
                    const pct = Math.round((done / total) * 100);
                    const byCategory = dealDetail.dueDiligenceItems.reduce((acc: Record<string, typeof dealDetail.dueDiligenceItems>, item: {category: string; item: string; status: string; assignedTo: string; dueDate: string}) => {
                      if (!acc[item.category]) acc[item.category] = [];
                      acc[item.category].push(item);
                      return acc;
                    }, {} as Record<string, typeof dealDetail.dueDiligenceItems>);
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-slate-800">DD Progress</div>
                            <div className="text-xs text-muted-foreground">{done} of {total} items complete</div>
                          </div>
                          <div className="text-2xl font-black text-primary">{pct}%</div>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        {Object.entries(byCategory).map(([category, items]) => {
                          const catDone = (items as {status: string}[]).filter((i) => i.status === "completed").length;
                          return (
                            <div key={category} className="bg-slate-50 rounded-xl p-4">
                              <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center justify-between">
                                {category}
                                <span className="font-normal text-muted-foreground">{catDone}/{(items as unknown[]).length}</span>
                              </div>
                              <div className="space-y-2">
                                {(items as {item: string; status: string}[]).map((ddItem, idx) => (
                                  <div key={idx} className="flex items-center gap-2.5">
                                    {ddItem.status === "completed" ? (
                                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                                    ) : ddItem.status === "flagged" ? (
                                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                    ) : ddItem.status === "in_progress" ? (
                                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                                    )}
                                    <span className={`text-xs ${ddItem.status === "completed" ? "text-slate-400 line-through" : "text-slate-700"}`}>
                                      {ddItem.item}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Timeline */}
              {activeTab === "timeline" && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-sm">Deal Timeline</h4>
                  {dealDetail.timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No timeline events set yet.</p>
                  ) : (
                    <div className="relative pl-5">
                      <div className="absolute left-1.5 top-1 bottom-1 w-px bg-slate-200" />
                      {dealDetail.timeline.map((ev: {date: string; event: string; description: string; type: string}, i: number) => {
                        const isPast = new Date(ev.date) < new Date();
                        return (
                          <div key={i} className="relative mb-5">
                            <div className={`absolute -left-4 w-3.5 h-3.5 rounded-full border-2 ${isPast ? "bg-primary border-primary" : "bg-white border-slate-300"}`} />
                            <div className={`p-3 rounded-xl border ${isPast ? "border-primary/20 bg-blue-50" : "border-slate-200 bg-white"}`}>
                              <div className={`text-xs font-bold ${isPast ? "text-primary" : "text-slate-500"}`}>{ev.event}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{ev.description}</div>
                              <div className={`text-[10px] mt-1 font-medium ${isPast ? "text-success" : "text-muted-foreground"}`}>
                                {isPast ? "✓ " : ""}{new Date(ev.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Financials */}
              {activeTab === "financials" && dealDetail.financials && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-sm">Target Financials</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "ARR", value: fmt(dealDetail.financials.arr), icon: TrendingUp, color: "text-primary" },
                      { label: "NRR", value: `${dealDetail.financials.nrr}%`, icon: ArrowUpRight, color: dealDetail.financials.nrr >= 100 ? "text-success" : "text-red-500" },
                      { label: "YoY Growth", value: `${dealDetail.financials.growth}%`, icon: BarChart2, color: "text-success" },
                      { label: "EBITDA", value: fmt(Math.abs(dealDetail.financials.ebitda)), icon: DollarSign, color: dealDetail.financials.ebitda >= 0 ? "text-success" : "text-red-500" },
                    ].map((f) => (
                      <div key={f.label} className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <f.icon className={`w-4 h-4 ${f.color}`} />
                          <span className="text-xs text-muted-foreground">{f.label}</span>
                        </div>
                        <div className={`text-xl font-black ${f.color}`}>{f.value}</div>
                        {f.label === "EBITDA" && (
                          <div className="text-[10px] text-muted-foreground">{dealDetail.financials.ebitda < 0 ? "Loss" : "Profit"}</div>
                        )}
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
                          {dealDetail.financials.arr > 0 ? `${(selectedDeal.dealSize / dealDetail.financials.arr).toFixed(1)}x` : "—"}
                        </div>
                        <div className="text-xs text-slate-400">ARR Multiple</div>
                      </div>
                      <div>
                        <div className="text-lg font-black">
                          {selectedDeal.valuation > 0 ? `${(selectedDeal.dealSize / selectedDeal.valuation * 100).toFixed(0)}%` : "—"}
                        </div>
                        <div className="text-xs text-slate-400">vs Valuation</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Synergies */}
              {activeTab === "synergies" && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-sm">Synergy Analysis</h4>
                  {!dealDetail.synergies?.length ? (
                    <p className="text-sm text-muted-foreground">No synergies modeled yet.</p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {dealDetail.synergies.map((s: {type: string; value: string; confidence: string}, i: number) => (
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
                        <div className="text-xs font-semibold text-primary mb-1">
                          {dealDetail.synergies.length} synergy driver{dealDetail.synergies.length > 1 ? "s" : ""} identified
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Based on preliminary analysis. Final synergy estimates subject to completion of due diligence.
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Documents */}
              {activeTab === "docs" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-sm">Document Vault</h4>
                    <button className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
                      <Upload className="w-3.5 h-3.5" /> Upload
                    </button>
                  </div>
                  {!dealDetail.documents?.length ? (
                    <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {dealDetail.documents.map((doc: {name: string; type: string; date: string; size: string}, i: number) => (
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
                            <button className="text-xs text-muted-foreground hover:text-foreground">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Contacts */}
              {activeTab === "contacts" && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 text-sm">Key Contacts</h4>
                  {!dealDetail.contacts?.length ? (
                    <p className="text-sm text-muted-foreground">No contacts added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {dealDetail.contacts.map((c: {name: string; role: string; email?: string}, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-sm shrink-0">
                            {c.name[0]}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-slate-800 text-sm">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.role}</div>
                            {c.email && (
                              <a href={`mailto:${c.email}`} className="text-xs text-primary hover:underline">{c.email}</a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </SlideOver>
      )}
    </div>
  );
}
