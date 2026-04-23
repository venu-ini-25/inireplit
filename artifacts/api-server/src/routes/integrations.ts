import { Router } from "express";
import { randomUUID } from "crypto";
import { db, integrationConnections, syncLogs } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin";
import * as qb from "../connectors/quickbooks";
import * as hs from "../connectors/hubspot";
import * as stripe from "../connectors/stripe";
import * as sheets from "../connectors/sheets";
import * as gusto from "../connectors/gusto";
import { notifySyncFailure } from "../lib/email";

const router = Router();

const PROVIDERS = ["quickbooks", "hubspot", "stripe", "sheets", "gusto"] as const;
type Provider = (typeof PROVIDERS)[number];

function providerLabel(p: string): string {
  return { quickbooks: "QuickBooks Online", hubspot: "HubSpot", stripe: "Stripe", sheets: "Google Sheets", gusto: "Gusto" }[p] ?? p;
}

const oauthStateStore = new Map<string, { provider: string; createdAt: number }>();

function generateOAuthState(provider: string): string {
  const state = randomUUID();
  oauthStateStore.set(state, { provider, createdAt: Date.now() });
  setTimeout(() => oauthStateStore.delete(state), 10 * 60 * 1000);
  return state;
}

function validateOAuthState(state: string, expectedProvider: string): boolean {
  const entry = oauthStateStore.get(state);
  if (!entry) return false;
  if (Date.now() - entry.createdAt > 10 * 60 * 1000) {
    oauthStateStore.delete(state);
    return false;
  }
  if (entry.provider !== expectedProvider) return false;
  oauthStateStore.delete(state);
  return true;
}

