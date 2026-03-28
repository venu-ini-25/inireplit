import { Router, type IRouter } from "express";

const router: IRouter = Router();

const MERCHANTS = [
  "Amazon", "Apple", "Netflix", "Stripe", "Shopify", "Google", "Microsoft",
  "Salesforce", "Zoom", "Slack", "GitHub", "Figma", "Notion", "Linear",
  "Vercel", "AWS", "Twilio", "SendGrid", "Intercom", "HubSpot",
];

const CATEGORIES = [
  "Software", "Marketing", "Payroll", "Infrastructure", "Travel", "Office",
  "Consulting", "Utilities", "Insurance", "Legal", "Sales", "Advertising",
];

const ACCOUNTS = [
  "Business Checking", "Operations", "Savings Reserve", "Payroll Account", "Credit Line",
];

const DESCRIPTIONS = [
  "Monthly subscription", "Annual license", "Service payment", "Invoice #", "Refund",
  "Transfer", "Contractor payment", "Software renewal", "Cloud services", "Marketing spend",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTransactions(count: number, offset: number) {
  const types = ["income", "expense", "transfer"] as const;
  const statuses = ["pending", "completed", "failed", "cancelled"] as const;

  return Array.from({ length: count }, (_, i) => {
    const type = i % 5 === 0 ? "income" : i % 7 === 0 ? "transfer" : "expense";
    const amount =
      type === "income"
        ? Math.floor(5000 + Math.random() * 95000)
        : Math.floor(500 + Math.random() * 15000);
    const date = new Date();
    date.setDate(date.getDate() - Math.floor((i + offset) / 2));

    const statusRoll = Math.random();
    const status =
      statusRoll > 0.85
        ? "pending"
        : statusRoll > 0.92
          ? "failed"
          : statusRoll > 0.97
            ? "cancelled"
            : "completed";

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

router.get("/transactions", (req, res) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const typeFilter = typeof req.query.type === "string" ? req.query.type : undefined;
  const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;
  const total = 248;

  let transactions = generateTransactions(limit, (page - 1) * limit);
  if (typeFilter) transactions = transactions.filter((t) => t.type === typeFilter);
  if (statusFilter) transactions = transactions.filter((t) => t.status === statusFilter);

  res.json({ transactions, total, page, limit });
});

export default router;
