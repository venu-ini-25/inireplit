import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getPool, extractPath } from "../_utils.js";

const STAGES = ["sourcing", "nda", "due_diligence", "negotiation", "closing", "closed", "passed"] as const;

const MOCK_DEALS = [
  { id: "deal_001", companyName: "Meridian Analytics", industry: "Data & Analytics", dealType: "acquisition", stage: "due_diligence", dealSize: 45000000, valuation: 52000000, targetRevenue: 7200000, assignedTo: "Sarah Chen", priority: "high", createdAt: "2025-01-15T00:00:00Z", updatedAt: "2025-03-20T00:00:00Z", closingDate: "2025-06-30T00:00:00Z", ndaSigned: true, dataRoomAccess: true },
  { id: "deal_002", companyName: "PulseAI", industry: "AI / ML", dealType: "investment", stage: "negotiation", dealSize: 18000000, valuation: 72000000, targetRevenue: 2800000, assignedTo: "Priya Nair", priority: "high", createdAt: "2025-02-01T00:00:00Z", updatedAt: "2025-03-28T00:00:00Z", closingDate: "2025-05-15T00:00:00Z", ndaSigned: true, dataRoomAccess: true },
  { id: "deal_003", companyName: "GreenRoute Logistics", industry: "Supply Chain", dealType: "investment", stage: "due_diligence", dealSize: 12000000, valuation: 48000000, targetRevenue: 3100000, assignedTo: "Marcus Williams", priority: "medium", createdAt: "2025-02-15T00:00:00Z", updatedAt: "2025-03-15T00:00:00Z", closingDate: "2025-07-30T00:00:00Z", ndaSigned: true, dataRoomAccess: false },
  { id: "deal_004", companyName: "NexaHealth", industry: "HealthTech", dealType: "investment", stage: "nda", dealSize: 8000000, valuation: 28000000, targetRevenue: 1200000, assignedTo: "Venu Vegi", priority: "medium", createdAt: "2025-03-01T00:00:00Z", updatedAt: "2025-03-30T00:00:00Z", closingDate: "2025-09-01T00:00:00Z", ndaSigned: true, dataRoomAccess: false },
  { id: "deal_005", companyName: "QuantumEdge", industry: "Fintech", dealType: "investment", stage: "sourcing", dealSize: 22000000, valuation: 88000000, targetRevenue: 4100000, assignedTo: "Sarah Chen", priority: "low", createdAt: "2025-03-10T00:00:00Z", updatedAt: "2025-04-01T00:00:00Z", closingDate: null, ndaSigned: false, dataRoomAccess: false },
  { id: "deal_006", companyName: "CartaView", industry: "Legal Tech", dealType: "acquisition", stage: "closing", dealSize: 62000000, valuation: 72000000, targetRevenue: 9400000, assignedTo: "Marcus Williams", priority: "high", createdAt: "2024-10-01T00:00:00Z", updatedAt: "2025-04-02T00:00:00Z", closingDate: "2025-04-30T00:00:00Z", ndaSigned: true, dataRoomAccess: true },
];

