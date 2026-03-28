import { useState } from "react";
import { DollarSign, ArrowUpRight, ArrowDownRight, Activity, CreditCard, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { MetricCard, MetricCardSkeleton } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  useGetDashboardMetrics, 
  useGetRevenueChart, 
  useGetTransactions, 
  useGetSpendingAnalytics 
} from "@workspace/api-client-react";

export default function Dashboard() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  
  // Use TanStack Query hooks from generated API client
  const { data: metrics, isLoading: isMetricsLoading } = useGetDashboardMetrics();
  const { data: chartData, isLoading: isChartLoading } = useGetRevenueChart({ period });
  const { data: recentTxns, isLoading: isTxnsLoading } = useGetTransactions({ limit: 5 });
  const { data: spending, isLoading: isSpendingLoading } = useGetSpendingAnalytics({ period });

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Financial Overview</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your finances today.</p>
        </div>
        
        <div className="relative inline-flex items-center bg-card border border-border rounded-xl p-1 shadow-sm">
          {(["7d", "30d", "90d", "1y"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                period === p 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isMetricsLoading || !metrics ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} delay={i * 0.1} />)
        ) : (
          <>
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(metrics.totalRevenue)}
              change={metrics.revenueChange}
              icon={<DollarSign className="w-5 h-5" />}
              delay={0}
            />
            <MetricCard
              title="Total Expenses"
              value={formatCurrency(metrics.totalExpenses)}
              change={metrics.expensesChange}
              icon={<ArrowDownRight className="w-5 h-5" />}
              delay={0.1}
            />
            <MetricCard
              title="Net Profit"
              value={formatCurrency(metrics.netProfit)}
              change={metrics.profitChange}
              icon={<ArrowUpRight className="w-5 h-5" />}
              delay={0.2}
            />
            <MetricCard
              title="Cash Flow"
              value={formatCurrency(metrics.cashFlow)}
              change={metrics.cashFlowChange}
              icon={<Activity className="w-5 h-5" />}
              delay={0.3}
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Area Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border-border/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-semibold text-lg">Revenue vs Expenses</h3>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          
          <div className="h-[300px] w-full">
            {isChartLoading || !chartData ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(val) => `$${val/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => formatCurrency(value * 100)}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="expenses" stroke="hsl(var(--chart-2))" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="glass-card rounded-2xl p-6 border-border/50 flex flex-col">
          <h3 className="font-display font-semibold text-lg mb-6">Spending Categories</h3>
          <div className="flex-1 w-full min-h-[250px]">
            {isSpendingLoading || !spending ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-chart-2/20 border-t-chart-2 rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spending.categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="amount"
                    stroke="none"
                  >
                    {spending.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || `hsl(var(--chart-${(index % 5) + 1}))`} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass-card rounded-2xl border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg">Recent Transactions</h3>
          <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/20">
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isTxnsLoading || !recentTxns ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><div className="h-5 w-32 bg-muted rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-24 bg-muted rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-20 bg-muted rounded animate-pulse" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-16 bg-muted rounded-full animate-pulse" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-5 w-20 bg-muted rounded ml-auto animate-pulse" /></td>
                  </tr>
                ))
              ) : recentTxns.transactions.length === 0 ? (
                 <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No recent transactions found.
                    </td>
                 </tr>
              ) : (
                recentTxns.transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{txn.description}</p>
                          <p className="text-xs text-muted-foreground">{txn.account}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{txn.category}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(txn.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={txn.status} />
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${
                      txn.type === 'income' ? 'text-success' : 'text-foreground'
                    }`}>
                      {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
