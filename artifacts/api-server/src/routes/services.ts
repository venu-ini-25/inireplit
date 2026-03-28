import { Router, type IRouter } from "express";
import {
  GetEngagementsResponse,
  GetServicesOverviewResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/services/engagements", (_req, res) => {
  const data = GetEngagementsResponse.parse([
    {
      id: "eng_001",
      clientName: "NovaPay",
      serviceType: "fpa",
      status: "active",
      startDate: "2025-01-01T00:00:00Z",
      endDate: "2025-06-30T00:00:00Z",
      fee: 72000,
      progress: 48,
      lead: "Venu Vegi",
      description: "Monthly FP&A support including budget vs actuals, rolling forecast, and board pack preparation.",
    },
    {
      id: "eng_002",
      clientName: "DataStream AI",
      serviceType: "strategic_finance",
      status: "active",
      startDate: "2024-10-01T00:00:00Z",
      endDate: "2025-03-31T00:00:00Z",
      fee: 95000,
      progress: 85,
      lead: "Sarah Chen",
      description: "Series B fundraising readiness, operating model enhancement, and investor materials.",
    },
    {
      id: "eng_003",
      clientName: "GreenRoute Logistics",
      serviceType: "due_diligence",
      status: "active",
      startDate: "2025-02-01T00:00:00Z",
      fee: 48000,
      progress: 62,
      lead: "Priya Nair",
      description: "Buy-side financial due diligence and QoE analysis for acquisition target.",
    },
    {
      id: "eng_004",
      clientName: "RetailEdge",
      serviceType: "corp_dev",
      status: "active",
      startDate: "2025-01-15T00:00:00Z",
      fee: 120000,
      progress: 35,
      lead: "Marcus Williams",
      description: "M&A advisory for add-on acquisition strategy and target identification.",
    },
    {
      id: "eng_005",
      clientName: "HealthVault",
      serviceType: "valuation",
      status: "completed",
      startDate: "2024-11-01T00:00:00Z",
      endDate: "2024-12-31T00:00:00Z",
      fee: 35000,
      progress: 100,
      lead: "Venu Vegi",
      description: "409A valuation and cap table optimization analysis.",
    },
    {
      id: "eng_006",
      clientName: "EduCore",
      serviceType: "fpa",
      status: "proposal",
      startDate: "2025-04-01T00:00:00Z",
      fee: 24000,
      progress: 0,
      lead: "Sarah Chen",
      description: "Financial model buildout and seed-round financial projections.",
    },
  ]);
  res.json(data);
});

router.get("/services/overview", (_req, res) => {
  const data = GetServicesOverviewResponse.parse({
    activeEngagements: 4,
    totalRevenue: 394000,
    avgEngagementSize: 65667,
    completedThisYear: 1,
    revenueChange: 42.8,
    engagementsByType: [
      { type: "FP&A", count: 2, revenue: 96000 },
      { type: "Strategic Finance", count: 1, revenue: 95000 },
      { type: "Corp Dev", count: 1, revenue: 120000 },
      { type: "Due Diligence", count: 1, revenue: 48000 },
      { type: "Valuation", count: 1, revenue: 35000 },
    ],
  });
  res.json(data);
});

export default router;
