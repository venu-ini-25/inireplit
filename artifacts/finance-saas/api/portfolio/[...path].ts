import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getPool } from "../_utils.js";

const MOCK_COMPANIES = [
  { id: "co_001", name: "NovaPay", industry: "Fintech", stage: "series_b", revenue: 8400000, valuation: 62000000, growthRate: 48.2, employees: 94, location: "San Francisco, CA", status: "active", dataVerified: true, ndaSigned: true, logo: "", ownership: "18.5%", arr: "$8.4M", irr: "31.2%", moic: "2.4x", lastValDate: "Oct 2024" },
  { id: "co_002", name: "CloudOps Pro", industry: "SaaS / Infrastructure", stage: "series_a", revenue: 3200000, valuation: 28000000, growthRate: 72.1, employees: 41, location: "Austin, TX", status: "active", dataVerified: true, ndaSigned: true, logo: "", ownership: "22.0%", arr: "$3.2M", irr: "24.8%", moic: "1.9x", lastValDate: "Sep 2024" },
  { id: "co_003", name: "HealthVault", industry: "HealthTech", stage: "series_a", revenue: 5100000, valuation: 38000000, growthRate: 31.4, employees: 68, location: "Boston, MA", status: "monitoring", dataVerified: false, ndaSigned: true, logo: "", ownership: "15.2%", arr: "$5.1M", irr: "18.4%", moic: "1.6x", lastValDate: "Jul 2024" },
  { id: "co_004", name: "DataStream AI", industry: "AI / ML", stage: "series_b", revenue: 12800000, valuation: 95000000, growthRate: 88.6, employees: 127, location: "New York, NY", status: "active", dataVerified: true, ndaSigned: true, logo: "", ownership: "22.3%", arr: "$12.8M", irr: "28.4%", moic: "3.1x", lastValDate: "Aug 2024" },
  { id: "co_005", name: "RetailEdge", industry: "Retail Tech", stage: "growth", revenue: 22500000, valuation: 145000000, growthRate: 19.3, employees: 204, location: "Chicago, IL", status: "active", dataVerified: true, ndaSigned: true, logo: "", ownership: "9.8%", arr: "$22.5M", irr: "22.1%", moic: "2.8x", lastValDate: "Nov 2024" },
  { id: "co_006", name: "CyberShield", industry: "Cybersecurity", stage: "series_a", revenue: 4200000, valuation: 32000000, growthRate: 61.8, employees: 52, location: "Austin, TX", status: "active", dataVerified: true, ndaSigned: true, logo: "", ownership: "19.1%", arr: "$4.2M", irr: "26.7%", moic: "2.2x", lastValDate: "Oct 2024" },
  { id: "co_007", name: "EduCore", industry: "EdTech", stage: "seed", revenue: 820000, valuation: 9500000, growthRate: 95.2, employees: 18, location: "Denver, CO", status: "active", dataVerified: false, ndaSigned: true, logo: "", ownership: "28.4%", arr: "$820K", irr: "N/A", moic: "1.2x", lastValDate: "Jun 2024" },
  { id: "co_008", name: "GreenRoute", industry: "Supply Chain", stage: "series_a", revenue: 6800000, valuation: 45000000, growthRate: 42.1, employees: 76, location: "Seattle, WA", status: "active", dataVerified: true, ndaSigned: true, logo: "", ownership: "17.6%", arr: "$6.8M", irr: "21.3%", moic: "1.8x", lastValDate: "Sep 2024" },
];

