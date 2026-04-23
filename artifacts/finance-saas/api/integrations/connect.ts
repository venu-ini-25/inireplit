import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAdmin, getPool } from "../_utils.js";
import { randomUUID } from "crypto";

async function stripeGet(apiKey: string, path: string): Promise<Record<string, unknown>> {
  const resp = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resp.ok) throw new Error(`Stripe API error: ${await resp.text()}`);
  return resp.json() as Promise<Record<string, unknown>>;
}

async function connectStripe(db: ReturnType<typeof import("pg").Pool.prototype.connect extends () => infer R ? () => R : never>, body: Record<string, string>) {
  const { apiKey } = body;
  if (!apiKey) throw new Error("apiKey is required");

  let accountName = "Stripe Account";
  try {
    const account = await stripeGet(apiKey, "account");
    accountName = (account["display_name"] as string | undefined) ?? accountName;
  } catch {
    throw new Error("Invalid Stripe API key — verify it begins with sk_live_ or sk_test_");
  }

  const { rows: existing } = await (db as unknown as ReturnType<typeof import("pg")["Pool"]["prototype"]>).query(
    `SELECT id FROM integration_connections WHERE provider = 'stripe'`
  );
  const id = (existing[0] as Record<string, string> | undefined)?.id ?? `ic_stripe_${randomUUID().slice(0, 8)}`;
  const now = new Date();
  await (db as unknown as ReturnType<typeof import("pg")["Pool"]["prototype"]>).query(`
    INSERT INTO integration_connections (id, provider, display_name, status, access_token, created_at, updated_at)
    VALUES ($1, 'stripe', $2, 'connected', $3, $4, $5)
    ON CONFLICT (id) DO UPDATE SET access_token = EXCLUDED.access_token, status = 'connected', display_name = EXCLUDED.display_name, updated_at = EXCLUDED.updated_at
  `, [id, `Stripe — ${accountName}`, apiKey, now, now]);
  return { ok: true, connectionId: id, accountName };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") { err(res, "Method not allowed", 405); return; }

  const email = await requireAdmin(req, res);
  if (!email) return;

  const { provider } = req.query as { provider?: string };
  if (!provider) { err(res, "provider query param is required"); return; }

  const body = req.body as Record<string, string>;
  const pool = getPool();

  try {
    if (provider === "stripe") {
      const apiKey = body.apiKey;
      if (!apiKey) { err(res, "apiKey is required"); return; }

      let accountName = "Stripe Account";
      try {
        const account = await stripeGet(apiKey, "account");
        accountName = (account["display_name"] as string | undefined) ?? accountName;
      } catch {
        err(res, "Invalid Stripe API key — verify it begins with sk_live_ or sk_test_"); return;
      }

      const { rows: existing } = await pool.query(`SELECT id FROM integration_connections WHERE provider = 'stripe'`);
      const id = (existing[0] as Record<string, string> | undefined)?.id ?? `ic_stripe_${randomUUID().slice(0, 8)}`;
      const now = new Date();
      await pool.query(`
        INSERT INTO integration_connections (id, provider, display_name, status, access_token, created_at, updated_at)
        VALUES ($1, 'stripe', $2, 'connected', $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET access_token = EXCLUDED.access_token, status = 'connected', display_name = EXCLUDED.display_name, updated_at = EXCLUDED.updated_at
      `, [id, `Stripe — ${accountName}`, apiKey, now, now]);
      ok(res, { ok: true, connectionId: id });

    } else if (provider === "sheets") {
      const { spreadsheetUrl, sheetName = "Sheet1" } = body;
      if (!spreadsheetUrl) { err(res, "spreadsheetUrl is required"); return; }

      const spreadsheetIdMatch = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (!spreadsheetIdMatch) { err(res, "Invalid Google Sheets URL"); return; }
      const spreadsheetId = spreadsheetIdMatch[1];

      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) { err(res, "GOOGLE_API_KEY env var not configured"); return; }

      const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;
      const resp = await fetch(sheetsUrl);
      if (!resp.ok) { err(res, `Could not access Google Sheet — check URL and sharing settings`); return; }
      const data = await resp.json() as { values?: string[][] };
      const headers = data.values?.[0] ?? [];
      const rowCount = Math.max(0, (data.values?.length ?? 1) - 1);

      const { rows: existing } = await pool.query(`SELECT id FROM integration_connections WHERE provider = 'sheets'`);
      const id = (existing[0] as Record<string, string> | undefined)?.id ?? `ic_sheets_${randomUUID().slice(0, 8)}`;
      const now = new Date();
      const extra = JSON.stringify({ spreadsheetUrl, sheetName, spreadsheetId, headers });
      await pool.query(`
        INSERT INTO integration_connections (id, provider, display_name, status, extra, created_at, updated_at)
        VALUES ($1, 'sheets', $2, 'connected', $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET extra = EXCLUDED.extra, status = 'connected', display_name = EXCLUDED.display_name, updated_at = EXCLUDED.updated_at
      `, [id, `Google Sheets — ${sheetName}`, extra, now, now]);
      ok(res, { ok: true, connectionId: id, headers, rowCount });

    } else {
      err(res, `Provider ${provider} requires OAuth — use the oauth-url endpoint`, 400);
    }
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
