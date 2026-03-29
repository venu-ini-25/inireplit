import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db, companies, deals, financialSnapshots, metricsSnapshots } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

type TableType = "companies" | "deals" | "financials" | "metrics" | "unknown";

function toKey(s: string): string {
  return s.toLowerCase().replace(/[\s_\-\.]/g, "").trim();
}

function applyMapping(raw: string, mapping: Record<string, string>): string {
  return mapping[raw] ?? toKey(raw);
}

function detectTableType(headers: string[]): TableType {
  const h = headers.map(toKey);
  if (h.some((x) => ["valuation", "arr", "moic", "irr", "ownership"].includes(x))) return "companies";
  if (h.some((x) => ["revenue", "expenses", "period", "ebitda"].includes(x))) return "financials";
  if (h.some((x) => ["dealsize", "dealname", "closingdate", "dealtype"].includes(x))) return "deals";
  if (h.some((x) => ["metrickey", "metric", "category", "metriclabel"].includes(x))) return "metrics";
  if (h.includes("company") || h.includes("industry") || h.includes("stage")) return "companies";
  return "unknown";
}

interface RowMap { [k: string]: string }

function parseFileToRows(buffer: Buffer, mimetype: string, columnMapping: Record<string, string>): { headers: string[]; rows: RowMap[]; tableType: TableType } {
  let rawHeaders: string[] = [];
  const dataRows: RowMap[] = [];

  const isCSV = mimetype === "text/csv" || mimetype === "application/csv";
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("No sheets found in file");
  const sheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" }) as string[][];

  if (!jsonRows.length || !jsonRows[0].length) throw new Error("Empty file or no data rows");

  rawHeaders = jsonRows[0].map(String);
  const mappedHeaders = rawHeaders.map((h) => applyMapping(h, columnMapping));
  const tableType = detectTableType(mappedHeaders);

  for (let i = 1; i < jsonRows.length; i++) {
    const row = jsonRows[i];
    if (!row || row.every((c) => !c)) continue;
    const obj: RowMap = {};
    mappedHeaders.forEach((h, idx) => { obj[h] = String(row[idx] ?? ""); });
    dataRows.push(obj);
  }

  return { headers: mappedHeaders, rows: dataRows, tableType };
}

function slugify(s: string, maxLen = 60): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, maxLen);
}

