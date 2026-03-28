import { Router, type IRouter } from "express";
import { z } from "zod";

const DashboardMetricsSchema = z.object({
  totalRevenue: z.number(),
  totalExpenses: z.number(),
  netProfit: z.number(),
  cashFlow: z.number(),
  revenueChange: z.number(),
  expensesChange: z.number(),
  profitChange: z.number(),
  cashFlowChange: z.number(),
  activeAccounts: z.number(),
  pendingTransactions: z.number(),
});

const RevenueChartQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "1y"]).optional(),
});

const RevenueChartResponseSchema = z.object({
  data: z.array(z.object({ date: z.string(), revenue: z.number(), expenses: z.number() })),
  totalRevenue: z.number(),
  totalExpenses: z.number(),
  growthRate: z.number(),
});

const router: IRouter = Router();

router.get("/dashboard/metrics", (_req, res) => {
  const data = DashboardMetricsSchema.parse({
    totalRevenue: 4285320,
    totalExpenses: 1923450,
    netProfit: 2361870,
    cashFlow: 892340,
    revenueChange: 12.4,
    expensesChange: -3.2,
    profitChange: 18.7,
    cashFlowChange: 8.1,
    activeAccounts: 7,
    pendingTransactions: 14,
  });
  res.json(data);
});

function generateChartData(period: string) {
  const now = new Date();
  const points: { date: string; revenue: number; expenses: number }[] = [];
  const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const revenue = Math.floor(80000 + Math.random() * 60000);
    const expenses = Math.floor(30000 + Math.random() * 30000);
    points.push({ date: dateStr, revenue, expenses });
  }

  return points;
}

router.get("/dashboard/revenue-chart", (req, res) => {
  const query = RevenueChartQuerySchema.parse(req.query);
  const period = query.period ?? "30d";
  const chartData = generateChartData(period);
  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = chartData.reduce((sum, d) => sum + d.expenses, 0);

  const data = RevenueChartResponseSchema.parse({
    data: chartData,
    totalRevenue,
    totalExpenses,
    growthRate: 12.4,
  });
  res.json(data);
});

export default router;
