import { useGetDeals } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";

export default function MASupport() {
  const { data: deals, isLoading } = useGetDeals();

  const stages = [
    { id: 'prospecting', name: 'Prospecting', color: 'bg-slate-200' },
    { id: 'nda', name: 'NDA Signed', color: 'bg-blue-200' },
    { id: 'diligence', name: 'Due Diligence', color: 'bg-amber-200' },
    { id: 'loi', name: 'LOI Issued', color: 'bg-purple-200' },
    { id: 'closed', name: 'Closed', color: 'bg-green-200' }
  ];

  return (
    <div className="flex flex-col gap-6 pb-12 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">M&A Support Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage active deal flow and diligence.</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
          Add New Deal
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
        {stages.map(stage => (
          <div key={stage.id} className="w-[300px] shrink-0 flex flex-col bg-slate-50/50 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stage.color}`}></div>
                {stage.name}
              </h3>
              <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                {deals?.filter(d => d.stage === stage.id).length || 0}
              </span>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto pr-1 pb-2">
              {isLoading ? (
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm animate-pulse h-32"></div>
              ) : deals?.filter(d => d.stage === stage.id).map(deal => (
                <div key={deal.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">{deal.targetCompany}</h4>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      deal.priority === 'high' ? 'bg-red-50 text-red-700' :
                      deal.priority === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {deal.priority}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-primary mb-3">
                    {formatCurrency(deal.dealSize)}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-[10px] flex items-center justify-center text-slate-700 border border-white shadow-sm">
                        {deal.leadPartner.charAt(0)}
                      </div>
                      {deal.leadPartner.split(' ')[0]}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(deal.updatedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
