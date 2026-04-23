import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAdmin, getPool } from "../_utils.js";

const PROVIDERS = ["quickbooks", "hubspot", "stripe", "sheets", "gusto"] as const;

function providerLabel(p: string): string {
  return { quickbooks: "QuickBooks Online", hubspot: "HubSpot", stripe: "Stripe", sheets: "Google Sheets", gusto: "Gusto" }[p] ?? p;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  const email = await requireAdmin(req, res);
  if (!email) return;

  const db = getPool();

  if (req.method === "GET") {
    try {
      const { rows } = await db.query(`SELECT * FROM integration_connections`);
      const result = PROVIDERS.map((p) => {
        const conn = rows.find((r: Record<string, string>) => r.provider === p);
        return {
          provider: p,
          displayName: providerLabel(p),
          status: conn?.status ?? "disconnected",
          lastSyncAt: conn?.last_sync_at ?? null,
          connectionId: conn?.id ?? null,
          configured: p === "stripe" || p === "sheets",
        };
      });
      ok(res, result);
    } catch (e) {
      err(res, (e as Error).message, 500);
    }

  } else if (req.method === "DELETE") {
    const { provider } = req.query as { provider?: string };
    if (!provider) { err(res, "provider is required"); return; }
    try {
      await db.query(`DELETE FROM integration_connections WHERE provider = $1`, [provider]);
      ok(res, { ok: true });
    } catch (e) {
      err(res, (e as Error).message, 500);
    }

  } else {
    err(res, "Method not allowed", 405);
  }
}
