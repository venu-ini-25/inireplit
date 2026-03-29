import { db, integrationConnections, deals, syncLogs } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { IntegrationConnection } from "@workspace/db";

const HS_CLIENT_ID = process.env["HUBSPOT_CLIENT_ID"];
const HS_CLIENT_SECRET = process.env["HUBSPOT_CLIENT_SECRET"];
const HS_REDIRECT_URI = process.env["HUBSPOT_REDIRECT_URI"] ?? "http://localhost:8080/api/oauth/hubspot/callback";
const HS_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";

export function isConfigured(): boolean {
  return Boolean(HS_CLIENT_ID && HS_CLIENT_SECRET);
}

export function getOAuthUrl(state: string): string {
  if (!HS_CLIENT_ID) throw new Error("HUBSPOT_CLIENT_ID not configured");
  const params = new URLSearchParams({
    client_id: HS_CLIENT_ID,
    redirect_uri: HS_REDIRECT_URI,
    scope: "crm.objects.deals.read crm.objects.contacts.read",
    optional_scope: "crm.objects.companies.read",
    state,
  });
  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  if (!HS_CLIENT_ID || !HS_CLIENT_SECRET) throw new Error("HubSpot credentials not configured");
  const resp = await fetch(HS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: HS_CLIENT_ID, client_secret: HS_CLIENT_SECRET, redirect_uri: HS_REDIRECT_URI, code }),
  });
  if (!resp.ok) throw new Error(`HubSpot token exchange failed: ${await resp.text()}`);
  const data = await resp.json() as { access_token: string; refresh_token: string; expires_in: number };
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + data.expires_in * 1000) };
}

async function refreshTokens(conn: IntegrationConnection): Promise<IntegrationConnection> {
  if (!HS_CLIENT_ID || !HS_CLIENT_SECRET || !conn.refreshToken) throw new Error("Cannot refresh HubSpot token");
  const resp = await fetch(HS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: HS_CLIENT_ID, client_secret: HS_CLIENT_SECRET, refresh_token: conn.refreshToken }),
  });
  if (!resp.ok) throw new Error(`HubSpot token refresh failed: ${await resp.text()}`);
  const data = await resp.json() as { access_token: string; refresh_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  const [updated] = await db.update(integrationConnections)
    .set({ accessToken: data.access_token, refreshToken: data.refresh_token, tokenExpiresAt: expiresAt, updatedAt: new Date() })
    .where(eq(integrationConnections.id, conn.id))
    .returning();
  return updated;
}

async function fetchContacts(token: string, dealId: string): Promise<{ name: string; role: string; email?: string }[]> {
  try {
    const assocResp = await fetch(
      `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/contacts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!assocResp.ok) return [];
    const assocData = await assocResp.json() as { results?: { id: string }[] };
    const contactIds = (assocData.results ?? []).map((r) => r.id).slice(0, 5);
    if (contactIds.length === 0) return [];

    const contacts: { name: string; role: string; email?: string }[] = [];
    for (const cid of contactIds) {
      const cResp = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${cid}?properties=firstname,lastname,email,jobtitle`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!cResp.ok) continue;
      const c = await cResp.json() as { properties?: Record<string, string> };
      const p = c.properties ?? {};
      const name = [p["firstname"], p["lastname"]].filter(Boolean).join(" ") || "Unknown";
      contacts.push({ name, role: p["jobtitle"] ?? "Contact", email: p["email"] });
    }
    return contacts;
  } catch {
    return [];
  }
}

const STAGE_MAP: Record<string, string> = {
  appointmentscheduled: "sourcing",
  qualifiedtobuy: "screening",
  presentationscheduled: "due_diligence",
  decisionmakerboughtin: "negotiation",
  contractsent: "negotiation",
  closedwon: "closed_won",
  closedlost: "closed_lost",
};

export async function sync(connectionId: string): Promise<{ recordsSynced: number }> {
  const logId = `sl_${randomUUID().slice(0, 8)}`;
  await db.insert(syncLogs).values({ id: logId, integrationId: connectionId, provider: "hubspot", status: "running", startedAt: new Date() });

  try {
    let [conn] = await db.select().from(integrationConnections).where(eq(integrationConnections.id, connectionId));
    if (!conn) throw new Error("HubSpot connection not found");
    if (conn.tokenExpiresAt && conn.tokenExpiresAt < new Date(Date.now() + 60_000)) conn = await refreshTokens(conn);

    const token = conn.accessToken ?? "";
    let after: string | undefined;
    let recordsSynced = 0;

    do {
      const url = new URL("https://api.hubapi.com/crm/v3/objects/deals");
      url.searchParams.set("limit", "100");
      url.searchParams.set("properties", "dealname,amount,dealstage,closedate,hubspot_owner_id,hs_deal_stage_probability,industry");
      if (after) url.searchParams.set("after", after);

      const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
      if (!resp.ok) throw new Error(`HubSpot deals API error: ${await resp.text()}`);
      const data = await resp.json() as { results: Record<string, unknown>[]; paging?: { next?: { after: string } } };

      for (const deal of data.results) {
        const props = deal["properties"] as Record<string, string>;
        const hsId = String(deal["id"]);
        const stage = STAGE_MAP[props["dealstage"]?.toLowerCase() ?? ""] ?? "sourcing";
        const id = `hs_${hsId}`;

        const contacts = await fetchContacts(token, hsId);

        await db.insert(deals).values({
          id,
          companyName: props["dealname"] ?? "Unknown",
          industry: props["industry"] ?? "Unknown",
          dealType: "investment",
          stage,
          dealSize: Math.round(Number(props["amount"] ?? "0")),
          valuation: Math.round(Number(props["amount"] ?? "0") * 1.2),
          targetRevenue: 0,
          assignedTo: props["hubspot_owner_id"] ?? "",
          priority: "medium",
          closingDate: props["closedate"] ?? null,
          ndaSigned: false,
          dataRoomAccess: false,
          overview: `Synced from HubSpot deal: ${props["dealname"]}`,
          thesis: "",
          contacts,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: deals.id,
          set: {
            companyName: props["dealname"] ?? "Unknown",
            stage,
            dealSize: Math.round(Number(props["amount"] ?? "0")),
            closingDate: props["closedate"] ?? null,
            contacts,
            updatedAt: new Date(),
          },
        });
        recordsSynced++;
      }

      after = data.paging?.next?.after;
    } while (after);

    await db.update(integrationConnections).set({ lastSyncAt: new Date(), updatedAt: new Date() }).where(eq(integrationConnections.id, connectionId));
    await db.update(syncLogs).set({ status: "success", recordsSynced, completedAt: new Date() }).where(eq(syncLogs.id, logId));
    return { recordsSynced };
  } catch (err) {
    const msg = (err as Error).message;
    await db.update(syncLogs).set({ status: "error", errorMessage: msg, completedAt: new Date() }).where(eq(syncLogs.id, logId));
    throw err;
  }
}
