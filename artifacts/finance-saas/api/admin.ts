import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool, ensureTable, rowToRequest } from "./_db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  await ensureTable();
  const db = getPool();

  const id = req.query.id as string;
  const action = req.query.action as string;

  if (!id || !action) return res.status(400).json({ error: "id and action are required" });

  let newStatus: string;
  if (action === "approve") newStatus = "approved";
  else if (action === "deny") newStatus = "denied";
  else if (action === "revoke") newStatus = "pending";
  else return res.status(400).json({ error: `Unknown action: ${action}` });

  const { rows } = await db.query(
    "UPDATE access_requests SET status=$1, reviewed_at=NOW() WHERE id=$2 RETURNING *",
    [newStatus, id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Request not found" });
  return res.status(200).json(rowToRequest(rows[0]));
}
