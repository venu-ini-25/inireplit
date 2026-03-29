import { Router, type IRouter } from "express";
import {
  GetOperationsMetricsResponse,
  GetProductMetricsResponse,
  GetMarketingMetricsResponse,
  GetSalesMetricsResponse,
  GetPeopleMetricsResponse,
  GetCashFlowMetricsResponse,
  GetCashFlowMetricsQueryParams,
  GetSpendingAnalyticsResponse,
  GetSpendingAnalyticsQueryParams,
} from "@workspace/api-zod";
import { db, metricsSnapshots } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

async function getMetricValues(category: string): Promise<Map<string, number>> {
  try {
    const rows = await db
      .select()
      .from(metricsSnapshots)
      .where(eq(metricsSnapshots.category, category));
    return new Map(rows.map((r) => [r.metricKey, r.value]));
  } catch (err) {
    console.warn(`[metrics/${category}] DB query failed, using mock data:`, (err as Error).message);
    return new Map();
  }
}

router.get("/metrics/operations", async (_req, res) => {
  const dbMetrics = await getMetricValues("operations");
  const data = GetOperationsMetricsResponse.parse({
    totalHeadcount: dbMetrics.get("totalHeadcount") ?? 89,
    monthlyBurnM: dbMetrics.get("monthlyBurnM") ?? 3.5,
    cashRunwayMonths: dbMetrics.get("cashRunwayMonths") ?? 14,
    grossMarginPct: dbMetrics.get("grossMarginPct") ?? 81.4,
    headcountTrend: [
      { month: "Jan", hc: 48 }, { month: "Feb", hc: 52 }, { month: "Mar", hc: 55 },
      { month: "Apr", hc: 58 }, { month: "May", hc: 62 }, { month: "Jun", hc: 67 },
      { month: "Jul", hc: 71 }, { month: "Aug", hc: 74 }, { month: "Sep", hc: 78 },
      { month: "Oct", hc: 82 }, { month: "Nov", hc: 85 }, { month: "Dec", hc: 89 },
    ],
    burnRunway: [
      { month: "Jan", burn: 2.1, runway: 22 }, { month: "Feb", burn: 2.3, runway: 20 },
      { month: "Mar", burn: 2.4, runway: 19 }, { month: "Apr", burn: 2.6, runway: 18 },
      { month: "May", burn: 2.7, runway: 18 }, { month: "Jun", burn: 2.9, runway: 17 },
      { month: "Jul", burn: 3.0, runway: 17 }, { month: "Aug", burn: 3.1, runway: 16 },
      { month: "Sep", burn: 3.2, runway: 16 }, { month: "Oct", burn: 3.3, runway: 15 },
      { month: "Nov", burn: 3.4, runway: 15 }, { month: "Dec", burn: 3.5, runway: 14 },
    ],
    unitEconomics: [
      { metric: "Revenue per Employee", value: "$287K", prev: "$264K", delta: 8.7, good: true },
      { metric: "Gross Margin", value: "81.4%", prev: "78.2%", delta: 3.2, good: true },
      { metric: "CAC Payback Period", value: "14 months", prev: "18 months", delta: -22.2, good: true },
      { metric: "ARR per Sales Rep", value: "$1.4M", prev: "$1.1M", delta: 27.3, good: true },
      { metric: "Support Tickets / Employee", value: "4.2", prev: "5.1", delta: -17.6, good: true },
      { metric: "G&A as % of Revenue", value: "11.2%", prev: "13.8%", delta: -18.8, good: true },
      { metric: "Net Revenue Retention", value: "118%", prev: "112%", delta: 5.4, good: true },
      { metric: "Magic Number", value: "1.4x", prev: "1.1x", delta: 27.3, good: true },
    ],
  });
  res.json(data);
});

