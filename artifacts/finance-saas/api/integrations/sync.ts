import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAdmin, getPool } from "../_utils.js";
import { randomUUID } from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") { err(res, "Method not allowed", 405); return; }

  const email = await requireAdmin(req, res);
  if (!email) return;

  const { provider } = req.query as { provider?: string };
  if (!provider) { err(res, "provider query param is required"); return; }

  const db = getPool();
  const logId = `sl_${randomUUID().slice(0, 8)}`;

  try {
    const { rows } = await db.query(`SELECT * FROM integration_connections WHERE provider = $1 LIMIT 1`, [provider]);
    const conn = rows[0] as Record<string, unknown> | undefined;
    if (!conn) { err(res, `${provider} is not connected`, 404); return; }

    await db.query(`
      INSERT INTO sync_logs (id, integration_id, provider, status, records_synced, started_at)
      VALUES ($1, $2, $3, 'running', 0, NOW())
    `, [logId, conn.id, provider]);

    let recordsSynced = 0;

    if (provider === "stripe") {
      const apiKey = String(conn.access_token ?? "");
      if (!apiKey) throw new Error("No Stripe API key stored");

      const resp = await fetch(`https://api.stripe.com/v1/subscriptions?limit=100&status=active`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!resp.ok) throw new Error(`Stripe API error: ${await resp.text()}`);
      const data = await resp.json() as { data?: Record<string, unknown>[] };
      const subs = data.data ?? [];

      const totalMRR = subs.reduce((s, sub) => {
        const plan = (sub.items as Record<string, unknown> | undefined)?.data as Record<string, unknown>[] | undefined;
        const amount = Number(plan?.[0]?.price as Record<string, number> | undefined) ?? 0;
        return s + amount / 100;
      }, 0);

      if (totalMRR > 0) {
        await db.query(`
          INSERT INTO metrics_snapshots (id, category, metric_key, metric_label, value, unit, period_label, source, created_at, updated_at)
          VALUES ($1, 'operations', 'monthlyRecurringRevenue', 'Monthly Recurring Revenue', $2, 'USD', 'Current', 'stripe', NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `, [`ms_stripe_mrr`, totalMRR]);
        recordsSynced++;
      }

      recordsSynced += subs.length;

    } else if (provider === "sheets") {
      const extra = conn.extra as Record<string, unknown> | undefined;
      const spreadsheetId = String(extra?.spreadsheetId ?? "");
      const sheetName = String(extra?.sheetName ?? "Sheet1");
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) throw new Error("GOOGLE_API_KEY not configured");

      const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`;
      const resp = await fetch(sheetsUrl);
      if (!resp.ok) throw new Error("Could not access Google Sheet");
      const sheetData = await resp.json() as { values?: string[][] };
      const sheetRows = sheetData.values ?? [];
      recordsSynced = Math.max(0, sheetRows.length - 1);

    } else {
      throw new Error(`Sync for ${provider} requires OAuth — not yet configured`);
    }

    await db.query(`
      UPDATE sync_logs SET status = 'success', records_synced = $1, completed_at = NOW() WHERE id = $2
    `, [recordsSynced, logId]);

    ok(res, { ok: true, recordsSynced });
  } catch (e) {
    await db.query(`
      UPDATE sync_logs SET status = 'error', error_message = $1, completed_at = NOW() WHERE id = $2
    `, [(e as Error).message, logId]).catch(() => {});
    err(res, (e as Error).message, 500);
  }
}
