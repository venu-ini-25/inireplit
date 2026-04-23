import { db, integrationConnections, companies, financialSnapshots, deals, syncLogs, metricsSnapshots } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { google } from "googleapis";

export function isConfigured(): boolean {
  return Boolean(process.env["GOOGLE_SERVICE_ACCOUNT_JSON"] || process.env["GOOGLE_API_KEY"]);
}

export function getConfigMode(): "service_account" | "api_key" | "none" {
  if (process.env["GOOGLE_SERVICE_ACCOUNT_JSON"]) return "service_account";
  if (process.env["GOOGLE_API_KEY"]) return "api_key";
  return "none";
}

function getAuth() {
  const json = process.env["GOOGLE_SERVICE_ACCOUNT_JSON"];
  if (!json) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured — set this env var to a base64-encoded service account JSON");
  const creds = JSON.parse(Buffer.from(json, "base64").toString("utf8")) as Record<string, string>;
  return new google.auth.GoogleAuth({ credentials: creds, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
}

async function getRowsViaApiKey(spreadsheetId: string, sheetName: string): Promise<string[][]> {
  const apiKey = process.env["GOOGLE_API_KEY"];
  if (!apiKey) throw new Error("GOOGLE_API_KEY not configured");
  const range = encodeURIComponent(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google Sheets API error: ${text}`);
  }
  const data = await resp.json() as { values?: string[][] };
  return data.values ?? [];
}

async function getRows(spreadsheetId: string, sheetName: string): Promise<string[][]> {
  if (process.env["GOOGLE_SERVICE_ACCOUNT_JSON"]) {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
    return (resp.data.values ?? []) as string[][];
  }
  return getRowsViaApiKey(spreadsheetId, sheetName);
}

function extractSpreadsheetId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match || !match[1]) throw new Error("Invalid Google Sheets URL — cannot extract spreadsheet ID");
  return match[1];
}

function detectTableType(headers: string[]): "companies" | "financials" | "deals" | "metrics" | "unknown" {
  const h = headers.map((s) => s.toLowerCase().replace(/[^a-z]/g, ""));
  if (h.some((x) => ["valuation", "arr", "moic", "irr", "ownership"].includes(x))) return "companies";
  if (h.some((x) => ["revenue", "expenses", "period", "ebitda"].includes(x))) return "financials";
  if (h.some((x) => ["dealsize", "dealname", "closingdate", "dealtype"].includes(x))) return "deals";
  if (h.some((x) => ["metrickey", "metric", "category", "metriclabel"].includes(x))) return "metrics";
  if (h.includes("company") || h.includes("industry") || h.includes("stage")) return "companies";
  return "unknown";
}

export async function validateConnection(spreadsheetUrl: string, sheetName: string): Promise<{
  valid: boolean;
  tableType?: string;
  rowCount?: number;
  headers?: string[];
  error?: string;
}> {
  try {
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    const rows = await getRows(spreadsheetId, sheetName);
    if (rows.length < 2) return { valid: true, tableType: "unknown", rowCount: 0, headers: [] };
    const headers = rows[0]!.map(String);
    const tableType = detectTableType(headers);
    return { valid: true, tableType, rowCount: rows.length - 1, headers };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}

function applyMapping(header: string, mapping: Record<string, string> | null): string {
  if (!mapping) return header;
  return mapping[header] ?? header;
}

export async function sync(connectionId: string): Promise<{ recordsSynced: number }> {
  const logId = `sl_${randomUUID().slice(0, 8)}`;
  await db.insert(syncLogs).values({ id: logId, integrationId: connectionId, provider: "sheets", status: "running", startedAt: new Date() });

  try {
    const [conn] = await db.select().from(integrationConnections).where(eq(integrationConnections.id, connectionId));
    if (!conn) throw new Error("Google Sheets connection not found");
    const extra = conn.extra as Record<string, string | Record<string, string> | null>;
    const spreadsheetUrl = String(extra?.["spreadsheetUrl"] ?? "");
    const sheetName = String(extra?.["sheetName"] ?? "Sheet1");
    const columnMapping = (extra?.["columnMapping"] ?? null) as Record<string, string> | null;

    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    const rows = await getRows(spreadsheetId, sheetName);
    if (rows.length < 2) {
      const now = new Date();
      await db.update(integrationConnections).set({ lastSyncAt: now, updatedAt: now }).where(eq(integrationConnections.id, connectionId));
      await db.update(syncLogs).set({ status: "success", recordsSynced: 0, completedAt: now }).where(eq(syncLogs.id, logId));
      return { recordsSynced: 0 };
    }

    const rawHeaders = rows[0].map(String);
    const headers = rawHeaders.map((h) => applyMapping(h, columnMapping));
    const tableType = detectTableType(headers);
    const dataRows = rows.slice(1);
    let recordsSynced = 0;

    const toRow = (row: string[]): Record<string, string> =>
      Object.fromEntries(headers.map((h, i) => [h.toLowerCase().replace(/\s+/g, "_"), row[i] ?? ""]));

    if (tableType === "financials") {
      for (const row of dataRows) {
        const r = toRow(row);
        const period = r["period"] ?? "";
        if (!period) continue;
        const id = `sh_${spreadsheetId}_${period.replace(/\s/g, "_")}`;
        const rev = Number(r["revenue"] || 0);
        const exp = Number(r["expenses"] || 0);
        await db.insert(financialSnapshots).values({
          id, period, revenue: Math.round(rev), expenses: Math.round(exp),
          ebitda: r["ebitda"] ? Math.round(Number(r["ebitda"])) : Math.round(rev - exp),
          arr: r["arr"] ? Math.round(Number(r["arr"])) : Math.round(rev * 12),
          sortOrder: recordsSynced, createdAt: new Date(),
        }).onConflictDoUpdate({
          target: financialSnapshots.id,
          set: { revenue: Math.round(rev), expenses: Math.round(exp), ebitda: Math.round(rev - exp) },
        });
        recordsSynced++;
      }
    } else if (tableType === "companies") {
      for (const row of dataRows) {
        const r = toRow(row);
        const name = r["company"] ?? r["name"] ?? r["company_name"] ?? "";
        if (!name) continue;
        const id = `sh_co_${name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30)}`;
        await db.insert(companies).values({
          id, name, industry: r["industry"] ?? "", stage: r["stage"] ?? "seed",
          revenue: Math.round(Number(r["revenue"] || 0)),
          valuation: Math.round(Number(r["valuation"] || 0)),
          growthRate: Number(r["growth_rate"] ?? r["growth"] ?? 0),
          employees: Math.round(Number(r["employees"] || 0)),
          location: r["location"] ?? "", status: r["status"] ?? "active",
          dataVerified: false, ndaSigned: false, logo: "", createdAt: new Date(), updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: companies.id,
          set: { revenue: Math.round(Number(r["revenue"] || 0)), valuation: Math.round(Number(r["valuation"] || 0)), updatedAt: new Date() },
        });
        recordsSynced++;
      }
    } else if (tableType === "metrics") {
      for (const row of dataRows) {
        const r = toRow(row);
        const metricKey = r["metric_key"] ?? r["metric"] ?? r["metrickey"] ?? "";
        const metricLabel = r["metric_label"] ?? r["metriclabel"] ?? r["label"] ?? metricKey;
        const category = r["category"] ?? "sheets";
        const periodLabel = r["period"] ?? r["period_label"] ?? "";
        if (!metricKey) continue;
        const val = Number(r["value"] ?? r["amount"] ?? 0);
        const now = new Date();
        const slug = `sh_metric_${spreadsheetId.slice(0, 12)}_${category}_${metricKey}_${periodLabel}`.replace(/[^a-z0-9_]/gi, "_").slice(0, 80);
        await db.insert(metricsSnapshots).values({
          id: slug, category, metricKey, metricLabel: String(metricLabel),
          value: val, unit: r["unit"] ?? "USD", periodLabel: String(periodLabel),
          source: "sheets", createdAt: now, updatedAt: now,
        }).onConflictDoUpdate({
          target: metricsSnapshots.id,
          set: { value: val, updatedAt: now },
        });
        recordsSynced++;
      }
    } else if (tableType === "deals") {
      for (const row of dataRows) {
        const r = toRow(row);
        const companyName = r["deal"] ?? r["company_name"] ?? r["deal_name"] ?? r["company"] ?? "";
        if (!companyName) continue;
        const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 40);
        const id = `sh_deal_${slug}`;
        const now = new Date();
        const dealValues = {
          companyName, industry: r["industry"] ?? "", dealType: r["deal_type"] ?? "investment",
          stage: r["stage"] ?? "sourcing",
          dealSize: Math.round(Number(r["dealsize"] ?? r["deal_size"] ?? r["size"] ?? 0)),
          valuation: Math.round(Number(r["valuation"] ?? 0)),
          targetRevenue: Math.round(Number(r["revenue"] ?? 0)),
          assignedTo: r["assigned_to"] ?? r["owner"] ?? r["lead"] ?? "",
          priority: r["priority"] ?? "medium",
          closingDate: r["closing_date"] ?? r["close_date"] ?? r["closedate"] ?? null,
          ndaSigned: ["true", "yes", "1"].includes((r["nda_signed"] ?? "").toLowerCase()),
          dataRoomAccess: false,
          overview: r["overview"] ?? r["notes"] ?? r["description"] ?? "",
          thesis: r["thesis"] ?? "",
          updatedAt: now,
        };
        await db.insert(deals).values({ id, ...dealValues, createdAt: now })
          .onConflictDoUpdate({
            target: deals.id,
            set: { ...dealValues },
          });
        recordsSynced++;
      }
    }

    const now = new Date();
    await db.update(integrationConnections).set({ lastSyncAt: now, updatedAt: now }).where(eq(integrationConnections.id, connectionId));
    await db.update(syncLogs).set({ status: "success", recordsSynced, completedAt: now }).where(eq(syncLogs.id, logId));
    return { recordsSynced };
  } catch (err) {
    const msg = (err as Error).message;
    await db.update(syncLogs).set({ status: "error", errorMessage: msg, completedAt: new Date() }).where(eq(syncLogs.id, logId));
    throw err;
  }
}
