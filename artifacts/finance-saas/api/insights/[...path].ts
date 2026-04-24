import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getPool, extractPath } from "../_utils.js";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// ─── Pure ML helpers ──────────────────────────────────────────────────────────

function linReg(ys: number[]) {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  const xs = ys.map((_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i]!, 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  const mean = sumY / n;
  const ssTot = ys.reduce((acc, y) => acc + (y - mean) ** 2, 0);
  const ssRes = ys.reduce((acc, y, i) => acc + (y - (slope * i + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;
  return { slope, intercept, r2 };
}

function zScoreAnomalies(ys: number[], labels: string[], metric: string, threshold = 1.8) {
  if (ys.length < 4) return [];
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const std = Math.sqrt(ys.reduce((acc, y) => acc + (y - mean) ** 2, 0) / ys.length);
  if (std === 0) return [];
  return ys
    .map((y, i) => ({ period: labels[i] ?? "", value: y, z: (y - mean) / std, metric }))
    .filter((a) => Math.abs(a.z) > threshold)
    .map((a) => ({ ...a, direction: a.z > 0 ? ("high" as const) : ("low" as const) }));
}

// Normalize any date/period string → "YYYY-MM" for consistent grouping
function toPeriodMonth(raw: string): string {
  if (!raw) return "";
  // "YYYY-MM"
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  // "YYYY-MM-DD"
  const ymd = raw.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}`;
  // "MM/DD/YYYY" or "M/D/YYYY"
  const mdy = raw.match(/^(\d{1,2})\/\d{1,2}\/(\d{4})$/);
  if (mdy) return `${mdy[2]}-${mdy[1]!.padStart(2, "0")}`;
  // "YYYY/MM/DD"
  const ymdSlash = raw.match(/^(\d{4})\/(\d{2})\/\d{2}$/);
  if (ymdSlash) return `${ymdSlash[1]}-${ymdSlash[2]}`;
  // "Jan 25" or "Jan 2025" or "Jan-25"
  const monYr = raw.match(/^([A-Za-z]{3})[-\s](\d{2,4})$/);
  if (monYr) {
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const mo = months.indexOf(monYr[1]!.toLowerCase()) + 1;
    if (mo > 0) {
      const yr = monYr[2]!.length === 2 ? `20${monYr[2]}` : monYr[2]!;
      return `${yr}-${String(mo).padStart(2, "0")}`;
    }
  }
  return raw;
}

// Aggregate raw daily/transaction rows → monthly buckets (sum)
function groupByMonth(periods: string[], revenues: number[], expenses: number[], ebitdas: number[]) {
  const map: Record<string, { revenue: number; expenses: number; ebitda: number }> = {};
  for (let i = 0; i < periods.length; i++) {
    const key = toPeriodMonth(periods[i] ?? "");
    if (!key) continue;
    const acc = map[key] ?? { revenue: 0, expenses: 0, ebitda: 0 };
    acc.revenue  += revenues[i] ?? 0;
    acc.expenses += expenses[i] ?? 0;
    acc.ebitda   += ebitdas[i]  ?? 0;
    map[key] = acc;
  }
  const sorted = Object.entries(map).sort(([a], [b]) => a < b ? -1 : 1);
  return {
    periods:  sorted.map(([k]) => k),
    revenues: sorted.map(([, v]) => v.revenue),
    expenses: sorted.map(([, v]) => v.expenses),
    ebitdas:  sorted.map(([, v]) => v.ebitda),
  };
}

function nextPeriodLabel(label: string): string {
  const m = label.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const yr = parseInt(m[1]!), mo = parseInt(m[2]!);
    const next = new Date(yr, mo - 1 + 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  }
  const q = label.match(/^(\d{4})-Q(\d)$/);
  if (q) {
    const yr = parseInt(q[1]!), qn = parseInt(q[2]!);
    return qn < 4 ? `${yr}-Q${qn + 1}` : `${yr + 1}-Q1`;
  }
  return `${label}+1`;
}

function forecastPeriods(last: string, n: number): string[] {
  const out: string[] = [];
  let cur = last;
  for (let i = 0; i < n; i++) { cur = nextPeriodLabel(cur); out.push(cur); }
  return out;
}

function gradeScore(value: number, target: number, goodAbove: boolean): "A" | "B" | "C" | "D" {
  const ratio = goodAbove ? value / target : target / (value || 0.001);
  if (ratio >= 1.1) return "A";
  if (ratio >= 0.85) return "B";
  if (ratio >= 0.6) return "C";
  return "D";
}

const GRADE_COLOR: Record<string, string> = { A: "text-emerald-700", B: "text-blue-700", C: "text-amber-700", D: "text-red-700" };

// ─── Demo fallback data (matches mockApiData.ts values) ──────────────────────

const DEMO_PERIODS = ["2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03"];
const DEMO_REVENUE = [769782,812000,855000,900000,917573,1035105,1042000,1068892,1105000];
const DEMO_EXPENSES = [536801,550000,561000,568000,574952,756133,670000,689112,710000];
const DEMO_EBITDA   = DEMO_REVENUE.map((r,i) => r - DEMO_EXPENSES[i]!);

// ─── Simple in-memory cache (5-min TTL) ──────────────────────────────────────

let cache: { ts: number; data: unknown } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// ─── Main insight computation ─────────────────────────────────────────────────

async function computeInsights(revenues: number[], expenses: number[], ebitdas: number[], periods: string[], dataSource: "real" | "demo") {
  const n = revenues.length;
  const revReg = linReg(revenues);
  const expReg = linReg(expenses);
  const ebiReg = linReg(ebitdas);

  const dir = (slope: number) => (Math.abs(slope) < 1000 ? "flat" : slope > 0 ? "up" : "down") as "up" | "down" | "flat";

  const firstRev = revenues[0] ?? 1, lastRev = revenues[n - 1] ?? 1;
  const revenueGrowthPct = firstRev > 0 ? ((lastRev - firstRev) / firstRev) * 100 : 0;
  const growthPerPeriod = n > 1 ? revenueGrowthPct / (n - 1) : 0;

  const lastEbi = ebitdas[n - 1] ?? 0;
  const ebitdaMarginPct = lastRev > 0 ? (lastEbi / lastRev) * 100 : 0;
  const grossMarginPct = lastRev > 0 ? ((lastRev - (expenses[n - 1] ?? 0)) / lastRev) * 100 : 0;
  const ruleOf40 = growthPerPeriod + ebitdaMarginPct;
  const burnMultiple = (revenues[n-1] ?? 0) > 0 ? (expenses[n-1] ?? 0) / (revenues[n-1] ?? 1) : 999;

  const FORECAST_N = 3;
  const fcstRevYs = Array.from({ length: FORECAST_N }, (_, k) => Math.round(revReg.slope * (n + k) + revReg.intercept));
  const fcstExpYs = Array.from({ length: FORECAST_N }, (_, k) => Math.round(expReg.slope * (n + k) + expReg.intercept));
  const revResiduals = revenues.map((y, i) => Math.abs(y - (revReg.slope * i + revReg.intercept)));
  const revStd = revResiduals.length > 0 ? Math.sqrt(revResiduals.reduce((a, b) => a + b * b, 0) / revResiduals.length) : 0;
  const fcstPeriods = forecastPeriods(periods[n - 1] ?? "", FORECAST_N);

  const anomalies = [
    ...zScoreAnomalies(revenues, periods, "revenue"),
    ...zScoreAnomalies(expenses, periods, "expenses"),
  ];

  const goals = {
    ruleOf40: { value: parseFloat(ruleOf40.toFixed(1)), target: 40, grade: gradeScore(ruleOf40, 40, true) as "A"|"B"|"C"|"D" },
    grossMargin: { value: parseFloat(grossMarginPct.toFixed(1)), target: 75, grade: gradeScore(grossMarginPct, 75, true) as "A"|"B"|"C"|"D" },
    burnMultiple: { value: parseFloat(burnMultiple.toFixed(2)), target: 1, grade: gradeScore(burnMultiple, 1, false) as "A"|"B"|"C"|"D" },
    revenueGrowth: { value: parseFloat(revenueGrowthPct.toFixed(1)), target: 20, grade: gradeScore(revenueGrowthPct, 20, true) as "A"|"B"|"C"|"D" },
  };

  const statsForAI = {
    periodCount: n,
    firstPeriod: periods[0], lastPeriod: periods[n - 1],
    revenueGrowthPct: goals.revenueGrowth.value,
    grossMarginPct: goals.grossMargin.value,
    ebitdaMarginPct: parseFloat(ebitdaMarginPct.toFixed(1)),
    ruleOf40: goals.ruleOf40.value,
    burnMultiple: goals.burnMultiple.value,
    revTrend: dir(revReg.slope),
    r2: parseFloat(revReg.r2.toFixed(2)),
    forecastNextPeriodRevenue: fcstRevYs[0] ?? 0,
    anomalyCount: anomalies.length,
    dataSource,
  };

  let narrative = "Insufficient data to generate analysis. Import more financial periods to unlock AI insights.";
  try {
    const prompt = `You are a senior investment analyst at a venture capital firm called iNi (Invent N Invest).
The following are computed financial metrics for a portfolio company:
${JSON.stringify(statsForAI, null, 2)}

Write exactly 3 sentences (no bullets, no headers):
1. The most significant trend in revenue/growth and what it signals.
2. The biggest risk or opportunity revealed by these numbers (mention the specific metric).
3. Whether the portfolio is on track for long-term goals, referencing the Rule of 40 score.

Be specific with numbers. Avoid filler phrases like "it is worth noting" or "it is important". Max 80 words.`;

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });
    narrative = resp.choices[0]?.message?.content?.trim() ?? narrative;
  } catch (e) {
    console.error("[insights] OpenAI failed:", e);
  }

  return {
    dataSource,
    periodCount: n,
    latestPeriod: periods[n - 1] ?? "",
    trends: {
      revenue: { slope: Math.round(revReg.slope), direction: dir(revReg.slope), r2: parseFloat(revReg.r2.toFixed(2)), growthPct: goals.revenueGrowth.value },
      expenses: { slope: Math.round(expReg.slope), direction: dir(expReg.slope), r2: parseFloat(expReg.r2.toFixed(2)) },
      ebitda:   { slope: Math.round(ebiReg.slope), direction: dir(ebiReg.slope), r2: parseFloat(ebiReg.r2.toFixed(2)) },
    },
    forecast: {
      periods: fcstPeriods,
      revenue: fcstRevYs,
      expenses: fcstExpYs,
      confidenceRange: fcstRevYs.map((v) => ({ low: Math.round(v - revStd), high: Math.round(v + revStd) })),
    },
    anomalies: anomalies.slice(0, 5),
    goals,
    narrative,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }
  const email = await requireAuth(req, res);
  if (!email) return;

  const pathParts = extractPath(req, "/api/insights");
  const sub = pathParts[0] ?? "";

  if (sub === "snapshot") {
    if (cache && Date.now() - cache.ts < CACHE_TTL) { return ok(res, cache.data); }

    try {
      const db = getPool();
      const { rows } = await db.query(`SELECT period, revenue, expenses, ebitda FROM financial_snapshots ORDER BY sort_order ASC, period ASC`);

      let revenues: number[], expenses: number[], ebitdas: number[], periods: string[], dataSource: "real" | "demo";

      if (rows.length >= 3) {
        const rawRevenues  = rows.map((r: Record<string,unknown>) => Number(r.revenue));
        const rawExpenses  = rows.map((r: Record<string,unknown>) => Number(r.expenses));
        const rawEbitdas   = rows.map((r: Record<string,unknown>) => Number(r.ebitda));
        const rawPeriods   = rows.map((r: Record<string,unknown>) => String(r.period));
        // Normalize & aggregate — handles raw dates, monthly periods, quarterly, etc.
        const grouped = groupByMonth(rawPeriods, rawRevenues, rawExpenses, rawEbitdas);
        revenues = grouped.revenues; expenses = grouped.expenses;
        ebitdas  = grouped.ebitdas;  periods  = grouped.periods;
        dataSource = "real";
      } else {
        revenues = DEMO_REVENUE; expenses = DEMO_EXPENSES; ebitdas = DEMO_EBITDA;
        periods = DEMO_PERIODS; dataSource = "demo";
      }

      const result = await computeInsights(revenues, expenses, ebitdas, periods, dataSource);
      cache = { ts: Date.now(), data: result };
      return ok(res, result);
    } catch (e) {
      console.error("[insights] error:", e);
      const result = await computeInsights(DEMO_REVENUE, DEMO_EXPENSES, DEMO_EBITDA, DEMO_PERIODS, "demo");
      return ok(res, result);
    }
  }

  err(res, `Unknown insights path: ${sub}`, 404);
}
