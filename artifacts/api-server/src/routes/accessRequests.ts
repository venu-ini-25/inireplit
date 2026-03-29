import { Router } from "express";
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

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

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "access-requests.json");

function loadStore(): AccessRequest[] {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (!existsSync(DATA_FILE)) return [];
    const raw = readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as AccessRequest[];
  } catch {
    return [];
  }
}

function saveStore(store: AccessRequest[]) {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to persist access requests:", e);
  }
}

const store: AccessRequest[] = loadStore();

const router = Router();

router.post("/access-requests", (req, res) => {
  const { firstName, lastName, email, company, role, aum, message } = req.body as Partial<AccessRequest>;

  if (!firstName || !email || !role) {
    return res.status(400).json({ error: "firstName, email and role are required" });
  }

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
  saveStore(store);
  return res.status(201).json(request);
});

router.get("/access-requests", (_req, res) => {
  const sorted = [...store].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
  return res.json({ requests: sorted, total: store.length });
});

router.get("/access-requests/status/:email", (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const request = store.find((r) => r.email === email);
  if (!request) return res.json({ status: "not_found" });
  return res.json({ status: request.status, id: request.id });
});

router.patch("/access-requests/:id/approve", (req, res) => {
  const request = store.find((r) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  request.status = "approved";
  request.reviewedAt = new Date().toISOString();
  saveStore(store);
  return res.json(request);
});

router.patch("/access-requests/:id/deny", (req, res) => {
  const request = store.find((r) => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found" });
  request.status = "denied";
  request.reviewedAt = new Date().toISOString();
  saveStore(store);
  return res.json(request);
});

export default router;
