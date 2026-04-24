import { Router } from "express";
import { db, financialSnapshots } from "@workspace/db";
import { asc } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const router = Router();

// ─── Pure ML helpers ──────────────────────────────────────────────────────────

function linReg(ys: number[]) {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  const sumX = (n * (n - 1)) / 2;
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = ys.reduce((acc, y, i) => acc + i * y, 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  const mean = sumY / n;
  const ssTot = ys.reduce((acc, y) => acc + (y - mean) ** 2, 0);
  const ssRes = ys.reduce((acc, y, i) => acc + (y - (slope * i + intercept)) ** 2, 0);
  const r2 = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;
  return { slope, intercept, r2 };
}

function zAnomalies(ys: number[], labels: string[], metric: string, threshold = 1.8) {
  if (ys.length < 4) return [];
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const std = Math.sqrt(ys.reduce((acc, y) => acc + (y - mean) ** 2, 0) / ys.length);
  if (std === 0) return [];
  return ys
    .map((y, i) => ({ period: labels[i] ?? "", value: y, z: (y - mean) / std, metric }))
    .filter((a) => Math.abs(a.z) > threshold)
    .map((a) => ({ ...a, direction: a.z > 0 ? "high" : "low" }));
}

function toPeriodMonth(raw: string): string {
  if (!raw) return "";
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  const ymd = raw.match(/^(\d{4})-(\d{2})-\d{2}$/); if (ymd) return `${ymd[1]}-${ymd[2]}`;
  const mdy = raw.match(/^(\d{1,2})\/\d{1,2}\/(\d{4})$/); if (mdy) return `${mdy[2]}-${mdy[1]!.padStart(2, "0")}`;
  const ymdS = raw.match(/^(\d{4})\/(\d{2})\/\d{2}$/); if (ymdS) return `${ymdS[1]}-${ymdS[2]}`;
  const mon = raw.match(/^([A-Za-z]{3})[-\s](\d{2,4})$/);
  if (mon) { const mo = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(mon[1]!.toLowerCase())+1; if(mo>0){const yr=mon[2]!.length===2?`20${mon[2]}`:mon[2]!;return `${yr}-${String(mo).padStart(2,"0")}`;} }
  return raw;
}

function groupByMonth(periods: string[], revenues: number[], expenses: number[], ebitdas: number[]) {
  const map: Record<string, {revenue: number; expenses: number; ebitda: number}> = {};
  for (let i = 0; i < periods.length; i++) {
    const key = toPeriodMonth(periods[i] ?? ""); if (!key) continue;
    const acc = map[key] ?? {revenue:0,expenses:0,ebitda:0};
    acc.revenue+=revenues[i]??0; acc.expenses+=expenses[i]??0; acc.ebitda+=ebitdas[i]??0; map[key]=acc;
  }
  const s = Object.entries(map).sort(([a],[b])=>a<b?-1:1);
  return {periods:s.map(([k])=>k),revenues:s.map(([,v])=>v.revenue),expenses:s.map(([,v])=>v.expenses),ebitdas:s.map(([,v])=>v.ebitda)};
}

function nextPeriodLabel(label: string): string {
  const m = label.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const d = new Date(parseInt(m[1]!), parseInt(m[2]!) - 1 + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  const q = label.match(/^(\d{4})-Q(\d)$/);
  if (q) {
    const yr = parseInt(q[1]!), qn = parseInt(q[2]!);
    return qn < 4 ? `${yr}-Q${qn + 1}` : `${yr + 1}-Q1`;
  }
  return `${label}+1`;
}

const DEMO_PERIODS  = ["2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03"];
const DEMO_REVENUE  = [769782,812000,855000,900000,917573,1035105,1042000,1068892,1105000];
const DEMO_EXPENSES = [536801,550000,561000,568000,574952,756133,670000,689112,710000];

let cache: { ts: number; data: unknown } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function computeInsights(revenues: number[], expenses: number[], ebitdas: number[], periods: string[], dataSource: "real" | "demo") {
  const n = revenues.length;
  const revReg = linReg(revenues);
  const expReg = linReg(expenses);
  const ebiReg = linReg(ebitdas);
  const dir = (s: number) => (Math.abs(s) < 1000 ? "flat" : s > 0 ? "up" : "down");

  const firstRev = revenues[0] ?? 1, lastRev = revenues[n - 1] ?? 1;
  const lastExp = expenses[n - 1] ?? 0;
  const lastEbi = ebitdas[n - 1] ?? 0;
  const revenueGrowthPct = firstRev > 0 ? ((lastRev - firstRev) / firstRev) * 100 : 0;
  const growthPerPeriod = n > 1 ? revenueGrowthPct / (n - 1) : 0;
  const ebitdaMarginPct = lastRev > 0 ? (lastEbi / lastRev) * 100 : 0;
  const grossMarginPct = lastRev > 0 ? ((lastRev - lastExp) / lastRev) * 100 : 0;
  const ruleOf40 = growthPerPeriod + ebitdaMarginPct;
  const burnMultiple = lastRev > 0 ? lastExp / lastRev : 999;

  const FORECAST_N = 3;
  const fcstRevYs = Array.from({ length: FORECAST_N }, (_, k) => Math.round(revReg.slope * (n + k) + revReg.intercept));
  const fcstExpYs = Array.from({ length: FORECAST_N }, (_, k) => Math.round(expReg.slope * (n + k) + expReg.intercept));
  const revResiduals = revenues.map((y, i) => Math.abs(y - (revReg.slope * i + revReg.intercept)));
  const revStd = Math.sqrt(revResiduals.reduce((a, b) => a + b * b, 0) / Math.max(revResiduals.length, 1));

  let lastLabel = periods[n - 1] ?? "";
  const fcstPeriods: string[] = [];
  for (let k = 0; k < FORECAST_N; k++) { lastLabel = nextPeriodLabel(lastLabel); fcstPeriods.push(lastLabel); }

  const anomalies = [
    ...zAnomalies(revenues, periods, "revenue"),
    ...zAnomalies(expenses, periods, "expenses"),
  ].slice(0, 5);

  const grade = (v: number, t: number, hi: boolean): "A"|"B"|"C"|"D" => {
    const r = hi ? v / t : t / (v || 0.001);
    return r >= 1.1 ? "A" : r >= 0.85 ? "B" : r >= 0.6 ? "C" : "D";
  };

  const goals = {
    ruleOf40:     { value: parseFloat(ruleOf40.toFixed(1)),         target: 40, grade: grade(ruleOf40, 40, true) },
    grossMargin:  { value: parseFloat(grossMarginPct.toFixed(1)),   target: 75, grade: grade(grossMarginPct, 75, true) },
    burnMultiple: { value: parseFloat(burnMultiple.toFixed(2)),     target: 1,  grade: grade(burnMultiple, 1, false) },
    revenueGrowth:{ value: parseFloat(revenueGrowthPct.toFixed(1)), target: 20, grade: grade(revenueGrowthPct, 20, true) },
  };

  let narrative = "Insufficient data to generate analysis. Import more financial periods to unlock AI insights.";
  try {
    const stats = { periodCount: n, firstPeriod: periods[0], lastPeriod: periods[n-1], revenueGrowthPct: goals.revenueGrowth.value, grossMarginPct: goals.grossMargin.value, ebitdaMarginPct: parseFloat(ebitdaMarginPct.toFixed(1)), ruleOf40: goals.ruleOf40.value, burnMultiple: goals.burnMultiple.value, revTrend: dir(revReg.slope), forecastNextPeriodRevenue: fcstRevYs[0] ?? 0, anomalyCount: anomalies.length, dataSource };
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 200,
      messages: [{ role: "user", content: `You are a senior investment analyst at iNi (Invent N Invest). Financial metrics:\n${JSON.stringify(stats, null, 2)}\n\nWrite exactly 3 sentences (no bullets): 1. Most significant revenue/growth trend and what it signals. 2. Biggest risk or opportunity with the specific metric. 3. Whether on track for goals, referencing Rule of 40. Be specific with numbers. Max 80 words.` }],
    });
    narrative = resp.choices[0]?.message?.content?.trim() ?? narrative;
  } catch (e) { console.error("[insights] OpenAI:", (e as Error).message); }

  return {
    dataSource, periodCount: n, latestPeriod: periods[n - 1] ?? "",
    trends: {
      revenue:  { slope: Math.round(revReg.slope), direction: dir(revReg.slope), r2: parseFloat(revReg.r2.toFixed(2)), growthPct: goals.revenueGrowth.value },
      expenses: { slope: Math.round(expReg.slope), direction: dir(expReg.slope), r2: parseFloat(expReg.r2.toFixed(2)) },
      ebitda:   { slope: Math.round(ebiReg.slope), direction: dir(ebiReg.slope), r2: parseFloat(ebiReg.r2.toFixed(2)) },
    },
    forecast: {
      periods: fcstPeriods, revenue: fcstRevYs, expenses: fcstExpYs,
      confidenceRange: fcstRevYs.map((v) => ({ low: Math.round(v - revStd), high: Math.round(v + revStd) })),
    },
    anomalies,
    goals,
    narrative,
  };
}

