import { Building2, Search, Filter } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useGetPortfolioCompanies } from "@workspace/api-client-react";

export default function Portfolio() {
  const { data: companies, isLoading } = useGetPortfolioCompanies();

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfolio Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and monitor all investments across funds.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search companies..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-md text-sm outline-none transition-all focus:border-primary shadow-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-white border border-border text-foreground rounded-md text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Skeleton loader
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-border shadow-sm h-[200px] animate-pulse flex flex-col">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-lg"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-slate-100 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-auto">
                <div className="h-10 bg-slate-100 rounded"></div>
                <div className="h-10 bg-slate-100 rounded"></div>
              </div>
            </div>
          ))
        ) : companies?.map((company) => (
          <div key={company.id} className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow group overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                      {company.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{company.industry}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 rounded-full">
                  {company.stage}
                </span>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-y-4 gap-x-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ARR / Revenue</p>
                  <p className="font-semibold text-slate-800">{formatCurrency(company.revenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Growth (YoY)</p>
                  <p className="font-semibold text-success">+{company.growthRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Valuation</p>
                  <p className="font-semibold text-slate-800">{formatCurrency(company.valuation)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                  <p className="font-medium text-slate-600 text-sm">
                    {new Date(company.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-5 py-3 flex items-center justify-between mt-auto">
              <span className={`flex items-center gap-1.5 text-xs font-medium ${company.status === 'active' ? 'text-success' : 'text-amber-600'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${company.status === 'active' ? 'bg-success' : 'bg-amber-500'}`}></div>
                {company.status === 'active' ? 'On Track' : 'Needs Review'}
              </span>
              <button className="text-sm font-medium text-primary hover:underline">View Details →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
