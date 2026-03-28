import { Router } from "express";
import { randomUUID } from "crypto";

export type AccessStatus = "pending" | "approved" | "denied";

export interface AccessRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  role: string;
  aum: string;
  message: string;
  status: AccessStatus;
  submittedAt: string;
  reviewedAt: string | null;
}

// In-memory store (persists while server is running)
const store: AccessRequest[] = [
  {
    id: "req_001",
    firstName: "Sarah",
    lastName: "Chen",
    email: "sarah.chen@redwoodvc.com",
    company: "Redwood Ventures",
    role: "investor",
    aum: "$200M – $1B",
    message: "Looking to track our 14 portfolio companies in one place.",
    status: "pending",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    reviewedAt: null,
  },
  {
    id: "req_002",
    firstName: "Marcus",
    lastName: "Rivera",
    email: "marcus@claritygrowth.io",
    company: "Clarity Growth Partners",
    role: "portfolio_company",
    aum: "$10M – $50M",
    message: "We need better FP&A tooling for our Series B reporting.",
    status: "pending",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    reviewedAt: null,
  },
  {
    id: "req_003",
    firstName: "Priya",
    lastName: "Nair",
    email: "priya.nair@summitfund.com",
    company: "Summit Growth Fund",
    role: "investor",
    aum: "$1M – $10M",
    message: "",
    status: "approved",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
];

const router = Router();

// Submit a new access request
router.post("/access-requests", (req, res) => {
  const { firstName, lastName, email, company, role, aum, message } = req.body as Partial<AccessRequest>;

  if (!firstName || !email || !role) {
    return res.status(400).json({ error: "firstName, email and role are required" });
  }

  // Prevent duplicate pending requests
  const existing = store.find((r) => r.email === email && r.status === "pending");
  if (existing) {
    return res.status(200).json({ id: existing.id, status: existing.status, message: "Request already submitted" });
  }

  const request: AccessRequest = {
    id: `req_${randomUUID().slice(0, 8)}`,
    firstName: firstName ?? "",
    lastName: lastName ?? "",
    email: email ?? "",
    company: company ?? "",
    role: role ?? "",
    aum: aum ?? "",
    message: message ?? "",
    status: "pending",
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
  };

  store.push(request);
  return res.status(201).json(request);
});

// Get all requests (admin)
router.get("/access-requests", (_req, res) => {
  const sorted = [...store].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
  return res.json({ requests: sorted, total: store.length });
});

// Check status for a specific email
router.get("/access-requests/status/:email", (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const request = store.find((r) => r.email === email);
  if (!request) return res.json({ status: "not_found" });
  return res.json({ status: request.status, id: request.id });
});

// Approve a request
router.patch("/access-requests/:id/approve", (req, res) => {
  const request = store.find((r) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  request.status = "approved";
  request.reviewedAt = new Date().toISOString();
  return res.json(request);
});

// Deny a request
router.patch("/access-requests/:id/deny", (req, res) => {
  const request = store.find((r) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  request.status = "denied";
  request.reviewedAt = new Date().toISOString();
  return res.json(request);
});

export default router;
