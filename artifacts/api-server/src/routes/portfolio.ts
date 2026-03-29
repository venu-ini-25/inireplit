import { Router, type IRouter } from "express";
import {
  GetPortfolioSummaryResponse,
  GetPortfolioCompaniesResponse,
  GetPortfolioCompanyResponse,
  GetPortfolioKpisResponse,
  GetPortfolioKpisQueryParams,
} from "@workspace/api-zod";
import { db, companies } from "@workspace/db";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

const QUARTERS = ["Q1 '23", "Q2 '23", "Q3 '23", "Q4 '23", "Q1 '24", "Q2 '24", "Q3 '24", "Q4 '24"];

function makeTrend(start: number, end: number) {
  return QUARTERS.map((q, i) => ({
    q,
    v: parseFloat((start + ((end - start) * i) / (QUARTERS.length - 1)).toFixed(2)),
  }));
}

const COMPANY_EXTRAS: Record<string, {
  founded: number; ownership: string; arr: string; arrGrowthPct: number;
  irr: string; moic: string; lastValDate: string;
  investors: string[];
  arrTrend: { q: string; v: number }[];
  headcountTrend: { q: string; v: number }[];
  burnTrend: { q: string; v: number }[];
}> = {
  co_001: {
    founded: 2019, ownership: "18.5%", arr: "$8.4M", arrGrowthPct: 94,
    irr: "31.2%", moic: "2.4x", lastValDate: "Oct 2024",
    investors: ["Sequoia Capital", "Andreessen Horowitz", "iNi Capital"],
    arrTrend: makeTrend(1.2, 8.4),
    headcountTrend: QUARTERS.map((q, i) => ({ q, v: 30 + i * 9 })),
    burnTrend: [
      { q: "Q1 '23", v: 1.4 }, { q: "Q2 '23", v: 1.6 }, { q: "Q3 '23", v: 1.8 },
      { q: "Q4 '23", v: 2.0 }, { q: "Q1 '24", v: 1.9 }, { q: "Q2 '24", v: 1.7 },
      { q: "Q3 '24", v: 1.4 }, { q: "Q4 '24", v: 1.1 },
    ],
  },
  co_002: {
    founded: 2021, ownership: "22.0%", arr: "$3.2M", arrGrowthPct: 72,
    irr: "24.8%", moic: "1.9x", lastValDate: "Sep 2024",
    investors: ["Bessemer Ventures", "iNi Capital", "500 Startups"],
    arrTrend: makeTrend(0.5, 3.2),
    headcountTrend: QUARTERS.map((q, i) => ({ q, v: 14 + i * 4 })),
    burnTrend: QUARTERS.map((q, i) => ({ q, v: parseFloat((0.5 + i * 0.1).toFixed(2)) })),
  },
  co_003: {
    founded: 2020, ownership: "15.2%", arr: "$5.1M", arrGrowthPct: 31,
    irr: "18.4%", moic: "1.6x", lastValDate: "Jul 2024",
    investors: ["General Catalyst", "iNi Capital"],
    arrTrend: makeTrend(1.8, 5.1),
    headcountTrend: QUARTERS.map((q, i) => ({ q, v: 30 + i * 6 })),
    burnTrend: QUARTERS.map((q, i) => ({ q, v: parseFloat((0.8 + i * 0.08).toFixed(2)) })),
  },
  co_004: {
    founded: 2020, ownership: "22.3%", arr: "$12.8M", arrGrowthPct: 142,
    irr: "28.4%", moic: "3.1x", lastValDate: "Aug 2024",
    investors: ["Tiger Global", "Bessemer Ventures", "iNi Capital"],
    arrTrend: makeTrend(1.8, 12.8),
    headcountTrend: QUARTERS.map((q, i) => ({ q, v: 22 + i * 15 })),
    burnTrend: [
      { q: "Q1 '23", v: 0.8 }, { q: "Q2 '23", v: 1.0 }, { q: "Q3 '23", v: 1.2 },
      { q: "Q4 '23", v: 1.4 }, { q: "Q1 '24", v: 1.6 }, { q: "Q2 '24", v: 1.5 },
      { q: "Q3 '24", v: 1.2 }, { q: "Q4 '24", v: 0.9 },
    ],
  },
  co_005: {
    founded: 2016, ownership: "9.8%", arr: "$22.5M", arrGrowthPct: 19,
    irr: "22.1%", moic: "2.8x", lastValDate: "Nov 2024",
    investors: ["KKR", "Vista Equity", "iNi Capital"],
    arrTrend: makeTrend(13.0, 22.5),
    headcountTrend: QUARTERS.map((q, i) => ({ q, v: 160 + i * 7 })),
    burnTrend: QUARTERS.map((q, i) => ({ q, v: parseFloat((2.5 - i * 0.05).toFixed(2)) })),
  },
  co_006: {
    founded: 2022, ownership: "18.0%", arr: "$2.9M", arrGrowthPct: 43,
    irr: "21.6%", moic: "1.5x", lastValDate: "Jun 2024",
    investors: ["YCombinator", "iNi Capital"],
    arrTrend: makeTrend(0.8, 2.9),
    headcountTrend: QUARTERS.map((q, i) => ({ q, v: 12 + i * 3 })),
    burnTrend: QUARTERS.map((q, i) => ({ q, v: parseFloat((0.4 + i * 0.05).toFixed(2)) })),
  },
  co_007: {
    founded: 2023, ownership: "25.0%", arr: "$0.8M", arrGrowthPct: 95,
    irr: "N/A%", moic: "1.2x", lastValDate: "Oct 2024",
    investors: ["SV Angel", "iNi Capital"],
    arrTrend: makeTrend(0.1, 0.8),
    headcountTrend: QUARTERS.map((q, i) => ({ q, v: 6 + i * 2 })),
    burnTrend: QUARTERS.map((q, i) => ({ q, v: parseFloat((0.15 + i * 0.03).toFixed(2)) })),
  },
  co_008: {
    founded: 2017, ownership: "7.4%", arr: "$38.0M", arrGrowthPct: 27,
    irr: "34.8%", moic: "4.2x", lastValDate: "Dec 2024",
    investors: ["Insight Partners", "CRV", "iNi Capital"],
    arrTrend: makeTrend(22.0, 38.0),
    headcountTrend: QUARTERS.map((q, i) => ({ q, v: 220 + i * 13 })),
    burnTrend: QUARTERS.map((q, i) => ({ q, v: parseFloat((4.0 - i * 0.15).toFixed(2)) })),
  },
};

