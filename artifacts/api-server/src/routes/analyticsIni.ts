import { Router, type IRouter } from "express";
import {
  GetRevenueAnalyticsResponse,
  GetRevenueAnalyticsQueryParams,
  GetBenchmarksResponse,
  GetBenchmarksQueryParams,
  GetReportsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/analytics/revenue", (req, res) => {
  const query = GetRevenueAnalyticsQueryParams.parse(req.query);
  const period = query.period || "1y";

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
      { label: "Revenue Growth", company: 48.2, industry: 28.4, topQuartile: 65.0, unit: "%" },
      { label: "Gross Margin", company: 74.2, industry: 68.5, topQuartile: 82.0, unit: "%" },
      { label: "EBITDA Margin", company: 18.4, industry: 12.1, topQuartile: 24.0, unit: "%" },
      { label: "NRR", company: 118, industry: 108, topQuartile: 130, unit: "%" },
      { label: "CAC Payback", company: 14, industry: 18, topQuartile: 10, unit: "months" },
      { label: "Rule of 40", company: 66.6, industry: 40.5, topQuartile: 89.0, unit: "" },
      { label: "Revenue / Employee", company: 198000, industry: 155000, topQuartile: 280000, unit: "$" },
      { label: "Cash Runway", company: 18, industry: 14, topQuartile: 24, unit: "months" },
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
