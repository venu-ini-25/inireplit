import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { getPool, ensureTable, rowToRequest } from "../_db.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  await ensureTable();
  const db = getPool();

  const pathParts = (req.query.path as string[] | undefined) ?? [];

  // GET /api/access-requests (list all)
  if (pathParts.length === 0 && req.method === "GET") {
    const { rows } = await db.query("SELECT * FROM access_requests ORDER BY submitted_at DESC");
    res.json({ requests: rows.map(rowToRequest), total: rows.length }); return;
  }

  // POST /api/access-requests (create)
  if (pathParts.length === 0 && req.method === "POST") {
    const { firstName, lastName, email, company, role, aum, message } = req.body ?? {};
    if (!firstName || !email || !role) { res.status(400).json({ error: "firstName, email and role are required" }); return; }
    const { rows: existing } = await db.query("SELECT id, status FROM access_requests WHERE email = $1 ORDER BY submitted_at DESC LIMIT 1", [email]);
    if (existing.length > 0) {
      const ex = existing[0] as Record<string, string>;
      if (ex.status === "pending" || ex.status === "approved") { res.status(200).json({ id: ex.id, status: ex.status, message: "Request already submitted" }); return; }
      const { rows: updated } = await db.query(`UPDATE access_requests SET status='pending', first_name=$1, last_name=$2, company=$3, role=$4, aum=$5, message=$6, submitted_at=NOW(), reviewed_at=NULL WHERE id=$7 RETURNING *`, [firstName, lastName ?? "", company ?? "", role, aum ?? "", message ?? "", ex.id]);
      res.status(200).json(rowToRequest(updated[0])); return;
    }
    const id = `req_${randomUUID().slice(0, 8)}`;
    const { rows } = await db.query(`INSERT INTO access_requests (id, first_name, last_name, email, company, role, aum, message) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [id, firstName, lastName ?? "", email, company ?? "", role, aum ?? "", message ?? ""]);
    res.status(201).json(rowToRequest(rows[0])); return;
  }

  // GET /api/access-requests/status (query param: ?email=xxx)
  if (pathParts[0] === "status" && pathParts.length === 1 && req.method === "GET") {
    const email = decodeURIComponent((req.query.email as string) ?? "");
    const { rows } = await db.query("SELECT id, status, platform_access FROM access_requests WHERE email = $1 ORDER BY submitted_at DESC LIMIT 1", [email]);
    if (rows.length === 0) { res.json({ status: "not_found" }); return; }
    const r = rows[0] as Record<string, string>;
    res.json({ status: r.status, id: r.id, platformAccess: r.platform_access ?? "demo" }); return;
  }

  // GET /api/access-requests/status/:email (path param)
  if (pathParts[0] === "status" && pathParts.length === 2 && req.method === "GET") {
    const email = decodeURIComponent(pathParts[1]);
    const { rows } = await db.query("SELECT id, status, platform_access FROM access_requests WHERE email = $1 ORDER BY submitted_at DESC LIMIT 1", [email]);
    if (rows.length === 0) { res.json({ status: "not_found" }); return; }
    const r = rows[0] as Record<string, string>;
    res.json({ status: r.status, id: r.id, platformAccess: r.platform_access ?? "demo" }); return;
  }

  // PATCH /api/access-requests/:id/status
  if (pathParts.length === 2 && pathParts[1] === "status" && req.method === "PATCH") {
    const id = pathParts[0];
    const { action } = req.body ?? {};
    if (action === "approve") {
      const { rows } = await db.query("UPDATE access_requests SET status='approved', reviewed_at=NOW() WHERE id=$1 RETURNING *", [id]);
      if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
      res.json(rowToRequest(rows[0])); return;
    }
    if (action === "reject") {
      const { rows } = await db.query("UPDATE access_requests SET status='rejected', reviewed_at=NOW() WHERE id=$1 RETURNING *", [id]);
      if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
      res.json(rowToRequest(rows[0])); return;
    }
    if (action === "revoke") {
      const { rows } = await db.query("UPDATE access_requests SET status='pending', reviewed_at=NOW() WHERE id=$1 RETURNING *", [id]);
      if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
      res.json(rowToRequest(rows[0])); return;
    }
    res.status(400).json({ error: `Unknown action: ${action}` }); return;
  }

  // PATCH /api/access-requests/:id/platform-access
  if (pathParts.length === 2 && pathParts[1] === "platform-access" && req.method === "PATCH") {
    const id = pathParts[0];
    const { platformAccess } = req.body ?? {};
    const safePlatform = ["demo", "app", "both", "admin"].includes(platformAccess) ? platformAccess : "demo";
    const { rows } = await db.query("UPDATE access_requests SET platform_access=$1 WHERE id=$2 RETURNING *", [safePlatform, id]);
    if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rowToRequest(rows[0])); return;
  }

  res.status(404).json({ error: "Not found" });
}
