import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getPool } from "../_utils.js";

const QUARTERS = ["Q1 '23", "Q2 '23", "Q3 '23", "Q4 '23", "Q1 '24", "Q2 '24", "Q3 '24", "Q4 '24"];

function makeTrend(start: number, end: number) {
  return QUARTERS.map((q, i) => ({
    q, v: parseFloat((start + ((end - start) * i) / (QUARTERS.length - 1)).toFixed(2)),
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }
  const email = await requireAuth(req, res);
  if (!email) return;

  const id = req.query["id"] as string;
  const db = getPool();

  try {
    const { rows } = await db.query(
      id ? `SELECT * FROM companies WHERE id = $1 LIMIT 1` : `SELECT * FROM companies ORDER BY name ASC LIMIT 1`,
      id ? [id] : []
    );

    let company = rows[0] as Record<string, unknown> | undefined;

    if (!company) {
      company = {
        id: "co_001", name: "NovaPay", industry: "Fintech", stage: "series_b",
        revenue: 8400000, valuation: 62000000, growth_rate: 48.2, employees: 94,
        location: "San Francisco, CA", status: "active", data_verified: true, nda_signed: true,
        founded: 2019, ownership: "18.5%", arr: "$8.4M", arr_growth_pct: 94,
        irr: "31.2%", moic: "2.4x", last_val_date: "Oct 2024",
        investors: ["Sequoia Capital", "Andreessen Horowitz", "iNi Capital"],
        arr_trend: makeTrend(1.2, 8.4),
        headcount_trend: QUARTERS.map((q, i) => ({ q, v: 30 + i * 9 })),
        burn_trend: [
          { q: "Q1 '23", v: 1.4 }, { q: "Q2 '23", v: 1.6 }, { q: "Q3 '23", v: 1.8 },
          { q: "Q4 '23", v: 2.0 }, { q: "Q1 '24", v: 1.9 }, { q: "Q2 '24", v: 1.7 },
          { q: "Q3 '24", v: 1.4 }, { q: "Q4 '24", v: 1.1 },
        ],
        logo: "",
      };
    }

    const revenue = Number(company.revenue);
    const investors = Array.isArray(company.investors) ? company.investors : [];
    const arrTrend = Array.isArray(company.arr_trend) && company.arr_trend.length > 0
      ? company.arr_trend
      : makeTrend(revenue * 0.1 / 1000000, revenue / 1000000);
    const headcountTrend = Array.isArray(company.headcount_trend) && company.headcount_trend.length > 0
      ? company.headcount_trend
      : QUARTERS.map((q, i) => ({ q, v: Math.max(5, Number(company.employees ?? 20) - 20 + i * 3) }));
    const burnTrend = Array.isArray(company.burn_trend) && company.burn_trend.length > 0
      ? company.burn_trend
      : QUARTERS.map((q, i) => ({ q, v: parseFloat((0.3 + i * 0.1).toFixed(2)) }));

    ok(res, {
      id: company.id, name: company.name, industry: company.industry, stage: company.stage,
      revenue, valuation: Number(company.valuation), growthRate: Number(company.growth_rate),
      employees: Number(company.employees), location: company.location, status: company.status,
      dataVerified: company.data_verified, ndaSigned: company.nda_signed, logo: company.logo || "",
      founded: company.founded,
      ownership: company.ownership ?? "N/A",
      arr: company.arr ?? `$${(revenue / 1000000).toFixed(1)}M`,
      arrGrowthPct: company.arr_growth_pct ?? Number(company.growth_rate),
      irr: company.irr ?? "N/A",
      moic: company.moic ?? "N/A",
      lastValDate: company.last_val_date ?? "N/A",
      investors: investors.length > 0 ? investors : ["iNi Capital"],
      arrTrend,
      headcountTrend,
      burnTrend,
      financials: {
        revenue, expenses: Math.floor(revenue * 0.72),
        ebitda: Math.floor(revenue * 0.18),
        cashOnHand: Math.floor(revenue * 1.4),
        burnRate: Math.floor(revenue * 0.054),
        runway: 18,
      },
      kpis: [
        { name: "ARR", value: Math.floor(revenue * 1.08), unit: "$", change: Number(company.growth_rate ?? 48), trend: "up" },
        { name: "MRR Growth", value: parseFloat((Number(company.growth_rate ?? 48) / 12).toFixed(1)), unit: "%", change: 2.1, trend: "up" },
        { name: "Gross Margin", value: 74.2, unit: "%", change: 1.8, trend: "up" },
        { name: "Net Burn", value: Math.floor(revenue * 0.054), unit: "$", change: -8.2, trend: "down" },
        { name: "Runway", value: 18, unit: "months", change: 3, trend: "up" },
        { name: "Headcount", value: Number(company.employees), unit: "", change: 12, trend: "up" },
        { name: "NRR", value: 118, unit: "%", change: 3.4, trend: "up" },
        { name: "CAC Payback", value: 14, unit: "months", change: -2, trend: "down" },
      ],
    });
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
