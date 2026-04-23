import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getPool } from "../_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }
  const email = await requireAuth(req, res);
  if (!email) return;

  const db = getPool();
  try {
    const { rows } = await db.query(`SELECT * FROM engagements`);
    if (rows.length > 0) {
      const active = rows.filter((r: Record<string, string>) => r.status === "active").length;
      const completed = rows.filter((r: Record<string, string>) => r.status === "completed").length;
      const totalRevenue = rows.reduce((s: number, r: Record<string, number>) => s + (r.fee ?? 0), 0);
      const avgSize = rows.length > 0 ? Math.floor(totalRevenue / rows.length) : 0;
      const byType: Record<string, { count: number; revenue: number }> = {};
      for (const row of rows as Record<string, string | number>[]) {
        const t = String(row.service_type);
        if (!byType[t]) byType[t] = { count: 0, revenue: 0 };
        byType[t].count++;
        byType[t].revenue += Number(row.fee);
      }
      ok(res, {
        activeEngagements: active, totalRevenue, avgEngagementSize: avgSize,
        completedThisYear: completed, revenueChange: 0,
        engagementsByType: Object.entries(byType).map(([type, v]) => ({ type, ...v })),
        revenueMonthly: [],
      });
    } else {
      ok(res, {
        activeEngagements: 4, totalRevenue: 394000, avgEngagementSize: 65667,
        completedThisYear: 1, revenueChange: 42.8,
        engagementsByType: [
          { type: "fpa", count: 2, revenue: 96000 },
          { type: "strategic_finance", count: 1, revenue: 95000 },
          { type: "corp_dev", count: 1, revenue: 120000 },
          { type: "due_diligence", count: 1, revenue: 48000 },
          { type: "valuation", count: 1, revenue: 35000 },
        ],
        revenueMonthly: [
          { month: "Jul", revenue: 28000 }, { month: "Aug", revenue: 32000 },
          { month: "Sep", revenue: 28000 }, { month: "Oct", revenue: 36000 },
          { month: "Nov", revenue: 42000 }, { month: "Dec", revenue: 48000 },
          { month: "Jan", revenue: 54000 }, { month: "Feb", revenue: 58000 },
          { month: "Mar", revenue: 62000 }, { month: "Apr", revenue: 68000 },
        ],
      });
    }
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
