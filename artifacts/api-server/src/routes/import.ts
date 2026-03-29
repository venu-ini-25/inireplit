import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db, companies, deals, financialSnapshots, metricsSnapshots, importLogs } from "@workspace/db";
import { desc } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { randomUUID } from "crypto";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const MAX_ROWS = 10_000;

export type TableType = "companies" | "deals" | "financials" | "metrics" | "unknown";

export const DB_FIELDS: Record<Exclude<TableType, "unknown">, { required: string[]; all: string[]; numeric: string[] }> = {
  companies: {
    required: ["company_name"],
    all: ["company_name", "industry", "stage", "revenue", "valuation", "growth_rate", "employees", "location", "status", "ownership", "arr", "moic", "irr", "founded"],
    numeric: ["revenue", "valuation", "growth_rate", "employees", "founded"],
  },
  deals: {
    required: ["company_name"],
    all: ["company_name", "deal_type", "deal_size", "stage", "closing_date", "valuation", "target_revenue", "industry", "assigned_to", "priority", "overview"],
    numeric: ["deal_size", "valuation", "target_revenue"],
  },
  financials: {
    required: ["period"],
    all: ["period", "revenue", "expenses", "ebitda", "arr"],
    numeric: ["revenue", "expenses", "ebitda", "arr"],
  },
  metrics: {
    required: ["metric_key"],
    all: ["metric_key", "metric_label", "category", "value", "unit", "period"],
    numeric: ["value"],
  },
};

function toKey(s: string): string {
  return s.toLowerCase().replace(/[\s_\-\.]+/g, "").trim();
}

function normalizeHeader(raw: string): string {
  return raw.toLowerCase().replace(/[\s]+/g, "_").replace(/[^a-z0-9_]/g, "").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function applyMapping(raw: string, mapping: Record<string, string>): string {
  if (mapping[raw]) return mapping[raw];
  return normalizeHeader(raw);
}

function detectTableType(headers: string[]): TableType {
  const h = headers.map(toKey);
  if (h.some((x) => ["valuation", "moic", "irr", "ownership"].includes(x))) return "companies";
  if (h.some((x) => ["dealsize", "dealname", "closingdate", "dealtype"].includes(x))) return "deals";
  if (h.some((x) => ["revenue", "expenses", "ebitda"].includes(x)) && h.includes("period")) return "financials";
  if (h.some((x) => ["metrickey", "metric_key"].includes(x))) return "metrics";
  if (h.includes("period") && h.some((x) => ["revenue", "expenses", "arr", "ebitda"].includes(x))) return "financials";
  if (h.includes("company") || h.includes("companyname")) return "companies";
  if (h.includes("industry") || h.includes("stage")) return "companies";
  return "unknown";
}

function autoMatchHeaders(rawHeaders: string[], tableType: Exclude<TableType, "unknown">): Record<string, string> {
  const mapping: Record<string, string> = {};
  const fields = DB_FIELDS[tableType].all;
  for (const raw of rawHeaders) {
    const normalized = normalizeHeader(raw);
    const keyRaw = toKey(raw);
    const match = fields.find((f) => {
      const fKey = toKey(f);
      return fKey === keyRaw || fKey === toKey(normalized) || f === normalized;
    });
    if (match) mapping[raw] = match;
  }
  return mapping;
}

interface RowMap { [k: string]: string }
interface RowError { row: number; field: string; message: string }

function parseFile(buffer: Buffer, columnMapping: Record<string, string>): {
  rawHeaders: string[];
  mappedHeaders: string[];
  rows: RowMap[];
  detectedType: TableType;
} {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No sheets found in file");
  const sheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" }) as string[][];
  if (!jsonRows.length || !jsonRows[0].length) throw new Error("Empty file or no data rows");

  const rawHeaders = jsonRows[0].map(String);
  const mappedHeaders = rawHeaders.map((h) => applyMapping(h, columnMapping));
  const detectedType = detectTableType(mappedHeaders);

  const dataRows = jsonRows.slice(1).filter(row => row && !row.every((c) => !c));

  if (dataRows.length > MAX_ROWS) {
    throw new Error(`File exceeds the maximum of ${MAX_ROWS.toLocaleString()} data rows (found ${dataRows.length.toLocaleString()}). Split the file and import each part separately.`);
  }

  const rows: RowMap[] = dataRows.map((row) => {
    const obj: RowMap = {};
    mappedHeaders.forEach((h, idx) => { obj[h] = String(row[idx] ?? ""); });
    return obj;
  });

  return { rawHeaders, mappedHeaders, rows, detectedType };
}

function slugify(s: string, maxLen = 60): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, maxLen) || "unknown";
}

