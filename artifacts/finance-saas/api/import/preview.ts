import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAdmin } from "../_utils.js";
import * as XLSX from "@e965/xlsx";

export const config = { api: { bodyParser: { sizeLimit: "25mb" } } };

type TableType = "companies" | "deals" | "financials" | "metrics" | "unknown";

const DB_FIELDS: Record<Exclude<TableType, "unknown">, { required: string[]; all: string[] }> = {
  companies: {
    required: ["company_name"],
    all: ["company_name", "industry", "stage", "revenue", "valuation", "growth_rate", "employees", "location", "status", "ownership", "arr", "moic", "irr", "founded"],
  },
  deals: {
    required: ["company_name"],
    all: ["company_name", "deal_type", "deal_size", "stage", "closing_date", "valuation", "target_revenue", "industry", "assigned_to", "priority", "overview"],
  },
  financials: {
    required: ["period"],
    all: ["period", "revenue", "expenses", "ebitda", "arr"],
  },
  metrics: {
    required: ["metric_key"],
    all: ["metric_key", "metric_label", "category", "value", "unit", "period"],
  },
};

function toKey(s: string): string {
  return s.toLowerCase().replace(/[\s_\-.]+/g, "").trim();
}

function normalizeHeader(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function detectTableType(headers: string[]): TableType {
  const h = headers.map(toKey);
  if (h.some((x) => ["valuation", "moic", "irr", "ownership"].includes(x))) return "companies";
  if (h.some((x) => ["dealsize", "dealname", "closingdate", "dealtype"].includes(x))) return "deals";
  if (h.some((x) => ["revenue", "expenses", "ebitda"].includes(x)) && h.includes("period")) return "financials";
  if (h.some((x) => ["metrickey"].includes(x))) return "metrics";
  if (h.includes("period") && h.some((x) => ["revenue", "expenses", "arr", "ebitda"].includes(x))) return "financials";
  if (h.includes("company") || h.includes("companyname")) return "companies";
  if (h.includes("industry") || h.includes("stage")) return "companies";
  return "unknown";
}

function autoMatchHeaders(rawHeaders: string[], tableType: Exclude<TableType, "unknown">): Record<string, string> {
  const mapping: Record<string, string> = {};
  const fields = DB_FIELDS[tableType].all;
  for (const raw of rawHeaders) {
    const keyRaw = toKey(raw);
    const normalized = normalizeHeader(raw);
    const match = fields.find((f) => toKey(f) === keyRaw || toKey(f) === toKey(normalized) || f === normalized);
    if (match) mapping[raw] = match;
  }
  return mapping;
}

function parseFileBuffer(buffer: Buffer, columnMapping: Record<string, string>): {
  rawHeaders: string[]; mappedHeaders: string[]; rows: Record<string, string>[]; detectedType: TableType;
} {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No sheets found in file");
  const sheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" }) as string[][];
  if (jsonRows.length === 0) throw new Error("File is empty");
  const rawHeaders = (jsonRows[0] ?? []).map((h) => String(h).trim()).filter(Boolean);
  if (rawHeaders.length === 0) throw new Error("No headers found");
  const detectedType = detectTableType(rawHeaders);
  const mappedHeaders = rawHeaders.map((h) => {
    if (columnMapping[h]) return columnMapping[h];
    return normalizeHeader(h);
  });
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < jsonRows.length && i < 10001; i++) {
    const row = jsonRows[i] ?? [];
    const mapped: Record<string, string> = {};
    let hasData = false;
    for (let j = 0; j < rawHeaders.length; j++) {
      const key = mappedHeaders[j] ?? rawHeaders[j] ?? "";
      const val = String(row[j] ?? "").trim();
      mapped[key] = val;
      if (val) hasData = true;
    }
    if (hasData) rows.push(mapped);
  }
  return { rawHeaders, mappedHeaders, rows, detectedType };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") { err(res, "Method not allowed", 405); return; }

  const email = await requireAdmin(req, res);
  if (!email) return;

  try {
    const body = req.body as {
      file?: string; fileName?: string; tableType?: string; columnMapping?: string | Record<string, string>;
    };

    if (!body.file) { err(res, "No file data provided"); return; }

    const buffer = Buffer.from(body.file, "base64");
    const rawColumnMapping: Record<string, string> = typeof body.columnMapping === "string"
      ? JSON.parse(body.columnMapping) as Record<string, string>
      : (body.columnMapping ?? {});

    const isKnownType = (t: string | undefined): t is Exclude<TableType, "unknown"> =>
      ["companies", "deals", "financials", "metrics"].includes(t ?? "");
    const forcedType = isKnownType(body.tableType) ? body.tableType : undefined;

    const { rawHeaders, rows, detectedType } = parseFileBuffer(buffer, rawColumnMapping);
    const tableType: TableType = forcedType ?? detectedType;
    const suggestedMapping = tableType !== "unknown"
      ? autoMatchHeaders(rawHeaders, tableType)
      : {};

    const previewRows = rows.slice(0, 5).map((row) => rawHeaders.map((h) => {
      const mapped = suggestedMapping[h] ?? normalizeHeader(h);
      return row[mapped] ?? row[h] ?? "";
    }));

    const requiredFields = tableType !== "unknown" ? DB_FIELDS[tableType].required : [];
    const allFields = tableType !== "unknown" ? DB_FIELDS[tableType].all : [];
    const unmappedRequired = requiredFields.filter((f) => !Object.values(suggestedMapping).includes(f));

    ok(res, {
      tableType,
      headers: rawHeaders,
      previewRows,
      totalRows: rows.length,
      suggestedMapping,
      unmappedRequired,
      availableFields: allFields,
    });
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