router.get("/metrics/product", (_req, res) => {
  const data = GetProductMetricsResponse.parse({
    dauCount: 9800,
    mauCount: 33400,
    dauMauRatio: 29.3,
    churnRatePct: 2.1,
    engagementTrend: [
      { month: "Jan", dau: 4200, mau: 18400 }, { month: "Feb", dau: 4800, mau: 19200 },
      { month: "Mar", dau: 5100, mau: 20100 }, { month: "Apr", dau: 5600, mau: 21400 },
      { month: "May", dau: 6100, mau: 22800 }, { month: "Jun", dau: 6800, mau: 24200 },
      { month: "Jul", dau: 7200, mau: 25600 }, { month: "Aug", dau: 7600, mau: 26900 },
      { month: "Sep", dau: 8100, mau: 28400 }, { month: "Oct", dau: 8700, mau: 30100 },
      { month: "Nov", dau: 9200, mau: 31800 }, { month: "Dec", dau: 9800, mau: 33400 },
    ],
    featureAdoption: [
      { feature: "Cash Flow Dashboard", adoption: 84 },
      { feature: "Portfolio Analytics", adoption: 76 },
      { feature: "M&A Deal Tracker", adoption: 61 },
      { feature: "Expense Reports", adoption: 58 },
      { feature: "Benchmark Compare", adoption: 47 },
      { feature: "AI Insights", adoption: 39 },
      { feature: "Data Export", adoption: 33 },
    ],
    churnWaterfall: [
      { name: "Start", value: 312, type: "base" },
      { name: "New", value: 48, type: "pos" },
      { name: "Expansion", value: 22, type: "pos" },
      { name: "Contraction", value: -14, type: "neg" },
      { name: "Churn", value: -24, type: "neg" },
      { name: "End", value: 344, type: "base" },
    ],
  });
  res.json(data);
});

router.get("/metrics/marketing", (_req, res) => {
  const data = GetMarketingMetricsResponse.parse({
    totalMQLs: 1600,
    blendedCAC: 740,
    marketingPipelineM: 3.1,
    avgCampaignROI: "4.4x",
    cacByChannel: [
      { channel: "Organic / SEO", cac: 420, leads: 340, color: "#22C55E" },
      { channel: "Content / Blog", cac: 580, leads: 210, color: "#2563EB" },
      { channel: "Paid Search", cac: 1240, leads: 480, color: "#EF4444" },
      { channel: "Social Ads", cac: 980, leads: 290, color: "#D97706" },
      { channel: "Webinars", cac: 720, leads: 160, color: "#7C3AED" },
      { channel: "Partner Referral", cac: 380, leads: 120, color: "#0891B2" },
    ],
    leadFunnel: [
      { stage: "Website Visits", value: 48200 },
      { stage: "MQL", value: 1600 },
      { stage: "SQL", value: 480 },
      { stage: "Opportunity", value: 192 },
      { stage: "Closed Won", value: 64 },
    ],
    campaigns: [
      { name: "Q4 ABM Campaign", channel: "Email", spend: 12000, leads: 184, pipeline: 820000, roi: "6.8x" },
      { name: "Finance Summit Sponsorship", channel: "Event", spend: 25000, leads: 96, pipeline: 640000, roi: "2.6x" },
      { name: "CFO Playbook Content", channel: "Content", spend: 8000, leads: 210, pipeline: 440000, roi: "5.5x" },
      { name: "Google Ads — FinanceSaaS", channel: "Paid Search", spend: 18000, leads: 380, pipeline: 560000, roi: "3.1x" },
      { name: "LinkedIn Retargeting", channel: "Social", spend: 9000, leads: 142, pipeline: 320000, roi: "3.6x" },
      { name: "Partner Co-Marketing", channel: "Partner", spend: 6000, leads: 88, pipeline: 290000, roi: "4.8x" },
    ],
    attribution: [
      { name: "Organic / SEO", value: 28, color: "#22C55E" },
      { name: "Paid Search", value: 24, color: "#EF4444" },
      { name: "Content", value: 19, color: "#2563EB" },
      { name: "Social", value: 14, color: "#D97706" },
      { name: "Events", value: 9, color: "#7C3AED" },
      { name: "Partner", value: 6, color: "#0891B2" },
    ],
  });
  res.json(data);
});

router.get("/metrics/sales", (_req, res) => {
  const data = GetSalesMetricsResponse.parse({
    totalBookingsK: 10100,
    avgDealSizeK: 48,
    winRatePct: 28.4,
    quotaAttainmentPct: 108,
    arrBridge: [
      { name: "Open ARR", value: 8200, type: "base" },
      { name: "New Logos", value: 1840, type: "pos" },
      { name: "Expansion", value: 920, type: "pos" },
      { name: "Contraction", value: -380, type: "neg" },
      { name: "Churn", value: -480, type: "neg" },
      { name: "Close ARR", value: 10100, type: "base" },
    ],
    pipeline: [
      { stage: "Prospecting", count: 124, value: 4800 },
      { stage: "Qualified", count: 68, value: 3200 },
      { stage: "Demo/Eval", count: 41, value: 2400 },
      { stage: "Proposal", count: 22, value: 1800 },
      { stage: "Negotiation", count: 11, value: 1200 },
      { stage: "Closed Won", count: 8, value: 960 },
    ],
    bookings: [
      { month: "Jan", quota: 600, actual: 520 },
      { month: "Feb", quota: 650, actual: 640 },
      { month: "Mar", quota: 700, actual: 760 },
      { month: "Apr", quota: 750, actual: 710 },
      { month: "May", quota: 800, actual: 840 },
      { month: "Jun", quota: 850, actual: 900 },
      { month: "Jul", quota: 900, actual: 870 },
      { month: "Aug", quota: 950, actual: 980 },
      { month: "Sep", quota: 1000, actual: 1080 },
      { month: "Oct", quota: 1050, actual: 1020 },
      { month: "Nov", quota: 1100, actual: 1180 },
      { month: "Dec", quota: 1150, actual: 1240 },
    ],
    acvBySegment: [
      { segment: "Enterprise", acv: 148000, deals: 12 },
      { segment: "Mid-Market", acv: 52000, deals: 34 },
      { segment: "SMB", acv: 14000, deals: 88 },
      { segment: "Startup", acv: 8000, deals: 56 },
    ],
  });
  res.json(data);
});

