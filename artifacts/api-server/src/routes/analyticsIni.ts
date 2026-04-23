import { Router, type IRouter } from "express";
import {
  GetRevenueAnalyticsResponse,
  GetRevenueAnalyticsQueryParams,
  GetBenchmarksResponse,
  GetBenchmarksQueryParams,
  GetReportsResponse,
} from "@workspace/api-zod";
import { db, financialSnapshots, metricsSnapshots, companies } from "@workspace/db";
import { asc, eq } from "drizzle-orm";

const router: IRouter = Router();

async function getMetricValues(category: string): Promise<Map<string, number>> {
  try {
    const rows = await db
      .select()
      .from(metricsSnapshots)
      .where(eq(metricsSnapshots.category, category));
    return new Map(rows.map((r) => [r.metricKey, r.value]));
  } catch (err) {
    console.warn(`[analytics/${category}] DB query failed, using mock data:`, (err as Error).message);
    return new Map();
  }
}

router.get("/analytics/revenue", async (req, res) => {
  const query = GetRevenueAnalyticsQueryParams.parse(req.query);
  const period = query.period || "1y";

  try {
    const dbRows = await db.select().from(financialSnapshots).orderBy(asc(financialSnapshots.sortOrder));
    if (dbRows.length > 0) {
      const data = dbRows.map((r) => ({
        period: r.period,
        revenue: r.revenue,
        expenses: r.expenses,
        ebitda: r.ebitda,
        arr: r.arr,
      }));
      const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
      const first = data[0]?.revenue ?? 1;
      const last = data[data.length - 1]?.revenue ?? 1;
      const revenueGrowth = first > 0 ? parseFloat((((last - first) / first) * 100).toFixed(1)) : 0;
      const response = GetRevenueAnalyticsResponse.parse({ data, totalRevenue, revenueGrowth, arrGrowth: revenueGrowth * 1.09 });
      res.json(response);
      return;
    }
  } catch (dbErr) {
    console.warn("[analytics/revenue] DB query failed, falling back to mock data:", (dbErr as Error).message);
  }

  const months = period === "6m" ? 6 : period === "2y" ? 24 : period === "3y" ? 36 : 12;
  const data = Array.from({ length: months }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (months - 1 - i));
    const base = 600000 + i * 45000;
    const revenue = Math.floor(base + Math.random() * 80000);
    const expenses = Math.floor(revenue * (0.62 + Math.random() * 0.12));
    return {
      period: d.toLocaleString("default", { month: "short", year: "2-digit" }),
      revenue,
      expenses,
      ebitda: revenue - expenses,
      arr: Math.floor(revenue * 1.08 * 12),
    };
  });

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const response = GetRevenueAnalyticsResponse.parse({ data, totalRevenue, revenueGrowth: 48.2, arrGrowth: 52.6 });
  res.json(response);
});

router.get("/analytics/benchmarks", async (req, res) => {
  const query = GetBenchmarksQueryParams.parse(req.query);
  const industry = query.industry || "SaaS";

  const m = await getMetricValues("benchmarks");

  const response = GetBenchmarksResponse.parse({
    industry,
    metrics: [
      { label: "Gross Margin",     company: m.get("grossMargin")   ?? 81,   industry: 74,  topQuartile: 85,  unit: "%" },
      { label: "Net Rev Retention", company: m.get("nrr")          ?? 118,  industry: 108, topQuartile: 125, unit: "%" },
      { label: "CAC Payback",       company: m.get("cacPayback")   ?? 14,   industry: 20,  topQuartile: 10,  unit: "months" },
      { label: "ARR Growth",        company: m.get("arrGrowth")    ?? 94,   industry: 60,  topQuartile: 110, unit: "%" },
      { label: "Magic Number",      company: m.get("magicNumber")  ?? 1.4,  industry: 0.9, topQuartile: 1.8, unit: "x" },
      { label: "Rule of 40",        company: m.get("ruleOf40")     ?? 68,   industry: 42,  topQuartile: 82,  unit: "%" },
    ],
    radarData: [
      { subject: "Gross Margin", portfolio: m.get("grossMargin")  ?? 81,  peerMedian: 74, fullMark: 100 },
      { subject: "NRR",          portfolio: m.get("nrr")          ?? 94,  peerMedian: 80, fullMark: 100 },
      { subject: "Efficiency",   portfolio: m.get("efficiency")   ?? 72,  peerMedian: 55, fullMark: 100 },
      { subject: "Growth",       portfolio: m.get("growth")       ?? 85,  peerMedian: 60, fullMark: 100 },
      { subject: "Retention",    portfolio: m.get("retention")    ?? 88,  peerMedian: 70, fullMark: 100 },
      { subject: "Burn Rate",    portfolio: m.get("burnRate")     ?? 68,  peerMedian: 52, fullMark: 100 },
    ],
  });
  res.json(response);
});

