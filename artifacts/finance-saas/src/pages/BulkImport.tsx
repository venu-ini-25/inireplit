import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Upload, FileText, CheckCircle2, XCircle, AlertCircle,
  Loader2, Download, RefreshCw, ChevronRight, ArrowRight,
  History, Info,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type TableType = "companies" | "deals" | "financials" | "metrics" | "unknown";
type ImportStep = "upload" | "mapping" | "result";

interface DbFieldsMap {
  companies: { required: string[]; all: string[] };
  deals: { required: string[]; all: string[] };
  financials: { required: string[]; all: string[] };
  metrics: { required: string[]; all: string[] };
}

interface PreviewResult {
  rawHeaders: string[];
  headers: string[];
  tableType: TableType;
  detectedType: TableType;
  rowCount: number;
  preview: Record<string, string>[];
  suggestedMapping: Record<string, string>;
  dbFields: { required: string[]; all: string[] };
  allDbFields: DbFieldsMap;
}

interface RowError { row: number; field?: string; message: string }

interface ImportResult {
  tableType: TableType;
  imported: number;
  skipped: number;
  errored: number;
  errors: RowError[];
  total: number;
}

interface ImportLogEntry {
  id: string;
  fileName: string;
  tableType: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errorRows: number;
  importedAt: string;
}

const TABLE_LABELS: Record<string, string> = {
  companies: "Portfolio Companies",
  deals: "Deals / M&A Pipeline",
  financials: "Financial Snapshots",
  metrics: "KPI Metrics",
  unknown: "— Select a type —",
};

const TABLE_COLORS: Record<string, string> = {
  companies: "text-blue-700 bg-blue-50 border-blue-200",
  deals: "text-violet-700 bg-violet-50 border-violet-200",
  financials: "text-green-700 bg-green-50 border-green-200",
  metrics: "text-amber-700 bg-amber-50 border-amber-200",
  unknown: "text-slate-500 bg-slate-50 border-slate-200",
};

const KNOWN_TYPES: Exclude<TableType, "unknown">[] = ["companies", "deals", "financials", "metrics"];

const TEMPLATE_HEADERS: Record<Exclude<TableType, "unknown">, string[]> = {
  companies: ["company_name", "industry", "stage", "revenue", "valuation", "arr", "moic", "irr", "ownership", "location", "status", "founded"],
  deals: ["company_name", "deal_type", "deal_size", "stage", "closing_date", "valuation", "industry", "assigned_to", "priority", "overview"],
  financials: ["period", "revenue", "expenses", "ebitda", "arr"],
  metrics: ["metric_key", "metric_label", "category", "value", "unit", "period"],
};

const SAMPLE_DATA: Record<Exclude<TableType, "unknown">, string[]> = {
  companies: ["Acme Corp", "Fintech", "series_a", "5000000", "25000000", "$8.4M", "2.4x", "31.2%", "18.5%", "San Francisco, CA", "active", "2020"],
  deals: ["Meridian Analytics", "acquisition", "15000000", "due_diligence", "2025-06-30", "75000000", "Data & Analytics", "Sarah Chen", "high", "Strategic acquisition target"],
  financials: ["Jan '25", "2500000", "1800000", "700000", "8400000"],
  metrics: ["nrr", "Net Revenue Retention", "saas", "118", "%", "Q1 2025"],
};

