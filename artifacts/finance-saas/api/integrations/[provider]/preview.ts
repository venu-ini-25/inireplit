import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAdmin } from "../../_utils.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

const COMPANY_KEYS = new Set(["company_name", "revenue", "valuation", "growth_rate", "employees", "industry", "stage", "location", "ownership", "arr", "moic", "irr", "status"]);
const DEAL_KEYS = new Set(["company_name", "deal_type", "deal_size", "stage", "closing_date", "valuation", "target_revenue", "industry", "assigned_to", "priority"]);
const FINANCIAL_KEYS = new Set(["period", "revenue", "expenses", "ebitda", "arr"]);
const METRIC_KEYS = new Set(["metric_key", "value", "category", "unit", "period"]);

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
  const keys = type === "companies" ? COMPANY_KEYS : type === "deals" ? DEAL_KEYS : type === "financials" ? FINANCIAL_KEYS : METRIC_KEYS;
  const m: Record<string, string> = {};
  for (const h of headers) {
    const k = toKey(h);
    const normalized = h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const match = [...keys].find((f) => toKey(f) === k || f === normalized);
    if (match) m[h] = match;
  }
  return m;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") { err(res, "Method not allowed", 405); return; }

  const email = await requireAdmin(req, res);
  if (!email) return;

  const body = req.body as { spreadsheetUrl?: string; sheetName?: string };
  const { spreadsheetUrl, sheetName = "Sheet1" } = body;
  if (!spreadsheetUrl) { err(res, "spreadsheetUrl is required"); return; }

  const spreadsheetIdMatch = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!spreadsheetIdMatch) { err(res, "Invalid Google Sheets URL"); return; }
  const spreadsheetId = spreadsheetIdMatch[1];

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) { err(res, "GOOGLE_API_KEY not configured on server"); return; }

  try {
    const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}&majorDimension=ROWS`);
    if (!resp.ok) { err(res, "Could not access Google Sheet — check the URL and make sure it is shared publicly"); return; }
    const data = await resp.json() as { values?: string[][] };
    const rows = data.values ?? [];
    const headers = (rows[0] ?? []).map((h) => String(h).trim()).filter(Boolean);
    const rowCount = Math.max(0, rows.length - 1);
    const tableType = detectType(headers);
    const suggestedMapping = tableType !== "unknown" ? autoMatch(headers, tableType) : {};
    ok(res, { valid: true, headers, rowCount, tableType, suggestedMapping });
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
