import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAdmin } from "../../_utils.js";
import { randomBytes } from "crypto";

const stateStore = new Map<string, { provider: string; ts: number }>();

function genState(provider: string): string {
  const state = randomBytes(16).toString("hex");
  stateStore.set(state, { provider, ts: Date.now() });
  setTimeout(() => stateStore.delete(state), 10 * 60 * 1000);
  return state;
}

function getBase(req: VercelRequest): string {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const host = req.headers.host as string;
  return `${proto}://${host}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") { err(res, "Method not allowed", 405); return; }

  const email = await requireAdmin(req, res);
  if (!email) return;

  const provider = String(req.query["provider"] ?? "");

  try {
    const state = genState(provider);
    const base = getBase(req);
    const redirectUri = `${base}/api/oauth/${provider}/callback`;
    let url: string;

    if (provider === "quickbooks") {
      const clientId = process.env.QB_CLIENT_ID;
      if (!clientId) { err(res, "QuickBooks OAuth is not configured (QB_CLIENT_ID missing)"); return; }
      const params = new URLSearchParams({
        client_id: clientId,
        scope: "com.intuit.quickbooks.accounting",
        redirect_uri: redirectUri,
        response_type: "code",
        state,
      });
      url = `https://appcenter.intuit.com/connect/oauth2?${params}`;

    } else if (provider === "hubspot") {
      const clientId = process.env.HUBSPOT_CLIENT_ID;
      if (!clientId) { err(res, "HubSpot OAuth is not configured (HUBSPOT_CLIENT_ID missing)"); return; }
      const params = new URLSearchParams({
        client_id: clientId,
        scope: "crm.objects.contacts.read crm.objects.deals.read",
        redirect_uri: redirectUri,
        state,
      });
      url = `https://app.hubspot.com/oauth/authorize?${params}`;

    } else if (provider === "gusto") {
      const clientId = process.env.GUSTO_CLIENT_ID;
      if (!clientId) { err(res, "Gusto OAuth is not configured (GUSTO_CLIENT_ID missing)"); return; }
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        state,
      });
      url = `https://api.gusto.com/oauth/authorize?${params}`;

    } else {
      err(res, `${provider} does not use OAuth — use the connect endpoint directly`); return;
    }

    ok(res, { url, state });
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