router.get("/insights/snapshot", async (_req, res): Promise<void> => {
  if (cache && Date.now() - cache.ts < CACHE_TTL) { res.json(cache.data); return; }
  try {
    const rows = await db.select().from(financialSnapshots).orderBy(asc(financialSnapshots.sortOrder));
    let revenues: number[], expenses: number[], ebitdas: number[], periods: string[], dataSource: "real" | "demo";
    if (rows.length >= 3) {
      const rR = rows.map((r) => r.revenue), rE = rows.map((r) => r.expenses);
      const rB = rows.map((r) => r.ebitda),  rP = rows.map((r) => r.period);
      const g = groupByMonth(rP, rR, rE, rB);
      revenues = g.revenues; expenses = g.expenses; ebitdas = g.ebitdas; periods = g.periods;
      dataSource = "real";
    } else {
      revenues = DEMO_REVENUE; expenses = DEMO_EXPENSES;
      ebitdas  = DEMO_REVENUE.map((r,i) => r - DEMO_EXPENSES[i]!);
      periods  = DEMO_PERIODS; dataSource = "demo";
    }
    const result = await computeInsights(revenues, expenses, ebitdas, periods, dataSource);
    cache = { ts: Date.now(), data: result };
    res.json(result);
  } catch (e) {
    console.error("[insights] DB error:", e);
    const ebi = DEMO_REVENUE.map((r,i) => r - DEMO_EXPENSES[i]!);
    res.json(await computeInsights(DEMO_REVENUE, DEMO_EXPENSES, ebi, DEMO_PERIODS, "demo"));
  }
});

export default router;
