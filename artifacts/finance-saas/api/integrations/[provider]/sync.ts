import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAdmin, getPool } from "../../_utils.js";
import { randomUUID } from "crypto";

async function syncStripe(db: ReturnType<typeof getPool>, connId: string, apiKey: string): Promise<number> {
  const resp = await fetch("https://api.stripe.com/v1/subscriptions?limit=100&status=active", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resp.ok) throw new Error(`Stripe API error: ${await resp.text()}`);
  const data = await resp.json() as { data?: { items?: { data?: { plan?: { amount?: number } }[] } }[] };
  const subs = data.data ?? [];

  const mrr = subs.reduce((sum, sub) => {
    const amount = sub.items?.data?.[0]?.plan?.amount ?? 0;
    return sum + amount / 100;
  }, 0);

  if (mrr > 0) {
    await db.query(`
      INSERT INTO metrics_snapshots (id, category, metric_key, metric_label, value, unit, period_label, source, created_at, updated_at)
      VALUES ($1, 'operations', 'monthlyRecurringRevenue', 'Monthly Recurring Revenue', $2, 'USD', 'Current', 'stripe', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, [`ms_stripe_mrr_${connId}`, mrr]);
  }

  for (const sub of subs.slice(0, 20)) {
    const subId = (sub as Record<string, unknown>).id as string;
    const amount = sub.items?.data?.[0]?.plan?.amount ?? 0;
    await db.query(`
      INSERT INTO metrics_snapshots (id, category, metric_key, metric_label, value, unit, period_label, source, created_at, updated_at)
      VALUES ($1, 'finance', $2, $3, $4, 'USD', 'Current', 'stripe', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, [`ms_stripe_sub_${subId}`, `sub_${subId}`, `Subscription ${subId}`, amount / 100]);
  }

  return subs.length;
}

async function syncSheets(db: ReturnType<typeof getPool>, extra: Record<string, unknown>): Promise<number> {
  const spreadsheetId = String(extra.spreadsheetId ?? "");
  const sheetName = String(extra.sheetName ?? "Sheet1");
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not configured on server");
  const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`);
  if (!resp.ok) throw new Error("Could not access Google Sheet — check sharing settings");
  const sheetData = await resp.json() as { values?: string[][] };
  const rows = sheetData.values ?? [];
  return Math.max(0, rows.length - 1);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") { err(res, "Method not allowed", 405); return; }

  const email = await requireAdmin(req, res);
  if (!email) return;

  const provider = String(req.query["provider"] ?? "");
  if (!provider) { err(res, "provider is required", 400); return; }

  const db = getPool();
  const logId = `sl_${randomUUID().slice(0, 8)}`;

  try {
    const { rows } = await db.query(`SELECT * FROM integration_connections WHERE provider = $1 LIMIT 1`, [provider]);
    const conn = rows[0] as Record<string, unknown> | undefined;
    if (!conn) { err(res, `${provider} is not connected`, 404); return; }

    await db.query(`
      INSERT INTO sync_logs (id, integration_id, provider, status, records_synced, started_at)
      VALUES ($1, $2, $3, 'running', 0, NOW())
      ON CONFLICT (id) DO NOTHING
    `, [logId, String(conn.id), provider]);

    let recordsSynced = 0;

    if (provider === "stripe") {
      const apiKey = String(conn.access_token ?? "");
      if (!apiKey) throw new Error("No Stripe API key stored — please reconnect");
      recordsSynced = await syncStripe(db, String(conn.id), apiKey);
    } else if (provider === "sheets") {
      const extra = (conn.extra as Record<string, unknown> | undefined) ?? {};
      recordsSynced = await syncSheets(db, extra);
    } else {
      throw new Error(`${provider} sync requires a live OAuth token — please reconnect via the OAuth flow`);
    }

    await db.query(`UPDATE sync_logs SET status = 'success', records_synced = $1, completed_at = NOW() WHERE id = $2`, [recordsSynced, logId]);
    await db.query(`UPDATE integration_connections SET last_sync_at = NOW() WHERE provider = $1`, [provider]);
    ok(res, { ok: true, recordsSynced });

  } catch (e) {
    await db.query(`UPDATE sync_logs SET status = 'error', error_message = $1, completed_at = NOW() WHERE id = $2`, [
      (e as Error).message, logId
    ]).catch(() => {});
    err(res, (e as Error).message, 500);
  }
}