router.get("/metrics/people", (_req, res) => {
  const data = GetPeopleMetricsResponse.parse({
    totalHeadcount: 89,
    openRoles: 14,
    attritionRatePct: 10.8,
    avgTenureMonths: 22.4,
    headcountByDept: [
      { dept: "Engineering", hc: 34, color: "#2563EB" },
      { dept: "Sales", hc: 18, color: "#22C55E" },
      { dept: "Marketing", hc: 10, color: "#7C3AED" },
      { dept: "G&A", hc: 12, color: "#D97706" },
      { dept: "Product", hc: 11, color: "#0891B2" },
      { dept: "Support", hc: 4, color: "#64748B" },
    ],
    hiringPlan: [
      { month: "Jan", actual: 3, plan: 4 }, { month: "Feb", actual: 4, plan: 4 },
      { month: "Mar", actual: 5, plan: 5 }, { month: "Apr", actual: 3, plan: 4 },
      { month: "May", actual: 6, plan: 5 }, { month: "Jun", actual: 5, plan: 6 },
      { month: "Jul", actual: 4, plan: 5 }, { month: "Aug", actual: 7, plan: 6 },
      { month: "Sep", actual: 4, plan: 5 }, { month: "Oct", actual: 5, plan: 5 },
      { month: "Nov", actual: 6, plan: 6 }, { month: "Dec", actual: 7, plan: 6 },
    ],
    attrition: [
      { dept: "Engineering", rate: 8.2 }, { dept: "Sales", rate: 14.6 },
      { dept: "Marketing", rate: 10.1 }, { dept: "G&A", rate: 6.4 },
      { dept: "Product", rate: 7.8 }, { dept: "Support", rate: 16.2 },
    ],
    compensation: [
      { dept: "Engineering", salary: 148000, bonus: 18000, equity: 42000 },
      { dept: "Sales", salary: 92000, bonus: 38000, equity: 18000 },
      { dept: "Marketing", salary: 112000, bonus: 16000, equity: 22000 },
      { dept: "G&A", salary: 104000, bonus: 14000, equity: 16000 },
      { dept: "Product", salary: 138000, bonus: 16000, equity: 36000 },
      { dept: "Support", salary: 72000, bonus: 8000, equity: 8000 },
    ],
  });
  res.json(data);
});

router.get("/metrics/cashflow", (req, res) => {
  const query = GetCashFlowMetricsQueryParams.parse(req.query);
  const _period = query.period || "Monthly";

  const data = GetCashFlowMetricsResponse.parse({
    totalInflowsM: 56.8,
    totalOutflowsM: 44.1,
    netCashFlowM: 12.7,
    cashOnHandM: 18.4,
    monthly: [
      { month: "Jan", inflows: 3200, outflows: 2800, net: 400 },
      { month: "Feb", inflows: 3600, outflows: 3100, net: 500 },
      { month: "Mar", inflows: 3100, outflows: 2950, net: 150 },
      { month: "Apr", inflows: 4200, outflows: 3400, net: 800 },
      { month: "May", inflows: 4500, outflows: 3700, net: 800 },
      { month: "Jun", inflows: 4800, outflows: 4000, net: 800 },
      { month: "Jul", inflows: 5100, outflows: 4100, net: 1000 },
      { month: "Aug", inflows: 4700, outflows: 4200, net: 500 },
      { month: "Sep", inflows: 5300, outflows: 4400, net: 900 },
      { month: "Oct", inflows: 5800, outflows: 4600, net: 1200 },
      { month: "Nov", inflows: 6100, outflows: 4800, net: 1300 },
      { month: "Dec", inflows: 6400, outflows: 5000, net: 1400 },
    ],
    waterfall: [
      { name: "Opening", value: 5200, type: "balance" },
      { name: "Operating CF", value: 8400, type: "positive" },
      { name: "Investing CF", value: -3200, type: "negative" },
      { name: "Financing CF", value: 2100, type: "positive" },
      { name: "Closing", value: 12500, type: "balance" },
    ],
    breakdown: [
      { category: "Customer Receipts", type: "Operating", q1: 9200, q2: 11400, q3: 14200, q4: 18300 },
      { category: "Supplier Payments", type: "Operating", q1: -4100, q2: -5200, q3: -6100, q4: -7800 },
      { category: "Payroll & Benefits", type: "Operating", q1: -2800, q2: -2900, q3: -3100, q4: -3400 },
      { category: "Equipment Purchase", type: "Investing", q1: -1200, q2: -800, q3: -600, q4: -600 },
      { category: "Software & IP", type: "Investing", q1: -400, q2: -600, q3: -400, q4: -600 },
      { category: "Loan Drawdown", type: "Financing", q1: 2000, q2: 0, q3: 0, q4: 100 },
      { category: "Loan Repayment", type: "Financing", q1: -500, q2: -500, q3: -500, q4: -600 },
    ],
  });
  res.json(data);
});

