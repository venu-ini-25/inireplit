import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAdmin, getPool } from "../../_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;

  const email = await requireAdmin(req, res);
  if (!email) return;

  const provider = String(req.query["provider"] ?? "");
  if (!provider) { err(res, "provider is required", 400); return; }

  const db = getPool();

  if (req.method === "DELETE") {
    try {
      await db.query(`DELETE FROM integration_connections WHERE provider = $1`, [provider]);
      await db.query(`DELETE FROM sync_logs WHERE provider = $1`, [provider]);
      ok(res, { ok: true });
    } catch (e) {
      err(res, (e as Error).message, 500);
    }
    return;
  }

  if (req.method === "GET") {
    try {
      const { rows } = await db.query(`SELECT * FROM integration_connections WHERE provider = $1 LIMIT 1`, [provider]);
      if (!rows.length) { err(res, "Not found", 404); return; }
      const conn = rows[0] as Record<string, unknown>;
      ok(res, {
        provider: conn.provider,
        status: conn.status,
        lastSyncAt: conn.last_sync_at,
        connectionId: conn.id,
        displayName: conn.display_name,
      });
    } catch (e) {
      err(res, (e as Error).message, 500);
    }
    return;
  }

  err(res, "Method not allowed", 405);
}
