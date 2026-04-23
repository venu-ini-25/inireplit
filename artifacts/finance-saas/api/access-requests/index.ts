import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { getPool, ensureTable, rowToRequest } from "../_db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  await ensureTable();
  const db = getPool();

  if (req.method === "GET") {
    const { rows } = await db.query("SELECT * FROM access_requests ORDER BY submitted_at DESC");
    return res.json({ requests: rows.map(rowToRequest), total: rows.length });
  }

  if (req.method === "POST") {
    const { firstName, lastName, email, company, role, aum, message } = req.body ?? {};
    if (!firstName || !email || !role) {
      return res.status(400).json({ error: "firstName, email and role are required" });
    }

    const { rows: existing } = await db.query(
      "SELECT id, status FROM access_requests WHERE email = $1 ORDER BY submitted_at DESC LIMIT 1",
      [email]
    );
    if (existing.length > 0) {
      const ex = existing[0];
      if (ex.status === "pending" || ex.status === "approved") {
        return res.status(200).json({ id: ex.id, status: ex.status, message: "Request already submitted" });
      }
      const { rows: updated } = await db.query(
        `UPDATE access_requests SET status='pending', first_name=$1, last_name=$2, company=$3, role=$4, aum=$5, message=$6, submitted_at=NOW(), reviewed_at=NULL
         WHERE id=$7 RETURNING *`,
        [firstName ?? "", lastName ?? "", company ?? "", role, aum ?? "", message ?? "", ex.id]
      );
      return res.status(200).json(rowToRequest(updated[0]));
    }

    const id = `req_${randomUUID().slice(0, 8)}`;
    const { rows } = await db.query(
      `INSERT INTO access_requests (id, first_name, last_name, email, company, role, aum, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, firstName ?? "", lastName ?? "", email, company ?? "", role, aum ?? "", message ?? ""]
    );
    return res.status(201).json(rowToRequest(rows[0]));
  }

  return res.status(405).json({ error: "Method not allowed" });
}
