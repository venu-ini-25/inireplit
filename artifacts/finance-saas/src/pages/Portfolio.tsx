import { useState } from "react";
import { useLocation } from "wouter";
import { Building2, Search, TrendingUp, DollarSign, BarChart2, Briefcase } from "lucide-react";
import { useGetPortfolioCompanies } from "@workspace/api-client-react";

const FUND_KPIS = [
  { label: "AUM", value: "$284M", icon: DollarSign, color: "text-primary", bg: "bg-blue-50" },
  { label: "Gross IRR", value: "28.6%", icon: TrendingUp, color: "text-success", bg: "bg-green-50" },
  { label: "MOIC", value: "2.7x", icon: BarChart2, color: "text-purple-600", bg: "bg-purple-50" },
  { label: "Portfolio Companies", value: "8", icon: Briefcase, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Avg Ownership", value: "19.4%", icon: Building2, color: "text-cyan-600", bg: "bg-cyan-50" },
  { label: "Unrealized Value", value: "$198M", icon: TrendingUp, color: "text-success", bg: "bg-green-50" },
];

const stageColors: Record<string, string> = {
  "seed": "bg-slate-100 text-slate-600",
  "series-a": "bg-blue-50 text-primary",
  "series-b": "bg-purple-50 text-purple-700",
  "series-c": "bg-green-50 text-success",
  "growth": "bg-amber-50 text-amber-700",
};

const formatRevenue = (v: number) => {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
};

export default function Portfolio() {
  const { data: companies, isLoading } = useGetPortfolioCompanies();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const filtered = companies?.filter(
    (c) =>
      search === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fund overview and portfolio company monitoring</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            placeholder="Search companies..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-md text-sm outline-none transition-all focus:border-primary shadow-sm"
          />
        </div>
      </div>

      {/* Fund KPI Bar */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Fund Overview</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 divide-x-0 lg:divide-x divide-border">
          {FUND_KPIS.map((kpi) => (
            <div key={kpi.label} className="lg:pl-4 first:pl-0 border border-border lg:border-0 rounded-lg lg:rounded-none p-3 lg:p-0">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-7 h-7 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                  <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <div className="text-xl font-bold text-foreground">{kpi.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Company Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-border shadow-sm h-52 animate-pulse" />
            ))
          : filtered?.map((company) => (
              <div
                key={company.id}
                onClick={() => navigate(`/portfolio/${company.id}`)}
                className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group overflow-hidden flex flex-col"
              >
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0 font-bold text-sm">
                        {company.name[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 leading-tight group-hover:text-primary transition-colors">
                          {company.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{company.industry}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${stageColors[company.stage] || "bg-slate-100 text-slate-600"}`}>
                      {company.stage.replace("-", " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground mb-0.5">ARR / Revenue</p>
                      <p className="font-bold text-slate-800 text-sm">{formatRevenue(company.revenue)}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Growth (YoY)</p>
                      <p className="font-bold text-success text-sm">+{company.growthRate}%</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Valuation</p>
                      <p className="font-bold text-slate-800 text-sm">{formatRevenue(company.valuation)}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Employees</p>
                      <p className="font-bold text-slate-800 text-sm">{company.employees}</p>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${company.status === "active" ? "text-success" : "text-amber-600"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${company.status === "active" ? "bg-success" : "bg-amber-500"}`} />
                    {company.status === "active" ? "On Track" : "Needs Review"}
                  </span>
                  <span className="text-xs font-medium text-primary group-hover:underline">View Details →</span>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
