import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getPool } from "../_utils.js";

const MOCK_DEALS = [
  { id: "deal_001", companyName: "Meridian Analytics", industry: "Data & Analytics", dealType: "acquisition", stage: "due_diligence", dealSize: 45000000, valuation: 52000000, targetRevenue: 7200000, assignedTo: "Sarah Chen", priority: "high", createdAt: "2025-01-15T00:00:00Z", updatedAt: "2025-03-20T00:00:00Z", closingDate: "2025-06-30T00:00:00Z", ndaSigned: true, dataRoomAccess: true },
  { id: "deal_002", companyName: "PulseAI", industry: "AI / ML", dealType: "investment", stage: "negotiation", dealSize: 18000000, valuation: 72000000, targetRevenue: 2800000, assignedTo: "Priya Nair", priority: "high", createdAt: "2025-02-01T00:00:00Z", updatedAt: "2025-03-28T00:00:00Z", closingDate: "2025-05-15T00:00:00Z", ndaSigned: true, dataRoomAccess: true },
  { id: "deal_003", companyName: "GreenRoute Logistics", industry: "Supply Chain", dealType: "investment", stage: "due_diligence", dealSize: 12000000, valuation: 48000000, targetRevenue: 3100000, assignedTo: "Marcus Williams", priority: "medium", createdAt: "2025-02-15T00:00:00Z", updatedAt: "2025-03-15T00:00:00Z", closingDate: "2025-07-30T00:00:00Z", ndaSigned: true, dataRoomAccess: false },
  { id: "deal_004", companyName: "NexaHealth", industry: "HealthTech", dealType: "investment", stage: "nda", dealSize: 8000000, valuation: 28000000, targetRevenue: 1200000, assignedTo: "Venu Vegi", priority: "medium", createdAt: "2025-03-01T00:00:00Z", updatedAt: "2025-03-30T00:00:00Z", closingDate: "2025-09-01T00:00:00Z", ndaSigned: true, dataRoomAccess: false },
  { id: "deal_005", companyName: "QuantumEdge", industry: "Fintech", dealType: "investment", stage: "sourcing", dealSize: 22000000, valuation: 88000000, targetRevenue: 4100000, assignedTo: "Sarah Chen", priority: "low", createdAt: "2025-03-10T00:00:00Z", updatedAt: "2025-04-01T00:00:00Z", closingDate: null, ndaSigned: false, dataRoomAccess: false },
  { id: "deal_006", companyName: "CartaView", industry: "Legal Tech", dealType: "acquisition", stage: "closing", dealSize: 62000000, valuation: 72000000, targetRevenue: 9400000, assignedTo: "Marcus Williams", priority: "high", createdAt: "2024-10-01T00:00:00Z", updatedAt: "2025-04-02T00:00:00Z", closingDate: "2025-04-30T00:00:00Z", ndaSigned: true, dataRoomAccess: true },
];

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }
  const email = await requireAuth(req, res);
  if (!email) return;

  const { stage, type } = req.query as { stage?: string; type?: string };
  const db = getPool();

  try {
    const { rows } = await db.query(`SELECT * FROM deals ORDER BY created_at DESC`);

    let list: typeof MOCK_DEALS | Record<string, unknown>[];
    if (rows.length > 0) {
      list = rows.map((d: Record<string, unknown>) => ({
        id: d.id, companyName: d.company_name, industry: d.industry,
        dealType: d.deal_type, stage: d.stage, dealSize: d.deal_size,
        valuation: d.valuation, targetRevenue: d.target_revenue,
        assignedTo: d.assigned_to, priority: d.priority,
        createdAt: d.created_at, updatedAt: d.updated_at,
        closingDate: d.closing_date, ndaSigned: d.nda_signed, dataRoomAccess: d.data_room_access,
      }));
    } else {
      list = [...MOCK_DEALS];
    }

    if (stage) list = list.filter((d) => (d as { stage: string }).stage === stage);
    if (type) list = list.filter((d) => (d as { dealType: string }).dealType === type);

    ok(res, list);
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
