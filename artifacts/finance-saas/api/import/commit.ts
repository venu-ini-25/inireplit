import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAdmin, getPool } from "../_utils.js";
import * as XLSX from "@e965/xlsx";
import { randomUUID } from "crypto";

export const config = { api: { bodyParser: { sizeLimit: "25mb" } } };

type TableType = "companies" | "deals" | "financials" | "metrics" | "unknown";

function toKey(s: string): string {
  return s.toLowerCase().replace(/[\s_\-.]+/g, "").trim();
}

function normalizeHeader(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
}

function parseNum(s: string): number {
  const cleaned = s.replace(/[$,% ]+/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
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

function isKnownType(t: string | undefined): t is Exclude<TableType, "unknown"> {
  return ["companies", "deals", "financials", "metrics"].includes(t ?? "");
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") { err(res, "Method not allowed", 405); return; }

  const email = await requireAdmin(req, res);
  if (!email) return;

  const db = getPool();

  try {
    const body = req.body as {
      file?: string; fileName?: string; tableType?: string;
      columnMapping?: string | Record<string, string>;
    };

    if (!body.file) { err(res, "No file data provided"); return; }

    const buffer = Buffer.from(body.file, "base64");
    const fileName = body.fileName ?? "upload";
    const rawColumnMapping: Record<string, string> = typeof body.columnMapping === "string"
      ? JSON.parse(body.columnMapping) as Record<string, string>
      : (body.columnMapping ?? {});
    const forcedType = isKnownType(body.tableType) ? body.tableType : undefined;

    const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) { err(res, "No sheets found"); return; }
    const sheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" }) as string[][];
    if (jsonRows.length < 2) { err(res, "File has no data rows"); return; }

    const rawHeaders = (jsonRows[0] ?? []).map((h) => String(h).trim()).filter(Boolean);
    const tableType: TableType = forcedType ?? detectTableType(rawHeaders);

    if (tableType === "unknown") {
      err(res, "Could not determine data type. Please select a type before importing.");
      return;
    }

    const getMapped = (row: Record<string, string>, field: string): string => {
      for (const [raw, mapped] of Object.entries(rawColumnMapping)) {
        if (mapped === field && row[raw] !== undefined) return String(row[raw]).trim();
      }
      const normalized = rawHeaders.map(normalizeHeader);
      const idx = normalized.indexOf(field);
      if (idx >= 0) return String(row[rawHeaders[idx] ?? ""] ?? "").trim();
      return String(row[field] ?? "").trim();
    };

    const rows: Record<string, string>[] = [];
    for (let i = 1; i < jsonRows.length && i < 10001; i++) {
      const r = jsonRows[i] ?? [];
      const obj: Record<string, string> = {};
      let hasData = false;
      for (let j = 0; j < rawHeaders.length; j++) {
        const key = rawColumnMapping[rawHeaders[j] ?? ""] ?? normalizeHeader(rawHeaders[j] ?? "");
        const val = String(r[j] ?? "").trim();
        obj[rawHeaders[j] ?? ""] = val;
        obj[key] = val;
        if (val) hasData = true;
      }
      if (hasData) rows.push(obj);
    }

    let imported = 0, skipped = 0;
    const rowErrors: { row: number; field: string; message: string }[] = [];
    const now = new Date();

    if (tableType === "companies") {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const name = getMapped(row, "company_name");
        if (!name) { skipped++; rowErrors.push({ row: i + 2, field: "company_name", message: "company_name is required" }); continue; }
        const id = `imp_co_${slugify(name)}`;
        try {
          await db.query(`
            INSERT INTO companies (id, name, industry, stage, revenue, valuation, growth_rate, employees, location, status, ownership, arr, moic, irr, founded, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            ON CONFLICT (id) DO UPDATE SET revenue = EXCLUDED.revenue, valuation = EXCLUDED.valuation, updated_at = EXCLUDED.updated_at
          `, [
            id, name,
            getMapped(row, "industry") || "",
            getMapped(row, "stage") || "seed",
            Math.round(parseNum(getMapped(row, "revenue"))),
            Math.round(parseNum(getMapped(row, "valuation"))),
            parseNum(getMapped(row, "growth_rate")),
            Math.round(parseNum(getMapped(row, "employees"))),
            getMapped(row, "location") || "",
            getMapped(row, "status") || "active",
            getMapped(row, "ownership") || null,
            getMapped(row, "arr") || null,
            getMapped(row, "moic") || null,
            getMapped(row, "irr") || null,
            getMapped(row, "founded") ? Math.round(parseNum(getMapped(row, "founded"))) : null,
            now, now,
          ]);
          imported++;
        } catch (e) {
          skipped++;
          rowErrors.push({ row: i + 2, field: "db", message: (e as Error).message });
        }
      }
    } else if (tableType === "deals") {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const name = getMapped(row, "company_name");
        if (!name) { skipped++; rowErrors.push({ row: i + 2, field: "company_name", message: "company_name is required" }); continue; }
        const id = `imp_deal_${slugify(name)}_${randomUUID().slice(0, 6)}`;
        try {
          await db.query(`
            INSERT INTO deals (id, company_name, industry, deal_type, stage, deal_size, valuation, target_revenue, assigned_to, priority, overview, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            ON CONFLICT (id) DO NOTHING
          `, [
            id, name,
            getMapped(row, "industry") || "",
            getMapped(row, "deal_type") || "investment",
            getMapped(row, "stage") || "sourcing",
            Math.round(parseNum(getMapped(row, "deal_size"))),
            Math.round(parseNum(getMapped(row, "valuation"))),
            Math.round(parseNum(getMapped(row, "target_revenue"))),
            getMapped(row, "assigned_to") || "",
            getMapped(row, "priority") || "medium",
            getMapped(row, "overview") || "",
            now, now,
          ]);
          imported++;
        } catch (e) {
          skipped++;
          rowErrors.push({ row: i + 2, field: "db", message: (e as Error).message });
        }
      }
    } else if (tableType === "financials") {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const period = getMapped(row, "period");
        if (!period) { skipped++; rowErrors.push({ row: i + 2, field: "period", message: "period is required" }); continue; }
        const id = `imp_fin_${slugify(period)}`;
        try {
          await db.query(`
            INSERT INTO financial_snapshots (id, period, revenue, expenses, ebitda, arr, sort_order, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (id) DO UPDATE SET revenue = EXCLUDED.revenue, ebitda = EXCLUDED.ebitda
          `, [
            id, period,
            Math.round(parseNum(getMapped(row, "revenue"))),
            Math.round(parseNum(getMapped(row, "expenses"))),
            Math.round(parseNum(getMapped(row, "ebitda"))),
            Math.round(parseNum(getMapped(row, "arr"))),
            i, now,
          ]);
          imported++;
        } catch (e) {
          skipped++;
          rowErrors.push({ row: i + 2, field: "db", message: (e as Error).message });
        }
      }
    } else if (tableType === "metrics") {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const metricKey = getMapped(row, "metric_key");
        if (!metricKey) { skipped++; rowErrors.push({ row: i + 2, field: "metric_key", message: "metric_key is required" }); continue; }
        const category = getMapped(row, "category") || "custom";
        const id = `imp_m_${slugify(category)}_${slugify(metricKey)}`;
        try {
          await db.query(`
            INSERT INTO metrics_snapshots (id, category, metric_key, metric_label, value, unit, period_label, source, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,'csv_import',$8,$9)
            ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
          `, [
            id, category, metricKey,
            getMapped(row, "metric_label") || metricKey,
            parseNum(getMapped(row, "value")),
            getMapped(row, "unit") || "",
            getMapped(row, "period") || "",
            now, now,
          ]);
          imported++;
        } catch (e) {
          skipped++;
          rowErrors.push({ row: i + 2, field: "db", message: (e as Error).message });
        }
      }
    }

    const logId = `imp_${randomUUID()}`;
    await db.query(`
      INSERT INTO import_logs (id, file_name, table_type, total_rows, imported_rows, skipped_rows, error_rows, errors, column_mapping, imported_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [
      logId, fileName, tableType, rows.length, imported, skipped,
      new Set(rowErrors.map((e) => e.row)).size,
      JSON.stringify(rowErrors.slice(0, 100)),
      JSON.stringify(rawColumnMapping), now,
    ]);

    ok(res, { tableType, imported, skipped, errored: new Set(rowErrors.map((e) => e.row)).size, errors: rowErrors, total: rows.length, logId });
  } catch (e) {
    err(res, (e as Error).message, 500);
  }
}