router.get("/integrations", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(integrationConnections);
    const result = PROVIDERS.map((p) => {
      const conn = rows.find((r) => r.provider === p);
      const configured = p === "quickbooks" ? qb.isConfigured()
        : p === "hubspot" ? hs.isConfigured()
        : p === "stripe" ? stripe.isConfigured()
        : p === "sheets" ? sheets.isConfigured()
        : gusto.isConfigured();
      return {
        provider: p,
        displayName: providerLabel(p),
        status: conn?.status ?? "disconnected",
        lastSyncAt: conn?.lastSyncAt ?? null,
        connectionId: conn?.id ?? null,
        configured,
        configMode: p === "sheets" ? sheets.getConfigMode() : undefined,
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/integrations/setup-info", (_req, res): void => {
  res.json({
    quickbooks: {
      authType: "oauth",
      missingVars: [!process.env["QB_CLIENT_ID"] && "QB_CLIENT_ID", !process.env["QB_CLIENT_SECRET"] && "QB_CLIENT_SECRET"].filter(Boolean),
      setupUrl: "https://developer.intuit.com/app/developer/qbo/docs/get-started",
      redirectUri: process.env["QB_REDIRECT_URI"] ?? `${process.env["APP_URL"] ?? "https://inventninvest.com"}/api/oauth/quickbooks/callback`,
      steps: [
        "Go to developer.intuit.com → Create an App → QuickBooks Online",
        "Set the redirect URI to the value shown below",
        "Copy Client ID → set as QB_CLIENT_ID env var",
        "Copy Client Secret → set as QB_CLIENT_SECRET env var",
        "Restart the API server — the Connect button will become active",
      ],
    },
    hubspot: {
      authType: "oauth",
      missingVars: [!process.env["HUBSPOT_CLIENT_ID"] && "HUBSPOT_CLIENT_ID", !process.env["HUBSPOT_CLIENT_SECRET"] && "HUBSPOT_CLIENT_SECRET"].filter(Boolean),
      setupUrl: "https://app.hubspot.com/developer",
      redirectUri: process.env["HUBSPOT_REDIRECT_URI"] ?? `${process.env["APP_URL"] ?? "https://inventninvest.com"}/api/oauth/hubspot/callback`,
      steps: [
        "Go to app.hubspot.com → Developer Account → Create App",
        "Under Auth, add the redirect URI shown below",
        "Add scopes: crm.objects.deals.read, crm.objects.contacts.read",
        "Copy App ID → set as HUBSPOT_CLIENT_ID env var",
        "Copy App Secret → set as HUBSPOT_CLIENT_SECRET env var",
        "Restart the API server — the Connect button will become active",
      ],
    },
    gusto: {
      authType: "oauth",
      missingVars: [!process.env["GUSTO_CLIENT_ID"] && "GUSTO_CLIENT_ID", !process.env["GUSTO_CLIENT_SECRET"] && "GUSTO_CLIENT_SECRET"].filter(Boolean),
      setupUrl: "https://app.gusto-demo.com/developer/applications",
      redirectUri: process.env["GUSTO_REDIRECT_URI"] ?? `${process.env["APP_URL"] ?? "https://inventninvest.com"}/api/oauth/gusto/callback`,
      steps: [
        "Go to app.gusto-demo.com/developer → Create Application",
        "Add the redirect URI shown below",
        "Copy Client ID → set as GUSTO_CLIENT_ID env var",
        "Copy Client Secret → set as GUSTO_CLIENT_SECRET env var",
        "Restart the API server — the Connect button will become active",
      ],
    },
    sheets: {
      authType: "apikey_or_service_account",
      configMode: sheets.getConfigMode(),
      missingVars: sheets.getConfigMode() === "none" ? ["GOOGLE_API_KEY (for public sheets) OR GOOGLE_SERVICE_ACCOUNT_JSON (for private sheets)"] : [],
      setupUrlApiKey: "https://console.cloud.google.com/apis/credentials",
      setupUrlServiceAccount: "https://console.cloud.google.com/iam-admin/serviceaccounts",
      steps: [
        "Option A — API Key (for public sheets): Go to Google Cloud Console → APIs & Services → Credentials → Create API Key. Enable the Google Sheets API. Set GOOGLE_API_KEY env var.",
        "Option B — Service Account (for private sheets): Go to Google Cloud Console → IAM → Service Accounts → Create. Download JSON key. Base64-encode it and set as GOOGLE_SERVICE_ACCOUNT_JSON env var. Share your sheet with the service account email.",
      ],
    },
    stripe: {
      authType: "apikey",
      missingVars: [],
      setupUrl: "https://dashboard.stripe.com/apikeys",
      steps: [
        "Go to dashboard.stripe.com → Developers → API Keys",
        "Create a restricted key with read-only access to: balance, charges, customers, subscriptions",
        "Paste the key into the Stripe Connect modal in Settings",
      ],
    },
    emailAlerts: {
      configured: Boolean(process.env["RESEND_API_KEY"]),
      missingVars: !process.env["RESEND_API_KEY"] ? ["RESEND_API_KEY"] : [],
      setupUrl: "https://resend.com/api-keys",
      steps: [
        "Go to resend.com → Sign up for free",
        "Create an API key with Send access",
        "Set RESEND_API_KEY env var",
        "Optionally set EMAIL_FROM to customize the sender address (default: noreply@inventninvest.com)",
        "Restart the API server — email alerts will be active immediately",
      ],
    },
  });
});

router.get("/integrations/:provider/oauth-url", requireAdmin, (req, res): void => {
  const provider = req.params["provider"] as Provider;
  try {
    let url: string;
    const state = generateOAuthState(provider);
    if (provider === "quickbooks") url = qb.getOAuthUrl(state);
    else if (provider === "hubspot") url = hs.getOAuthUrl(state);
    else if (provider === "gusto") url = gusto.getOAuthUrl(state);
    else {
      res.status(400).json({ error: `${provider} does not use OAuth` });
      return;
    }
    res.json({ url, state });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/integrations/stripe/connect", requireAdmin, async (req, res): Promise<void> => {
  const { apiKey } = req.body as { apiKey?: string };
  if (!apiKey) {
    res.status(400).json({ error: "apiKey is required" });
    return;
  }

  const validation = await stripe.validateApiKey(apiKey);
  if (!validation.valid) {
    res.status(400).json({ error: "Invalid Stripe API key — check that it begins with sk_live_ or sk_test_ and has read permissions" });
    return;
  }

  try {
    const existing = await db.select().from(integrationConnections).where(eq(integrationConnections.provider, "stripe"));
    const id = existing[0]?.id ?? `ic_stripe_${randomUUID().slice(0, 8)}`;
    const now = new Date();
    await db.insert(integrationConnections).values({
      id, provider: "stripe", displayName: `Stripe — ${validation.accountName ?? ""}`,
      status: "connected", accessToken: apiKey, updatedAt: now, createdAt: now,
    }).onConflictDoUpdate({ target: integrationConnections.id, set: { accessToken: apiKey, status: "connected", displayName: `Stripe — ${validation.accountName ?? ""}`, updatedAt: now } });
    res.json({ ok: true, connectionId: id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/integrations/sheets/connect", requireAdmin, async (req, res): Promise<void> => {
  const { spreadsheetUrl, sheetName, columnMapping } = req.body as { spreadsheetUrl?: string; sheetName?: string; columnMapping?: Record<string, string> };
  if (!spreadsheetUrl) {
    res.status(400).json({ error: "spreadsheetUrl is required" });
    return;
  }

  const validation = await sheets.validateConnection(spreadsheetUrl, sheetName ?? "Sheet1");
  if (!validation.valid) {
    res.status(400).json({ error: validation.error ?? "Could not connect to Google Sheet" });
    return;
  }

  try {
    const existing = await db.select().from(integrationConnections).where(eq(integrationConnections.provider, "sheets"));
    const id = existing[0]?.id ?? `ic_sheets_${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const extra = {
      spreadsheetUrl,
      sheetName: sheetName ?? "Sheet1",
      tableType: validation.tableType,
      previewHeaders: validation.headers,
      columnMapping: columnMapping ?? null,
    };
    await db.insert(integrationConnections).values({
      id, provider: "sheets", displayName: `Google Sheets — ${sheetName ?? "Sheet1"}`,
      status: "connected", extra, updatedAt: now, createdAt: now,
    }).onConflictDoUpdate({ target: integrationConnections.id, set: { extra, status: "connected", displayName: `Google Sheets — ${sheetName ?? "Sheet1"}`, updatedAt: now } });
    res.json({ ok: true, connectionId: id, tableType: validation.tableType, rowCount: validation.rowCount, headers: validation.headers });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/integrations/sheets/preview", requireAdmin, async (req, res): Promise<void> => {
  const { spreadsheetUrl, sheetName } = req.body as { spreadsheetUrl?: string; sheetName?: string };
  if (!spreadsheetUrl) {
    res.status(400).json({ error: "spreadsheetUrl is required" });
    return;
  }
  try {
    const result = await sheets.validateConnection(spreadsheetUrl, sheetName ?? "Sheet1");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/integrations/:provider", requireAdmin, async (req, res): Promise<void> => {
  const provider = String(req.params["provider"]);
  try {
    await db.delete(integrationConnections).where(eq(integrationConnections.provider, provider));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/integrations/:provider/sync", requireAdmin, async (req, res): Promise<void> => {
  const provider = String(req.params["provider"]) as Provider;
  try {
    const [conn] = await db.select().from(integrationConnections).where(eq(integrationConnections.provider, provider));
    if (!conn) {
      res.status(404).json({ error: `${provider} is not connected` });
      return;
    }

    let result: { recordsSynced: number };
    if (provider === "quickbooks") result = await qb.sync(conn.id);
    else if (provider === "hubspot") result = await hs.sync(conn.id);
    else if (provider === "stripe") result = await stripe.sync(conn.id);
    else if (provider === "sheets") result = await sheets.sync(conn.id);
    else if (provider === "gusto") result = await gusto.sync(conn.id);
    else {
      res.status(400).json({ error: `Unknown provider: ${provider}` });
      return;
    }

    res.json({ ok: true, ...result });
  } catch (err) {
    const msg = (err as Error).message;
    notifySyncFailure(provider, msg).catch(() => {});
    res.status(500).json({ error: msg });
  }
});

router.get("/integrations/:provider/sync-logs", requireAdmin, async (req, res): Promise<void> => {
  const provider = String(req.params["provider"]);
  try {
    const logs = await db.select().from(syncLogs)
      .where(eq(syncLogs.provider, provider))
      .orderBy(desc(syncLogs.startedAt))
      .limit(10);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/oauth/:provider/callback", async (req, res): Promise<void> => {
  const provider = String(req.params["provider"]) as Provider;
  const code = String(req.query["code"] ?? "");
  const realmId = String(req.query["realmId"] ?? "");
  const state = String(req.query["state"] ?? "");

  if (!code) {
    res.redirect(`/settings/integrations?error=${provider}_no_code`);
    return;
  }

  if (!state || !validateOAuthState(state, provider)) {
    res.redirect(`/settings/integrations?error=${provider}_invalid_state`);
    return;
  }

  try {
    let accessToken: string, refreshToken: string, expiresAt: Date;

    if (provider === "quickbooks") {
      ({ accessToken, refreshToken, expiresAt } = await qb.exchangeCode(code, realmId));
    } else if (provider === "hubspot") {
      ({ accessToken, refreshToken, expiresAt } = await hs.exchangeCode(code));
    } else if (provider === "gusto") {
      ({ accessToken, refreshToken, expiresAt } = await gusto.exchangeCode(code));
    } else {
      res.redirect(`/settings/integrations?error=${provider}_unsupported`);
      return;
    }

    const existing = await db.select().from(integrationConnections).where(eq(integrationConnections.provider, provider));
    const id = existing[0]?.id ?? `ic_${provider}_${randomUUID().slice(0, 8)}`;
    const now = new Date();
    await db.insert(integrationConnections).values({
      id, provider, displayName: providerLabel(provider), status: "connected",
      accessToken, refreshToken, tokenExpiresAt: expiresAt,
      realmId: realmId || null, updatedAt: now, createdAt: now,
    }).onConflictDoUpdate({
      target: integrationConnections.id,
      set: { accessToken, refreshToken, tokenExpiresAt: expiresAt, status: "connected", realmId: realmId || null, updatedAt: now },
    });

    res.redirect(`/settings/integrations?connected=${provider}`);
  } catch (err) {
    console.error(`[oauth/${provider}]`, (err as Error).message);
    res.redirect(`/settings/integrations?error=${provider}_auth_failed`);
  }
});

export default router;
