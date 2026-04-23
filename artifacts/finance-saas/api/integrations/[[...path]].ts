import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAdmin, getPool } from "../_utils.js";
import { randomUUID } from "crypto";

const PROVIDERS = ["quickbooks", "hubspot", "stripe", "sheets", "gusto"] as const;
function providerLabel(p: string): string {
  return { quickbooks: "QuickBooks Online", hubspot: "HubSpot", stripe: "Stripe", sheets: "Google Sheets", gusto: "Gusto" }[p] ?? p;
}

function toKey(s: string) { return s.toLowerCase().replace(/[\s_\-.]+/g, "").trim(); }
function detectType(headers: string[]): string {
  const h = headers.map(toKey);
  if (h.some((x) => ["valuation", "moic", "irr", "ownership"].includes(x))) return "companies";
  if (h.some((x) => ["dealsize", "dealname", "closingdate"].includes(x))) return "deals";
  if (h.some((x) => ["revenue", "expenses", "ebitda"].includes(x)) && h.includes("period")) return "financials";
  if (h.some((x) => ["metrickey"].includes(x))) return "metrics";
  return "unknown";
}
function autoMatch(headers: string[], type: string): Record<string, string> {
  const keyMap: Record<string, string[]> = { companies: ["company_name","industry","stage","revenue","valuation","growth_rate","employees","location","status","ownership","arr","moic","irr","founded"], deals: ["company_name","deal_type","deal_size","stage","closing_date","valuation","target_revenue","industry","assigned_to","priority","overview"], financials: ["period","revenue","expenses","ebitda","arr"], metrics: ["metric_key","metric_label","category","value","unit","period"] };
  const fields = keyMap[type] ?? [];
  const m: Record<string, string> = {};
  for (const h of headers) { const k = toKey(h); const norm = h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""); const match = fields.find((f) => toKey(f) === k || f === norm); if (match) m[h] = match; }
  return m;
}

