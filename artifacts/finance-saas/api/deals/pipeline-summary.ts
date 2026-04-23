import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getPool } from "../_utils.js";

const STAGES = ["sourcing", "nda", "due_diligence", "negotiation", "closing", "closed", "passed"] as const;

const MOCK_DEALS = [
  { stage: "due_diligence", dealSize: 45000000 },
  { stage: "negotiation", dealSize: 18000000 },
  { stage: "due_diligence", dealSize: 12000000 },
  { stage: "nda", dealSize: 8000000 },
  { stage: "sourcing", dealSize: 22000000 },
  { stage: "closing", dealSize: 62000000 },
];

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }
  const email = await requireAuth(req, res);
  if (!email) return;

  const db = getPool();
  try {
    const { rows } = await db.query(`SELECT stage, deal_size FROM deals`);
    const list = rows.length > 0
      ? rows.map((d: Record<string, unknown>) => ({ stage: String(d.stage), dealSize: Number(d.deal_size) }))
      : MOCK_DEALS;

    const byStage = STAGES.map((stage) => {
      const stagDeals = list.filter((d) => d.stage === stage);
      return { stage, count: stagDeals.length, value: stagDeals.reduce((s, d) => s + d.dealSize, 0) };
    });

    ok(res, {
      totalDeals: list.length,
      totalValue: list.reduce((s, d) => s + d.dealSize, 0),
      byStage,
      avgTimeToClose: 4.2,
      dealsClosedThisYear: list.filter((d) => d.stage === "closed").length,
      valueClosedThisYear: list.filter((d) => d.stage === "closed").reduce((s, d) => s + d.dealSize, 0),
    });
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
