import { Router, type IRouter } from "express";
import {
  GetDashboardMetricsResponse,
  GetRevenueChartResponse,
  GetRevenueChartQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/metrics", (_req, res) => {
  const data = GetDashboardMetricsResponse.parse({
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

  let days: number;
  switch (period) {
    case "7d":
      days = 7;
      break;
    case "90d":
      days = 90;
      break;
    case "1y":
      days = 365;
      break;
    default:
      days = 30;
  }

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
  const query = GetRevenueChartQueryParams.parse(req.query);
  const period = query.period ?? "30d";
  const chartData = generateChartData(period);

  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = chartData.reduce((sum, d) => sum + d.expenses, 0);

  const data = GetRevenueChartResponse.parse({
    data: chartData,
    totalRevenue,
    totalExpenses,
    growthRate: 12.4,
  });
  res.json(data);
});

export default router;
