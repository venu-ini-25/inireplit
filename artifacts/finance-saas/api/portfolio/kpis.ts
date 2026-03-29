import type { VercelRequest, VercelResponse } from "@vercel/node";
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({"portfolioArr":93720000,"yoyGrowth":48.2,"avgNrr":116,"avgGrossMargin":74.2,"totalHeadcount":899,"weightedGrowthRate":53.1,"topPerformer":{"name":"DataStream AI","growth":88.6},"bottomPerformer":{"name":"RetailEdge","growth":19.3},"arrByCompany":[{"name":"NovaPay","arr":8200000},{"name":"CloudOps Pro","arr":3100000},{"name":"HealthVault","arr":4900000},{"name":"DataStream AI","arr":12400000},{"name":"RetailEdge","arr":21800000},{"name":"LogiChain","arr":2800000},{"name":"EduCore","arr":800000},{"name":"SecureVault","arr":37100000}]});
}
