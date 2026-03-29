import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db, companies, deals, financialSnapshots, metricsSnapshots, importLogs } from "@workspace/db";
import { desc, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { randomUUID } from "crypto";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const MAX_ROWS = 10_000;

export type TableType = "companies" | "deals" | "financials" | "metrics" | "unknown";

export const DB_FIELDS: Record<Exclude<TableType, "unknown">, { required: string[]; all: string[] }> = {
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
interface RowError { row: number; message: string }

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
    throw new Error(`File exceeds the maximum of ${MAX_ROWS.toLocaleString()} data rows (found ${dataRows.length.toLocaleString()}). Split the file into smaller parts and import each one.`);
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
    const v = row[k] ?? row[toKey(k)];
    if (v) return String(v);
  }
  return "";
}

router.post("/import/preview", requireAdmin, upload.single("file"), async (req, res): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const mapping: Record<string, string> = req.body["columnMapping"] ? JSON.parse(req.body["columnMapping"]) : {};
    const forcedType = req.body["tableType"] as TableType | undefined;

    const { rawHeaders, mappedHeaders, rows, detectedType } = parseFile(req.file.buffer, mapping);
    const tableType: TableType = (forcedType && forcedType !== "unknown") ? forcedType : detectedType;

    const autoMapping = tableType !== "unknown" ? autoMatchHeaders(rawHeaders, tableType) : {};
    const dbFields = tableType !== "unknown" ? DB_FIELDS[tableType] : { required: [], all: [] };

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
    const mapping: Record<string, string> = req.body["columnMapping"] ? JSON.parse(req.body["columnMapping"]) : {};
    const forcedType = req.body["tableType"] as TableType | undefined;

    const { rows, detectedType } = parseFile(req.file.buffer, mapping);
    const tableType: TableType = (forcedType && forcedType !== "unknown") ? forcedType : detectedType;

    if (tableType === "unknown") {
      res.status(400).json({ error: "Could not detect table type. Please select a data type before importing." });
      return;
    }

    const now = new Date();
    let imported = 0;
    let skipped = 0;
    const rowErrors: RowError[] = [];

    if (tableType === "companies") {
      const validRows: typeof rows = [];
      const validationErrors: RowError[] = [];
      for (let i = 0; i < rows.length; i++) {
        const name = r(rows[i], "company_name", "company", "name", "companyname");
        if (!name) { skipped++; validationErrors.push({ row: i + 2, message: "Missing company_name" }); continue; }
        validRows.push(rows[i]);
      }
      rowErrors.push(...validationErrors);
      if (validRows.length > 0) {
        await db.transaction(async (tx) => {
          for (let i = 0; i < validRows.length; i++) {
            const row = validRows[i];
            const name = r(row, "company_name", "company", "name", "companyname");
            const id = `imp_co_${slugify(name)}`;
            try {
              await tx.insert(companies).values({
                id, name,
                industry: r(row, "industry") || "",
                stage: r(row, "stage") || "seed",
                location: r(row, "location", "geography", "country") || "",
                revenue: Math.round(Number(r(row, "revenue")) || 0),
                valuation: Math.round(Number(r(row, "valuation")) || 0),
                growthRate: Number(r(row, "growth_rate", "growthrate", "growth")) || 0,
                employees: Math.round(Number(r(row, "employees", "headcount")) || 0),
                ownership: r(row, "ownership") || null,
                arr: r(row, "arr") || null,
                moic: r(row, "moic") || null,
                irr: r(row, "irr") || null,
                status: r(row, "status") || "active",
                founded: r(row, "founded") ? Number(r(row, "founded")) : null,
                createdAt: now, updatedAt: now,
              }).onConflictDoUpdate({
                target: companies.id,
                set: { revenue: Math.round(Number(r(row, "revenue")) || 0), valuation: Math.round(Number(r(row, "valuation")) || 0), updatedAt: now },
              });
              imported++;
            } catch (e) {
              rowErrors.push({ row: i + 2, message: (e as Error).message });
            }
          }
        });
      }
    } else if (tableType === "financials") {
      const validRows: { row: RowMap; period: string }[] = [];
      for (let i = 0; i < rows.length; i++) {
        const period = r(rows[i], "period", "month", "quarter", "year");
        if (!period) { skipped++; rowErrors.push({ row: i + 2, message: "Missing period" }); continue; }
        validRows.push({ row: rows[i], period });
      }
      if (validRows.length > 0) {
        await db.transaction(async (tx) => {
          for (let i = 0; i < validRows.length; i++) {
            const { row, period } = validRows[i];
            const id = `imp_fin_${slugify(period)}`;
            try {
              await tx.insert(financialSnapshots).values({
                id, period,
                revenue: Math.round(Number(r(row, "revenue")) || 0),
                expenses: Math.round(Number(r(row, "expenses", "costs")) || 0),
                ebitda: Math.round(Number(r(row, "ebitda")) || 0),
                arr: Math.round(Number(r(row, "arr")) || 0),
                sortOrder: 0,
                createdAt: now,
              }).onConflictDoUpdate({
                target: financialSnapshots.id,
                set: { revenue: Math.round(Number(r(row, "revenue")) || 0), ebitda: Math.round(Number(r(row, "ebitda")) || 0) },
              });
              imported++;
            } catch (e) {
              rowErrors.push({ row: i + 2, message: (e as Error).message });
            }
          }
        });
      }
    } else if (tableType === "deals") {
      const validRows: typeof rows = [];
      const validationErrors: RowError[] = [];
      for (let i = 0; i < rows.length; i++) {
        const name = r(rows[i], "company_name", "deal", "deal_name", "company", "companyname");
        if (!name) { skipped++; validationErrors.push({ row: i + 2, message: "Missing company_name" }); continue; }
        validRows.push(rows[i]);
      }
      rowErrors.push(...validationErrors);
      if (validRows.length > 0) {
        await db.transaction(async (tx) => {
          for (let i = 0; i < validRows.length; i++) {
            const row = validRows[i];
            const companyName = r(row, "company_name", "deal", "deal_name", "company", "companyname");
            const id = `imp_deal_${slugify(companyName)}`;
            try {
              await tx.insert(deals).values({
                id, companyName,
                dealType: r(row, "deal_type", "dealtype", "type") || "investment",
                dealSize: Math.round(Number(r(row, "deal_size", "dealsize", "size", "amount")) || 0),
                closingDate: r(row, "closing_date", "closingdate", "date") || null,
                stage: r(row, "stage") || "sourcing",
                valuation: Math.round(Number(r(row, "valuation")) || 0),
                targetRevenue: Math.round(Number(r(row, "target_revenue", "targetrevenue", "revenue")) || 0),
                industry: r(row, "industry") || "",
                assignedTo: r(row, "assigned_to", "assignedto") || "",
                priority: r(row, "priority") || "medium",
                overview: r(row, "overview", "notes") || "",
                createdAt: now,
              }).onConflictDoUpdate({
                target: deals.id,
                set: { dealSize: Math.round(Number(r(row, "deal_size", "dealsize", "size", "amount")) || 0), updatedAt: now },
              });
              imported++;
            } catch (e) {
              rowErrors.push({ row: i + 2, message: (e as Error).message });
            }
          }
        });
      }
    } else if (tableType === "metrics") {
      const validRows: typeof rows = [];
      const validationErrors: RowError[] = [];
      for (let i = 0; i < rows.length; i++) {
        const key = r(rows[i], "metric_key", "metrickey", "metric");
        if (!key) { skipped++; validationErrors.push({ row: i + 2, message: "Missing metric_key" }); continue; }
        validRows.push(rows[i]);
      }
      rowErrors.push(...validationErrors);
      if (validRows.length > 0) {
        await db.transaction(async (tx) => {
          for (let i = 0; i < validRows.length; i++) {
            const row = validRows[i];
            const metricKey = r(row, "metric_key", "metrickey", "metric");
            const periodLabel = r(row, "period", "periodlabel", "period_label") || "";
            const category = r(row, "category") || "import";
            const id = `imp_metric_${slugify(category)}_${slugify(metricKey)}_${slugify(periodLabel)}`;
            try {
              await tx.insert(metricsSnapshots).values({
                id, category, metricKey,
                metricLabel: r(row, "metric_label", "metriclabel", "label") || metricKey,
                value: Number(r(row, "value", "amount")) || 0,
                unit: r(row, "unit") || "USD",
                periodLabel,
                source: "csv_import",
                createdAt: now, updatedAt: now,
              }).onConflictDoUpdate({
                target: metricsSnapshots.id,
                set: { value: Number(r(row, "value", "amount")) || 0, updatedAt: now },
              });
              imported++;
            } catch (e) {
              rowErrors.push({ row: i + 2, message: (e as Error).message });
            }
          }
        });
      }
    }

    const logId = `imp_${randomUUID()}`;
    await db.insert(importLogs).values({
      id: logId,
      fileName: req.file.originalname,
      tableType,
      totalRows: rows.length,
      importedRows: imported,
      skippedRows: skipped,
      errorRows: rowErrors.length,
      errors: rowErrors.slice(0, 100),
      columnMapping: mapping,
      importedAt: now,
    });

    res.json({ tableType, imported, skipped, errors: rowErrors, total: rows.length, logId });
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
