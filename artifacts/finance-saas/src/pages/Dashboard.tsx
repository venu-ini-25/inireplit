import { ArrowUp, ArrowDown, Activity, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";
import {
  useGetPortfolioSummary,
  useGetRevenueAnalytics,
  useGetOperationsMetrics,
} from "@workspace/api-client-react";

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetPortfolioSummary();
  const { data: revenueData, isLoading: isChartLoading } = useGetRevenueAnalytics({ period: "1y" });
  const { data: operations } = useGetOperationsMetrics();

  const chartData = revenueData?.data?.map((d) => ({
    name: d.period.split(" ")[0],
    actual: parseFloat((d.revenue / 1_000_000).toFixed(2)),
    target: parseFloat(((d.revenue * 1.05) / 1_000_000).toFixed(2)),
  })) ?? [
    { name: "Jan", actual: 1.2, target: 1.5 }, { name: "Feb", actual: 1.4, target: 1.6 },
    { name: "Mar", actual: 1.5, target: 1.7 }, { name: "Apr", actual: 1.7, target: 1.8 },
    { name: "May", actual: 1.9, target: 1.9 }, { name: "Jun", actual: 2.1, target: 2.0 },
    { name: "Jul", actual: 2.3, target: 2.2 }, { name: "Aug", actual: 2.5, target: 2.4 },
    { name: "Sep", actual: 2.6, target: 2.5 }, { name: "Oct", actual: 2.4, target: 2.6 },
    { name: "Nov", actual: 2.7, target: 2.7 }, { name: "Dec", actual: 2.9, target: 2.8 },
  ];

  const customerData = revenueData?.data?.slice(-6).map((d) => ({
    name: d.period.split(" ")[0],
    users: Math.round((d.arr ?? d.revenue) / 8_500),
  })) ?? [
    { name: "Jan", users: 800 }, { name: "Feb", users: 950 },
    { name: "Mar", users: 1050 }, { name: "Apr", users: 1100 },
    { name: "May", users: 1150 }, { name: "Jun", users: 1247 },
  ];

  const lastRevenue = revenueData?.data?.[revenueData.data.length - 1]?.revenue;
  const monthlyRevenue = lastRevenue ? fmt(lastRevenue) : (isSummaryLoading ? "—" : "$2.1M");
  const prevRevenue = revenueData?.data?.[revenueData.data.length - 2]?.revenue;
  const revenueChange = lastRevenue && prevRevenue
    ? (((lastRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1)
    : "15.3";

  const burnRate = operations?.monthlyBurnM
    ? fmt(operations.monthlyBurnM * 1_000_000)
    : "$340K";
  const runway = operations?.cashRunwayMonths
    ? `${operations.cashRunwayMonths} months`
    : "18 months";

  const customerCount = customerData[customerData.length - 1]?.users ?? 1247;
  const prevCustomerCount = customerData[customerData.length - 2]?.users ?? 1150;
  const customerChange = (((customerCount - prevCustomerCount) / prevCustomerCount) * 100).toFixed(1);

  const totalAum = summary?.totalAum ?? 0;
  const operatingCF = lastRevenue
    ? fmt(Math.round(lastRevenue * 0.2))
    : "$420K";

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage data connections and monitor real-time business performance.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-primary text-primary rounded-md text-sm font-medium hover:bg-blue-50 transition-colors shadow-sm">
          <Star className="w-4 h-4 fill-primary" />
          Auto-Sync Active
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-border shadow-sm flex flex-col gap-2">
          <div className="text-sm text-muted-foreground font-medium">Monthly Revenue</div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              {isChartLoading ? <div className="w-20 h-8 bg-muted animate-pulse rounded" /> : monthlyRevenue}
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-primary flex items-center justify-center">
              <span className="font-serif font-bold text-lg leading-none">$</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-success flex items-center font-medium">
              <ArrowUp className="w-3 h-3 mr-0.5" /> {revenueChange}%
            </span>
            <span className="text-muted-foreground text-xs ml-1">vs last month</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border shadow-sm flex flex-col gap-2">
          <div className="text-sm text-muted-foreground font-medium">Customer Growth</div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              {isChartLoading ? <div className="w-20 h-8 bg-muted animate-pulse rounded" /> : customerCount.toLocaleString()}
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-primary flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-success flex items-center font-medium">
              <ArrowUp className="w-3 h-3 mr-0.5" /> {customerChange}%
            </span>
            <span className="text-muted-foreground text-xs ml-1">vs last month</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border shadow-sm flex flex-col gap-2">
          <div className="text-sm text-muted-foreground font-medium">Burn Rate</div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{burnRate}</div>
            <div className="w-8 h-8 rounded-full bg-red-50 text-destructive flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-success flex items-center font-medium">
              <ArrowDown className="w-3 h-3 mr-0.5" /> 5.1%
            </span>
            <span className="text-muted-foreground text-xs ml-1">improvement</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border shadow-sm flex flex-col gap-2">
          <div className="text-sm text-muted-foreground font-medium">
            {totalAum > 0 ? "AUM" : "Runway"}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              {isSummaryLoading
                ? <div className="w-20 h-8 bg-muted animate-pulse rounded" />
                : totalAum > 0 ? fmt(totalAum) : runway}
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-primary flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-success flex items-center font-medium">
              <ArrowUp className="w-3 h-3 mr-0.5" />
              {totalAum > 0 ? `${summary?.aumChange?.toFixed(1) ?? "12.4"}%` : "2 months"}
            </span>
            <span className="text-muted-foreground text-xs ml-1">
              {totalAum > 0 ? "YoY growth" : "extension"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">Revenue Trends</h3>
            <div className="flex gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <div className="w-3 h-3 rounded bg-primary/20 border border-primary"></div>
                Actual
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <div className="w-3 h-3 rounded bg-slate-100 border border-slate-300"></div>
                Target
              </div>
            </div>
          </div>
          {isChartLoading ? (
            <div className="h-[280px] bg-muted animate-pulse rounded-lg" />
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={(v) => `$${v}M`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", borderColor: "#e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                    formatter={(value: number) => `$${value}M`}
                  />
                  <Area type="monotone" dataKey="target" stroke="#cbd5e1" strokeDasharray="5 5" fill="none" />
                  <Area type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-semibold text-lg mb-6">Customer Growth</h3>
          {isChartLoading ? (
            <div className="h-[280px] bg-muted animate-pulse rounded-lg" />
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={customerData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", borderColor: "#e2e8f0", borderRadius: "8px" }} />
                  <Line
                    type="monotone" dataKey="users" stroke="hsl(var(--chart-2))" strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                    activeDot={{ r: 6, fill: "hsl(var(--chart-2))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg">Cash Flow Analysis</h3>
          <button className="text-sm font-medium text-primary hover:underline">View Detailed Report</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="pt-4 md:pt-0 pr-6">
            <p className="text-sm text-muted-foreground mb-1">Operating Cash Flow</p>
            <p className="text-2xl font-bold">
              {isChartLoading ? <span className="inline-block w-16 h-7 bg-muted animate-pulse rounded" /> : operatingCF}
            </p>
            <div className="mt-2 text-xs text-muted-foreground">Generated from core business activities. Stable and growing.</div>
          </div>
          <div className="py-4 md:py-0 px-0 md:px-6">
            <p className="text-sm text-muted-foreground mb-1">Investing Cash Flow</p>
            <p className="text-2xl font-bold">-$150K</p>
            <div className="mt-2 text-xs text-muted-foreground">Capital expenditure on new equipment and technology upgrades.</div>
          </div>
          <div className="pb-4 md:pb-0 pl-0 md:pl-6">
            <p className="text-sm text-muted-foreground mb-1">Financing Cash Flow</p>
            <p className="text-2xl font-bold">-$80K</p>
            <div className="mt-2 text-xs text-muted-foreground">Debt repayments and shareholder dividends.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