const MOCK_COMPANIES = [
  {
    id: "co_001", name: "NovaPay", industry: "Fintech", stage: "series_b",
    revenue: 8400000, valuation: 62000000, growthRate: 48.2, employees: 94,
    location: "San Francisco, CA", status: "active", dataVerified: true, ndaSigned: true,
    lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), logo: "",
  },
  {
    id: "co_002", name: "CloudOps Pro", industry: "SaaS / Infrastructure", stage: "series_a",
    revenue: 3200000, valuation: 28000000, growthRate: 72.1, employees: 41,
    location: "Austin, TX", status: "active", dataVerified: true, ndaSigned: true,
    lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), logo: "",
  },
  {
    id: "co_003", name: "HealthVault", industry: "HealthTech", stage: "series_a",
    revenue: 5100000, valuation: 38000000, growthRate: 31.4, employees: 68,
    location: "Boston, MA", status: "monitoring", dataVerified: false, ndaSigned: true,
    lastUpdated: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), logo: "",
  },
  {
    id: "co_004", name: "DataStream AI", industry: "AI / ML", stage: "series_b",
    revenue: 12800000, valuation: 95000000, growthRate: 88.6, employees: 127,
    location: "New York, NY", status: "active", dataVerified: true, ndaSigned: true,
    lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), logo: "",
  },
  {
    id: "co_005", name: "RetailEdge", industry: "Retail Tech", stage: "growth",
    revenue: 22500000, valuation: 145000000, growthRate: 19.3, employees: 204,
    location: "Chicago, IL", status: "active", dataVerified: true, ndaSigned: true,
    lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), logo: "",
  },
  {
    id: "co_006", name: "LogiChain", industry: "Supply Chain", stage: "series_a",
    revenue: 2900000, valuation: 21000000, growthRate: 42.7, employees: 35,
    location: "Seattle, WA", status: "watchlist", dataVerified: false, ndaSigned: false,
    lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), logo: "",
  },
  {
    id: "co_007", name: "EduCore", industry: "EdTech", stage: "seed",
    revenue: 820000, valuation: 9500000, growthRate: 95.2, employees: 18,
    location: "Denver, CO", status: "active", dataVerified: false, ndaSigned: true,
    lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), logo: "",
  },
  {
    id: "co_008", name: "SecureVault", industry: "Cybersecurity", stage: "series_c",
    revenue: 38000000, valuation: 290000000, growthRate: 26.8, employees: 312,
    location: "Washington, DC", status: "active", dataVerified: true, ndaSigned: true,
    lastUpdated: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), logo: "",
  },
];

