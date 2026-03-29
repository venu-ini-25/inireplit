import { db, integrationConnections, financialSnapshots, metricsSnapshots, syncLogs } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { IntegrationConnection } from "@workspace/db";

const QB_CLIENT_ID = process.env["QB_CLIENT_ID"];
const QB_CLIENT_SECRET = process.env["QB_CLIENT_SECRET"];
const QB_REDIRECT_URI = process.env["QB_REDIRECT_URI"] ?? "http://localhost:8080/api/oauth/quickbooks/callback";
const QB_API_BASE = "https://quickbooks.api.intuit.com/v3/company";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

export function isConfigured(): boolean {
  return Boolean(QB_CLIENT_ID && QB_CLIENT_SECRET);
}

export function getOAuthUrl(state: string): string {
  if (!QB_CLIENT_ID) throw new Error("QB_CLIENT_ID not configured");
  const params = new URLSearchParams({
    client_id: QB_CLIENT_ID,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: QB_REDIRECT_URI,
    state,
  });
  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
}

export async function exchangeCode(code: string, realmId: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  if (!QB_CLIENT_ID || !QB_CLIENT_SECRET) throw new Error("QuickBooks credentials not configured");
  const creds = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString("base64");
  const resp = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: QB_REDIRECT_URI }),
  });
  if (!resp.ok) throw new Error(`QB token exchange failed: ${await resp.text()}`);
  const data = await resp.json() as { access_token: string; refresh_token: string; expires_in: number };
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + data.expires_in * 1000) };
}

async function refreshTokens(conn: IntegrationConnection): Promise<IntegrationConnection> {
  if (!QB_CLIENT_ID || !QB_CLIENT_SECRET || !conn.refreshToken) throw new Error("Cannot refresh: missing credentials");
  const creds = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString("base64");
  const resp = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refreshToken }),
  });
  if (!resp.ok) throw new Error(`QB token refresh failed: ${await resp.text()}`);
  const data = await resp.json() as { access_token: string; refresh_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  const [updated] = await db.update(integrationConnections)
    .set({ accessToken: data.access_token, refreshToken: data.refresh_token, tokenExpiresAt: expiresAt, updatedAt: new Date() })
    .where(eq(integrationConnections.id, conn.id))
    .returning();
  return updated;
}