function r(row: RowMap, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return "";
}

function isNumeric(value: string): boolean {
  const cleaned = value.replace(/[$,%\s]/g, "");
  return cleaned !== "" && !isNaN(Number(cleaned)) && isFinite(Number(cleaned));
}

function parseNum(value: string): number {
  return Number(value.replace(/[$,%\s]/g, "")) || 0;
}

interface ValidatedRow<T> { data: T; errors: RowError[] }

function validateCompanyRow(row: RowMap, rowNum: number): ValidatedRow<typeof row> {
  const errors: RowError[] = [];
  const name = r(row, "company_name");
  if (!name) errors.push({ row: rowNum, field: "company_name", message: "company_name is required" });
  for (const field of DB_FIELDS.companies.numeric) {
    const val = r(row, field);
    if (val && !isNumeric(val)) errors.push({ row: rowNum, field, message: `${field} must be a number (got "${val}")` });
  }
  return { data: row, errors };
}

function validateDealRow(row: RowMap, rowNum: number): ValidatedRow<typeof row> {
  const errors: RowError[] = [];
  const name = r(row, "company_name");
  if (!name) errors.push({ row: rowNum, field: "company_name", message: "company_name is required" });
  for (const field of DB_FIELDS.deals.numeric) {
    const val = r(row, field);
    if (val && !isNumeric(val)) errors.push({ row: rowNum, field, message: `${field} must be a number (got "${val}")` });
  }
  return { data: row, errors };
}

function validateFinancialsRow(row: RowMap, rowNum: number): ValidatedRow<typeof row> {
  const errors: RowError[] = [];
  const period = r(row, "period");
  if (!period) errors.push({ row: rowNum, field: "period", message: "period is required" });
  for (const field of DB_FIELDS.financials.numeric) {
    const val = r(row, field);
    if (val && !isNumeric(val)) errors.push({ row: rowNum, field, message: `${field} must be a number (got "${val}")` });
  }
  return { data: row, errors };
}

function validateMetricsRow(row: RowMap, rowNum: number): ValidatedRow<typeof row> {
  const errors: RowError[] = [];
  const key = r(row, "metric_key");
  if (!key) errors.push({ row: rowNum, field: "metric_key", message: "metric_key is required" });
  const value = r(row, "value");
  if (value && !isNumeric(value)) errors.push({ row: rowNum, field: "value", message: `value must be a number (got "${value}")` });
  return { data: row, errors };
}