async function stripeGet(apiKey: string, path: string): Promise<Record<string, unknown>> {
  const resp = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!resp.ok) throw new Error(`Stripe API error: ${await resp.text()}`);
  return resp.json() as Promise<Record<string, unknown>>;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  const email = await requireAdmin(req, res);
  if (!email) return;

  const pathParts = Array.isArray(req.query.path) ? req.query.path as string[] : typeof req.query.path === "string" ? [req.query.path] : [];
  const db = getPool();

  // GET /api/integrations (list all)
  if (pathParts.length === 0 && req.method === "GET") {
    try {
      const { rows } = await db.query(`SELECT * FROM integration_connections`);
      const result = PROVIDERS.map((p) => {
        const conn = rows.find((r: Record<string, string>) => r.provider === p);
        return { provider: p, displayName: providerLabel(p), status: conn?.status ?? "disconnected", lastSyncAt: conn?.last_sync_at ?? null, connectionId: conn?.id ?? null, configured: p === "stripe" || p === "sheets" };
      });
      return ok(res, result);
    } catch (e) { return err(res, (e as Error).message, 500); }
  }

  // DELETE /api/integrations (by provider query param)
  if (pathParts.length === 0 && req.method === "DELETE") {
    const { provider } = req.query as { provider?: string };
    if (!provider) { err(res, "provider is required"); return; }
    try { await db.query(`DELETE FROM integration_connections WHERE provider = $1`, [provider]); return ok(res, { ok: true }); }
    catch (e) { return err(res, (e as Error).message, 500); }
  }

  // POST /api/integrations/sync (global sync trigger)
  if (pathParts.length === 1 && pathParts[0] === "sync" && req.method === "POST") {
    const { provider } = req.query as { provider?: string };
    if (!provider) { err(res, "provider query param is required"); return; }
    const logId = `sl_${randomUUID().slice(0, 8)}`;
    try {
      const { rows } = await db.query(`SELECT * FROM integration_connections WHERE provider = $1 LIMIT 1`, [provider]);
      const conn = rows[0] as Record<string, unknown> | undefined;
      if (!conn) { err(res, `${provider} is not connected`, 404); return; }
      await db.query(`INSERT INTO sync_logs (id, integration_id, provider, status, records_synced, started_at) VALUES ($1,$2,$3,'running',0,NOW())`, [logId, conn.id, provider]);
      let recordsSynced = 0;
      if (provider === "stripe") {
        const apiKey = String(conn.access_token ?? "");
        if (!apiKey) throw new Error("No Stripe API key stored");
        const data = await stripeGet(apiKey, "subscriptions?limit=100&status=active") as { data?: Record<string, unknown>[] };
        recordsSynced = (data.data ?? []).length;
      }
      await db.query(`UPDATE sync_logs SET status='success', records_synced=$1, completed_at=NOW() WHERE id=$2`, [recordsSynced, logId]);
      await db.query(`UPDATE integration_connections SET last_sync_at=NOW(), status='connected' WHERE provider=$1`, [provider]);
      return ok(res, { ok: true, recordsSynced, logId });
    } catch (e) {
      await db.query(`UPDATE sync_logs SET status='failed', error_message=$1, completed_at=NOW() WHERE id=$2`, [(e as Error).message, logId]).catch(() => {});
      return err(res, (e as Error).message, 500);
    }
  }

  // POST /api/integrations/connect (global connect — stripe/sheets only)
  if (pathParts.length === 1 && pathParts[0] === "connect" && req.method === "POST") {
    const { provider } = req.query as { provider?: string };
    const body = req.body as Record<string, string>;
    if (!provider) { err(res, "provider query param is required"); return; }
    try {
      if (provider === "stripe") {
        const { apiKey } = body; if (!apiKey) { err(res, "apiKey is required"); return; }
        let accountName = "Stripe Account";
        try { const account = await stripeGet(apiKey, "account"); accountName = (account["display_name"] as string | undefined) ?? accountName; } catch { err(res, "Invalid Stripe API key — verify it begins with sk_live_ or sk_test_"); return; }
        const { rows: existing } = await db.query(`SELECT id FROM integration_connections WHERE provider='stripe'`);
        const id = (existing[0] as Record<string, string> | undefined)?.id ?? `ic_stripe_${randomUUID().slice(0, 8)}`;
        const now = new Date();
        await db.query(`INSERT INTO integration_connections (id, provider, display_name, status, access_token, created_at, updated_at) VALUES ($1,'stripe',$2,'connected',$3,$4,$5) ON CONFLICT (id) DO UPDATE SET access_token=EXCLUDED.access_token, status='connected', display_name=EXCLUDED.display_name, updated_at=EXCLUDED.updated_at`, [id, `Stripe — ${accountName}`, apiKey, now, now]);
        return ok(res, { ok: true, connectionId: id });
      } else if (provider === "sheets") {
        const { spreadsheetUrl, sheetName = "Sheet1" } = body; if (!spreadsheetUrl) { err(res, "spreadsheetUrl is required"); return; }
        const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        if (!match) { err(res, "Invalid Google Sheets URL"); return; }
        const spreadsheetId = match[1]; const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) { err(res, "GOOGLE_API_KEY not configured"); return; }
        const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`);
        if (!resp.ok) { err(res, "Could not access Google Sheet — check URL and sharing settings"); return; }
        const data = await resp.json() as { values?: string[][] };
        const rowCount = Math.max(0, (data.values?.length ?? 1) - 1);
        const { rows: existing } = await db.query(`SELECT id FROM integration_connections WHERE provider='sheets'`);
        const id = (existing[0] as Record<string, string> | undefined)?.id ?? `ic_sheets_${randomUUID().slice(0, 8)}`;
        const now = new Date();
        const extra = JSON.stringify({ spreadsheetUrl, sheetName, spreadsheetId });
        await db.query(`INSERT INTO integration_connections (id, provider, display_name, status, extra, created_at, updated_at) VALUES ($1,'sheets',$2,'connected',$3,$4,$5) ON CONFLICT (id) DO UPDATE SET extra=EXCLUDED.extra, status='connected', display_name=EXCLUDED.display_name, updated_at=EXCLUDED.updated_at`, [id, `Google Sheets — ${sheetName}`, extra, now, now]);
        return ok(res, { ok: true, connectionId: id, rowCount });
      }
      return err(res, `Provider ${provider} requires OAuth — use the oauth-url endpoint`, 400);
    } catch (e) { return err(res, (e as Error).message, 500); }
  }

  // GET /api/integrations/:provider
  if (pathParts.length === 1 && req.method === "GET") {
    const provider = pathParts[0];
    try {
      const { rows } = await db.query(`SELECT * FROM integration_connections WHERE provider=$1 LIMIT 1`, [provider]);
      if (!rows.length) { err(res, "Not found", 404); return; }
      const conn = rows[0] as Record<string, unknown>;
      return ok(res, { provider: conn.provider, status: conn.status, lastSyncAt: conn.last_sync_at, connectionId: conn.id, displayName: conn.display_name });
    } catch (e) { return err(res, (e as Error).message, 500); }
  }

  // DELETE /api/integrations/:provider
  if (pathParts.length === 1 && req.method === "DELETE") {
    const provider = pathParts[0];
    try {
      await db.query(`DELETE FROM integration_connections WHERE provider=$1`, [provider]);
      await db.query(`DELETE FROM sync_logs WHERE provider=$1`, [provider]);
      return ok(res, { ok: true });
    } catch (e) { return err(res, (e as Error).message, 500); }
  }

  // GET /api/integrations/:provider/oauth-url
  if (pathParts.length === 2 && pathParts[1] === "oauth-url" && req.method === "GET") {
    const provider = pathParts[0];
    const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
    const host = req.headers.host as string;
    const redirectUri = encodeURIComponent(`${proto}://${host}/api/oauth/${provider}/callback`);
    let url = "";
    if (provider === "quickbooks") {
      const clientId = process.env.QB_CLIENT_ID ?? ""; const scope = encodeURIComponent("com.intuit.quickbooks.accounting");
      url = `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${randomUUID()}`;
    } else if (provider === "hubspot") {
      const clientId = process.env.HUBSPOT_CLIENT_ID ?? ""; const scope = encodeURIComponent("crm.objects.deals.read crm.objects.contacts.read oauth");
      url = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    } else if (provider === "gusto") {
      const clientId = process.env.GUSTO_CLIENT_ID ?? ""; url = `https://api.gusto.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
    } else { err(res, `${provider} does not use OAuth`, 400); return; }
    if (!url) { err(res, `Missing OAuth credentials for ${provider}`, 500); return; }
    return ok(res, { url });
  }

  // POST /api/integrations/:provider/sync
  if (pathParts.length === 2 && pathParts[1] === "sync" && req.method === "POST") {
    const provider = pathParts[0]; const logId = `sl_${randomUUID().slice(0, 8)}`;
    try {
      const { rows } = await db.query(`SELECT * FROM integration_connections WHERE provider=$1 LIMIT 1`, [provider]);
      const conn = rows[0] as Record<string, unknown> | undefined;
      if (!conn) { err(res, `${provider} is not connected`, 404); return; }
      await db.query(`INSERT INTO sync_logs (id, integration_id, provider, status, records_synced, started_at) VALUES ($1,$2,$3,'running',0,NOW())`, [logId, conn.id, provider]);
      let recordsSynced = 0;
      if (provider === "stripe") {
        const apiKey = String(conn.access_token ?? ""); if (!apiKey) throw new Error("No Stripe API key");
        const data = await stripeGet(apiKey, "subscriptions?limit=100&status=active") as { data?: Record<string, unknown>[] };
        recordsSynced = (data.data ?? []).length;
      } else if (provider === "sheets") {
        const extra = (typeof conn.extra === "string" ? JSON.parse(conn.extra) : conn.extra) as { spreadsheetId?: string; sheetName?: string } | undefined;
        if (extra?.spreadsheetId) {
          const apiKey = process.env.GOOGLE_API_KEY ?? "";
          const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${extra.spreadsheetId}/values/${encodeURIComponent(extra.sheetName ?? "Sheet1")}?key=${apiKey}`);
          if (resp.ok) { const d = await resp.json() as { values?: unknown[][] }; recordsSynced = Math.max(0, (d.values?.length ?? 1) - 1); }
        }
      }
      await db.query(`UPDATE sync_logs SET status='success', records_synced=$1, completed_at=NOW() WHERE id=$2`, [recordsSynced, logId]);
      await db.query(`UPDATE integration_connections SET last_sync_at=NOW(), status='connected' WHERE provider=$1`, [provider]);
      return ok(res, { ok: true, recordsSynced, logId });
    } catch (e) {
      await db.query(`UPDATE sync_logs SET status='failed', error_message=$1, completed_at=NOW() WHERE id=$2`, [(e as Error).message, logId]).catch(() => {});
      return err(res, (e as Error).message, 500);
    }
  }

  // GET /api/integrations/:provider/sync-logs
  if (pathParts.length === 2 && pathParts[1] === "sync-logs" && req.method === "GET") {
    const provider = pathParts[0];
    try {
      const { rows } = await db.query(`SELECT id, provider, status, records_synced, error_message, started_at, completed_at FROM sync_logs WHERE provider=$1 ORDER BY started_at DESC LIMIT 10`, [provider]);
      return ok(res, rows.map((r: Record<string, unknown>) => ({ id: r.id, status: r.status, recordsSynced: r.records_synced, errorMessage: r.error_message, startedAt: r.started_at, completedAt: r.completed_at })));
    } catch (e) { return err(res, (e as Error).message, 500); }
  }

  // POST /api/integrations/:provider/connect
  if (pathParts.length === 2 && pathParts[1] === "connect" && req.method === "POST") {
    const provider = pathParts[0]; const body = req.body as Record<string, string>;
    try {
      if (provider === "stripe") {
        const { apiKey } = body; if (!apiKey) { err(res, "apiKey is required"); return; }
        let accountName = "Stripe Account";
        try { const account = await stripeGet(apiKey, "account"); accountName = (account["display_name"] as string | undefined) ?? accountName; } catch { err(res, "Invalid Stripe API key"); return; }
        const { rows: existing } = await db.query(`SELECT id FROM integration_connections WHERE provider='stripe'`);
        const id = (existing[0] as Record<string, string> | undefined)?.id ?? `ic_stripe_${randomUUID().slice(0, 8)}`;
        const now = new Date();
        await db.query(`INSERT INTO integration_connections (id, provider, display_name, status, access_token, created_at, updated_at) VALUES ($1,'stripe',$2,'connected',$3,$4,$5) ON CONFLICT (id) DO UPDATE SET access_token=EXCLUDED.access_token, status='connected', display_name=EXCLUDED.display_name, updated_at=EXCLUDED.updated_at`, [id, `Stripe — ${accountName}`, apiKey, now, now]);
        return ok(res, { ok: true, connectionId: id });
      } else if (provider === "sheets") {
        const { spreadsheetUrl, sheetName = "Sheet1" } = body; if (!spreadsheetUrl) { err(res, "spreadsheetUrl is required"); return; }
        const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        if (!match) { err(res, "Invalid Google Sheets URL"); return; }
        const spreadsheetId = match[1]; const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) { err(res, "GOOGLE_API_KEY not configured"); return; }
        const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`);
        if (!resp.ok) { err(res, "Could not access Google Sheet"); return; }
        const data = await resp.json() as { values?: string[][] };
        const headers = data.values?.[0] ?? []; const rowCount = Math.max(0, (data.values?.length ?? 1) - 1);
        const tableType = detectType(headers); const suggestedMapping = tableType !== "unknown" ? autoMatch(headers, tableType) : {};
        const { rows: existing } = await db.query(`SELECT id FROM integration_connections WHERE provider='sheets'`);
        const id = (existing[0] as Record<string, string> | undefined)?.id ?? `ic_sheets_${randomUUID().slice(0, 8)}`;
        const now = new Date(); const extra = JSON.stringify({ spreadsheetUrl, sheetName, spreadsheetId, headers });
        await db.query(`INSERT INTO integration_connections (id, provider, display_name, status, extra, created_at, updated_at) VALUES ($1,'sheets',$2,'connected',$3,$4,$5) ON CONFLICT (id) DO UPDATE SET extra=EXCLUDED.extra, status='connected', display_name=EXCLUDED.display_name, updated_at=EXCLUDED.updated_at`, [id, `Google Sheets — ${sheetName}`, extra, now, now]);
        return ok(res, { ok: true, connectionId: id, headers, rowCount, tableType, suggestedMapping });
      }
      return err(res, `Provider ${provider} requires OAuth`, 400);
    } catch (e) { return err(res, (e as Error).message, 500); }
  }

  // GET /api/integrations/:provider/preview
  if (pathParts.length === 2 && pathParts[1] === "preview" && req.method === "GET") {
    const provider = pathParts[0];
    try {
      if (provider !== "sheets") { err(res, "Preview only available for Google Sheets", 400); return; }
      const { rows } = await db.query(`SELECT * FROM integration_connections WHERE provider='sheets' LIMIT 1`);
      if (!rows.length) { err(res, "Sheets not connected", 404); return; }
      const conn = rows[0] as Record<string, unknown>;
      const extra = (typeof conn.extra === "string" ? JSON.parse(conn.extra) : conn.extra) as { spreadsheetId?: string; sheetName?: string; headers?: string[] } | undefined;
      if (!extra?.spreadsheetId) { err(res, "No spreadsheet configured"); return; }
      const apiKey = process.env.GOOGLE_API_KEY ?? "";
      const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${extra.spreadsheetId}/values/${encodeURIComponent(extra.sheetName ?? "Sheet1")}?key=${apiKey}`);
      if (!resp.ok) { err(res, "Could not access Google Sheet"); return; }
      const data = await resp.json() as { values?: string[][] };
      const [headers = [], ...dataRows] = data.values ?? [];
      const tableType = detectType(headers as string[]); const suggestedMapping = tableType !== "unknown" ? autoMatch(headers as string[], tableType) : {};
      return ok(res, { headers, rows: dataRows.slice(0, 5), rowCount: dataRows.length, tableType, suggestedMapping });
    } catch (e) { return err(res, (e as Error).message, 500); }
  }

  err(res, "Not found", 404);
}
