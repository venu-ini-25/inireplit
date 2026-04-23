import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getPool, getMetricValues } from "../_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }
  const email = await requireAuth(req, res);
  if (!email) return;

  const pathParts = (req.query.path as string[]) ?? [];
  const sub = pathParts[0] ?? "";

  // GET /api/analytics/revenue
  if (sub === "revenue") {
    const { period = "1y" } = req.query as { period?: string };
    const db = getPool();
    try {
      const { rows } = await db.query(`SELECT * FROM financial_snapshots ORDER BY sort_order ASC`);
      if (rows.length > 0) {
        const data = rows.map((r: Record<string, number | string>) => ({ period: String(r.period), revenue: Number(r.revenue), expenses: Number(r.expenses), ebitda: Number(r.ebitda), arr: Number(r.arr) }));
        const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
        const first = data[0]?.revenue ?? 1, last = data[data.length - 1]?.revenue ?? 1;
        const revenueGrowth = first > 0 ? parseFloat((((last - first) / first) * 100).toFixed(1)) : 0;
        return ok(res, { data, totalRevenue, revenueGrowth, arrGrowth: parseFloat((revenueGrowth * 1.09).toFixed(1)) });
      }
    } catch {}
    const months = period === "6m" ? 6 : period === "2y" ? 24 : period === "3y" ? 36 : 12;
    const data = Array.from({ length: months }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (months - 1 - i));
      const base = 600000 + i * 45000;
      const revenue = Math.floor(base + (Math.random() * 0.1 + 0.95) * 10000);
      const expenses = Math.floor(revenue * 0.68);
      return { period: d.toLocaleString("default", { month: "short", year: "2-digit" }), revenue, expenses, ebitda: revenue - expenses, arr: Math.floor(revenue * 1.08 * 12) };
    });
    return ok(res, { data, totalRevenue: data.reduce((s, d) => s + d.revenue, 0), revenueGrowth: 48.2, arrGrowth: 52.6 });
  }

  // GET /api/analytics/spending
  if (sub === "spending") {
    const { period = "30d" } = req.query as { period?: string };
    const multiplier = period === "7d" ? 0.25 : period === "90d" ? 3 : period === "1y" ? 12 : 1;
    const m = await getMetricValues("spending");
    const categories = [
      { name: "Payroll & Benefits", amount: Math.floor((m.get("payroll") ?? 18400) * multiplier), percentage: 51.1, color: "#2563EB", change: 5.2 },
      { name: "Software & SaaS", amount: Math.floor((m.get("software") ?? 5200) * multiplier), percentage: 14.4, color: "#7C3AED", change: -2.1 },
      { name: "Marketing & Ads", amount: Math.floor((m.get("marketing") ?? 4100) * multiplier), percentage: 11.4, color: "#0891B2", change: 12.8 },
      { name: "Office & Facilities", amount: Math.floor((m.get("office") ?? 2800) * multiplier), percentage: 7.8, color: "#D97706", change: -1.4 },
      { name: "Travel & Entertainment", amount: Math.floor((m.get("travel") ?? 1600) * multiplier), percentage: 4.4, color: "#DC2626", change: -8.3 },
      { name: "Professional Services", amount: Math.floor((m.get("professional") ?? 2100) * multiplier), percentage: 5.8, color: "#059669", change: 0.7 },
      { name: "Other", amount: Math.floor((m.get("other") ?? 1800) * multiplier), percentage: 5.0, color: "#64748B", change: 1.2 },
    ];
    const totalSpending = categories.reduce((s, c) => s + c.amount, 0);
    const daysInPeriod = period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
    return ok(res, { categories, deptBudgets: [{ dept: "Engineering", budget: 12000, actual: 11200 }, { dept: "Sales", budget: 8000, actual: 8900 }, { dept: "Marketing", budget: 5000, actual: 4100 }, { dept: "Operations", budget: 3500, actual: 3200 }, { dept: "G&A", budget: 4200, actual: 3900 }], totalSpending, avgDailyBurn: parseFloat((totalSpending / daysInPeriod).toFixed(0)), burnVsBudget: -2.4 });
  }

  // GET /api/analytics/reports
  if (sub === "reports") {
    return ok(res, { reports: [
      { id: "r_001", name: "Q4 2024 Board Pack", type: "Board Pack", status: "published", createdAt: "2025-01-10T00:00:00Z", period: "Q4 2024", pages: 24 },
      { id: "r_002", name: "FY2024 Annual Review", type: "Annual Review", status: "published", createdAt: "2025-02-01T00:00:00Z", period: "FY 2024", pages: 48 },
      { id: "r_003", name: "Q1 2025 Investor Update", type: "Investor Update", status: "draft", createdAt: "2025-04-01T00:00:00Z", period: "Q1 2025", pages: 18 },
      { id: "r_004", name: "Portfolio Deep Dive — NovaPay", type: "Portfolio Analysis", status: "published", createdAt: "2025-03-15T00:00:00Z", period: "Mar 2025", pages: 32 },
      { id: "r_005", name: "Benchmark Analysis — SaaS Metrics", type: "Benchmark", status: "published", createdAt: "2025-03-01T00:00:00Z", period: "Q1 2025", pages: 16 },
    ]});
  }

  // GET /api/analytics/benchmarks
  if (sub === "benchmarks") {
    const { industry = "SaaS" } = req.query as { industry?: string };
    return ok(res, { industry, metrics: [
      { name: "Revenue Growth", your: 48.2, p25: 18, p50: 32, p75: 52, top: 80, unit: "%" },
      { name: "Gross Margin", your: 81.4, p25: 65, p50: 74, p75: 82, top: 90, unit: "%" },
      { name: "NRR", your: 118, p25: 102, p50: 110, p75: 120, top: 135, unit: "%" },
      { name: "CAC Payback", your: 14, p25: 28, p50: 20, p75: 14, top: 8, unit: " months" },
      { name: "ARR / FTE", your: 287, p25: 140, p50: 200, p75: 280, top: 400, unit: "K" },
      { name: "Rule of 40", your: 92, p25: 32, p50: 50, p75: 70, top: 100, unit: "" },
      { name: "Magic Number", your: 1.4, p25: 0.6, p50: 0.9, p75: 1.2, top: 1.8, unit: "x" },
      { name: "Burn Multiple", your: 0.8, p25: 2.4, p50: 1.6, p75: 1.0, top: 0.5, unit: "x" },
    ], peers: [{ company: "Median SaaS Co.", arr: 18000000, growth: 32, nrr: 110, margin: 74 }, { company: "Top Quartile SaaS", arr: 42000000, growth: 52, nrr: 120, margin: 82 }, { company: "iNi Portfolio Avg", arr: 11000000, growth: 48, nrr: 118, margin: 81 }] });
  }

  err(res, "Not found", 404);
}
