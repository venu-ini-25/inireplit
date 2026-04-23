import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_utils.js";
import { randomUUID } from "crypto";

function providerLabel(p: string): string {
  return { quickbooks: "QuickBooks Online", hubspot: "HubSpot", gusto: "Gusto" }[p] ?? p;
}

async function exchangeQuickBooks(code: string, realmId: string, redirectUri: string) {
  const clientId = process.env.QB_CLIENT_ID!;
  const clientSecret = process.env.QB_CLIENT_SECRET!;
  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const resp = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  if (!resp.ok) throw new Error("QuickBooks token exchange failed");
  const data = await resp.json() as { access_token: string; refresh_token: string; expires_in: number };
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + data.expires_in * 1000), realmId };
}

async function exchangeHubSpot(code: string, redirectUri: string) {
  const resp = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: process.env.HUBSPOT_CLIENT_ID!, client_secret: process.env.HUBSPOT_CLIENT_SECRET!, redirect_uri: redirectUri, code }),
  });
  if (!resp.ok) throw new Error("HubSpot token exchange failed");
  const data = await resp.json() as { access_token: string; refresh_token: string; expires_in: number };
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + data.expires_in * 1000), realmId: null };
}

async function exchangeGusto(code: string, redirectUri: string) {
  const resp = await fetch("https://api.gusto.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: process.env.GUSTO_CLIENT_ID!, client_secret: process.env.GUSTO_CLIENT_SECRET!, redirect_uri: redirectUri, code }),
  });
  if (!resp.ok) throw new Error("Gusto token exchange failed");
  const data = await resp.json() as { access_token: string; refresh_token: string; expires_in: number };
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + data.expires_in * 1000), realmId: null };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const pathParts = (req.query.path as string[]) ?? [];
  const provider = pathParts[0] ?? "";
  const action = pathParts[1] ?? "";

  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const host = req.headers.host as string;
  const redirectUri = `${proto}://${host}/api/oauth/${provider}/callback`;
  const settingsBase = `${proto}://${host}`;

  if (action !== "callback") { res.redirect(302, `${settingsBase}/settings/integrations?error=invalid_path`); return; }

  const code = String(req.query["code"] ?? "");
  const realmId = String(req.query["realmId"] ?? "");
  if (!code) { res.redirect(302, `${settingsBase}/settings/integrations?error=${provider}_no_code`); return; }

  try {
    let result: { accessToken: string; refreshToken: string; expiresAt: Date; realmId: string | null };
    if (provider === "quickbooks") result = await exchangeQuickBooks(code, realmId, redirectUri);
    else if (provider === "hubspot") result = await exchangeHubSpot(code, redirectUri);
    else if (provider === "gusto") result = await exchangeGusto(code, redirectUri);
    else { res.redirect(302, `${settingsBase}/settings/integrations?error=${provider}_unsupported`); return; }

    const db = getPool();
    const { rows: existing } = await db.query(`SELECT id FROM integration_connections WHERE provider = $1`, [provider]);
    const id = (existing[0] as Record<string, string> | undefined)?.id ?? `ic_${provider}_${randomUUID().slice(0, 8)}`;
    const now = new Date();
    await db.query(`
      INSERT INTO integration_connections (id, provider, display_name, status, access_token, refresh_token, token_expires_at, realm_id, created_at, updated_at)
      VALUES ($1,$2,$3,'connected',$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO UPDATE SET access_token=EXCLUDED.access_token, refresh_token=EXCLUDED.refresh_token, token_expires_at=EXCLUDED.token_expires_at, realm_id=EXCLUDED.realm_id, status='connected', updated_at=EXCLUDED.updated_at
    `, [id, provider, providerLabel(provider), result.accessToken, result.refreshToken, result.expiresAt, result.realmId, now, now]);

    res.redirect(302, `${settingsBase}/settings/integrations?connected=${provider}`);
  } catch (e) {
    console.error(`[oauth/${provider}]`, e);
    res.redirect(302, `${settingsBase}/settings/integrations?error=${provider}_${(e as Error).message.replace(/\s+/g, "_")}`);
  }
}
