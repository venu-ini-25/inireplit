import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAuth, getMetricValues } from "../_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }
  const email = await requireAuth(req, res);
  if (!email) return;

  const { period = "30d" } = req.query as { period?: string };
  const multiplier = period === "7d" ? 0.25 : period === "90d" ? 3 : period === "1y" ? 12 : 1;

  const m = await getMetricValues("spending");

  const categories = [
    { name: "Payroll & Benefits", amount: Math.floor((m.get("payroll") ?? 18400) * multiplier), percentage: 51.1, color: "#2563EB", change: 5.2 },
    { name: "Software & SaaS", amount: Math.floor((m.get("software") ?? 5200) * multiplier), percentage: 14.4, color: "#7C3AED", change: -2.1 },
    { name: "Marketing & Ads", amount: Math.floor((m.get("marketing") ?? 4100) * multiplier), percentage: 11.4, color: "#0891B2", change: 12.8 },
    { name: "Office & Facilities", amount: Math.floor((m.get("office") ?? 2800) * multiplier), percentage: 7.8, color: "#D97706", change: -1.4 },
    { name: "Travel & Entertainment", amount: Math.floor((m.get("travel") ?? 1600) * multiplier), percentage: 4.4, color: "#DC2626", change: -8.3 },
    { name: "Professional Services", amount: Math.floor((m.get("professional") ?? 2100) * multiplier), percentage: 5.8, color: "#059669", change: 0.7 },
    { name: "Other", amount: Math.floor((m.get("other") ?? 1800) * multiplier), percentage: 5.0, color: "#64748B", change: 1.2 },
  ];
  const totalSpending = categories.reduce((s, c) => s + c.amount, 0);
  const daysInPeriod = period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;

  ok(res, {
    categories,
    deptBudgets: [
      { dept: "Engineering", budget: 12000, actual: 11200 },
      { dept: "Sales", budget: 8000, actual: 8900 },
      { dept: "Marketing", budget: 6000, actual: 5800 },
      { dept: "G&A", budget: 4500, actual: 4100 },
      { dept: "Product", budget: 5500, actual: 5200 },
      { dept: "Support", budget: 2000, actual: 1800 },
    ],
    lineItems: [
      { vendor: "Workday", category: "Software & SaaS", dept: "HR", amount: 1200, status: "Recurring", date: "Dec 1, 2024" },
      { vendor: "AWS", category: "Software & SaaS", dept: "Engineering", amount: 3800, status: "Recurring", date: "Dec 1, 2024" },
      { vendor: "Salesforce", category: "Software & SaaS", dept: "Sales", amount: 2100, status: "Recurring", date: "Dec 1, 2024" },
      { vendor: "Google Ads", category: "Marketing & Ads", dept: "Marketing", amount: 4100, status: "Variable", date: "Nov 30, 2024" },
      { vendor: "WeWork", category: "Office & Facilities", dept: "G&A", amount: 2800, status: "Recurring", date: "Dec 1, 2024" },
      { vendor: "Deloitte", category: "Professional Services", dept: "Finance", amount: 2100, status: "One-time", date: "Nov 25, 2024" },
    ],
    totalSpending,
    averageDaily: Math.floor(totalSpending / daysInPeriod),
    topCategory: "Payroll & Benefits",
  });
}