const MOCK_DEAL_DETAIL = {
  id: "deal_001", companyName: "Meridian Analytics", industry: "Data & Analytics", dealType: "acquisition", stage: "due_diligence", dealSize: 45000000, valuation: 52000000, targetRevenue: 7200000, assignedTo: "Sarah Chen", priority: "high", createdAt: "2025-01-15T00:00:00Z", updatedAt: "2025-03-20T00:00:00Z", closingDate: "2025-06-30T00:00:00Z", ndaSigned: true, dataRoomAccess: true,
  overview: "SaaS analytics platform targeting enterprise finance teams. $45M all-cash acquisition. Strong ARR of $7.2M with 112% NRR.",
  thesis: "Cross-sell iNi platform to Meridian's 200+ enterprise customers. Accelerate product roadmap by 12 months with Meridian's analytics IP.",
  financials: { arr: 7200000, nrr: 112, growth: 68, ebitda: -420000 },
  synergies: [{ type: "Revenue Synergy", value: "$2.1M", confidence: "High" }, { type: "Cost Elimination", value: "$840K", confidence: "Medium" }, { type: "Customer Cross-sell", value: "$3.4M", confidence: "Medium" }],
  contacts: [{ name: "Alex Rivera", role: "CEO", email: "alex@meridian.io" }, { name: "Kim Park", role: "CFO", email: "kim@meridian.io" }, { name: "Sarah Chen", role: "Lead Partner (iNi)", email: "sarah@inventninvest.com" }],
  documents: [{ name: "NDA — Meridian Analytics.pdf", type: "NDA", date: "Jan 15, 2025", size: "180 KB" }, { name: "LOI — Draft v2.docx", type: "LOI", date: "Feb 10, 2025", size: "240 KB" }, { name: "Meridian — CIM.pdf", type: "CIM", date: "Feb 20, 2025", size: "4.2 MB" }],
  dueDiligenceItems: [{ category: "Governance & Legal", item: "NDA executed", status: "completed", assignedTo: "Legal Team", dueDate: "2025-01-15T00:00:00Z" }, { category: "Financial & Accounting", item: "QoE analysis complete", status: "completed", assignedTo: "Sarah Chen", dueDate: "2025-03-20T00:00:00Z" }, { category: "Technology & Operations", item: "Technical architecture review", status: "in_progress", assignedTo: "Tech Advisor", dueDate: "2025-04-10T00:00:00Z" }],
  timeline: [{ event: "Initial Outreach", date: "2025-01-10T00:00:00Z", status: "completed" }, { event: "NDA Signed", date: "2025-01-15T00:00:00Z", status: "completed" }, { event: "DD Complete", date: "2025-04-30T00:00:00Z", status: "pending" }, { event: "Close", date: "2025-06-30T00:00:00Z", status: "pending" }],
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  const email = await requireAuth(req, res);
  if (!email) return;

  const pathParts = extractPath(req, "/api/deals");
  const sub = pathParts.join("/");

  // GET /api/deals (list)
  if (pathParts.length === 0 && req.method === "GET") {
    const { stage, type } = req.query as { stage?: string; type?: string };
    const db = getPool();
    try {
      const { rows } = await db.query(`SELECT * FROM deals ORDER BY created_at DESC`);
      let list: typeof MOCK_DEALS | Record<string, unknown>[] = rows.length > 0
        ? rows.map((d: Record<string, unknown>) => ({ id: d.id, companyName: d.company_name, industry: d.industry, dealType: d.deal_type, stage: d.stage, dealSize: d.deal_size, valuation: d.valuation, targetRevenue: d.target_revenue, assignedTo: d.assigned_to, priority: d.priority, createdAt: d.created_at, updatedAt: d.updated_at, closingDate: d.closing_date, ndaSigned: d.nda_signed, dataRoomAccess: d.data_room_access }))
        : [...MOCK_DEALS];
      if (stage) list = list.filter((d) => (d as { stage: string }).stage === stage);
      if (type) list = list.filter((d) => (d as { dealType: string }).dealType === type);
      return ok(res, list);
    } catch {
      let list: typeof MOCK_DEALS | Record<string, unknown>[] = [...MOCK_DEALS];
      if (stage) list = list.filter((d) => d.stage === stage);
      if (type) list = list.filter((d) => d.dealType === type);
      return ok(res, list);
    }
  }

  // GET /api/deals/pipeline-summary
  if (sub === "pipeline-summary" && req.method === "GET") {
    const db = getPool();
    try {
      const { rows } = await db.query(`SELECT stage, deal_size FROM deals`);
      const list = rows.length > 0
        ? rows.map((d: Record<string, unknown>) => ({ stage: String(d.stage), dealSize: Number(d.deal_size) }))
        : MOCK_DEALS.map(d => ({ stage: d.stage, dealSize: d.dealSize }));
      const byStage = STAGES.map((stage) => { const sd = list.filter((d) => d.stage === stage); return { stage, count: sd.length, value: sd.reduce((s, d) => s + d.dealSize, 0) }; });
      return ok(res, { totalDeals: list.length, totalValue: list.reduce((s, d) => s + d.dealSize, 0), byStage, avgTimeToClose: 4.2, dealsClosedThisYear: list.filter((d) => d.stage === "closed").length, valueClosedThisYear: list.filter((d) => d.stage === "closed").reduce((s, d) => s + d.dealSize, 0) });
    } catch {
      const byStage = STAGES.map((stage) => { const sd = MOCK_DEALS.filter((d) => d.stage === stage); return { stage, count: sd.length, value: sd.reduce((s, d) => s + d.dealSize, 0) }; });
      return ok(res, { totalDeals: MOCK_DEALS.length, totalValue: MOCK_DEALS.reduce((s, d) => s + d.dealSize, 0), byStage, avgTimeToClose: 4.2, dealsClosedThisYear: 0, valueClosedThisYear: 0 });
    }
  }

  // GET /api/deals/:id
  if (pathParts.length === 1 && req.method === "GET") {
    const id = pathParts[0];
    const db = getPool();
    try {
      const { rows } = await db.query(`SELECT * FROM deals WHERE id = $1 LIMIT 1`, [id]);
      if (rows.length > 0) {
        const d = rows[0] as Record<string, unknown>;
        return ok(res, { id: d.id, companyName: d.company_name, industry: d.industry, dealType: d.deal_type, stage: d.stage, dealSize: d.deal_size, valuation: d.valuation, targetRevenue: d.target_revenue, assignedTo: d.assigned_to, priority: d.priority, createdAt: d.created_at, updatedAt: d.updated_at, closingDate: d.closing_date, ndaSigned: d.nda_signed, dataRoomAccess: d.data_room_access, overview: d.overview || "", thesis: d.thesis || "", financials: d.financials ?? { arr: 0, nrr: 100, growth: 0, ebitda: 0 }, synergies: d.synergies ?? [], contacts: d.contacts ?? [], documents: d.documents ?? [], dueDiligenceItems: d.due_diligence_items ?? [], timeline: d.timeline ?? [] });
      }
    } catch {}
    const mock = MOCK_DEALS.find(d => d.id === id);
    return ok(res, mock ? { ...mock, ...MOCK_DEAL_DETAIL, id: mock.id, companyName: mock.companyName } : MOCK_DEAL_DETAIL);
  }

  err(res, "Not found", 404);
}