const QUARTERS = ["Q1 24", "Q2 24", "Q3 24", "Q4 24"];
function makeTrend(start: number, end: number) {
  return QUARTERS.map((q, i) => ({ q, v: parseFloat((start + (end - start) * (i / 3)).toFixed(2)) }));
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  const email = await requireAuth(req, res);
  if (!email) return;

  const pathParts = Array.isArray(req.query.path) ? req.query.path as string[] : typeof req.query.path === "string" ? [req.query.path] : [];
  const sub = pathParts.join("/");

  // GET /api/portfolio/summary
  if (sub === "summary" && req.method === "GET") {
    const db = getPool();
    try {
      const { rows } = await db.query(`SELECT * FROM companies ORDER BY name ASC`);
      if (rows.length > 0) {
        const total = rows.length;
        const totalValue = rows.reduce((s: number, c: Record<string, number>) => s + (c.valuation ?? 0), 0);
        const active = rows.filter((c: Record<string, string>) => c.status === "active").length;
        const avgGrowth = rows.reduce((s: number, c: Record<string, number>) => s + (c.growth_rate ?? 0), 0) / total;
        const stageBreakdown: Record<string, number> = {};
        for (const c of rows as Record<string, string>[]) { stageBreakdown[c.stage] = (stageBreakdown[c.stage] ?? 0) + 1; }
        return ok(res, { totalCompanies: total, totalPortfolioValue: totalValue, activeInvestments: active, averageGrowthRate: parseFloat(avgGrowth.toFixed(1)), irr: 26.4, moic: 2.1, stageBreakdown: Object.entries(stageBreakdown).map(([stage, count]) => ({ stage, count })) });
      }
    } catch {}
    return ok(res, { totalCompanies: 8, totalPortfolioValue: 454500000, activeInvestments: 7, averageGrowthRate: 82, irr: 26.4, moic: 2.1, stageBreakdown: [{ stage: "seed", count: 1 }, { stage: "series_a", count: 5 }, { stage: "series_b", count: 2 }] });
  }

  // GET /api/portfolio/companies
  if (sub === "companies" && req.method === "GET") {
    const db = getPool();
    try {
      const { rows } = await db.query(`SELECT * FROM companies ORDER BY name ASC`);
      if (rows.length > 0) return ok(res, rows.map((c: Record<string, unknown>) => ({ id: c.id, name: c.name, industry: c.industry, stage: c.stage, revenue: Number(c.revenue), valuation: Number(c.valuation), growthRate: Number(c.growth_rate), employees: Number(c.employees), location: c.location, status: c.status, dataVerified: c.data_verified, ndaSigned: c.nda_signed, logo: c.logo || "", ownership: c.ownership ?? "N/A", arr: c.arr ?? `$${(Number(c.revenue) / 1000000).toFixed(1)}M`, irr: c.irr ?? "N/A", moic: c.moic ?? "N/A", lastValDate: c.last_val_date ?? "N/A" })));
    } catch {}
    return ok(res, MOCK_COMPANIES);
  }

  // GET /api/portfolio/kpis
  if (sub === "kpis" && req.method === "GET") {
    const { period = "YTD", companyId } = req.query as { period?: string; companyId?: string };
    const db = getPool();
    try {
      const { rows } = await db.query(companyId ? `SELECT * FROM companies WHERE id = $1 LIMIT 1` : `SELECT * FROM companies ORDER BY name ASC LIMIT 1`, companyId ? [companyId] : []);
      const company = rows[0] as Record<string, number | string> | undefined;
      const revenue = company ? Number(company.revenue) : 8400000;
      const growthRate = company ? Number(company.growth_rate) : 48.2;
      const employees = company ? Number(company.employees) : 94;
      const companyName = company ? String(company.name) : "NovaPay";
      return ok(res, { period, companyName, metrics: [{ name: "Revenue", value: revenue, unit: "$", change: growthRate, trend: "up" }, { name: "ARR", value: Math.floor(revenue * 1.08), unit: "$", change: 48.2, trend: "up" }, { name: "Gross Margin", value: 74.2, unit: "%", change: 1.8, trend: "up" }, { name: "EBITDA", value: Math.floor(revenue * 0.18), unit: "$", change: 22.4, trend: "up" }, { name: "Burn Rate", value: Math.floor(revenue * 0.054), unit: "$", change: -8.2, trend: "down" }, { name: "Cash Runway", value: 18, unit: "months", change: 3, trend: "up" }, { name: "Headcount", value: employees, unit: "", change: 12, trend: "up" }, { name: "NRR", value: 118, unit: "%", change: 3.4, trend: "up" }, { name: "Rule of 40", value: 92, unit: "", change: 14, trend: "up" }] });
    } catch (e) {
      return err(res, (e as Error).message, 500);
    }
  }

  // GET /api/portfolio/:id
  if (pathParts.length === 1 && req.method === "GET") {
    const id = pathParts[0];
    const db = getPool();
    try {
      const { rows } = await db.query(`SELECT * FROM companies WHERE id = $1 LIMIT 1`, [id]);
      if (rows.length > 0) {
        const company = rows[0] as Record<string, unknown>;
        const revenue = Number(company.revenue);
        const investors = Array.isArray(company.investors) ? company.investors : [];
        const arrTrend = Array.isArray(company.arr_trend) && (company.arr_trend as unknown[]).length > 0 ? company.arr_trend : makeTrend(revenue * 0.1 / 1000000, revenue / 1000000);
        const headcountTrend = Array.isArray(company.headcount_trend) && (company.headcount_trend as unknown[]).length > 0 ? company.headcount_trend : QUARTERS.map((q, i) => ({ q, v: Math.max(5, Number(company.employees ?? 20) - 20 + i * 3) }));
        const burnTrend = Array.isArray(company.burn_trend) && (company.burn_trend as unknown[]).length > 0 ? company.burn_trend : QUARTERS.map((q, i) => ({ q, v: parseFloat((0.3 + i * 0.1).toFixed(2)) }));
        return ok(res, { id: company.id, name: company.name, industry: company.industry, stage: company.stage, revenue, valuation: Number(company.valuation), growthRate: Number(company.growth_rate), employees: Number(company.employees), location: company.location, status: company.status, dataVerified: company.data_verified, ndaSigned: company.nda_signed, logo: company.logo || "", founded: company.founded, ownership: company.ownership ?? "N/A", arr: company.arr ?? `$${(revenue / 1000000).toFixed(1)}M`, arrGrowthPct: company.arr_growth_pct ?? Number(company.growth_rate), irr: company.irr ?? "N/A", moic: company.moic ?? "N/A", lastValDate: company.last_val_date ?? "N/A", investors: investors.length > 0 ? investors : ["iNi Capital"], arrTrend, headcountTrend, burnTrend, financials: { revenue, expenses: Math.floor(revenue * 0.72), ebitda: Math.floor(revenue * 0.18), cashOnHand: Math.floor(revenue * 1.4), burnRate: Math.floor(revenue * 0.054), runway: 18 }, kpis: [{ name: "ARR", value: Math.floor(revenue * 1.08), unit: "$", change: Number(company.growth_rate ?? 48), trend: "up" }, { name: "MRR Growth", value: parseFloat((Number(company.growth_rate ?? 48) / 12).toFixed(1)), unit: "%", change: 2.1, trend: "up" }, { name: "Gross Margin", value: 74.2, unit: "%", change: 1.8, trend: "up" }, { name: "Net Burn", value: Math.floor(revenue * 0.054), unit: "$", change: -8.2, trend: "down" }, { name: "Runway", value: 18, unit: "months", change: 3, trend: "up" }, { name: "Headcount", value: Number(company.employees), unit: "", change: 12, trend: "up" }, { name: "NRR", value: 118, unit: "%", change: 3.4, trend: "up" }, { name: "CAC Payback", value: 14, unit: "months", change: -2, trend: "down" }] });
      }
      const mock = MOCK_COMPANIES.find(c => c.id === id) ?? MOCK_COMPANIES[0];
      return ok(res, { ...mock, arrTrend: makeTrend(1.2, mock.revenue / 1000000), headcountTrend: QUARTERS.map((q, i) => ({ q, v: Math.max(5, (mock.employees ?? 20) - 10 + i * 3) })), burnTrend: QUARTERS.map((q, i) => ({ q, v: parseFloat((0.3 + i * 0.1).toFixed(2)) })), financials: { revenue: mock.revenue, expenses: Math.floor(mock.revenue * 0.72), ebitda: Math.floor(mock.revenue * 0.18), cashOnHand: Math.floor(mock.revenue * 1.4), burnRate: Math.floor(mock.revenue * 0.054), runway: 18 }, kpis: [{ name: "ARR", value: Math.floor(mock.revenue * 1.08), unit: "$", change: mock.growthRate, trend: "up" }] });
    } catch (e) {
      return err(res, (e as Error).message, 500);
    }
  }

  err(res, "Not found", 404);
}
