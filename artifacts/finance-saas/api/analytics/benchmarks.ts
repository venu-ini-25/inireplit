import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth } from "../_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }
  const email = await requireAuth(req, res);
  if (!email) return;

  const { industry = "SaaS" } = req.query as { industry?: string };

  ok(res, {
    industry,
    metrics: [
      { name: "Revenue Growth", your: 48.2, p25: 18, p50: 32, p75: 52, top: 80, unit: "%" },
      { name: "Gross Margin", your: 81.4, p25: 65, p50: 74, p75: 82, top: 90, unit: "%" },
      { name: "NRR", your: 118, p25: 102, p50: 110, p75: 120, top: 135, unit: "%" },
      { name: "CAC Payback", your: 14, p25: 28, p50: 20, p75: 14, top: 8, unit: " months" },
      { name: "ARR / FTE", your: 287, p25: 140, p50: 200, p75: 280, top: 400, unit: "K" },
      { name: "Rule of 40", your: 92, p25: 32, p50: 50, p75: 70, top: 100, unit: "" },
      { name: "Magic Number", your: 1.4, p25: 0.6, p50: 0.9, p75: 1.2, top: 1.8, unit: "x" },
      { name: "Burn Multiple", your: 0.8, p25: 2.4, p50: 1.6, p75: 1.0, top: 0.5, unit: "x" },
    ],
    peers: [
      { company: "Median SaaS Co.", arr: 18000000, growth: 32, nrr: 110, margin: 74 },
      { company: "Top Quartile SaaS", arr: 42000000, growth: 52, nrr: 120, margin: 82 },
      { company: "iNi Portfolio Avg", arr: 11000000, growth: 48, nrr: 118, margin: 81 },
    ],
  });
}