router.post("/import/preview", requireAdmin, upload.single("file"), async (req, res): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const mapping: Record<string, string> = req.body["columnMapping"] ? JSON.parse(req.body["columnMapping"]) : {};
    const forcedType = req.body["tableType"] as TableType | undefined;

    const { rawHeaders, mappedHeaders, rows, detectedType } = parseFile(req.file.buffer, mapping);
    const tableType: TableType = (forcedType && forcedType !== "unknown") ? forcedType : detectedType;

    const autoMapping = tableType !== "unknown" ? autoMatchHeaders(rawHeaders, tableType) : {};
    const dbFields = tableType !== "unknown" ? DB_FIELDS[tableType] : { required: [], all: [], numeric: [] };

    res.json({
      rawHeaders,
      headers: mappedHeaders,
      tableType,
      detectedType,
      rowCount: rows.length,
      preview: rows.slice(0, 5),
      suggestedMapping: Object.keys(mapping).length ? mapping : autoMapping,
      dbFields,
      allDbFields: DB_FIELDS,
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/import/commit", requireAdmin, upload.single("file"), async (req, res): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

    let mapping: Record<string, string>;
    let forcedType: TableType | undefined;
    try {
      mapping = req.body["columnMapping"] ? JSON.parse(req.body["columnMapping"]) : {};
      forcedType = req.body["tableType"] as TableType | undefined;
    } catch {
      res.status(400).json({ error: "Invalid columnMapping JSON in request body" });
      return;
    }

    let parsed: ReturnType<typeof parseFile>;
    try {
      parsed = parseFile(req.file.buffer, mapping);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }

    const { rows, detectedType } = parsed;
    const tableType: TableType = (forcedType && forcedType !== "unknown") ? forcedType : detectedType;

    if (tableType === "unknown") {
      res.status(400).json({ error: "Could not determine data type. Please select a data type (Portfolio Companies, Deals, etc.) before importing." });
      return;
    }

    const now = new Date();
    let imported = 0;
    let skipped = 0;
    const rowErrors: RowError[] = [];

    if (tableType === "companies") {
      const validRows: { row: RowMap; rowNum: number }[] = [];
      for (let i = 0; i < rows.length; i++) {
        const { errors } = validateCompanyRow(rows[i], i + 2);
        if (errors.length) { skipped++; rowErrors.push(...errors); continue; }
        validRows.push({ row: rows[i], rowNum: i + 2 });
      }
      if (validRows.length > 0) {
        await db.transaction(async (tx) => {
          for (const { row, rowNum } of validRows) {
            const name = r(row, "company_name");
            const id = `imp_co_${slugify(name)}`;
            try {
              await tx.insert(companies).values({
                id, name,
                industry: r(row, "industry") || "",
                stage: r(row, "stage") || "seed",
                location: r(row, "location") || "",
                revenue: Math.round(parseNum(r(row, "revenue"))),
                valuation: Math.round(parseNum(r(row, "valuation"))),
                growthRate: parseNum(r(row, "growth_rate")),
                employees: Math.round(parseNum(r(row, "employees"))),
                ownership: r(row, "ownership") || null,
                arr: r(row, "arr") || null,
                moic: r(row, "moic") || null,
                irr: r(row, "irr") || null,
                status: r(row, "status") || "active",
                founded: r(row, "founded") ? Math.round(parseNum(r(row, "founded"))) : null,
                createdAt: now, updatedAt: now,
              }).onConflictDoUpdate({
                target: companies.id,
                set: {
                  revenue: Math.round(parseNum(r(row, "revenue"))),
                  valuation: Math.round(parseNum(r(row, "valuation"))),
                  updatedAt: now,
                },
              });
              imported++;
            } catch (e) {
              rowErrors.push({ row: rowNum, field: "db", message: (e as Error).message });
            }
          }
        });
      }
    } else if (tableType === "financials") {
      const validRows: { row: RowMap; rowNum: number }[] = [];
      for (let i = 0; i < rows.length; i++) {
        const { errors } = validateFinancialsRow(rows[i], i + 2);
        if (errors.length) { skipped++; rowErrors.push(...errors); continue; }
        validRows.push({ row: rows[i], rowNum: i + 2 });
      }
      if (validRows.length > 0) {
        await db.transaction(async (tx) => {
          for (const { row, rowNum } of validRows) {
            const period = r(row, "period");
            const id = `imp_fin_${slugify(period)}`;
            try {
              await tx.insert(financialSnapshots).values({
                id, period,
                revenue: Math.round(parseNum(r(row, "revenue"))),
                expenses: Math.round(parseNum(r(row, "expenses"))),
                ebitda: Math.round(parseNum(r(row, "ebitda"))),
                arr: Math.round(parseNum(r(row, "arr"))),
                sortOrder: 0,
                createdAt: now,
              }).onConflictDoUpdate({
                target: financialSnapshots.id,
                set: {
                  revenue: Math.round(parseNum(r(row, "revenue"))),
                  ebitda: Math.round(parseNum(r(row, "ebitda"))),
                },
              });
              imported++;
            } catch (e) {
              rowErrors.push({ row: rowNum, field: "db", message: (e as Error).message });
            }
          }
        });
      }
    } else if (tableType === "deals") {
      const validRows: { row: RowMap; rowNum: number }[] = [];
      for (let i = 0; i < rows.length; i++) {
        const { errors } = validateDealRow(rows[i], i + 2);
        if (errors.length) { skipped++; rowErrors.push(...errors); continue; }
        validRows.push({ row: rows[i], rowNum: i + 2 });
      }
      if (validRows.length > 0) {
        await db.transaction(async (tx) => {
          for (const { row, rowNum } of validRows) {
            const companyName = r(row, "company_name");
            const id = `imp_deal_${slugify(companyName)}`;
            try {
              await tx.insert(deals).values({
                id, companyName,
                dealType: r(row, "deal_type") || "investment",
                dealSize: Math.round(parseNum(r(row, "deal_size"))),
                closingDate: r(row, "closing_date") || null,
                stage: r(row, "stage") || "sourcing",
                valuation: Math.round(parseNum(r(row, "valuation"))),
                targetRevenue: Math.round(parseNum(r(row, "target_revenue"))),
                industry: r(row, "industry") || "",
                assignedTo: r(row, "assigned_to") || "",
                priority: r(row, "priority") || "medium",
                overview: r(row, "overview") || "",
                createdAt: now,
              }).onConflictDoUpdate({
                target: deals.id,
                set: {
                  dealSize: Math.round(parseNum(r(row, "deal_size"))),
                  updatedAt: now,
                },
              });
              imported++;
            } catch (e) {
              rowErrors.push({ row: rowNum, field: "db", message: (e as Error).message });
            }
          }
        });
      }
    } else if (tableType === "metrics") {
      const validRows: { row: RowMap; rowNum: number }[] = [];
      for (let i = 0; i < rows.length; i++) {
        const { errors } = validateMetricsRow(rows[i], i + 2);
        if (errors.length) { skipped++; rowErrors.push(...errors); continue; }
        validRows.push({ row: rows[i], rowNum: i + 2 });
      }
      if (validRows.length > 0) {
        await db.transaction(async (tx) => {
          for (const { row, rowNum } of validRows) {
            const metricKey = r(row, "metric_key");
            const periodLabel = r(row, "period") || "";
            const category = r(row, "category") || "import";
            const id = `imp_metric_${slugify(category)}_${slugify(metricKey)}_${slugify(periodLabel)}`;
            try {
              await tx.insert(metricsSnapshots).values({
                id, category, metricKey,
                metricLabel: r(row, "metric_label") || metricKey,
                value: parseNum(r(row, "value")),
                unit: r(row, "unit") || "USD",
                periodLabel,
                source: "csv_import",
                createdAt: now, updatedAt: now,
              }).onConflictDoUpdate({
                target: metricsSnapshots.id,
                set: { value: parseNum(r(row, "value")), updatedAt: now },
              });
              imported++;
            } catch (e) {
              rowErrors.push({ row: rowNum, field: "db", message: (e as Error).message });
            }
          }
        });
      }
    }

    const errored = rowErrors.length;
    const logId = `imp_${randomUUID()}`;
    await db.insert(importLogs).values({
      id: logId,
      fileName: req.file.originalname,
      tableType,
      totalRows: rows.length,
      importedRows: imported,
      skippedRows: skipped,
      errorRows: errored,
      errors: rowErrors.slice(0, 100),
      columnMapping: mapping,
      importedAt: now,
    });

    res.json({ tableType, imported, skipped, errored, errors: rowErrors, total: rows.length, logId });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/import/logs", requireAdmin, async (req, res): Promise<void> => {
  try {
    const logs = await db.select().from(importLogs).orderBy(desc(importLogs.importedAt)).limit(20);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
