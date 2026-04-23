import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, ok, err, requireAdmin, getPool } from "../_utils.js";
import * as XLSX from "@e965/xlsx";
import { randomUUID } from "crypto";

export const config = { api: { bodyParser: { sizeLimit: "25mb" } } };

type TableType = "companies" | "deals" | "financials" | "metrics" | "unknown";

function toKey(s: string): string { return s.toLowerCase().replace(/[\s_\-.]+/g, "").trim(); }
function normalizeHeader(raw: string): string { return raw.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_").replace(/^_|_$/g, ""); }
function slugify(s: string): string { return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40); }
function parseNum(s: string): number { const n = parseFloat(s.replace(/[$,% ]+/g, "")); return isNaN(n) ? 0 : n; }

const DB_FIELDS: Record<Exclude<TableType, "unknown">, { required: string[]; all: string[] }> = {
  companies: { required: ["company_name"], all: ["company_name","industry","stage","revenue","valuation","growth_rate","employees","location","status","ownership","arr","moic","irr","founded"] },
  deals: { required: ["company_name"], all: ["company_name","deal_type","deal_size","stage","closing_date","valuation","target_revenue","industry","assigned_to","priority","overview"] },
  financials: { required: ["period"], all: ["period","revenue","expenses","ebitda","arr"] },
  metrics: { required: ["metric_key"], all: ["metric_key","metric_label","category","value","unit","period"] },
};

