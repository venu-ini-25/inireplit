import { useState } from "react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { useGetSpendingAnalytics } from "@workspace/api-client-react";
import { ArrowUpRight, ArrowDownRight, Target } from "lucide-react";

export default function Analytics() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  
  const { data: analytics, isLoading } = useGetSpendingAnalytics({ period });

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into your spending patterns.</p>
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

      {/* Top Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-6 border-border/50 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Spending</h3>
          {isLoading || !analytics ? (
             <div className="w-32 h-8 bg-muted rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-display font-bold text-foreground">
              {formatCurrency(analytics.totalSpending)}
            </p>
          )}
        </div>
        <div className="glass-card rounded-2xl p-6 border-border/50">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Average Daily</h3>
          {isLoading || !analytics ? (
             <div className="w-32 h-8 bg-muted rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-display font-bold text-foreground">
              {formatCurrency(analytics.averageDaily)}
            </p>
          )}
        </div>
        <div className="glass-card rounded-2xl p-6 border-border/50 flex flex-col justify-between">
          <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Top Category
          </h3>
          {isLoading || !analytics ? (
             <div className="w-32 h-8 bg-muted rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-display font-bold text-primary capitalize">
              {analytics.topCategory}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bar Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border-border/50">
          <h3 className="font-display font-semibold text-lg mb-6">Spending by Category</h3>
          <div className="h-[350px] w-full">
            {isLoading || !analytics ? (
               <div className="w-full h-full flex items-center justify-center">
                 <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
               </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.categories} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
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
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {analytics.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || `hsl(var(--chart-${(index % 5) + 1}))`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Breakdown List */}
        <div className="glass-card rounded-2xl p-6 border-border/50 flex flex-col h-[430px]">
          <h3 className="font-display font-semibold text-lg mb-6">Category Breakdown</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {isLoading || !analytics ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-muted animate-pulse" />
                    <div className="w-24 h-4 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="w-16 h-4 bg-muted rounded animate-pulse" />
                </div>
              ))
            ) : (
              analytics.categories.map((category, index) => (
                <div key={index} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full shadow-sm" 
                      style={{ backgroundColor: category.color || `hsl(var(--chart-${(index % 5) + 1}))` }} 
                    />
                    <div>
                      <p className="font-medium text-foreground capitalize group-hover:text-primary transition-colors">{category.name}</p>
                      <p className="text-xs text-muted-foreground">{category.percentage}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{formatCurrency(category.amount)}</p>
                    {category.change !== undefined && (
                      <p className={`text-xs flex items-center justify-end gap-0.5 ${
                        category.change > 0 ? 'text-destructive' : 'text-success' // Increase in spending is usually bad
                      }`}>
                        {category.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {formatPercentage(Math.abs(category.change))}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
