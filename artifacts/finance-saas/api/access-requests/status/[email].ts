import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool, ensureTable } from "../../_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  await ensureTable();
  const db = getPool();
  const email = decodeURIComponent(req.query.email as string);

  const { rows } = await db.query(
    "SELECT id, status FROM access_requests WHERE email = $1 ORDER BY submitted_at DESC LIMIT 1",
    [email]
  );
  if (rows.length === 0) return res.json({ status: "not_found" });
  return res.json({ status: rows[0].status, id: rows[0].id });
}
