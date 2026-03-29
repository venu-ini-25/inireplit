import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json([{"id":"rpt_001","title":"Q4 2025 Board Pack","type":"board_pack","status":"published","createdAt":"2025-01-05T00:00:00Z","period":"Q4 2025","pages":24},{"id":"rpt_002","title":"FY 2025 Annual Report","type":"annual","status":"published","createdAt":"2025-01-15T00:00:00Z","period":"FY 2025","pages":48},{"id":"rpt_003","title":"Q1 2026 Investor Update","type":"investor_update","status":"draft","createdAt":"2026-03-01T00:00:00Z","period":"Q1 2026","pages":12},{"id":"rpt_004","title":"Portfolio Performance H2 2025","type":"portfolio","status":"published","createdAt":"2026-01-10T00:00:00Z","period":"H2 2025","pages":32},{"id":"rpt_005","title":"Cash Flow Analysis Dec 2025","type":"cashflow","status":"published","createdAt":"2026-01-08T00:00:00Z","period":"Dec 2025","pages":8}]);
}
