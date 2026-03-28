import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/accounts", (_req, res) => {
  const data = [
    {
      id: "acc_001",
      name: "Business Checking",
      type: "checking",
      balance: 284750.5,
      currency: "USD",
      institution: "Chase Bank",
      lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: "active",
      accountNumber: "****4521",
    },
    {
      id: "acc_002",
      name: "Operations Account",
      type: "checking",
      balance: 97234.25,
      currency: "USD",
      institution: "Bank of America",
      lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
      accountNumber: "****7834",
    },
    {
      id: "acc_003",
      name: "Savings Reserve",
      type: "savings",
      balance: 512890.0,
      currency: "USD",
      institution: "Wells Fargo",
      lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
      accountNumber: "****2290",
    },
    {
      id: "acc_004",
      name: "Investment Portfolio",
      type: "investment",
      balance: 1284500.75,
      currency: "USD",
      institution: "Fidelity",
      lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
      accountNumber: "****9012",
    },
    {
      id: "acc_005",
      name: "Corporate Credit",
      type: "credit",
      balance: -34250.0,
      currency: "USD",
      institution: "American Express",
      lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
      accountNumber: "****3456",
    },
    {
      id: "acc_006",
      name: "Crypto Reserve",
      type: "crypto",
      balance: 89340.22,
      currency: "USD",
      institution: "Coinbase",
      lastActivity: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      status: "active",
      accountNumber: "0x7f...3e4a",
    },
    {
      id: "acc_007",
      name: "Payroll Account",
      type: "checking",
      balance: 142000.0,
      currency: "USD",
      institution: "Chase Bank",
      lastActivity: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: "inactive",
      accountNumber: "****6678",
    },
  ];
  res.json(data);
});

export default router;
