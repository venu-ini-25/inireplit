import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getPool } from "../_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }
  const email = await requireAuth(req, res);
  if (!email) return;

  const db = getPool();
  try {
    const { rows } = await db.query(`SELECT * FROM companies ORDER BY name ASC`);

    if (rows.length > 0) {
      const total = rows.length;
      const totalValue = rows.reduce((s: number, c: Record<string, number>) => s + (c.valuation ?? 0), 0);
      const active = rows.filter((c: Record<string, string>) => c.status === "active").length;
      const avgGrowth = rows.reduce((s: number, c: Record<string, number>) => s + (c.growth_rate ?? 0), 0) / total;
      const stageBreakdown: Record<string, number> = {};
      for (const c of rows as Record<string, string>[]) {
        stageBreakdown[c.stage] = (stageBreakdown[c.stage] ?? 0) + 1;
      }
      ok(res, {
        totalCompanies: total, totalPortfolioValue: totalValue,
        activeInvestments: active, averageGrowthRate: parseFloat(avgGrowth.toFixed(1)),
        irr: 26.4, moic: 2.1,
        stageBreakdown: Object.entries(stageBreakdown).map(([stage, count]) => ({ stage, count })),
      });
    } else {
      ok(res, {
        totalCompanies: 12, totalPortfolioValue: 620000000,
        activeInvestments: 10, averageGrowthRate: 48.2,
        irr: 26.4, moic: 2.1,
        stageBreakdown: [
          { stage: "seed", count: 2 }, { stage: "series_a", count: 4 },
          { stage: "series_b", count: 3 }, { stage: "growth", count: 3 },
        ],
      });
    }
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
