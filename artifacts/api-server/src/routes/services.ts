import { Router, type IRouter } from "express";
import {
  GetEngagementsResponse,
  GetServicesOverviewResponse,
} from "@workspace/api-zod";
import { db, engagements } from "@workspace/db";

const router: IRouter = Router();

const MOCK_ENGAGEMENTS = [
  {
    id: "eng_001", clientName: "NovaPay", serviceType: "fpa", status: "active",
    startDate: "2025-01-01T00:00:00Z", endDate: "2025-06-30T00:00:00Z",
    fee: 72000, progress: 48, lead: "Venu Vegi",
    description: "Monthly FP&A support including budget vs actuals, rolling forecast, and board pack preparation.",
  },
  {
    id: "eng_002", clientName: "DataStream AI", serviceType: "strategic_finance", status: "active",
    startDate: "2024-10-01T00:00:00Z", endDate: "2025-03-31T00:00:00Z",
    fee: 95000, progress: 85, lead: "Sarah Chen",
    description: "Series B fundraising readiness, operating model enhancement, and investor materials.",
  },
  {
    id: "eng_003", clientName: "GreenRoute Logistics", serviceType: "due_diligence", status: "active",
    startDate: "2025-02-01T00:00:00Z",
    fee: 48000, progress: 62, lead: "Priya Nair",
    description: "Buy-side financial due diligence and QoE analysis for acquisition target.",
  },
  {
    id: "eng_004", clientName: "RetailEdge", serviceType: "corp_dev", status: "active",
    startDate: "2025-01-15T00:00:00Z",
    fee: 120000, progress: 35, lead: "Marcus Williams",
    description: "M&A advisory for add-on acquisition strategy and target identification.",
  },
  {
    id: "eng_005", clientName: "HealthVault", serviceType: "valuation", status: "completed",
    startDate: "2024-11-01T00:00:00Z", endDate: "2024-12-31T00:00:00Z",
    fee: 35000, progress: 100, lead: "Venu Vegi",
    description: "409A valuation and cap table optimization analysis.",
  },
  {
    id: "eng_006", clientName: "EduCore", serviceType: "fpa", status: "proposal",
    startDate: "2025-04-01T00:00:00Z",
    fee: 24000, progress: 0, lead: "Sarah Chen",
    description: "Financial model buildout and seed-round financial projections.",
  },
];

router.get("/services/engagements", async (_req, res) => {
  try {
    const dbRows = await db.select().from(engagements);
    if (dbRows.length > 0) {
      const mapped = dbRows.map((r) => ({
        id: r.id,
        clientName: r.clientName,
        serviceType: r.serviceType,
        status: r.status,
        startDate: r.startDate ?? undefined,
        endDate: r.endDate ?? undefined,
        fee: r.fee,
        progress: r.progress,
        lead: r.lead,
        description: r.description,
      }));
      const data = GetEngagementsResponse.parse(mapped);
      res.json(data);
      return;
    }
  } catch (err) {
    console.warn("[services/engagements] DB query failed, using mock data:", (err as Error).message);
  }

  const data = GetEngagementsResponse.parse(MOCK_ENGAGEMENTS);
  res.json(data);
});

router.get("/services/overview", async (_req, res) => {
  try {
    const dbRows = await db.select().from(engagements);
    if (dbRows.length > 0) {
      const active = dbRows.filter((r) => r.status === "active").length;
      const completed = dbRows.filter((r) => r.status === "completed").length;
      const totalRevenue = dbRows.reduce((s, r) => s + r.fee, 0);
      const avgSize = dbRows.length > 0 ? Math.floor(totalRevenue / dbRows.length) : 0;

      const byType: Record<string, { count: number; revenue: number }> = {};
      for (const row of dbRows) {
        if (!byType[row.serviceType]) byType[row.serviceType] = { count: 0, revenue: 0 };
        byType[row.serviceType].count++;
        byType[row.serviceType].revenue += row.fee;
      }

      const data = GetServicesOverviewResponse.parse({
        activeEngagements: active,
        totalRevenue,
        avgEngagementSize: avgSize,
        completedThisYear: completed,
        revenueChange: 0,
        engagementsByType: Object.entries(byType).map(([type, v]) => ({ type, ...v })),
        revenueMonthly: [],
      });
      res.json(data);
      return;
    }
  } catch (err) {
    console.warn("[services/overview] DB query failed, using mock data:", (err as Error).message);
  }

  const data = GetServicesOverviewResponse.parse({
    activeEngagements: 4,
    totalRevenue: 394000,
    avgEngagementSize: 65667,
    completedThisYear: 1,
    revenueChange: 42.8,
    engagementsByType: [
      { type: "fpa", count: 2, revenue: 96000 },
      { type: "strategic_finance", count: 1, revenue: 95000 },
      { type: "corp_dev", count: 1, revenue: 120000 },
      { type: "due_diligence", count: 1, revenue: 48000 },
      { type: "valuation", count: 1, revenue: 35000 },
    ],
    revenueMonthly: [
      { month: "Jul", rev: 38000 }, { month: "Aug", rev: 44000 }, { month: "Sep", rev: 52000 },
      { month: "Oct", rev: 48000 }, { month: "Nov", rev: 61000 }, { month: "Dec", rev: 72000 },
    ],
  });
  res.json(data);
});

export default router;
