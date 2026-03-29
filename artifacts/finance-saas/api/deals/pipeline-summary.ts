import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({"totalDeals":14,"totalValue":273000000,"avgDealSize":19500000,"byStage":[{"stage":"sourcing","count":4,"value":48000000},{"stage":"nda","count":3,"value":38000000},{"stage":"due_diligence","count":3,"value":82000000},{"stage":"negotiation","count":2,"value":68000000},{"stage":"closing","count":1,"value":18000000},{"stage":"closed","count":1,"value":19000000}],"byType":[{"type":"acquisition","count":6,"value":148000000},{"type":"investment","count":5,"value":68000000},{"type":"merger","count":2,"value":38000000},{"type":"divestiture","count":1,"value":19000000}]});
}
