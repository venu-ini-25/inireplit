import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool, ensureTable, rowToRequest } from "../../_db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!["GET","POST","PATCH"].includes(req.method ?? "")) return res.status(405).json({ error: "Method not allowed" });

  await ensureTable();
  const db = getPool();
  const { rows } = await db.query(
    "UPDATE access_requests SET status = 'denied', reviewed_at = NOW() WHERE id = $1 RETURNING *",
    [req.query.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Request not found" });
  return res.json(rowToRequest(rows[0]));
}
