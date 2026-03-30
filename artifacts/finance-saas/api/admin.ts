import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool, ensureTable, rowToRequest } from "./_db.js";

const VALID_PLATFORMS = ["app", "demo", "both", "admin"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  await ensureTable();
  const db = getPool();

  const id = req.query.id as string;
  const action = req.query.action as string;
  const platform = req.query.platform as string;

  if (!id || !action) return res.status(400).json({ error: "id and action are required" });

  const safePlatform = VALID_PLATFORMS.includes(platform) ? platform : "demo";

  if (action === "set-access") {
    const { rows } = await db.query(
      "UPDATE access_requests SET platform_access=$1 WHERE id=$2 RETURNING *",
      [safePlatform, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Request not found" });
    return res.status(200).json(rowToRequest(rows[0]));
  }

  if (action === "approve") {
    const { rows } = await db.query(
      "UPDATE access_requests SET status='approved', platform_access=$1, reviewed_at=NOW() WHERE id=$2 RETURNING *",
      [safePlatform, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Request not found" });
    return res.status(200).json(rowToRequest(rows[0]));
  }

  if (action === "deny") {
    const { rows } = await db.query(
      "UPDATE access_requests SET status='denied', reviewed_at=NOW() WHERE id=$1 RETURNING *",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Request not found" });
    return res.status(200).json(rowToRequest(rows[0]));
  }

  if (action === "revoke") {
    const { rows } = await db.query(
      "UPDATE access_requests SET status='pending', reviewed_at=NOW() WHERE id=$1 RETURNING *",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Request not found" });
    return res.status(200).json(rowToRequest(rows[0]));
  }

  return res.status(400).json({ error: `Unknown action: ${action}` });
}
