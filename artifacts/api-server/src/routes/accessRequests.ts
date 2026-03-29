import { Router } from "express";
import { randomUUID } from "crypto";
import pool from "../lib/db";
import { requireAdmin } from "../middleware/requireAdmin";

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

function rowToRequest(row: Record<string, unknown>): AccessRequest {
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    company: (row.company as string) ?? "",
    role: row.role as string,
    aum: (row.aum as string) ?? "",
    message: (row.message as string) ?? "",
    status: row.status as AccessStatus,
    submittedAt: (row.submitted_at as Date).toISOString(),
    reviewedAt: row.reviewed_at ? (row.reviewed_at as Date).toISOString() : null,
  };
}

const router = Router();

router.post("/access-requests", async (req, res) => {
  const { firstName, lastName, email, company, role, aum, message } = req.body as Partial<AccessRequest>;

  if (!firstName || !email || !role) {
    return res.status(400).json({ error: "firstName, email and role are required" });
  }

  // Prevent duplicate pending requests
  const { rows: existing } = await pool.query(
    "SELECT id, status FROM access_requests WHERE email = $1 AND status = 'pending'",
    [email]
  );
  if (existing.length > 0) {
    return res.status(200).json({ id: existing[0].id, status: existing[0].status, message: "Request already submitted" });
  }

  const id = `req_${randomUUID().slice(0, 8)}`;
  const { rows } = await pool.query(
    `INSERT INTO access_requests (id, first_name, last_name, email, company, role, aum, message, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
    [id, firstName ?? "", lastName ?? "", email ?? "", company ?? "", role ?? "", aum ?? "", message ?? ""]
  );

  return res.status(201).json(rowToRequest(rows[0]));
});

router.get("/access-requests", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM access_requests ORDER BY submitted_at DESC"
  );
  return res.json({ requests: rows.map(rowToRequest), total: rows.length });
});

router.get("/access-requests/status/:email", async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const { rows } = await pool.query(
    "SELECT id, status FROM access_requests WHERE email = $1 ORDER BY submitted_at DESC LIMIT 1",
    [email]
  );
  if (rows.length === 0) return res.json({ status: "not_found" });
  return res.json({ status: rows[0].status, id: rows[0].id });
});

async function approveRequest(id: string) {
  const { rows } = await pool.query(
    "UPDATE access_requests SET status = 'approved', reviewed_at = NOW() WHERE id = $1 RETURNING *",
    [id]
  );
  return rows;
}

async function denyRequest(id: string) {
  const { rows } = await pool.query(
    "UPDATE access_requests SET status = 'denied', reviewed_at = NOW() WHERE id = $1 RETURNING *",
    [id]
  );
  return rows;
}

router.patch("/access-requests/:id/approve", requireAdmin, async (req, res) => {
  const rows = await approveRequest(String(req.params["id"]));
  if (rows.length === 0) return res.status(404).json({ error: "Request not found" });
  return res.json(rowToRequest(rows[0]));
});

router.post("/access-requests/:id/approve", requireAdmin, async (req, res) => {
  const rows = await approveRequest(String(req.params["id"]));
  if (rows.length === 0) return res.status(404).json({ error: "Request not found" });
  return res.json(rowToRequest(rows[0]));
});

router.patch("/access-requests/:id/deny", requireAdmin, async (req, res) => {
  const rows = await denyRequest(String(req.params["id"]));
  if (rows.length === 0) return res.status(404).json({ error: "Request not found" });
  return res.json(rowToRequest(rows[0]));
});

router.post("/access-requests/:id/deny", requireAdmin, async (req, res) => {
  const rows = await denyRequest(String(req.params["id"]));
  if (rows.length === 0) return res.status(404).json({ error: "Request not found" });
  return res.json(rowToRequest(rows[0]));
});

export default router;
