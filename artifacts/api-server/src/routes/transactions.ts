import { Router, type IRouter } from "express";
import { z } from "zod";

const TransactionSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  type: z.enum(["income", "expense", "transfer"]),
  status: z.enum(["pending", "completed", "failed", "cancelled"]),
  category: z.string(),
  account: z.string(),
  date: z.string(),
  merchant: z.string().optional(),
});

const GetTransactionsQueryParams = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  type: z.enum(["income", "expense", "transfer"]).optional(),
  status: z.enum(["pending", "completed", "failed", "cancelled"]).optional(),
});

const GetTransactionsResponse = z.object({
  transactions: z.array(TransactionSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

const MERCHANTS = ["Amazon", "Apple", "Netflix", "Stripe", "Shopify", "Google", "Microsoft", "Salesforce", "Zoom", "Slack", "GitHub", "Figma", "Notion", "Linear", "Vercel", "AWS", "Twilio", "SendGrid", "Intercom", "HubSpot"];
const CATEGORIES = ["Software", "Marketing", "Payroll", "Infrastructure", "Travel", "Office", "Consulting", "Utilities", "Insurance", "Legal", "Sales", "Advertising"];
const ACCOUNTS = ["Business Checking", "Operations", "Savings Reserve", "Payroll Account", "Credit Line"];
const DESCRIPTIONS = ["Monthly subscription", "Annual license", "Service payment", "Invoice #", "Refund", "Transfer", "Contractor payment", "Software renewal", "Cloud services", "Marketing spend"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTransactions(count: number, offset: number) {
  return Array.from({ length: count }, (_, i) => {
    const type = (i % 5 === 0 ? "income" : i % 7 === 0 ? "transfer" : "expense") as "income" | "expense" | "transfer";
    const amount = type === "income" ? Math.floor(5000 + Math.random() * 95000) : Math.floor(500 + Math.random() * 15000);
    const date = new Date();
    date.setDate(date.getDate() - Math.floor((i + offset) / 2));

    const statusRoll = Math.random();
    const status = (statusRoll > 0.85 ? "pending" : statusRoll > 0.92 ? "failed" : statusRoll > 0.97 ? "cancelled" : "completed") as "pending" | "completed" | "failed" | "cancelled";

    return {
      id: `txn_${(i + offset + 1).toString().padStart(6, "0")}`,
      description: `${randomFrom(DESCRIPTIONS)} ${i + offset + 1001}`,
      amount,
      type,
      status,
      category: randomFrom(CATEGORIES),
      account: randomFrom(ACCOUNTS),
      date: date.toISOString().split("T")[0],
      merchant: type !== "transfer" ? randomFrom(MERCHANTS) : undefined,
    };
  });
}

const router: IRouter = Router();

router.get("/transactions", (req, res) => {
  const query = GetTransactionsQueryParams.parse({
    page: req.query.page,
    limit: req.query.limit,
    type: req.query.type,
    status: req.query.status,
  });

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const total = 248;

  let transactions = generateTransactions(limit, (page - 1) * limit);
  if (query.type) transactions = transactions.filter((t) => t.type === query.type);
  if (query.status) transactions = transactions.filter((t) => t.status === query.status);

  const data = GetTransactionsResponse.parse({ transactions, total, page, limit });
  res.json(data);
});

export default router;
