import { db, integrationConnections, metricsSnapshots, syncLogs } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { IntegrationConnection } from "@workspace/db";

const GUSTO_CLIENT_ID = process.env["GUSTO_CLIENT_ID"];
const GUSTO_CLIENT_SECRET = process.env["GUSTO_CLIENT_SECRET"];
const GUSTO_REDIRECT_URI = process.env["GUSTO_REDIRECT_URI"] ?? "http://localhost:8080/api/oauth/gusto/callback";
const GUSTO_TOKEN_URL = "https://api.gusto-demo.com/oauth/token";
const GUSTO_API_BASE = "https://api.gusto-demo.com/v1";

export function isConfigured(): boolean {
  return Boolean(GUSTO_CLIENT_ID && GUSTO_CLIENT_SECRET);
}

export function getOAuthUrl(state: string): string {
  if (!GUSTO_CLIENT_ID) throw new Error("GUSTO_CLIENT_ID not configured");
  const params = new URLSearchParams({ client_id: GUSTO_CLIENT_ID, redirect_uri: GUSTO_REDIRECT_URI, response_type: "code", state });
  return `https://app.gusto-demo.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  if (!GUSTO_CLIENT_ID || !GUSTO_CLIENT_SECRET) throw new Error("Gusto credentials not configured");
  const resp = await fetch(GUSTO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: GUSTO_CLIENT_ID, client_secret: GUSTO_CLIENT_SECRET, redirect_uri: GUSTO_REDIRECT_URI }),
  });
  if (!resp.ok) throw new Error(`Gusto token exchange failed: ${await resp.text()}`);
  const data = await resp.json() as { access_token: string; refresh_token: string; expires_in?: number };
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + (data.expires_in ?? 7200) * 1000) };
}

async function refreshTokens(conn: IntegrationConnection): Promise<IntegrationConnection> {
  if (!GUSTO_CLIENT_ID || !GUSTO_CLIENT_SECRET || !conn.refreshToken) throw new Error("Cannot refresh Gusto token");
  const resp = await fetch(GUSTO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refreshToken, client_id: GUSTO_CLIENT_ID, client_secret: GUSTO_CLIENT_SECRET }),
  });
  if (!resp.ok) throw new Error(`Gusto token refresh failed: ${await resp.text()}`);
  const data = await resp.json() as { access_token: string; refresh_token: string; expires_in?: number };
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 7200) * 1000);
  const [updated] = await db.update(integrationConnections)
    .set({ accessToken: data.access_token, refreshToken: data.refresh_token, tokenExpiresAt: expiresAt, updatedAt: new Date() })
    .where(eq(integrationConnections.id, conn.id)).returning();
  return updated;
}

export async function sync(connectionId: string): Promise<{ recordsSynced: number }> {
  const logId = `sl_${randomUUID().slice(0, 8)}`;
  await db.insert(syncLogs).values({ id: logId, integrationId: connectionId, provider: "gusto", status: "running", startedAt: new Date() });

  try {
    let [conn] = await db.select().from(integrationConnections).where(eq(integrationConnections.id, connectionId));
    if (!conn) throw new Error("Gusto connection not found");
    if (conn.tokenExpiresAt && conn.tokenExpiresAt < new Date(Date.now() + 60_000)) conn = await refreshTokens(conn);

    const token = conn.accessToken ?? "";
    const extra = conn.extra as Record<string, unknown>;

    const meResp = await fetch(`${GUSTO_API_BASE}/me`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    if (!meResp.ok) throw new Error(`Gusto /me failed: ${await meResp.text()}`);
    const meData = await meResp.json() as { roles?: { payroll_admin?: { companies?: { uuid: string }[] } } };
    const existingCompanyId = String(extra?.["companyId"] ?? "");
    const resolvedCompanyId = existingCompanyId || meData.roles?.payroll_admin?.companies?.[0]?.uuid;
    if (!resolvedCompanyId) throw new Error("No Gusto company found");

    const [empResp, payrollResp] = await Promise.all([
      fetch(`${GUSTO_API_BASE}/companies/${resolvedCompanyId}/employees`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${GUSTO_API_BASE}/companies/${resolvedCompanyId}/payrolls?processed=true&include_off_cycle=false`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
    ]);

    if (!empResp.ok) throw new Error(`Gusto employees failed: ${await empResp.text()}`);
    const employees = await empResp.json() as Record<string, unknown>[];

    const deptCounts: Record<string, number> = {};
    let totalHeadcount = 0;
    for (const emp of employees) {
      const dept = String((emp["department"] as Record<string, unknown>)?.["name"] ?? "Other");
      deptCounts[dept] = (deptCounts[dept] ?? 0) + 1;
      totalHeadcount++;
    }

    const now = new Date();
    const periodLabel = now.toISOString().slice(0, 7);
    const prefix = `gusto_${conn.id}`;
    const metrics: { key: string; label: string; value: number; unit: string }[] = [
      { key: "totalHeadcount", label: "Total Headcount", value: totalHeadcount, unit: "count" },
      ...Object.entries(deptCounts).map(([dept, count]) => ({
        key: `hc_${dept.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        label: `Headcount: ${dept}`,
        value: count,
        unit: "count",
      })),
    ];

    let totalPayroll = 0;
    if (payrollResp?.ok) {
      const payrolls = await payrollResp.json() as Record<string, unknown>[];
      const recent = payrolls.slice(0, 12);
      for (const p of recent) {
        const totals = p["totals"] as Record<string, unknown> | undefined;
        const gross = Number(totals?.["company_debit"] ?? totals?.["gross_pay"] ?? 0);
        totalPayroll += gross;
      }
      const avgMonthlyPayroll = recent.length > 0 ? totalPayroll / recent.length : 0;
      metrics.push({ key: "avgMonthlyPayroll", label: "Avg Monthly Payroll", value: parseFloat(avgMonthlyPayroll.toFixed(2)), unit: "USD" });
      metrics.push({ key: "annualPayrollBurn", label: "Annual Payroll Burn", value: parseFloat((avgMonthlyPayroll * 12).toFixed(2)), unit: "USD" });
    }

    for (const m of metrics) {
      const id = `${prefix}_${m.key}`;
      await db.insert(metricsSnapshots).values({
        id, category: "people", metricKey: m.key, metricLabel: m.label, value: m.value, unit: m.unit,
        periodLabel, source: "gusto", createdAt: now, updatedAt: now,
      }).onConflictDoUpdate({ target: metricsSnapshots.id, set: { value: m.value, updatedAt: now } });
    }

    await db.update(integrationConnections)
      .set({ lastSyncAt: now, updatedAt: now, extra: { ...extra, companyId: resolvedCompanyId } })
      .where(eq(integrationConnections.id, connectionId));
    await db.update(syncLogs).set({ status: "success", recordsSynced: metrics.length, completedAt: now }).where(eq(syncLogs.id, logId));
    return { recordsSynced: metrics.length };
  } catch (err) {
    const msg = (err as Error).message;
    await db.update(syncLogs).set({ status: "error", errorMessage: msg, completedAt: new Date() }).where(eq(syncLogs.id, logId));
    throw err;
  }
}
