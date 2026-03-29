import React, { useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle, Loader2, Download, RefreshCw, ChevronRight } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type TableType = "companies" | "deals" | "financials" | "metrics" | "unknown";
type ImportStep = "upload" | "preview" | "mapping" | "result";

interface PreviewResult {
  headers: string[];
  tableType: TableType;
  rowCount: number;
  preview: Record<string, string>[];
}

interface ImportResult {
  tableType: TableType;
  imported: number;
  skipped: number;
  total: number;
}

const TABLE_LABELS: Record<TableType, string> = {
  companies: "Portfolio Companies",
  deals: "Deals / M&A Pipeline",
  financials: "Financial Snapshots",
  metrics: "KPI Metrics",
  unknown: "Unknown",
};

const TABLE_COLORS: Record<TableType, string> = {
  companies: "text-blue-700 bg-blue-50 border-blue-200",
  deals: "text-violet-700 bg-violet-50 border-violet-200",
  financials: "text-green-700 bg-green-50 border-green-200",
  metrics: "text-amber-700 bg-amber-50 border-amber-200",
  unknown: "text-slate-600 bg-slate-50 border-slate-200",
};

const TEMPLATE_HEADERS: Record<Exclude<TableType, "unknown">, string[]> = {
  companies: ["company_name", "industry", "stage", "revenue", "valuation", "arr", "moic", "irr", "ownership", "location", "status"],
  deals: ["deal_name", "deal_type", "deal_size", "stage", "closing_date", "valuation", "industry", "assigned_to", "overview"],
  financials: ["period", "revenue", "expenses", "ebitda", "arr"],
  metrics: ["metric_key", "metric_label", "category", "value", "unit", "period"],
};

function downloadTemplate(type: Exclude<TableType, "unknown">) {
  const headers = TEMPLATE_HEADERS[type];
  const csvContent = headers.join(",") + "\n" + headers.map(() => "").join(",");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ini_${type}_template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkImport() {
  const { getToken } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>("upload");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);

  const adminToken = sessionStorage.getItem("ini_admin_token");

  const getAuthHeader = useCallback(async () => {
    if (adminToken) return { Authorization: `Bearer ${adminToken}` };
    const token = await getToken();
    if (token) return { Authorization: `Bearer ${token}` };
    return {};
  }, [adminToken, getToken]);

  const handleFile = (f: File) => {
    setFile(f);
    setError(null);
    setPreview(null);
    setResult(null);
    setColumnMapping({});
    setStep("preview");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const runPreview = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const fd = new FormData();
      fd.append("file", file);
      if (Object.keys(columnMapping).length) fd.append("columnMapping", JSON.stringify(columnMapping));
      const resp = await fetch(`${API_BASE}/api/import/preview`, { method: "POST", headers, body: fd });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error ?? "Preview failed"); return; }
      setPreview(data as PreviewResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [file, columnMapping, getAuthHeader]);

  const runImport = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const fd = new FormData();
      fd.append("file", file);
      if (Object.keys(columnMapping).length) fd.append("columnMapping", JSON.stringify(columnMapping));
      const resp = await fetch(`${API_BASE}/api/import/commit`, { method: "POST", headers, body: fd });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error ?? "Import failed"); return; }
      setResult(data as ImportResult);
      setStep("result");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [file, columnMapping, getAuthHeader]);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setColumnMapping({});
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bulk Import</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload CSV or Excel files to import companies, deals, financial data, and KPI metrics into the platform.</p>
      </div>

      <div className="flex items-center gap-2 text-xs">
        {(["upload", "preview", "result"] as ImportStep[]).map((s, i, arr) => (
          <React.Fragment key={s}>
            <span className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${step === s ? "bg-primary text-white" : i < arr.indexOf(step) ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
              {i + 1}. {s === "upload" ? "Upload File" : s === "preview" ? "Review & Map" : "Complete"}
            </span>
            {i < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
          </React.Fragment>
        ))}
      </div>

      {step === "upload" && (
        <div className="space-y-5">
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
            <div className="text-sm text-muted-foreground mt-1">Supports CSV, XLS, XLSX — up to 20 MB</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="text-sm font-semibold text-slate-700 mb-3">Download CSV Templates</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["companies", "deals", "financials", "metrics"] as const).map((type) => (
                <button key={type} onClick={() => downloadTemplate(type)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-slate-100 hover:border-primary/30 hover:bg-slate-50 transition-colors text-center group">
                  <Download className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-slate-700">{TABLE_LABELS[type]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <div className="font-semibold mb-1">Column auto-detection</div>
            Headers are matched automatically. The system detects the table type from your column names. Download a template above to get started quickly.
          </div>
        </div>
      )}

      {step === "preview" && file && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 text-sm truncate">{file.name}</div>
              <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
            </div>
            <button onClick={reset} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Change file</button>
          </div>

          {!preview && (
            <div className="flex justify-center">
              <button onClick={runPreview} disabled={loading}
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {loading ? "Analyzing…" : "Analyze File"}
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div><span className="font-semibold">Error: </span>{error}</div>
            </div>
          )}

          {preview && (
            <>
              <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-800 text-sm">Analysis Results</div>
                  <button onClick={runPreview} className="text-xs text-primary hover:underline">Re-analyze</button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Detected type:</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TABLE_COLORS[preview.tableType]}`}>
                      {TABLE_LABELS[preview.tableType]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Rows:</span>
                    <span className="text-xs font-semibold text-slate-700">{preview.rowCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Columns:</span>
                    <span className="text-xs font-semibold text-slate-700">{preview.headers.length}</span>
                  </div>
                </div>

                {preview.tableType === "unknown" && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div>Table type could not be detected automatically. Please map your columns below or use a template.</div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-3 bg-slate-50">
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

              <div className="flex items-center justify-between pt-2">
                <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">← Change file</button>
                <button onClick={runImport} disabled={loading || preview.tableType === "unknown"}
                  className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {loading ? "Importing…" : `Import ${preview.rowCount.toLocaleString()} rows`}
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div><span className="font-semibold">Import error: </span>{error}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === "result" && result && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-100 p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
            <div>
              <div className="text-xl font-bold text-slate-900">Import Complete</div>
              <div className="text-sm text-muted-foreground mt-1">Your data has been imported into <span className="font-semibold text-slate-700">{TABLE_LABELS[result.tableType]}</span></div>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{result.imported}</div>
                <div className="text-xs text-muted-foreground">Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">{result.skipped}</div>
                <div className="text-xs text-muted-foreground">Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-700">{result.total}</div>
                <div className="text-xs text-muted-foreground">Total rows</div>
              </div>
            </div>

            {result.skipped > 0 && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2 inline-block">
                {result.skipped} rows were skipped (missing required key field)
              </div>
            )}
          </div>

          <div className="flex justify-center gap-3">
            <button onClick={reset}
              className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              <Upload className="w-4 h-4" />
              Import another file
            </button>
            <a href={result.tableType === "companies" ? "/portfolio" : result.tableType === "deals" ? "/ma" : "/app"}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
              View data
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
