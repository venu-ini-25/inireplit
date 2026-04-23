import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAdmin, getPool } from "../../_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }

  const email = await requireAdmin(req, res);
  if (!email) return;

  const provider = String(req.query["provider"] ?? "");
  if (!provider) { err(res, "provider is required", 400); return; }

  const db = getPool();
  try {
    const { rows } = await db.query(
      `SELECT id, provider, status, records_synced, error_message, started_at, completed_at
       FROM sync_logs WHERE provider = $1 ORDER BY started_at DESC LIMIT 10`,
      [provider]
    );
    ok(res, rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      status: r.status,
      recordsSynced: r.records_synced,
      errorMessage: r.error_message,
      startedAt: r.started_at,
      completedAt: r.completed_at,
    })));
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
