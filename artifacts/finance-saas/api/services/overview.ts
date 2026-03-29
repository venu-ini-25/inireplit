import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({"activeEngagements":4,"totalRevenue":394000,"avgEngagementSize":65667,"completedThisYear":1,"revenueChange":42.8,"engagementsByType":[{"type":"fpa","count":2,"revenue":96000},{"type":"strategic_finance","count":1,"revenue":95000},{"type":"corp_dev","count":1,"revenue":120000},{"type":"due_diligence","count":1,"revenue":48000},{"type":"valuation","count":1,"revenue":35000}],"revenueMonthly":[{"month":"Jul","rev":38000},{"month":"Aug","rev":44000},{"month":"Sep","rev":52000},{"month":"Oct","rev":48000},{"month":"Nov","rev":61000},{"month":"Dec","rev":72000}]});
}