async function qbFetch(token: string, realmId: string, reportType: string, params: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const url = new URL(`${QB_API_BASE}/${realmId}/reports/${reportType}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  if (!resp.ok) throw new Error(`QB ${reportType} error: ${await resp.text()}`);
  return resp.json() as Promise<Record<string, unknown>>;
}

function extractMonthColumns(data: Record<string, unknown>): string[] {
  const columns = (data["Columns"] as Record<string, unknown>)?.["Column"] as Record<string, unknown>[] ?? [];
  return columns.slice(1, -1).map((c) => String(c["ColTitle"] ?? ""));
}

function findRowByName(rows: Record<string, unknown>[], name: string): Record<string, unknown> | undefined {
  return rows.find((r) => {
    const header = (r["Header"] as Record<string, unknown>)?.["ColData"] as Record<string, unknown>[];
    return String(header?.[0]?.["value"] ?? "") === name;
  });
}

function getSummaryValues(section: Record<string, unknown> | undefined, monthCount: number): number[] {
  if (!section) return Array(monthCount).fill(0) as number[];
  const summary = (section["Summary"] as Record<string, unknown>)?.["ColData"] as Record<string, unknown>[];
  if (!summary) return Array(monthCount).fill(0) as number[];
  return summary.slice(1, -1).map((c) => Number(String(c["value"] ?? "0").replace(/,/g, "")) || 0);
}

function getRowValues(row: Record<string, unknown> | undefined, monthCount: number): number[] {
  if (!row) return Array(monthCount).fill(0) as number[];
  const colData = (row["ColData"] as Record<string, unknown>[]) ?? [];
  return colData.slice(1).map((c) => Number(String(c["value"] ?? "0").replace(/,/g, "")) || 0).slice(0, monthCount);
}

export async function sync(connectionId: string): Promise<{ recordsSynced: number }> {
  const logId = `sl_${randomUUID().slice(0, 8)}`;
  await db.insert(syncLogs).values({ id: logId, integrationId: connectionId, provider: "quickbooks", status: "running", startedAt: new Date() });

  try {
    let [conn] = await db.select().from(integrationConnections).where(eq(integrationConnections.id, connectionId));
    if (!conn || !conn.realmId) throw new Error("QuickBooks connection not found or missing realmId");
    const realmId: string = conn.realmId;
    if (conn.tokenExpiresAt && conn.tokenExpiresAt < new Date(Date.now() + 60_000)) conn = await refreshTokens(conn);

    const token = conn.accessToken ?? "";

    const endDate = new Date().toISOString().split("T")[0] as string;
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] as string;

    const [plData, bsData, cfData] = await Promise.all([
      qbFetch(token, realmId, "ProfitAndLoss", { start_date: startDate, end_date: endDate, summarize_column_by: "Month" }),
      qbFetch(token, realmId, "BalanceSheet", { start_date: startDate, end_date: endDate, summarize_column_by: "Month" }).catch(() => null),
      qbFetch(token, realmId, "CashFlow", { start_date: startDate, end_date: endDate, summarize_column_by: "Month" }).catch(() => null),
    ]);

    const monthLabels = extractMonthColumns(plData);
    const plRows = ((plData["Rows"] as Record<string, unknown>)?.["Row"] as Record<string, unknown>[]) ?? [];

    const revenues = getSummaryValues(findRowByName(plRows, "Income"), monthLabels.length);
    const expenses = getSummaryValues(findRowByName(plRows, "Expenses"), monthLabels.length);

    let recordsSynced = 0;

    for (let i = 0; i < monthLabels.length; i++) {
      const period = monthLabels[i];
      if (!period) continue;
      const rev = revenues[i] ?? 0;
      const exp = expenses[i] ?? 0;
      const id = `qb_${realmId}_${period.replace(/\s/g, "_")}`;
      await db.insert(financialSnapshots)
        .values({ id, period, revenue: Math.round(rev), expenses: Math.round(exp), ebitda: Math.round(rev - exp), arr: Math.round(rev * 12), sortOrder: i, createdAt: new Date() })
        .onConflictDoUpdate({ target: financialSnapshots.id, set: { revenue: Math.round(rev), expenses: Math.round(exp), ebitda: Math.round(rev - exp), arr: Math.round(rev * 12) } });
      recordsSynced++;
    }

    if (bsData) {
      const bsRows = ((bsData["Rows"] as Record<string, unknown>)?.["Row"] as Record<string, unknown>[]) ?? [];
      const cashRow = bsRows.flatMap((r) => {
        const sub = (r["Rows"] as Record<string, unknown>)?.["Row"] as Record<string, unknown>[] ?? [];
        return sub;
      }).find((r) => {
        const cols = r["ColData"] as Record<string, unknown>[];
        return String(cols?.[0]?.["value"] ?? "").toLowerCase().includes("cash");
      });
      const cashValues = getRowValues(cashRow, monthLabels.length);

      for (let i = 0; i < monthLabels.length; i++) {
        const period = monthLabels[i];
        if (!period) continue;
        const id = `qb_bs_cash_${realmId}_${period.replace(/\s/g, "_")}`;
        const val = cashValues[i] ?? 0;
        const now = new Date();
        await db.insert(metricsSnapshots).values({
          id, category: "balance_sheet", metricKey: "cash", metricLabel: "Cash & Equivalents",
          value: val, unit: "USD", periodLabel: period, source: "quickbooks", createdAt: now, updatedAt: now,
        }).onConflictDoUpdate({ target: metricsSnapshots.id, set: { value: val, updatedAt: now } });
        recordsSynced++;
      }
    }

    if (cfData) {
      const cfRows = ((cfData["Rows"] as Record<string, unknown>)?.["Row"] as Record<string, unknown>[]) ?? [];
      const opCFSection = findRowByName(cfRows, "Operating Activities");
      const opCFValues = getSummaryValues(opCFSection, monthLabels.length);

      for (let i = 0; i < monthLabels.length; i++) {
        const period = monthLabels[i];
        if (!period) continue;
        const id = `qb_cf_ops_${realmId}_${period.replace(/\s/g, "_")}`;
        const val = opCFValues[i] ?? 0;
        const now = new Date();
        await db.insert(metricsSnapshots).values({
          id, category: "cash_flow", metricKey: "operating_cash_flow", metricLabel: "Operating Cash Flow",
          value: val, unit: "USD", periodLabel: period, source: "quickbooks", createdAt: now, updatedAt: now,
        }).onConflictDoUpdate({ target: metricsSnapshots.id, set: { value: val, updatedAt: now } });
        recordsSynced++;
      }
    }

    await db.update(integrationConnections).set({ lastSyncAt: new Date(), updatedAt: new Date() }).where(eq(integrationConnections.id, connectionId));
    await db.update(syncLogs).set({ status: "success", recordsSynced, completedAt: new Date() }).where(eq(syncLogs.id, logId));
    return { recordsSynced };
  } catch (err) {
    const msg = (err as Error).message;
    await db.update(syncLogs).set({ status: "error", errorMessage: msg, completedAt: new Date() }).where(eq(syncLogs.id, logId));
    throw err;
  }
}
