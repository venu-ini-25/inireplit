import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getPool } from "../_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }
  const email = await requireAuth(req, res);
  if (!email) return;

  const { period = "YTD", companyId } = req.query as { period?: string; companyId?: string };
  const db = getPool();

  try {
    const { rows } = await db.query(
      companyId
        ? `SELECT * FROM companies WHERE id = $1 LIMIT 1`
        : `SELECT * FROM companies ORDER BY name ASC LIMIT 1`,
      companyId ? [companyId] : []
    );

    const company = rows[0] as Record<string, number> | undefined;

    const revenue = company ? Number(company.revenue) : 8400000;
    const valuation = company ? Number(company.valuation) : 62000000;
    const growthRate = company ? Number(company.growth_rate) : 48.2;
    const employees = company ? Number(company.employees) : 94;
    const companyName = company ? String(company.name) : "NovaPay";

    ok(res, {
      period,
      companyName,
      metrics: [
        { name: "Revenue", value: revenue, unit: "$", change: growthRate, trend: "up" },
        { name: "ARR", value: Math.floor(revenue * 1.08), unit: "$", change: 48.2, trend: "up" },
        { name: "Gross Margin", value: 74.2, unit: "%", change: 1.8, trend: "up" },
        { name: "EBITDA", value: Math.floor(revenue * 0.18), unit: "$", change: 22.4, trend: "up" },
        { name: "Burn Rate", value: Math.floor(revenue * 0.054), unit: "$", change: -8.2, trend: "down" },
        { name: "Cash Runway", value: 18, unit: "months", change: 3, trend: "up" },
        { name: "Headcount", value: employees, unit: "", change: 12, trend: "up" },
        { name: "NRR", value: 118, unit: "%", change: 3.4, trend: "up" },
        { name: "GRR", value: 94, unit: "%", change: 0.8, trend: "up" },
        { name: "CAC", value: 4800, unit: "$", change: -6.2, trend: "down" },
        { name: "LTV", value: 52000, unit: "$", change: 11.4, trend: "up" },
        { name: "Rule of 40", value: 92, unit: "", change: 14, trend: "up" },
      ],
    });
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
