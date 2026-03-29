import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({"totalCompanies":8,"totalAum":688500000,"totalRevenue":93720000,"avgGrowthRate":53,"avgValuation":86062500,"totalDeals":14,"aumChange":18.4,"revenueChange":34.2,"growthChange":6.1});
}
