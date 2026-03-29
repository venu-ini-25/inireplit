import { db, integrationConnections, companies, financialSnapshots, deals, syncLogs } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { google } from "googleapis";

export function isConfigured(): boolean {
  return Boolean(process.env["GOOGLE_SERVICE_ACCOUNT_JSON"]);
}

function getAuth() {
  const json = process.env["GOOGLE_SERVICE_ACCOUNT_JSON"];
  if (!json) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not configured");
  const creds = JSON.parse(Buffer.from(json, "base64").toString("utf8")) as Record<string, string>;
  return new google.auth.GoogleAuth({ credentials: creds, scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"] });
}

function extractSpreadsheetId(url: string): string {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error("Invalid Google Sheets URL — cannot extract spreadsheet ID");
  return match[1];
}

function detectTableType(headers: string[]): "companies" | "financials" | "deals" | "metrics" | "unknown" {
  const h = headers.map((s) => s.toLowerCase());
  if (h.includes("company") || h.includes("valuation") || h.includes("arr")) return "companies";
  if (h.includes("revenue") || h.includes("period") || h.includes("expenses")) return "financials";
  if (h.includes("deal") || h.includes("stage") || h.includes("dealsize")) return "deals";
  if (h.includes("metric") || h.includes("value") || h.includes("category")) return "metrics";
  return "unknown";
}

export async function validateConnection(spreadsheetUrl: string, sheetName: string): Promise<{ valid: boolean; tableType?: string; rowCount?: number; error?: string }> {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
    const rows = resp.data.values ?? [];
    if (rows.length < 2) return { valid: true, tableType: "unknown", rowCount: 0 };
    const headers = rows[0].map(String);
    const tableType = detectTableType(headers);
    return { valid: true, tableType, rowCount: rows.length - 1 };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}

export async function sync(connectionId: string): Promise<{ recordsSynced: number }> {
  const logId = `sl_${randomUUID().slice(0, 8)}`;
  await db.insert(syncLogs).values({ id: logId, integrationId: connectionId, provider: "sheets", status: "running", startedAt: new Date() });

  try {
    const [conn] = await db.select().from(integrationConnections).where(eq(integrationConnections.id, connectionId));
    if (!conn) throw new Error("Google Sheets connection not found");
    const extra = conn.extra as Record<string, string>;
    const spreadsheetUrl = String(extra?.["spreadsheetUrl"] ?? "");
    const sheetName = String(extra?.["sheetName"] ?? "Sheet1");

    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
    const rows = resp.data.values ?? [];
    if (rows.length < 2) return { recordsSynced: 0 };

    const headers = rows[0].map(String);
    const tableType = detectTableType(headers);
    const dataRows = rows.slice(1);
    let recordsSynced = 0;

    const toRow = (row: string[]): Record<string, string> =>
      Object.fromEntries(headers.map((h, i) => [h.toLowerCase().replace(/\s+/g, "_"), row[i] ?? ""]));

    if (tableType === "financials") {
      for (const row of dataRows) {
        const r = toRow(row);
        const id = `sh_${spreadsheetId}_${r["period"]?.replace(/\s/g, "_") ?? randomUUID().slice(0, 8)}`;
        const rev = Number(r["revenue"] || 0);
        const exp = Number(r["expenses"] || 0);
        await db.insert(financialSnapshots).values({
          id, period: r["period"] ?? "", revenue: Math.round(rev), expenses: Math.round(exp),
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
        const name = r["company"] ?? r["name"] ?? "";
        if (!name) continue;
        const id = `sh_co_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
        await db.insert(companies).values({
          id, name, industry: r["industry"] ?? "", stage: r["stage"] ?? "seed",
          revenue: Math.round(Number(r["revenue"] || 0)),
          valuation: Math.round(Number(r["valuation"] || 0)),
          growthRate: Number(r["growth_rate"] || r["growth"] || 0),
          employees: Math.round(Number(r["employees"] || 0)),
          location: r["location"] ?? "", status: r["status"] ?? "active",
          dataVerified: false, ndaSigned: false, logo: "", createdAt: new Date(), updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: companies.id,
          set: { revenue: Math.round(Number(r["revenue"] || 0)), valuation: Math.round(Number(r["valuation"] || 0)), updatedAt: new Date() },
        });
        recordsSynced++;
      }
    } else if (tableType === "deals") {
      for (const row of dataRows) {
        const r = toRow(row);
        const companyName = r["deal"] ?? r["company_name"] ?? r["company"] ?? "";
        if (!companyName) continue;
        const id = `sh_deal_${companyName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${randomUUID().slice(0, 4)}`;
        await db.insert(deals).values({
          id, companyName, industry: r["industry"] ?? "", dealType: r["deal_type"] ?? "investment",
          stage: r["stage"] ?? "sourcing",
          dealSize: Math.round(Number(r["dealsize"] ?? r["deal_size"] ?? 0)),
          valuation: Math.round(Number(r["valuation"] ?? 0)),
          targetRevenue: Math.round(Number(r["revenue"] ?? 0)),
          assignedTo: r["assigned_to"] ?? r["owner"] ?? "",
          priority: r["priority"] ?? "medium",
          closingDate: r["closing_date"] ?? r["close_date"] ?? null,
          ndaSigned: r["nda_signed"] === "true" || r["nda_signed"] === "yes",
          dataRoomAccess: false, overview: r["overview"] ?? r["notes"] ?? "",
          thesis: "", createdAt: new Date(), updatedAt: new Date(),
        }).onConflictDoNothing();
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