router.get("/analytics/spending", (req, res) => {
  const query = GetSpendingAnalyticsQueryParams.parse(req.query);
  const period = query.period ?? "30d";
  const multiplier =
    period === "7d" ? 0.25 : period === "90d" ? 3 : period === "1y" ? 12 : 1;

  const categories = [
    { name: "Payroll & Benefits", amount: Math.floor(18400 * multiplier), percentage: 51.1, color: "#2563EB", change: 5.2 },
    { name: "Software & SaaS", amount: Math.floor(5200 * multiplier), percentage: 14.4, color: "#7C3AED", change: -2.1 },
    { name: "Marketing & Ads", amount: Math.floor(4100 * multiplier), percentage: 11.4, color: "#0891B2", change: 12.8 },
    { name: "Office & Facilities", amount: Math.floor(2800 * multiplier), percentage: 7.8, color: "#D97706", change: -1.4 },
    { name: "Travel & Entertainment", amount: Math.floor(1600 * multiplier), percentage: 4.4, color: "#DC2626", change: -8.3 },
    { name: "Professional Services", amount: Math.floor(2100 * multiplier), percentage: 5.8, color: "#059669", change: 0.7 },
    { name: "Other", amount: Math.floor(1800 * multiplier), percentage: 5.0, color: "#64748B", change: 1.2 },
  ];
  const totalSpending = categories.reduce((s, c) => s + c.amount, 0);
  const daysInPeriod = period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;

  const data = GetSpendingAnalyticsResponse.parse({
    categories,
    deptBudgets: [
      { dept: "Engineering", budget: 12000, actual: 11200 },
      { dept: "Sales", budget: 8000, actual: 8900 },
      { dept: "Marketing", budget: 6000, actual: 5800 },
      { dept: "G&A", budget: 4500, actual: 4100 },
      { dept: "Product", budget: 5500, actual: 5200 },
      { dept: "Support", budget: 2000, actual: 1800 },
    ],
    lineItems: [
      { vendor: "Workday", category: "Software & SaaS", dept: "HR", amount: 1200, status: "Recurring", date: "Dec 1, 2024" },
      { vendor: "AWS", category: "Software & SaaS", dept: "Engineering", amount: 3800, status: "Recurring", date: "Dec 1, 2024" },
      { vendor: "Salesforce", category: "Software & SaaS", dept: "Sales", amount: 2100, status: "Recurring", date: "Dec 1, 2024" },
      { vendor: "Lattice", category: "Software & SaaS", dept: "HR", amount: 900, status: "Recurring", date: "Dec 1, 2024" },
      { vendor: "Google Ads", category: "Marketing & Ads", dept: "Marketing", amount: 4100, status: "Variable", date: "Nov 30, 2024" },
      { vendor: "JW Marriott", category: "Travel & Entertainment", dept: "Sales", amount: 1600, status: "One-time", date: "Nov 28, 2024" },
      { vendor: "WeWork", category: "Office & Facilities", dept: "G&A", amount: 2800, status: "Recurring", date: "Dec 1, 2024" },
      { vendor: "Deloitte", category: "Professional Services", dept: "Finance", amount: 2100, status: "One-time", date: "Nov 25, 2024" },
    ],
    totalSpending,
    averageDaily: Math.floor(totalSpending / daysInPeriod),
    topCategory: "Payroll & Benefits",
  });
  res.json(data);
});

export default router;
