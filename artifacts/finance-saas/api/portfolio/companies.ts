import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getPool } from "../_utils.js";

const MOCK_COMPANIES = [
  { id: "co_001", name: "NovaPay", industry: "Fintech", stage: "series_b", revenue: 8400000, valuation: 62000000, growthRate: 48.2, employees: 94, location: "San Francisco, CA", status: "active", dataVerified: true, ndaSigned: true, logo: "", ownership: "18.5%", arr: "$8.4M", irr: "31.2%", moic: "2.4x", lastValDate: "Oct 2024" },
  { id: "co_002", name: "CloudOps Pro", industry: "SaaS / Infrastructure", stage: "series_a", revenue: 3200000, valuation: 28000000, growthRate: 72.1, employees: 41, location: "Austin, TX", status: "active", dataVerified: true, ndaSigned: true, logo: "", ownership: "22.0%", arr: "$3.2M", irr: "24.8%", moic: "1.9x", lastValDate: "Sep 2024" },
  { id: "co_003", name: "HealthVault", industry: "HealthTech", stage: "series_a", revenue: 5100000, valuation: 38000000, growthRate: 31.4, employees: 68, location: "Boston, MA", status: "monitoring", dataVerified: false, ndaSigned: true, logo: "", ownership: "15.2%", arr: "$5.1M", irr: "18.4%", moic: "1.6x", lastValDate: "Jul 2024" },
  { id: "co_004", name: "DataStream AI", industry: "AI / ML", stage: "series_b", revenue: 12800000, valuation: 95000000, growthRate: 88.6, employees: 127, location: "New York, NY", status: "active", dataVerified: true, ndaSigned: true, logo: "", ownership: "22.3%", arr: "$12.8M", irr: "28.4%", moic: "3.1x", lastValDate: "Aug 2024" },
  { id: "co_005", name: "RetailEdge", industry: "Retail Tech", stage: "growth", revenue: 22500000, valuation: 145000000, growthRate: 19.3, employees: 204, location: "Chicago, IL", status: "active", dataVerified: true, ndaSigned: true, logo: "", ownership: "9.8%", arr: "$22.5M", irr: "22.1%", moic: "2.8x", lastValDate: "Nov 2024" },
  { id: "co_006", name: "LogiChain", industry: "Supply Chain", stage: "series_a", revenue: 2900000, valuation: 21000000, growthRate: 43.2, employees: 34, location: "Seattle, WA", status: "active", dataVerified: true, ndaSigned: false, logo: "", ownership: "18.0%", arr: "$2.9M", irr: "21.6%", moic: "1.5x", lastValDate: "Jun 2024" },
  { id: "co_007", name: "EduCore", industry: "EdTech", stage: "seed", revenue: 800000, valuation: 8000000, growthRate: 95.0, employees: 18, location: "Denver, CO", status: "active", dataVerified: false, ndaSigned: false, logo: "", ownership: "25.0%", arr: "$0.8M", irr: "N/A%", moic: "1.2x", lastValDate: "Oct 2024" },
  { id: "co_008", name: "FinBridge", industry: "Fintech", stage: "growth", revenue: 38000000, valuation: 210000000, growthRate: 27.1, employees: 320, location: "New York, NY", status: "active", dataVerified: true, ndaSigned: true, logo: "", ownership: "7.4%", arr: "$38.0M", irr: "34.8%", moic: "4.2x", lastValDate: "Dec 2024" },
];

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }
  const email = await requireAuth(req, res);
  if (!email) return;

  const db = getPool();
  try {
    const { rows } = await db.query(`SELECT * FROM companies ORDER BY name ASC`);

    if (rows.length > 0) {
      ok(res, rows.map((c: Record<string, unknown>) => ({
        id: c.id, name: c.name, industry: c.industry, stage: c.stage,
        revenue: c.revenue, valuation: c.valuation, growthRate: c.growth_rate,
        employees: c.employees, location: c.location, status: c.status,
        dataVerified: c.data_verified, ndaSigned: c.nda_signed, logo: c.logo || "",
        ownership: c.ownership, arr: c.arr, irr: c.irr, moic: c.moic,
        lastValDate: c.last_val_date,
        lastUpdated: c.updated_at ?? c.created_at,
      })));
    } else {
      ok(res, MOCK_COMPANIES.map((c) => ({
        ...c,
        lastUpdated: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
      })));
    }
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
