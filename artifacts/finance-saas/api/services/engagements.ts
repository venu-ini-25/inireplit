import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getPool } from "../_utils.js";

const MOCK_ENGAGEMENTS = [
  { id: "eng_001", clientName: "NovaPay", serviceType: "fpa", status: "active", startDate: "2025-01-01T00:00:00Z", endDate: "2025-06-30T00:00:00Z", fee: 72000, progress: 48, lead: "Venu Vegi", description: "Monthly FP&A support including budget vs actuals, rolling forecast, and board pack preparation.", deliverables: [], team: [] },
  { id: "eng_002", clientName: "DataStream AI", serviceType: "strategic_finance", status: "active", startDate: "2024-10-01T00:00:00Z", endDate: "2025-03-31T00:00:00Z", fee: 95000, progress: 85, lead: "Sarah Chen", description: "Series B fundraising readiness, operating model enhancement, and investor materials.", deliverables: [], team: [] },
  { id: "eng_003", clientName: "GreenRoute Logistics", serviceType: "due_diligence", status: "active", startDate: "2025-02-01T00:00:00Z", endDate: null, fee: 48000, progress: 62, lead: "Priya Nair", description: "Buy-side financial due diligence and QoE analysis for acquisition target.", deliverables: [], team: [] },
  { id: "eng_004", clientName: "RetailEdge", serviceType: "corp_dev", status: "active", startDate: "2025-01-15T00:00:00Z", endDate: null, fee: 120000, progress: 35, lead: "Marcus Williams", description: "M&A advisory for add-on acquisition strategy and target identification.", deliverables: [], team: [] },
  { id: "eng_005", clientName: "HealthVault", serviceType: "valuation", status: "completed", startDate: "2024-11-01T00:00:00Z", endDate: "2024-12-31T00:00:00Z", fee: 35000, progress: 100, lead: "Venu Vegi", description: "409A valuation and cap table optimization analysis.", deliverables: [], team: [] },
  { id: "eng_006", clientName: "EduCore", serviceType: "fpa", status: "proposal", startDate: "2025-04-01T00:00:00Z", endDate: null, fee: 24000, progress: 0, lead: "Sarah Chen", description: "Financial model buildout and seed-round financial projections.", deliverables: [], team: [] },
];

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }
  const email = await requireAuth(req, res);
  if (!email) return;

  const db = getPool();
  try {
    const { rows } = await db.query(`SELECT * FROM engagements ORDER BY created_at DESC`);
    if (rows.length > 0) {
      ok(res, rows.map((r: Record<string, unknown>) => ({
        id: r.id, clientName: r.client_name, serviceType: r.service_type, status: r.status,
        startDate: r.start_date, endDate: r.end_date, fee: r.fee, progress: r.progress,
        lead: r.lead, description: r.description,
        deliverables: r.deliverables ?? [], team: r.team ?? [],
      })));
    } else {
      ok(res, MOCK_ENGAGEMENTS);
    }
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