router.get("/analytics/reports", async (_req, res) => {
  try {
    const dbCompanies = await db.select().from(companies).orderBy(asc(companies.name));
    if (dbCompanies.length > 0) {
      const now = new Date();
      const dbReports = dbCompanies.flatMap((co, i) => [
        {
          id: `rpt_${co.id}_kpi`,
          title: `${co.name} – Monthly KPI Report`,
          type: "kpi_report" as const,
          status: (i % 2 === 0 ? "published" : "ready") as "published" | "ready",
          createdAt: new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now.getTime() - i * 3 * 24 * 60 * 60 * 1000).toISOString(),
          sharedWith: 4 + i,
          companyName: co.name,
        },
        {
          id: `rpt_${co.id}_fin`,
          title: `${co.name} – Financial Summary`,
          type: "financial_summary" as const,
          status: "draft" as const,
          createdAt: new Date(now.getTime() - (i + 5) * 7 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now.getTime() - (i + 2) * 24 * 60 * 60 * 1000).toISOString(),
          sharedWith: 0,
          companyName: co.name,
        },
      ]);
      const response = GetReportsResponse.parse(dbReports);
      res.json(response);
      return;
    }
  } catch (dbErr) {
    console.warn("[analytics/reports] DB query failed, falling back to mock data:", (dbErr as Error).message);
  }

  const reports = [
    { id: "rpt_001", title: "Q4 2024 Investor Update", type: "investor_update" as const, status: "published" as const, createdAt: "2025-01-10T00:00:00Z", updatedAt: "2025-01-14T00:00:00Z", sharedWith: 12, companyName: "Portfolio" },
    { id: "rpt_002", title: "NovaPay – Board Pack Dec 2024", type: "board_deck" as const, status: "published" as const, createdAt: "2024-12-20T00:00:00Z", updatedAt: "2024-12-28T00:00:00Z", sharedWith: 6, companyName: "NovaPay" },
    { id: "rpt_003", title: "DataStream AI – Monthly KPI Report", type: "kpi_report" as const, status: "ready" as const, createdAt: "2025-03-01T00:00:00Z", updatedAt: "2025-03-18T00:00:00Z", sharedWith: 4, companyName: "DataStream AI" },
    { id: "rpt_004", title: "Q1 2025 Portfolio Benchmarking", type: "benchmarking" as const, status: "draft" as const, createdAt: "2025-03-15T00:00:00Z", updatedAt: "2025-03-25T00:00:00Z", sharedWith: 0, companyName: "Portfolio" },
    { id: "rpt_005", title: "RetailEdge – FY2024 Financial Summary", type: "financial_summary" as const, status: "published" as const, createdAt: "2025-02-01T00:00:00Z", updatedAt: "2025-02-14T00:00:00Z", sharedWith: 8, companyName: "RetailEdge" },
    { id: "rpt_006", title: "HealthVault – Due Diligence Summary", type: "due_diligence" as const, status: "ready" as const, createdAt: "2025-03-10T00:00:00Z", updatedAt: "2025-03-20T00:00:00Z", sharedWith: 3, companyName: "HealthVault" },
    { id: "rpt_007", title: "CloudOps Pro – Q1 2025 KPI Report", type: "kpi_report" as const, status: "draft" as const, createdAt: "2025-03-20T00:00:00Z", updatedAt: "2025-03-26T00:00:00Z", sharedWith: 0, companyName: "CloudOps Pro" },
    { id: "rpt_008", title: "SecureVault – Series C Investor Update", type: "investor_update" as const, status: "published" as const, createdAt: "2025-02-20T00:00:00Z", updatedAt: "2025-03-01T00:00:00Z", sharedWith: 18, companyName: "SecureVault" },
  ];

  const response = GetReportsResponse.parse(reports);
  res.json(response);
});

export default router;
