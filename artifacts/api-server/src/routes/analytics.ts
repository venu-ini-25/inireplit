import { Router, type IRouter } from "express";
import {
  GetSpendingAnalyticsResponse,
  GetSpendingAnalyticsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/analytics/spending", (req, res) => {
  const query = GetSpendingAnalyticsQueryParams.parse(req.query);
  const period = query.period ?? "30d";

  const multiplier =
    period === "7d" ? 0.25 : period === "90d" ? 3 : period === "1y" ? 12 : 1;

  const categories = [
    {
      name: "Software & SaaS",
      amount: Math.floor(48230 * multiplier),
      percentage: 28.4,
      color: "#6366f1",
      change: -2.1,
    },
    {
      name: "Payroll",
      amount: Math.floor(82100 * multiplier),
      percentage: 48.3,
      color: "#8b5cf6",
      change: 5.2,
    },
    {
      name: "Marketing",
      amount: Math.floor(18500 * multiplier),
      percentage: 10.9,
      color: "#a78bfa",
      change: 12.8,
    },
    {
      name: "Infrastructure",
      amount: Math.floor(9800 * multiplier),
      percentage: 5.8,
      color: "#c4b5fd",
      change: -1.4,
    },
    {
      name: "Travel & Office",
      amount: Math.floor(5920 * multiplier),
      percentage: 3.5,
      color: "#ddd6fe",
      change: -8.3,
    },
    {
      name: "Other",
      amount: Math.floor(5280 * multiplier),
      percentage: 3.1,
      color: "#ede9fe",
      change: 0.7,
    },
  ];

  const totalSpending = categories.reduce((sum, c) => sum + c.amount, 0);
  const daysInPeriod =
    period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;

  const data = GetSpendingAnalyticsResponse.parse({
    categories,
    totalSpending,
    averageDaily: Math.floor(totalSpending / daysInPeriod),
    topCategory: "Payroll",
  });
  res.json(data);
});

export default router;