function downloadTemplate(type: Exclude<TableType, "unknown">) {
  const headers = TEMPLATE_HEADERS[type];
  const sample = SAMPLE_DATA[type];
  const csvContent = headers.join(",") + "\n" + sample.join(",") + "\n" + headers.map(() => "").join(",");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ini_${type}_template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

export default function BulkImport() {
  const { getToken } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>("upload");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [selectedType, setSelectedType] = useState<TableType>("unknown");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [history, setHistory] = useState<ImportLogEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const adminToken = sessionStorage.getItem("ini_admin_token");

  const getAuthHeader = useCallback(async (): Promise<Record<string, string>> => {
    if (adminToken) return { Authorization: `Bearer ${adminToken}` };
    const token = await getToken();
    if (token) return { Authorization: `Bearer ${token}` };
    return {};
  }, [adminToken, getToken]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const headers = await getAuthHeader();
      const resp = await fetch(`${API_BASE}/api/import/logs`, { headers });
      if (resp.ok) setHistory(await resp.json());
    } catch { /* ignore */ }
    finally { setLoadingHistory(false); }
  }, [getAuthHeader]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const runPreview = useCallback(async (
    f: File,
    mapping: Record<string, string> = {},
    tableType: TableType = "unknown"
  ) => {
    setAnalyzing(true);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const fd = new FormData();
      fd.append("file", f);
      if (Object.keys(mapping).length) fd.append("columnMapping", JSON.stringify(mapping));
      if (tableType !== "unknown") fd.append("tableType", tableType);
      const resp = await fetch(`${API_BASE}/api/import/preview`, { method: "POST", headers, body: fd });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error ?? "Preview failed"); return; }
      const result = data as PreviewResult;
      setPreview(result);
      if (!Object.keys(mapping).length) {
        setColumnMapping(result.suggestedMapping ?? {});
      }
      if (result.tableType !== "unknown") {
        setSelectedType(result.tableType);
      }
      setStep("mapping");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }, [getAuthHeader]);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setError(null);
    setPreview(null);
    setResult(null);
    setColumnMapping({});
    setSelectedType("unknown");
    runPreview(f);
  }, [runPreview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleTypeChange = useCallback((newType: TableType) => {
    setSelectedType(newType);
    if (file && newType !== "unknown") {
      setColumnMapping({});
      runPreview(file, {}, newType);
    }
  }, [file, runPreview]);

  const reAnalyze = useCallback(() => {
    if (file) runPreview(file, columnMapping, selectedType);
  }, [file, columnMapping, selectedType, runPreview]);

  const runImport = useCallback(async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const fd = new FormData();
      fd.append("file", file);
      if (Object.keys(columnMapping).length) fd.append("columnMapping", JSON.stringify(columnMapping));
      if (selectedType !== "unknown") fd.append("tableType", selectedType);
      const resp = await fetch(`${API_BASE}/api/import/commit`, { method: "POST", headers, body: fd });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error ?? "Import failed"); return; }
      setResult(data as ImportResult);
      setStep("result");
      loadHistory();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }, [file, columnMapping, selectedType, getAuthHeader, loadHistory]);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setColumnMapping({});
    setSelectedType("unknown");
    if (fileRef.current) fileRef.current.value = "";
  };

  const effectiveType = selectedType !== "unknown" ? selectedType : preview?.tableType;
  const effectiveDbFields = effectiveType && effectiveType !== "unknown"
    ? (preview?.allDbFields?.[effectiveType] ?? { required: [], all: [] })
    : { required: [], all: [] };

  const allRequiredMapped = effectiveType && effectiveType !== "unknown"
    ? effectiveDbFields.required.every((req) => Object.values(columnMapping).includes(req))
    : false;

  const stepIdx = step === "upload" ? 0 : step === "mapping" ? 1 : 2;
  const STEPS = ["Upload File", "Review & Map", "Complete"];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bulk Import</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload CSV or Excel files to bulk-load portfolio companies, deals, financials, or KPI metrics. Max 10,000 rows per file.</p>
        </div>
        <button
          onClick={() => { setShowHistory(!showHistory); loadHistory(); }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          Import History
        </button>
      </div>

      {showHistory && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Recent Imports</span>
            <button onClick={loadHistory} className="text-xs text-primary hover:underline">Refresh</button>
          </div>
          {loadingHistory ? (
            <div className="flex items-center gap-2 px-4 py-6 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
            </div>
          ) : history.length === 0 ? (
            <div className="px-4 py-6 text-xs text-muted-foreground text-center">No import history yet.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left font-medium text-slate-500 px-4 py-2">File</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-2 hidden sm:table-cell">Type</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-2">Rows</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-2 hidden md:table-cell">Errors</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {history.map((log) => (
                  <tr key={log.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-slate-700 font-medium max-w-[180px] truncate">{log.fileName}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TABLE_COLORS[log.tableType] ?? "text-slate-600 bg-slate-50 border-slate-200"}`}>
                        {TABLE_LABELS[log.tableType] ?? log.tableType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      <span className="text-green-600 font-semibold">{log.importedRows}</span>
                      <span className="text-muted-foreground"> / {log.totalRows}</span>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      {log.errorRows > 0 ? (
                        <span className="text-red-500 font-semibold">{log.errorRows}</span>
                      ) : (
                        <span className="text-green-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(log.importedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <span className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${i === stepIdx ? "bg-primary text-white" : i < stepIdx ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
              {i + 1}. {label}
            </span>
            {i < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
          </React.Fragment>
        ))}
      </div>

      {step === "upload" && (
        <div className="space-y-5">
          {analyzing ? (
            <div className="border-2 border-dashed border-primary/40 rounded-xl p-12 text-center bg-primary/5">
              <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin mb-3" />
              <div className="font-semibold text-slate-700">Analyzing {file?.name}…</div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"}`}
            >
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <Upload className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <div className="font-semibold text-slate-700 text-base">Drop your file here or click to browse</div>
              <div className="text-sm text-muted-foreground mt-1">Supports CSV, XLS, XLSX — up to 10,000 rows, 20 MB</div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div><span className="font-semibold">Error: </span>{error}</div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="text-sm font-semibold text-slate-700 mb-1">Download CSV Templates</div>
            <p className="text-xs text-muted-foreground mb-3">Each template includes a sample row to show the expected format.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {KNOWN_TYPES.map((type) => (
                <button key={type} onClick={(e) => { e.stopPropagation(); downloadTemplate(type); }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-slate-100 hover:border-primary/30 hover:bg-slate-50 transition-colors text-center group">
                  <Download className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-slate-700">{TABLE_LABELS[type]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <div className="font-semibold mb-1 flex items-center gap-1.5"><Info className="w-4 h-4" /> How it works</div>
            Upload a file and the system auto-detects the data type from your column headers. You can then review and adjust the column mapping before committing the import. Required fields must be mapped to proceed.
          </div>
        </div>
      )}

      {step === "mapping" && file && preview && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 text-sm truncate">{file.name}</div>
              <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · {preview.rowCount.toLocaleString()} data rows</div>
            </div>
            <button onClick={reset} className="text-xs text-slate-400 hover:text-red-500 transition-colors shrink-0">Change file</button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
            <div className="font-semibold text-slate-800 text-sm">Data Type</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {KNOWN_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${selectedType === type
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  {TABLE_LABELS[type]}
                </button>
              ))}
            </div>
            {preview.detectedType !== "unknown" && preview.detectedType !== selectedType && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Auto-detected as <span className="font-semibold">{TABLE_LABELS[preview.detectedType]}</span>. You've changed it — mapping options updated.
              </p>
            )}
            {selectedType === "unknown" && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                Please select a data type above so the import knows where to store your data.
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Column Mapping</span>
                <span className="text-xs text-muted-foreground ml-2">Connect your file columns to the correct database fields</span>
              </div>
              <button onClick={reAnalyze} className="text-xs text-primary hover:underline flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Re-analyze
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-[1fr_48px_1fr] gap-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">Your file columns</div>
                <div />
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">Database fields</div>
                {preview.rawHeaders.map((raw, idx) => {
                  const mapped = columnMapping[raw] ?? "";
                  const isRequired = effectiveType && effectiveType !== "unknown" && effectiveDbFields.required.some((req) => req === mapped);
                  const isMapped = Boolean(mapped);
                  const availableFields = effectiveType && effectiveType !== "unknown"
                    ? (preview.allDbFields?.[effectiveType]?.all ?? [])
                    : [];
                  const usedByOther = new Set(
                    Object.entries(columnMapping)
                      .filter(([k, v]) => k !== raw && Boolean(v))
                      .map(([, v]) => v)
                  );
                  return (
                    <React.Fragment key={`row-${idx}`}>
                      <div className={`px-3 py-2 rounded-lg border text-xs font-mono truncate mr-2 mb-2 self-center ${isMapped ? "border-primary/30 bg-primary/5 text-slate-800 shadow-sm" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                        {raw}
                      </div>
                      <div className="flex items-center justify-center mb-2 self-center">
                        <div className={`h-0.5 w-full rounded-full transition-colors ${isMapped ? "bg-primary/50" : "bg-slate-200"}`} />
                        <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-colors ${isMapped ? "text-primary" : "text-slate-300"}`} />
                      </div>
                      <div className="ml-2 mb-2 self-center">
                        <select
                          value={mapped}
                          onChange={(e) => {
                            const newVal = e.target.value;
                            setColumnMapping((prev) => {
                              const next = { ...prev };
                              if (newVal) {
                                for (const [k, v] of Object.entries(next)) {
                                  if (k !== raw && v === newVal) next[k] = "";
                                }
                              }
                              next[raw] = newVal;
                              return next;
                            });
                          }}
                          disabled={selectedType === "unknown" && (!preview.tableType || preview.tableType === "unknown")}
                          className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white disabled:bg-slate-50 disabled:text-slate-400 font-mono transition-colors ${isRequired ? "border-green-400 text-green-800 bg-green-50" : isMapped ? "border-primary/30 text-slate-700" : "border-slate-200 text-slate-400"}`}
                        >
                          <option value="">— skip —</option>
                          {availableFields.map((field) => (
                            <option key={field} value={field} disabled={usedByOther.has(field)}>
                              {field}{effectiveDbFields.required.includes(field) ? " ★" : ""}{usedByOther.has(field) ? " (used)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              {effectiveType && effectiveType !== "unknown" && (
                <div className="flex items-center gap-4 pt-2 border-t border-slate-50 mt-1 text-xs text-muted-foreground">
                  <span>Fields marked <span className="font-bold text-amber-600">★</span> are required</span>
                  <span className="text-green-600 font-semibold">{Object.values(columnMapping).filter(Boolean).length} of {preview.rawHeaders.length}</span>
                  <span>columns connected</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Data Preview (first 5 rows)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    {preview.headers.map((h) => (
                      <th key={h} className="text-left text-slate-500 font-medium px-4 py-2 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      {preview.headers.map((h) => (
                        <td key={h} className="px-4 py-2 text-slate-700 whitespace-nowrap max-w-[200px] truncate">{row[h] ?? ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div><span className="font-semibold">Error: </span>{error}</div>
            </div>
          )}

          {effectiveType && effectiveType !== "unknown" && !allRequiredMapped && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Required field(s) not yet mapped: <span className="font-semibold ml-1">{effectiveDbFields.required.filter(req => !Object.values(columnMapping).includes(req)).join(", ")}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">← Change file</button>
            <button
              onClick={runImport}
              disabled={importing || selectedType === "unknown" || !allRequiredMapped}
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? "Importing…" : `Import ${preview.rowCount.toLocaleString()} rows`}
            </button>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-100 p-6 text-center space-y-4">
            {result.imported === 0 ? (
              <XCircle className="w-12 h-12 text-red-400 mx-auto" />
            ) : (
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            )}
            <div>
              <div className="text-xl font-bold text-slate-900">
                {result.imported === 0 ? "Import Failed" : "Import Complete"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Data stored in: <span className="font-semibold text-slate-700">{TABLE_LABELS[result.tableType]}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 max-w-sm mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{result.imported}</div>
                <div className="text-xs text-muted-foreground">Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">{result.skipped}</div>
                <div className="text-xs text-muted-foreground">Skipped</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${result.errored > 0 ? "text-red-500" : "text-slate-300"}`}>{result.errored}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-700">{result.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
              <div className="border-b border-red-100 bg-red-50 px-4 py-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Row Errors ({result.errors.length})</span>
                <span className="text-xs text-red-500 ml-1">Fix these rows and re-import to capture them</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white border-b border-slate-100">
                    <tr>
                      <th className="text-left text-slate-500 font-medium px-4 py-2 w-20">Row #</th>
                      <th className="text-left text-slate-500 font-medium px-4 py-2 w-28">Field</th>
                      <th className="text-left text-slate-500 font-medium px-4 py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-2 text-slate-500 font-mono">{e.row}</td>
                        <td className="px-4 py-2 text-slate-600 font-mono">{e.field ?? ""}</td>
                        <td className="px-4 py-2 text-red-600">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <button onClick={reset}
              className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              <Upload className="w-4 h-4" />
              Import another file
            </button>
            <a href={result.tableType === "companies" ? "/portfolio" : result.tableType === "deals" ? "/ma" : "/app"}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
              View imported data
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