router.post("/import/preview", requireAdmin, upload.single("file"), async (req, res): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const mapping: Record<string, string> = req.body["columnMapping"] ? JSON.parse(req.body["columnMapping"]) : {};
    const { headers, rows, tableType } = parseFileToRows(req.file.buffer, req.file.mimetype, mapping);
    res.json({
      headers,
      tableType,
      rowCount: rows.length,
      preview: rows.slice(0, 5),
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post("/import/commit", requireAdmin, upload.single("file"), async (req, res): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const mapping: Record<string, string> = req.body["columnMapping"] ? JSON.parse(req.body["columnMapping"]) : {};
    const { rows, tableType } = parseFileToRows(req.file.buffer, req.file.mimetype, mapping);
    if (tableType === "unknown") { res.status(400).json({ error: "Could not detect table type from headers. Map columns manually or check file format." }); return; }

    let imported = 0;
    let skipped = 0;
    const now = new Date();

    if (tableType === "companies") {
      for (const r of rows) {
        const name = r["companyname"] ?? r["company"] ?? r["name"] ?? "";
        if (!name) { skipped++; continue; }
        const id = `imp_co_${slugify(name)}`;
        await db.insert(companies).values({
          id, name,
          industry: r["industry"] ?? "",
          stage: r["stage"] ?? "seed",
          location: r["location"] ?? r["geography"] ?? r["country"] ?? "",
          revenue: Math.round(Number(r["revenue"] ?? 0)),
          valuation: Math.round(Number(r["valuation"] ?? 0)),
          growthRate: Number(r["growthrate"] ?? r["growth_rate"] ?? r["growth"] ?? 0),
          employees: Math.round(Number(r["employees"] ?? r["headcount"] ?? 0)),
          ownership: r["ownership"] ?? "",
          arr: r["arr"] ?? "0",
          moic: r["moic"] ?? "0",
          irr: r["irr"] ?? "0",
          status: r["status"] ?? "active",
          createdAt: now, updatedAt: now,
        }).onConflictDoUpdate({
          target: companies.id,
          set: { revenue: Math.round(Number(r["revenue"] ?? 0)), valuation: Math.round(Number(r["valuation"] ?? 0)), updatedAt: now },
        });
        imported++;
      }
    } else if (tableType === "financials") {
      for (const r of rows) {
        const period = r["period"] ?? r["month"] ?? r["quarter"] ?? r["year"] ?? "";
        if (!period) { skipped++; continue; }
        const id = `imp_fin_${slugify(period)}`;
        await db.insert(financialSnapshots).values({
          id, period,
          revenue: Math.round(Number(r["revenue"] ?? 0)),
          expenses: Math.round(Number(r["expenses"] ?? r["costs"] ?? 0)),
          ebitda: Math.round(Number(r["ebitda"] ?? 0)),
          arr: Math.round(Number(r["arr"] ?? 0)),
          sortOrder: 0,
          createdAt: now,
        }).onConflictDoUpdate({
          target: financialSnapshots.id,
          set: { revenue: Math.round(Number(r["revenue"] ?? 0)) },
        });
        imported++;
      }
    } else if (tableType === "deals") {
      for (const r of rows) {
        const companyName = r["deal"] ?? r["dealname"] ?? r["company"] ?? r["companyname"] ?? "";
        if (!companyName) { skipped++; continue; }
        const id = `imp_deal_${slugify(companyName)}`;
        await db.insert(deals).values({
          id,
          companyName,
          dealType: r["dealtype"] ?? r["type"] ?? "investment",
          dealSize: Math.round(Number(r["dealsize"] ?? r["deal_size"] ?? r["size"] ?? r["amount"] ?? 0)),
          closingDate: r["closingdate"] ?? r["dealdate"] ?? r["date"] ?? "",
          stage: r["stage"] ?? "sourcing",
          valuation: Math.round(Number(r["valuation"] ?? 0)),
          targetRevenue: Math.round(Number(r["targetrevenue"] ?? r["revenue"] ?? 0)),
          industry: r["industry"] ?? "",
          assignedTo: r["assignedto"] ?? r["assigned_to"] ?? "",
          priority: r["priority"] ?? "medium",
          overview: r["overview"] ?? r["notes"] ?? "",
          createdAt: now,
        }).onConflictDoUpdate({
          target: deals.id,
          set: { dealSize: Math.round(Number(r["dealsize"] ?? r["deal_size"] ?? r["size"] ?? r["amount"] ?? 0)), updatedAt: now },
        });
        imported++;
      }
    } else if (tableType === "metrics") {
      for (const r of rows) {
        const metricKey = r["metrickey"] ?? r["metric"] ?? "";
        if (!metricKey) { skipped++; continue; }
        const periodLabel = r["period"] ?? r["periodlabel"] ?? "";
        const category = r["category"] ?? "import";
        const id = `imp_metric_${slugify(category)}_${slugify(metricKey)}_${slugify(periodLabel)}`;
        await db.insert(metricsSnapshots).values({
          id, category, metricKey,
          metricLabel: r["metriclabel"] ?? r["label"] ?? metricKey,
          value: Number(r["value"] ?? r["amount"] ?? 0),
          unit: r["unit"] ?? "USD",
          periodLabel,
          source: "csv_import",
          createdAt: now, updatedAt: now,
        }).onConflictDoUpdate({
          target: metricsSnapshots.id,
          set: { value: Number(r["value"] ?? r["amount"] ?? 0), updatedAt: now },
        });
        imported++;
      }
    }

    res.json({ tableType, imported, skipped, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
