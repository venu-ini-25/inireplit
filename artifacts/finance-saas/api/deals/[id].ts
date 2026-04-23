import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getPool } from "../_utils.js";

const MOCK_DEAL = {
  id: "deal_001", companyName: "Meridian Analytics", industry: "Data & Analytics",
  dealType: "acquisition", stage: "due_diligence", dealSize: 45000000, valuation: 52000000,
  targetRevenue: 7200000, assignedTo: "Sarah Chen", priority: "high",
  createdAt: "2025-01-15T00:00:00Z", updatedAt: "2025-03-20T00:00:00Z",
  closingDate: "2025-06-30T00:00:00Z", ndaSigned: true, dataRoomAccess: true,
  overview: "SaaS analytics platform targeting enterprise finance teams. $45M all-cash acquisition. Strong ARR of $7.2M with 112% NRR.",
  thesis: "Cross-sell iNi platform to Meridian's 200+ enterprise customers. Accelerate product roadmap by 12 months with Meridian's analytics IP.",
  financials: { arr: 7200000, nrr: 112, growth: 68, ebitda: -420000 },
  synergies: [
    { type: "Revenue Synergy", value: "$2.1M", confidence: "High" },
    { type: "Cost Elimination", value: "$840K", confidence: "Medium" },
    { type: "Customer Cross-sell", value: "$3.4M", confidence: "Medium" },
  ],
  contacts: [
    { name: "Alex Rivera", role: "CEO", email: "alex@meridian.io" },
    { name: "Kim Park", role: "CFO", email: "kim@meridian.io" },
    { name: "Sarah Chen", role: "Lead Partner (iNi)", email: "sarah@inventninvest.com" },
  ],
  documents: [
    { name: "NDA — Meridian Analytics.pdf", type: "NDA", date: "Jan 15, 2025", size: "180 KB" },
    { name: "LOI — Draft v2.docx", type: "LOI", date: "Feb 10, 2025", size: "240 KB" },
    { name: "Meridian — CIM.pdf", type: "CIM", date: "Feb 20, 2025", size: "4.2 MB" },
    { name: "QoE Report — EY.pdf", type: "QoE", date: "Mar 5, 2025", size: "2.8 MB" },
    { name: "Cap Table — Current.xlsx", type: "Cap Table", date: "Mar 12, 2025", size: "95 KB" },
  ],
  dueDiligenceItems: [
    { category: "Governance & Legal", item: "NDA executed", status: "completed", assignedTo: "Legal Team", dueDate: "2025-01-15T00:00:00Z" },
    { category: "Governance & Legal", item: "LOI / term sheet agreed", status: "completed", assignedTo: "Legal Team", dueDate: "2025-02-10T00:00:00Z" },
    { category: "Governance & Legal", item: "IP & contracts reviewed", status: "in_progress", assignedTo: "Legal Team", dueDate: "2025-04-20T00:00:00Z" },
    { category: "Financial & Accounting", item: "Financial statements (3yr) reviewed", status: "completed", assignedTo: "Sarah Chen", dueDate: "2025-03-15T00:00:00Z" },
    { category: "Financial & Accounting", item: "QoE analysis complete", status: "completed", assignedTo: "Sarah Chen", dueDate: "2025-03-20T00:00:00Z" },
    { category: "Financial & Accounting", item: "Debt & liabilities schedule", status: "in_progress", assignedTo: "Analyst Team", dueDate: "2025-04-15T00:00:00Z" },
    { category: "Commercial & Market", item: "Customer concentration analysis", status: "completed", assignedTo: "Marcus Williams", dueDate: "2025-03-20T00:00:00Z" },
    { category: "Commercial & Market", item: "Top 10 customer interviews", status: "in_progress", assignedTo: "Marcus Williams", dueDate: "2025-04-12T00:00:00Z" },
    { category: "People & Culture", item: "Management interviews completed", status: "completed", assignedTo: "Sarah Chen", dueDate: "2025-02-28T00:00:00Z" },
    { category: "People & Culture", item: "Retention risk assessment", status: "pending", assignedTo: "HR Lead", dueDate: "2025-05-01T00:00:00Z" },
    { category: "Technology & Operations", item: "Technical architecture review", status: "in_progress", assignedTo: "Tech Advisor", dueDate: "2025-04-10T00:00:00Z" },
    { category: "Technology & Operations", item: "Security & compliance audit", status: "pending", assignedTo: "Tech Advisor", dueDate: "2025-04-25T00:00:00Z" },
  ],
  timeline: [
    { event: "Initial Outreach", date: "2025-01-10T00:00:00Z", status: "completed" },
    { event: "NDA Signed", date: "2025-01-15T00:00:00Z", status: "completed" },
    { event: "CIM Received", date: "2025-02-20T00:00:00Z", status: "completed" },
    { event: "LOI Submitted", date: "2025-02-10T00:00:00Z", status: "completed" },
    { event: "QoE Started", date: "2025-03-01T00:00:00Z", status: "completed" },
    { event: "DD Complete", date: "2025-04-30T00:00:00Z", status: "pending" },
    { event: "Purchase Agreement", date: "2025-05-15T00:00:00Z", status: "pending" },
    { event: "Close", date: "2025-06-30T00:00:00Z", status: "pending" },
  ],
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }
  const email = await requireAuth(req, res);
  if (!email) return;

  const id = req.query["id"] as string;
  const db = getPool();

  try {
    const { rows } = await db.query(`SELECT * FROM deals WHERE id = $1 LIMIT 1`, [id]);

    if (rows.length > 0) {
      const d = rows[0] as Record<string, unknown>;
      ok(res, {
        id: d.id, companyName: d.company_name, industry: d.industry,
        dealType: d.deal_type, stage: d.stage, dealSize: d.deal_size,
        valuation: d.valuation, targetRevenue: d.target_revenue,
        assignedTo: d.assigned_to, priority: d.priority,
        createdAt: d.created_at, updatedAt: d.updated_at,
        closingDate: d.closing_date, ndaSigned: d.nda_signed, dataRoomAccess: d.data_room_access,
        overview: d.overview || "", thesis: d.thesis || "",
        financials: d.financials ?? { arr: 0, nrr: 100, growth: 0, ebitda: 0 },
        synergies: d.synergies ?? [], contacts: d.contacts ?? [],
        documents: d.documents ?? [], dueDiligenceItems: d.due_diligence_items ?? [],
        timeline: d.timeline ?? [],
      });
    } else {
      ok(res, MOCK_DEAL);
    }
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
