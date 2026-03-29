import { Router, type IRouter } from "express";
import {
  GetRevenueAnalyticsResponse,
  GetRevenueAnalyticsQueryParams,
  GetBenchmarksResponse,
  GetBenchmarksQueryParams,
  GetReportsResponse,
} from "@workspace/api-zod";
import { db, financialSnapshots } from "@workspace/db";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

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

  const response = GetRevenueAnalyticsResponse.parse({
    data,
    totalRevenue,
    revenueGrowth: 48.2,
    arrGrowth: 52.6,
  });
  res.json(response);
});

router.get("/analytics/benchmarks", (req, res) => {
  const query = GetBenchmarksQueryParams.parse(req.query);
  const industry = query.industry || "SaaS";

  const response = GetBenchmarksResponse.parse({
    industry,
    metrics: [
      { label: "Gross Margin", company: 81, industry: 74, topQuartile: 85, unit: "%" },
      { label: "Net Rev Retention", company: 118, industry: 108, topQuartile: 125, unit: "%" },
      { label: "CAC Payback", company: 14, industry: 20, topQuartile: 10, unit: "months" },
      { label: "ARR Growth", company: 94, industry: 60, topQuartile: 110, unit: "%" },
      { label: "Magic Number", company: 1.4, industry: 0.9, topQuartile: 1.8, unit: "x" },
      { label: "Rule of 40", company: 68, industry: 42, topQuartile: 82, unit: "%" },
    ],
    radarData: [
      { subject: "Gross Margin", portfolio: 81, peerMedian: 74, fullMark: 100 },
      { subject: "NRR", portfolio: 94, peerMedian: 80, fullMark: 100 },
      { subject: "Efficiency", portfolio: 72, peerMedian: 55, fullMark: 100 },
      { subject: "Growth", portfolio: 85, peerMedian: 60, fullMark: 100 },
      { subject: "Retention", portfolio: 88, peerMedian: 70, fullMark: 100 },
      { subject: "Burn Rate", portfolio: 68, peerMedian: 52, fullMark: 100 },
    ],
  });
  res.json(response);
});

router.get("/analytics/reports", (_req, res) => {
  const types = ["investor_update", "financial_summary", "kpi_report", "board_deck", "due_diligence", "benchmarking"] as const;
  const statuses = ["draft", "ready", "published", "archived"] as const;
  const companies = ["NovaPay", "DataStream AI", "RetailEdge", "CloudOps Pro", "HealthVault", "SecureVault"];

  const reports = [
    { id: "rpt_001", title: "Q4 2024 Investor Update", type: "investor_update", status: "published", createdAt: "2025-01-10T00:00:00Z", updatedAt: "2025-01-14T00:00:00Z", sharedWith: 12, companyName: "Portfolio" },
    { id: "rpt_002", title: "NovaPay – Board Pack Dec 2024", type: "board_deck", status: "published", createdAt: "2024-12-20T00:00:00Z", updatedAt: "2024-12-28T00:00:00Z", sharedWith: 6, companyName: "NovaPay" },
    { id: "rpt_003", title: "DataStream AI – Monthly KPI Report", type: "kpi_report", status: "ready", createdAt: "2025-03-01T00:00:00Z", updatedAt: "2025-03-18T00:00:00Z", sharedWith: 4, companyName: "DataStream AI" },
    { id: "rpt_004", title: "Q1 2025 Portfolio Benchmarking", type: "benchmarking", status: "draft", createdAt: "2025-03-15T00:00:00Z", updatedAt: "2025-03-25T00:00:00Z", sharedWith: 0, companyName: "Portfolio" },
    { id: "rpt_005", title: "RetailEdge – FY2024 Financial Summary", type: "financial_summary", status: "published", createdAt: "2025-02-01T00:00:00Z", updatedAt: "2025-02-14T00:00:00Z", sharedWith: 8, companyName: "RetailEdge" },
    { id: "rpt_006", title: "HealthVault – Due Diligence Summary", type: "due_diligence", status: "ready", createdAt: "2025-03-10T00:00:00Z", updatedAt: "2025-03-20T00:00:00Z", sharedWith: 3, companyName: "HealthVault" },
    { id: "rpt_007", title: "CloudOps Pro – Q1 2025 KPI Report", type: "kpi_report", status: "draft", createdAt: "2025-03-20T00:00:00Z", updatedAt: "2025-03-26T00:00:00Z", sharedWith: 0, companyName: "CloudOps Pro" },
    { id: "rpt_008", title: "SecureVault – Series C Investor Update", type: "investor_update", status: "published", createdAt: "2025-02-20T00:00:00Z", updatedAt: "2025-03-01T00:00:00Z", sharedWith: 18, companyName: "SecureVault" },
  ];

  const response = GetReportsResponse.parse(reports);
  res.json(response);
});

export default router;
