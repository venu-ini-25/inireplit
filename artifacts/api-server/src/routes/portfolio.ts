import { Router, type IRouter } from "express";
import {
  GetPortfolioSummaryResponse,
  GetPortfolioCompaniesResponse,
  GetPortfolioCompanyResponse,
  GetPortfolioKpisResponse,
  GetPortfolioKpisQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const COMPANIES = [
  {
    id: "co_001",
    name: "NovaPay",
    industry: "Fintech",
    stage: "series_b",
    revenue: 8400000,
    valuation: 62000000,
    growthRate: 48.2,
    employees: 94,
    location: "San Francisco, CA",
    status: "active",
    dataVerified: true,
    ndaSigned: true,
    lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    logo: null,
  },
  {
    id: "co_002",
    name: "CloudOps Pro",
    industry: "SaaS / Infrastructure",
    stage: "series_a",
    revenue: 3200000,
    valuation: 28000000,
    growthRate: 72.1,
    employees: 41,
    location: "Austin, TX",
    status: "active",
    dataVerified: true,
    ndaSigned: true,
    lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    logo: null,
  },
  {
    id: "co_003",
    name: "HealthVault",
    industry: "HealthTech",
    stage: "series_a",
    revenue: 5100000,
    valuation: 38000000,
    growthRate: 31.4,
    employees: 68,
    location: "Boston, MA",
    status: "monitoring",
    dataVerified: false,
    ndaSigned: true,
    lastUpdated: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    logo: null,
  },
  {
    id: "co_004",
    name: "DataStream AI",
    industry: "AI / ML",
    stage: "series_b",
    revenue: 12800000,
    valuation: 95000000,
    growthRate: 88.6,
    employees: 127,
    location: "New York, NY",
    status: "active",
    dataVerified: true,
    ndaSigned: true,
    lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    logo: null,
  },
  {
    id: "co_005",
    name: "RetailEdge",
    industry: "Retail Tech",
    stage: "growth",
    revenue: 22500000,
    valuation: 145000000,
    growthRate: 19.3,
    employees: 204,
    location: "Chicago, IL",
    status: "active",
    dataVerified: true,
    ndaSigned: true,
    lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    logo: null,
  },
  {
    id: "co_006",
    name: "LogiChain",
    industry: "Supply Chain",
    stage: "series_a",
    revenue: 2900000,
    valuation: 21000000,
    growthRate: 42.7,
    employees: 35,
    location: "Seattle, WA",
    status: "watchlist",
    dataVerified: false,
    ndaSigned: false,
    lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    logo: null,
  },
  {
    id: "co_007",
    name: "EduCore",
    industry: "EdTech",
    stage: "seed",
    revenue: 820000,
    valuation: 9500000,
    growthRate: 95.2,
    employees: 18,
    location: "Denver, CO",
    status: "active",
    dataVerified: false,
    ndaSigned: true,
    lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    logo: null,
  },
  {
    id: "co_008",
    name: "SecureVault",
    industry: "Cybersecurity",
    stage: "series_c",
    revenue: 38000000,
    valuation: 290000000,
    growthRate: 26.8,
    employees: 312,
    location: "Washington, DC",
    status: "active",
    dataVerified: true,
    ndaSigned: true,
    lastUpdated: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    logo: null,
  },
];

router.get("/portfolio/summary", (_req, res) => {
  const data = GetPortfolioSummaryResponse.parse({
    totalCompanies: COMPANIES.length,
    totalAum: 688500000,
    totalRevenue: COMPANIES.reduce((s, c) => s + c.revenue, 0),
    avgGrowthRate: 53.0,
    avgValuation: COMPANIES.reduce((s, c) => s + c.valuation, 0) / COMPANIES.length,
    totalDeals: 14,
    aumChange: 18.4,
    revenueChange: 34.2,
    growthChange: 6.1,
  });
  res.json(data);
});

router.get("/portfolio/companies", (_req, res) => {
  const data = GetPortfolioCompaniesResponse.parse(COMPANIES);
  res.json(data);
});

router.get("/portfolio/companies/:id", (req, res) => {
  const company = COMPANIES.find((c) => c.id === req.params.id) || COMPANIES[0];
  const data = GetPortfolioCompanyResponse.parse({
    ...company,
    capTable: [
      { investor: "Founders", shares: 4200000, percentage: 42.0, shareClass: "Common", investmentAmount: 0 },
      { investor: "iNi Capital", shares: 1800000, percentage: 18.0, shareClass: "Series B Preferred", investmentAmount: 12000000 },
      { investor: "Sequoia Capital", shares: 1500000, percentage: 15.0, shareClass: "Series B Preferred", investmentAmount: 9800000 },
      { investor: "Andreessen Horowitz", shares: 1000000, percentage: 10.0, shareClass: "Series A Preferred", investmentAmount: 5000000 },
      { investor: "ESOP Pool", shares: 800000, percentage: 8.0, shareClass: "Common", investmentAmount: 0 },
      { investor: "Angel Investors", shares: 700000, percentage: 7.0, shareClass: "Series A Preferred", investmentAmount: 2500000 },
    ],
    financials: {
      revenue: company.revenue,
      expenses: Math.floor(company.revenue * 0.72),
      ebitda: Math.floor(company.revenue * 0.18),
      cashOnHand: Math.floor(company.revenue * 1.4),
      burnRate: Math.floor(company.revenue * 0.054),
      runway: 18,
    },
    kpis: [
      { name: "ARR", value: company.revenue * 1.08, unit: "$", change: company.growthRate, trend: "up" },
      { name: "MRR Growth", value: company.growthRate / 12, unit: "%", change: 2.1, trend: "up" },
      { name: "Gross Margin", value: 74.2, unit: "%", change: 1.8, trend: "up" },
      { name: "Net Burn", value: Math.floor(company.revenue * 0.054), unit: "$", change: -8.2, trend: "down" },
      { name: "Runway", value: 18, unit: "months", change: 3, trend: "up" },
      { name: "Headcount", value: company.employees, unit: "", change: 12, trend: "up" },
      { name: "NRR", value: 118, unit: "%", change: 3.4, trend: "up" },
      { name: "CAC Payback", value: 14, unit: "months", change: -2, trend: "down" },
    ],
  });
  res.json(data);
});

router.get("/portfolio/kpis", (req, res) => {
  const query = GetPortfolioKpisQueryParams.parse(req.query);
  const period = query.period || "YTD";
  const company = COMPANIES.find((c) => c.id === query.companyId) || COMPANIES[0];

  const data = GetPortfolioKpisResponse.parse({
    period,
    companyName: company.name,
    metrics: [
      { name: "Revenue", value: company.revenue, unit: "$", change: company.growthRate, trend: "up" },
      { name: "ARR", value: company.revenue * 1.08, unit: "$", change: 48.2, trend: "up" },
      { name: "Gross Margin", value: 74.2, unit: "%", change: 1.8, trend: "up" },
      { name: "EBITDA", value: Math.floor(company.revenue * 0.18), unit: "$", change: 22.4, trend: "up" },
      { name: "Burn Rate", value: Math.floor(company.revenue * 0.054), unit: "$", change: -8.2, trend: "down" },
      { name: "Cash Runway", value: 18, unit: "months", change: 3, trend: "up" },
      { name: "Headcount", value: company.employees, unit: "", change: 12, trend: "up" },
      { name: "NRR", value: 118, unit: "%", change: 3.4, trend: "up" },
      { name: "GRR", value: 94, unit: "%", change: 0.8, trend: "up" },
      { name: "CAC", value: 4800, unit: "$", change: -6.2, trend: "down" },
      { name: "LTV", value: 52000, unit: "$", change: 11.4, trend: "up" },
      { name: "Rule of 40", value: 92, unit: "", change: 14, trend: "up" },
    ],
  });
  res.json(data);
});

export default router;
