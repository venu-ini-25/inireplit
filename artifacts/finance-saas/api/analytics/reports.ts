import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth } from "../_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }
  const email = await requireAuth(req, res);
  if (!email) return;

  ok(res, {
    reports: [
      { id: "r_001", name: "Q4 2024 Board Pack", type: "Board Pack", status: "published", createdAt: "2025-01-10T00:00:00Z", period: "Q4 2024", pages: 24 },
      { id: "r_002", name: "FY2024 Annual Review", type: "Annual Review", status: "published", createdAt: "2025-02-01T00:00:00Z", period: "FY 2024", pages: 48 },
      { id: "r_003", name: "Q1 2025 Investor Update", type: "Investor Update", status: "draft", createdAt: "2025-04-01T00:00:00Z", period: "Q1 2025", pages: 18 },
      { id: "r_004", name: "Portfolio Deep Dive — NovaPay", type: "Portfolio Analysis", status: "published", createdAt: "2025-03-15T00:00:00Z", period: "Mar 2025", pages: 32 },
      { id: "r_005", name: "Benchmark Analysis — SaaS Metrics", type: "Benchmark", status: "published", createdAt: "2025-03-01T00:00:00Z", period: "Q1 2025", pages: 16 },
    ],
  });
}