async function getCompanies() {
  try {
    const rows = await db.select().from(companies).orderBy(asc(companies.name));
    if (rows.length > 0) {
      return rows.map((c) => ({
        id: c.id,
        name: c.name,
        industry: c.industry,
        stage: c.stage,
        revenue: c.revenue,
        valuation: c.valuation,
        growthRate: c.growthRate,
        employees: c.employees,
        location: c.location,
        status: c.status,
        dataVerified: c.dataVerified,
        ndaSigned: c.ndaSigned,
        logo: c.logo,
        lastUpdated: c.updatedAt?.toISOString() ?? new Date().toISOString(),
      }));
    }
  } catch {}
  return null;
}

router.get("/portfolio/summary", async (_req, res) => {
  const dbCompanies = await getCompanies();
  const list = dbCompanies ?? MOCK_COMPANIES;
  const data = GetPortfolioSummaryResponse.parse({
    totalCompanies: list.length,
    totalAum: 688500000,
    totalRevenue: list.reduce((s, c) => s + c.revenue, 0),
    avgGrowthRate: 53.0,
    avgValuation: list.reduce((s, c) => s + c.valuation, 0) / list.length,
    totalDeals: 14,
    aumChange: 18.4,
    revenueChange: 34.2,
    growthChange: 6.1,
  });
  res.json(data);
});

router.get("/portfolio/companies", async (_req, res) => {
  const dbCompanies = await getCompanies();
  const data = GetPortfolioCompaniesResponse.parse(dbCompanies ?? MOCK_COMPANIES);
  res.json(data);
});

router.get("/portfolio/companies/:id", async (req, res) => {
  const dbCompanies = await getCompanies();
  const list = dbCompanies ?? MOCK_COMPANIES;

  const company = list.find((c) => c.id === req.params.id) ?? list[0];

  let extras = COMPANY_EXTRAS[company.id] ?? COMPANY_EXTRAS["co_001"];

  if (dbCompanies) {
    const dbRow = (await db.select().from(companies).orderBy(asc(companies.name)))
      .find((c) => c.id === company.id);
    if (dbRow) {
      extras = {
        founded: dbRow.founded ?? extras.founded,
        ownership: dbRow.ownership ?? extras.ownership,
        arr: dbRow.arr ?? extras.arr,
        arrGrowthPct: dbRow.arrGrowthPct ?? extras.arrGrowthPct,
        irr: dbRow.irr ?? extras.irr,
        moic: dbRow.moic ?? extras.moic,
        lastValDate: dbRow.lastValDate ?? extras.lastValDate,
        investors: (dbRow.investors as string[]) ?? extras.investors,
        arrTrend: (dbRow.arrTrend as { q: string; v: number }[])?.length
          ? (dbRow.arrTrend as { q: string; v: number }[])
          : extras.arrTrend,
        headcountTrend: (dbRow.headcountTrend as { q: string; v: number }[])?.length
          ? (dbRow.headcountTrend as { q: string; v: number }[])
          : extras.headcountTrend,
        burnTrend: (dbRow.burnTrend as { q: string; v: number }[])?.length
          ? (dbRow.burnTrend as { q: string; v: number }[])
          : extras.burnTrend,
      };
    }
  }

  const data = GetPortfolioCompanyResponse.parse({
    ...company,
    founded: extras.founded,
    ownership: extras.ownership,
    arr: extras.arr,
    arrGrowthPct: extras.arrGrowthPct,
    irr: extras.irr,
    moic: extras.moic,
    lastValDate: extras.lastValDate,
    investors: extras.investors,
    arrTrend: extras.arrTrend,
    headcountTrend: extras.headcountTrend,
    burnTrend: extras.burnTrend,
    capTable: [
      { investor: "Founders", shares: 4200000, percentage: 42.0, shareClass: "Common", investmentAmount: 0 },
      { investor: "iNi Capital", shares: 1800000, percentage: 18.0, shareClass: "Series B Preferred", investmentAmount: 12000000 },
      { investor: extras.investors[0] ?? "Sequoia Capital", shares: 1500000, percentage: 15.0, shareClass: "Series B Preferred", investmentAmount: 9800000 },
      { investor: extras.investors[1] ?? "Andreessen Horowitz", shares: 1000000, percentage: 10.0, shareClass: "Series A Preferred", investmentAmount: 5000000 },
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

router.get("/portfolio/kpis", async (req, res) => {
  const query = GetPortfolioKpisQueryParams.parse(req.query);
  const period = query.period || "YTD";
  const dbCompanies = await getCompanies();
  const list = dbCompanies ?? MOCK_COMPANIES;
  const company = list.find((c) => c.id === query.companyId) ?? list[0];

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