function detectTableType(headers: string[]): TableType {
  const h = headers.map(toKey);
  if (h.some((x) => ["valuation","moic","irr","ownership"].includes(x))) return "companies";
  if (h.some((x) => ["dealsize","dealname","closingdate","dealtype"].includes(x))) return "deals";
  if (h.some((x) => ["revenue","expenses","ebitda"].includes(x)) && h.includes("period")) return "financials";
  if (h.some((x) => ["metrickey"].includes(x))) return "metrics";
  if (h.includes("period") && h.some((x) => ["revenue","expenses","arr","ebitda"].includes(x))) return "financials";
  if (h.includes("company") || h.includes("companyname")) return "companies";
  if (h.includes("industry") || h.includes("stage")) return "companies";
  return "unknown";
}
function isKnownType(t: string | undefined): t is Exclude<TableType, "unknown"> { return ["companies","deals","financials","metrics"].includes(t ?? ""); }
function autoMatchHeaders(rawHeaders: string[], tableType: Exclude<TableType, "unknown">): Record<string, string> {
  const mapping: Record<string, string> = {};
  const fields = DB_FIELDS[tableType].all;
  for (const raw of rawHeaders) { const k = toKey(raw); const n = normalizeHeader(raw); const match = fields.find((f) => toKey(f) === k || toKey(f) === toKey(n) || f === n); if (match) mapping[raw] = match; }
  return mapping;
}
function parseFileBuffer(buffer: Buffer, columnMapping: Record<string, string>): { rawHeaders: string[]; mappedHeaders: string[]; rows: Record<string, string>[]; detectedType: TableType; } {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No sheets found in file");
  const sheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" }) as string[][];
  if (jsonRows.length === 0) throw new Error("File is empty");
  const rawHeaders = (jsonRows[0] ?? []).map((h) => String(h).trim()).filter(Boolean);
  if (rawHeaders.length === 0) throw new Error("No headers found");
  const detectedType = detectTableType(rawHeaders);
  const mappedHeaders = rawHeaders.map((h) => columnMapping[h] ? columnMapping[h] : normalizeHeader(h));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < jsonRows.length && i < 10001; i++) {
    const row = jsonRows[i] ?? []; const mapped: Record<string, string> = {}; let hasData = false;
    for (let j = 0; j < rawHeaders.length; j++) { const key = mappedHeaders[j] ?? rawHeaders[j] ?? ""; const val = String(row[j] ?? "").trim(); mapped[key] = val; if (val) hasData = true; }
    if (hasData) rows.push(mapped);
  }
  return { rawHeaders, mappedHeaders, rows, detectedType };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res)) return;

  const pathParts = (req.query.path as string[]) ?? [];
  const sub = pathParts[0] ?? "";

  // GET /api/import/logs — admin only
  if (sub === "logs" && req.method === "GET") {
    const email = await requireAdmin(req, res);
    if (!email) return;
    const db = getPool();
    try {
      const { rows } = await db.query(`SELECT * FROM import_logs ORDER BY imported_at DESC LIMIT 20`);
      return ok(res, rows.map((r: Record<string, unknown>) => ({ id: r.id, fileName: r.file_name, tableType: r.table_type, totalRows: r.total_rows, importedRows: r.imported_rows, skippedRows: r.skipped_rows, errorRows: r.error_rows, errors: r.errors, columnMapping: r.column_mapping, importedAt: r.imported_at })));
    } catch (e) { return err(res, (e as Error).message, 500); }
  }

  // POST /api/import/preview
  if (sub === "preview" && req.method === "POST") {
    const body = req.body as { file?: string; fileName?: string; tableType?: string; columnMapping?: string | Record<string, string> };
    if (!body.file) { err(res, "No file data provided"); return; }
    try {
      const buffer = Buffer.from(body.file, "base64");
      const rawColumnMapping: Record<string, string> = typeof body.columnMapping === "string" ? JSON.parse(body.columnMapping) as Record<string, string> : (body.columnMapping ?? {});
      const { rawHeaders, rows, detectedType } = parseFileBuffer(buffer, rawColumnMapping);
      const resolvedType = isKnownType(body.tableType) ? body.tableType : detectedType;
      const suggestedMapping = isKnownType(resolvedType) ? autoMatchHeaders(rawHeaders, resolvedType) : {};
      const finalMapping = { ...suggestedMapping, ...rawColumnMapping };
      const sampleRows = rows.slice(0, 5);
      const issues: string[] = [];
      if (resolvedType === "unknown") issues.push("Could not automatically detect data type — please select one manually.");
      if (isKnownType(resolvedType)) { for (const req of DB_FIELDS[resolvedType].required) { if (!sampleRows[0]?.[req]) issues.push(`Required field "${req}" not mapped — some rows may be skipped.`); } }
      return ok(res, { rawHeaders, sampleRows, totalRows: rows.length, detectedType: resolvedType, suggestedMapping: finalMapping, issues });
    } catch (e) { return err(res, (e as Error).message, 500); }
  }

  // POST /api/import/commit — admin only (writes to DB)
  if (sub === "commit" && req.method === "POST") {
    const commitEmail = await requireAdmin(req, res);
    if (!commitEmail) return;
    const body = req.body as { file?: string; fileName?: string; tableType?: string; columnMapping?: string | Record<string, string> };
    if (!body.file) { err(res, "No file data provided"); return; }
    const db = getPool();
    try {
      const buffer = Buffer.from(body.file, "base64");
      const fileName = body.fileName ?? "upload";
      const rawColumnMapping: Record<string, string> = typeof body.columnMapping === "string" ? JSON.parse(body.columnMapping) as Record<string, string> : (body.columnMapping ?? {});
      const forcedType = isKnownType(body.tableType) ? body.tableType : undefined;
      const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) { err(res, "No sheets found"); return; }
      const sheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" }) as string[][];
      if (jsonRows.length < 2) { err(res, "File has no data rows"); return; }
      const rawHeaders = (jsonRows[0] ?? []).map((h) => String(h).trim()).filter(Boolean);
      const tableType: TableType = forcedType ?? detectTableType(rawHeaders);
      if (tableType === "unknown") { err(res, "Could not determine data type. Please select a type before importing."); return; }
      const autoMapping = autoMatchHeaders(rawHeaders, tableType as Exclude<TableType, "unknown">);
      const finalMapping = { ...autoMapping, ...rawColumnMapping };
      const mappedHeaders = rawHeaders.map((h) => finalMapping[h] ? finalMapping[h] : normalizeHeader(h));
      const rows: Record<string, string>[] = [];
      for (let i = 1; i < jsonRows.length && i < 10001; i++) {
        const row = jsonRows[i] ?? []; const mapped: Record<string, string> = {}; let hasData = false;
        for (let j = 0; j < rawHeaders.length; j++) { const key = mappedHeaders[j] ?? ""; const val = String(row[j] ?? "").trim(); mapped[key] = val; if (val) hasData = true; }
        if (hasData) rows.push(mapped);
      }
      let imported = 0, skipped = 0;
      const rowErrors: { row: number; message: string }[] = [];
      const now = new Date();
      if (tableType === "companies") {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i]!;
          if (!r.company_name) { skipped++; continue; }
          try {
            const id = `co_${slugify(r.company_name)}_${randomUUID().slice(0, 6)}`;
            await db.query(`INSERT INTO companies (id, name, industry, stage, revenue, valuation, growth_rate, employees, location, status, ownership, arr, moic, irr, founded, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, industry=EXCLUDED.industry, updated_at=EXCLUDED.updated_at`,
              [id, r.company_name, r.industry ?? "", r.stage ?? "seed", parseNum(r.revenue ?? "0"), parseNum(r.valuation ?? "0"), parseNum(r.growth_rate ?? "0"), parseInt(r.employees ?? "0"), r.location ?? "", r.status ?? "active", r.ownership ?? "", r.arr ?? "", r.moic ?? "", r.irr ?? "", r.founded ?? null, now, now]);
            imported++;
          } catch (e) { rowErrors.push({ row: i + 2, message: (e as Error).message }); }
        }
      } else if (tableType === "deals") {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i]!;
          if (!r.company_name) { skipped++; continue; }
          try {
            const id = `deal_${slugify(r.company_name)}_${randomUUID().slice(0, 6)}`;
            await db.query(`INSERT INTO deals (id, company_name, deal_type, deal_size, stage, closing_date, valuation, target_revenue, industry, assigned_to, priority, overview, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO UPDATE SET company_name=EXCLUDED.company_name, updated_at=EXCLUDED.updated_at`,
              [id, r.company_name, r.deal_type ?? "investment", parseNum(r.deal_size ?? "0"), r.stage ?? "sourcing", r.closing_date || null, parseNum(r.valuation ?? "0"), parseNum(r.target_revenue ?? "0"), r.industry ?? "", r.assigned_to ?? "", r.priority ?? "medium", r.overview ?? "", now, now]);
            imported++;
          } catch (e) { rowErrors.push({ row: i + 2, message: (e as Error).message }); }
        }
      } else if (tableType === "financials") {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i]!;
          if (!r.period) { skipped++; continue; }
          try {
            const id = `fs_${slugify(r.period)}_${randomUUID().slice(0, 6)}`;
            await db.query(`INSERT INTO financial_snapshots (id, period, revenue, expenses, ebitda, arr, sort_order, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET revenue=EXCLUDED.revenue, expenses=EXCLUDED.expenses, ebitda=EXCLUDED.ebitda, arr=EXCLUDED.arr, updated_at=EXCLUDED.updated_at`,
              [id, r.period, parseNum(r.revenue ?? "0"), parseNum(r.expenses ?? "0"), parseNum(r.ebitda ?? "0"), parseNum(r.arr ?? "0"), i, now, now]);
            imported++;
          } catch (e) { rowErrors.push({ row: i + 2, message: (e as Error).message }); }
        }
      } else if (tableType === "metrics") {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i]!;
          if (!r.metric_key) { skipped++; continue; }
          try {
            const id = `ms_${slugify(r.metric_key)}_${randomUUID().slice(0, 6)}`;
            await db.query(`INSERT INTO metrics_snapshots (id, category, metric_key, metric_label, value, unit, period_label, source, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'import',$8,$9) ON CONFLICT (id) DO UPDATE SET value=EXCLUDED.value, updated_at=EXCLUDED.updated_at`,
              [id, r.category ?? "general", r.metric_key, r.metric_label ?? r.metric_key, parseNum(r.value ?? "0"), r.unit ?? "", r.period ?? "", now, now]);
            imported++;
          } catch (e) { rowErrors.push({ row: i + 2, message: (e as Error).message }); }
        }
      }
      const logId = `imp_${randomUUID()}`;
      await db.query(`INSERT INTO import_logs (id, file_name, table_type, total_rows, imported_rows, skipped_rows, error_rows, errors, column_mapping, imported_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [logId, fileName, tableType, rows.length, imported, skipped, new Set(rowErrors.map((e) => e.row)).size, JSON.stringify(rowErrors.slice(0, 100)), JSON.stringify(rawColumnMapping), now]);
      return ok(res, { tableType, imported, skipped, errored: new Set(rowErrors.map((e) => e.row)).size, errors: rowErrors, total: rows.length, logId });
    } catch (e) { return err(res, (e as Error).message, 500); }
  }

  err(res, "Not found", 404);
}
