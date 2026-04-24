import { useQuery } from "@tanstack/react-query";
import { Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw, ChevronRight, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface GoalMetric { value: number; target: number; grade: "A" | "B" | "C" | "D" }
interface InsightsData {
  dataSource: "real" | "demo";
  periodCount: number;
  latestPeriod: string;
  trends: {
    revenue: { slope: number; direction: "up" | "down" | "flat"; r2: number; growthPct: number };
    expenses: { direction: "up" | "down" | "flat" };
    ebitda: { direction: "up" | "down" | "flat" };
  };
  forecast: {
    periods: string[];
    revenue: number[];
    expenses: number[];
    confidenceRange: { low: number; high: number }[];
  };
  anomalies: { period: string; value: number; z: number; metric: string; direction: "high" | "low" }[];
  goals: {
    ruleOf40: GoalMetric;
    grossMargin: GoalMetric;
    burnMultiple: GoalMetric;
    revenueGrowth: GoalMetric;
  };
  narrative: string;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const GRADE_CONFIG: Record<"A" | "B" | "C" | "D", { bg: string; text: string; border: string; label: string }> = {
  A: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Excellent" },
  B: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Good" },
  C: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Fair" },
  D: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "At Risk" },
};

function TrendIcon({ dir }: { dir: "up" | "down" | "flat" }) {
  if (dir === "up") return <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />;
  if (dir === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

function GradeCard({ label, value, unit = "", target, targetLabel, grade }: {
  label: string; value: number; unit?: string; target: number; targetLabel: string; grade: "A" | "B" | "C" | "D";
}) {
  const cfg = GRADE_CONFIG[grade];
  const pct = Math.min(100, Math.max(0, (value / (target * 1.5)) * 100));
  return (
    <div className={cn("rounded-xl border p-4 flex flex-col gap-2", cfg.bg, cfg.border)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", cfg.text, cfg.border, cfg.bg)}>{grade} · {cfg.label}</span>
      </div>
      <div className={cn("text-2xl font-bold", cfg.text)}>
        {value.toFixed(label === "Burn Multiple" ? 2 : 1)}{unit}
      </div>
      <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", grade === "A" ? "bg-emerald-500" : grade === "B" ? "bg-blue-500" : grade === "C" ? "bg-amber-500" : "bg-red-500")} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Target className="w-3 h-3" />
        <span>{targetLabel}</span>
      </div>
    </div>
  );
}

function SkeletonLine({ w = "full" }: { w?: string }) {
  return <div className={`h-4 bg-slate-100 rounded animate-pulse w-${w}`} />;
}

export function InsightsPanel() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<InsightsData>({
    queryKey: ["insights-snapshot"],
    queryFn: async () => {
      const resp = await fetch(`${API_BASE}/api/insights/snapshot`);
      if (!resp.ok) throw new Error(await resp.text());
      return resp.json() as Promise<InsightsData>;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isError) return null;

  const isDemo = !data || data.dataSource === "demo";

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">AI Intelligence Engine</h3>
            <p className="text-[11px] text-muted-foreground">
              {isLoading ? "Analyzing financials…" : isDemo ? "Showing demo analysis · Import real data for live insights" : `Live analysis · ${data.periodCount} periods through ${data.latestPeriod}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDemo && !isLoading && (
            <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-medium">Demo</span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-slate-100 rounded-md transition-colors disabled:opacity-40"
            title="Refresh analysis"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {/* AI Narrative */}
        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1">
            {isLoading ? (
              <div className="flex flex-col gap-2 pt-1">
                <SkeletonLine /><SkeletonLine w="4/5" /><SkeletonLine w="3/5" />
              </div>
            ) : (
              <p className="text-sm text-foreground leading-relaxed">{data?.narrative}</p>
            )}
          </div>
        </div>

        {/* Goal Scorecards */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Goal Scorecards</span>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : data ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <GradeCard label="Rule of 40" value={data.goals.ruleOf40.value} unit="" target={40} targetLabel="Target ≥ 40" grade={data.goals.ruleOf40.grade} />
              <GradeCard label="Gross Margin" value={data.goals.grossMargin.value} unit="%" target={75} targetLabel="Target ≥ 75%" grade={data.goals.grossMargin.grade} />
              <GradeCard label="Burn Multiple" value={data.goals.burnMultiple.value} unit="x" target={1} targetLabel="Target < 1.0x" grade={data.goals.burnMultiple.grade} />
              <GradeCard label="Revenue Growth" value={data.goals.revenueGrowth.value} unit="%" target={20} targetLabel="Target ≥ 20%" grade={data.goals.revenueGrowth.grade} />
            </div>
          ) : null}
        </div>

        {/* Forecast + Anomalies row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Forecast */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Revenue Forecast</span>
              <span className="text-[10px] text-muted-foreground">(next 3 periods)</span>
            </div>
            {isLoading ? (
              <div className="flex flex-col gap-2"><SkeletonLine /><SkeletonLine /><SkeletonLine /></div>
            ) : data ? (
              <div className="flex flex-col gap-2">
                {data.forecast.periods.map((period, i) => {
                  const rev = data.forecast.revenue[i] ?? 0;
                  const lo = data.forecast.confidenceRange[i]?.low ?? 0;
                  const hi = data.forecast.confidenceRange[i]?.high ?? 0;
                  const prevRev = i === 0 ? (data.trends.revenue.slope + rev) : (data.forecast.revenue[i - 1] ?? rev);
                  const change = prevRev > 0 ? ((rev - prevRev) / prevRev) * 100 : 0;
                  const isUp = rev >= (data.forecast.revenue[i - 1] ?? rev);
                  return (
                    <div key={period} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      <div className="w-20 shrink-0">
                        <span className="text-xs font-mono text-muted-foreground">{period}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{fmt(rev)}</span>
                          <span className={cn("text-[11px] flex items-center gap-0.5", isUp ? "text-emerald-600" : "text-red-500")}>
                            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(change).toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Range: {fmt(Math.max(0, lo))} – {fmt(hi)}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Trend Signals + Anomalies */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Trend Signals</span>
            </div>
            {isLoading ? (
              <div className="flex flex-col gap-2"><SkeletonLine /><SkeletonLine /><SkeletonLine /></div>
            ) : data ? (
              <div className="flex flex-col gap-2">
                {[
                  { label: "Revenue", dir: data.trends.revenue.direction, detail: `${data.trends.revenue.growthPct > 0 ? "+" : ""}${data.trends.revenue.growthPct.toFixed(1)}% total growth · R²=${data.trends.revenue.r2}` },
                  { label: "Expenses", dir: data.trends.expenses.direction, detail: data.trends.expenses.direction === "down" ? "Improving efficiency" : data.trends.expenses.direction === "up" ? "Rising — monitor closely" : "Stable" },
                  { label: "EBITDA", dir: data.trends.ebitda.direction, detail: data.trends.ebitda.direction === "up" ? "Margin expansion underway" : data.trends.ebitda.direction === "down" ? "Margin compression risk" : "Stable" },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <TrendIcon dir={t.dir} />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{t.label}</span>
                      <span className="text-[11px] text-muted-foreground ml-2">{t.detail}</span>
                    </div>
                  </div>
                ))}

                {data.anomalies.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-semibold text-amber-700">Anomalies Detected</span>
                    </div>
                    {data.anomalies.slice(0, 3).map((a, i) => (
                      <div key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5 mb-1">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>
                          <span className="font-medium text-foreground">{a.period}</span> {a.metric} was {a.direction === "high" ? "unusually high" : "unusually low"} ({(Math.abs(a.z)).toFixed(1)}σ from trend)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
