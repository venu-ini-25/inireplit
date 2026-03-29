import type { VercelRequest, VercelResponse } from "@vercel/node";
const deals: Record<string, object> = {
  "deal_001":{"id":"deal_001","companyName":"Meridian Analytics","industry":"Data & Analytics","dealType":"acquisition","stage":"due_diligence","dealSize":45000000,"valuation":52000000,"targetRevenue":7200000,"assignedTo":"Sarah Chen","priority":"high","createdAt":"2025-01-15T00:00:00Z","updatedAt":"2025-03-20T00:00:00Z","closingDate":"2025-06-30T00:00:00Z","ndaSigned":true,"dataRoomAccess":true,"description":"Strategic acquisition of analytics platform to expand data capabilities."},
  "deal_002":{"id":"deal_002","companyName":"FlexForce HR","industry":"HR Tech","dealType":"investment","stage":"nda","dealSize":12000000,"valuation":38000000,"targetRevenue":3400000,"assignedTo":"Marcus Williams","priority":"medium","createdAt":"2025-02-08T00:00:00Z","updatedAt":"2025-03-18T00:00:00Z","closingDate":"2025-08-15T00:00:00Z","ndaSigned":true,"dataRoomAccess":false,"description":"Series B co-investment in HR automation SaaS platform."},
  "deal_003":{"id":"deal_003","companyName":"GreenRoute Logistics","industry":"Supply Chain","dealType":"acquisition","stage":"negotiation","dealSize":78000000,"valuation":88000000,"targetRevenue":14800000,"assignedTo":"Priya Nair","priority":"high","createdAt":"2024-11-20T00:00:00Z","updatedAt":"2025-03-25T00:00:00Z","closingDate":"2025-05-15T00:00:00Z","ndaSigned":true,"dataRoomAccess":true,"description":"Full acquisition of logistics tech platform targeting last-mile delivery optimization."},
  "deal_004":{"id":"deal_004","companyName":"SkyBridge Capital","industry":"Financial Services","dealType":"merger","stage":"sourcing","dealSize":120000000,"valuation":145000000,"targetRevenue":22000000,"assignedTo":"James Park","priority":"low","createdAt":"2025-03-10T00:00:00Z","updatedAt":"2025-03-22T00:00:00Z","ndaSigned":false,"dataRoomAccess":false,"description":"Merger exploration with fintech-adjacent capital management firm."},
  "deal_005":{"id":"deal_005","companyName":"Orbit DevOps","industry":"Developer Tools","dealType":"investment","stage":"closing","dealSize":18000000,"valuation":55000000,"targetRevenue":4900000,"assignedTo":"Sarah Chen","priority":"high","createdAt":"2024-10-05T00:00:00Z","updatedAt":"2025-03-27T00:00:00Z","closingDate":"2025-04-15T00:00:00Z","ndaSigned":true,"dataRoomAccess":true,"description":"Late-stage growth investment in developer infrastructure and CI/CD tooling platform."}
};
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const id = req.query.id as string;
  const deal = deals[id] ?? Object.values(deals)[0];
  res.json(deal);
}
