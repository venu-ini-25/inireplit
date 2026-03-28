import { useState } from "react";
import { useGetDeals } from "@workspace/api-client-react";
import { SlideOver } from "@/components/ui/SlideOver";
import { CheckCircle2, Circle, Plus } from "lucide-react";

const DD_CHECKLIST = [
  "NDA executed", "Data room access granted", "Management interviews completed",
  "Financial statements (3yr) reviewed", "QoE analysis complete",
  "Working capital analysis", "Debt & liabilities review",
  "Legal entity structure verified", "IP & contracts reviewed",
  "Employee & equity schedule", "Customer concentration analysis",
  "Final report drafted",
];

const DEAL_DETAILS: Record<string, { overview: string; ddComplete: number; contacts: { name: string; role: string }[] }> = {
  "Meridian Analytics": {
    overview: "SaaS analytics platform targeting enterprise finance teams. $45M all-cash acquisition. Strong ARR of $4.2M with 112% NRR. Synergy thesis: cross-sell to existing portfolio.",
    ddComplete: 7,
    contacts: [{ name: "Alex Rivera", role: "CEO" }, { name: "Kim Park", role: "CFO" }],
  },
  "Apex Capital Partners": {
    overview: "Buy-side PE fund with $180M AUM seeking a FinTech add-on. iNi advising on target identification, valuation, and deal structuring.",
    ddComplete: 4,
    contacts: [{ name: "James Chen", role: "Managing Director" }],
  },
  "NovaTech Solutions": {
    overview: "B2B SaaS platform for supply chain management. Early-stage prospecting — reviewing initial financials and customer references.",
    ddComplete: 2,
    contacts: [{ name: "Lisa Nguyen", role: "Founder & CEO" }],
  },
  default: {
    overview: "Deal overview and details will be added once the engagement is scoped.",
    ddComplete: 0,
    contacts: [],
  },
};

export default function MASupport() {
  const { data: deals, isLoading } = useGetDeals();
  const [selectedDeal, setSelectedDeal] = useState<any>(null);

  const stages = [
    { id: "prospecting", name: "Prospecting", dot: "bg-slate-400" },
    { id: "nda", name: "NDA Signed", dot: "bg-blue-500" },
    { id: "diligence", name: "Due Diligence", dot: "bg-amber-500" },
    { id: "loi", name: "LOI Issued", dot: "bg-purple-500" },
    { id: "closed", name: "Closed", dot: "bg-green-500" },
  ];

  const detail = selectedDeal
    ? DEAL_DETAILS[selectedDeal.targetCompany] ?? DEAL_DETAILS["default"]
    : null;

  const fmt = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v}`;
  };

  return (
    <div className="flex flex-col gap-6 pb-12 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">M&A Support</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Deal pipeline, due diligence tracking, and advisory workflow</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Add Deal
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ maxHeight: "calc(100vh - 240px)" }}>
        {stages.map((stage) => (
          <div key={stage.id} className="w-72 shrink-0 flex flex-col bg-slate-50/50 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                {stage.name}
              </h3>
              <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                {deals?.filter((d) => d.stage === stage.id).length || 0}
              </span>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm animate-pulse h-32" />
              ) : (
                deals?.filter((d) => d.stage === stage.id).map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => setSelectedDeal(deal)}
                    className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-sm line-clamp-1">
                        {deal.targetCompany}
                      </h4>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        deal.priority === "high" ? "bg-red-50 text-red-700" :
                        deal.priority === "medium" ? "bg-amber-50 text-amber-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>{deal.priority}</span>
                    </div>
                    <div className="text-sm font-semibold text-primary mb-3">{fmt(deal.dealSize)}</div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">
                          {deal.leadPartner?.charAt(0) ?? "?"}
                        </div>
                        {deal.leadPartner?.split(" ")[0] ?? "—"}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(deal.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedDeal && detail && (
        <SlideOver
          open={!!selectedDeal}
          onClose={() => setSelectedDeal(null)}
          title={selectedDeal.targetCompany}
          subtitle={`${selectedDeal.dealType ?? "M&A"} · ${fmt(selectedDeal.dealSize)}`}
          width="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Deal Size", fmt(selectedDeal.dealSize)],
                ["Lead Partner", selectedDeal.leadPartner],
                ["Priority", selectedDeal.priority?.toUpperCase()],
              ].map(([k, v]) => (
                <div key={k} className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="font-semibold text-slate-800 mt-0.5 capitalize">{v}</div>
                </div>
              ))}
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Deal Overview</h4>
              <p className="text-sm text-slate-700 leading-relaxed">{detail.overview}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-800">Due Diligence Checklist</h4>
                <span className="text-xs text-muted-foreground">{detail.ddComplete}/{DD_CHECKLIST.length} complete</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full mb-4">
                <div
                  className="h-1.5 bg-primary rounded-full transition-all"
                  style={{ width: `${(detail.ddComplete / DD_CHECKLIST.length) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DD_CHECKLIST.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i < detail.ddComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className={`text-xs ${i < detail.ddComplete ? "text-slate-500 line-through" : "text-slate-700"}`}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {detail.contacts.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-800 mb-3">Key Contacts</h4>
                <div className="space-y-2">
                  {detail.contacts.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                        {c.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-800">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.role}</div>
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
