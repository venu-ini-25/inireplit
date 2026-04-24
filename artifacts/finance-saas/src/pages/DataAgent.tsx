import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  Upload, FileText, Loader2, Bot, Send, RefreshCw,
  CheckCircle2, AlertCircle, XCircle, Info,
  ChevronRight, ArrowRight, Download, Sparkles, History,
  ChevronDown, ArrowLeft, Zap, Database, BarChart2,
  TrendingUp, Users, DollarSign, ShoppingCart, Globe,
  Building2, GitMerge, PieChart, Briefcase, Activity,
  ChevronUp, Eye, Wand2,
} from "lucide-react";

import sampleQuickbooksGl from "../samples/quickbooks_gl_jan_mar_2025.csv?raw";
import sampleHubspot from "../samples/hubspot_deal_pipeline_q1_2025.csv?raw";
import sampleGusto from "../samples/gusto_payroll_export_q1_2025.csv?raw";
import sampleBank from "../samples/bank_statement_q1_2025.csv?raw";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function downloadCsvBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(f);
    reader.onload = () => { resolve((reader.result as string).split(",")[1] ?? ""); };
    reader.onerror = reject;
  });
}

async function safeRespJson(resp: Response): Promise<Record<string, unknown>> {
  try { return await resp.json() as Record<string, unknown>; } catch { return {}; }
}
async function checkRespOk(resp: Response): Promise<void> {
  if (!resp.ok) {
    const d = await safeRespJson(resp);
    // Use || (not ??) so empty string statusText falls through to the HTTP status fallback
    const msg = (d.error as string) || resp.statusText || `HTTP ${resp.status}`;
    console.error("[DataAgent] request failed:", resp.status, resp.url, d);
    throw new Error(msg);
  }
}

type TableType = "companies" | "deals" | "financials" | "metrics" | "unknown";

const TABLE_LABELS: Record<string, string> = {
  companies: "Portfolio Companies",
  deals: "Deals / M&A Pipeline",
  financials: "Financial Snapshots",
  metrics: "KPI Metrics",
  unknown: "Unknown",
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
  companies: ["company_name","industry","stage","revenue","valuation","arr","moic","irr","ownership","location","status","founded"],
  deals: ["company_name","deal_type","deal_size","stage","closing_date","valuation","industry","assigned_to","priority","overview"],
  financials: ["period","revenue","expenses","ebitda","arr"],
  metrics: ["metric_key","metric_label","category","value","unit","period"],
};

const SAMPLE_DATA: Record<Exclude<TableType, "unknown">, string[]> = {
  companies: ["Acme Corp","Fintech","series_a","5000000","25000000","8400000","2.4","31.2","18.5","San Francisco, CA","active","2020"],
  deals: ["Meridian Analytics","acquisition","15000000","due_diligence","2025-06-30","75000000","Data & Analytics","Sarah Chen","high","Strategic acquisition target"],
  financials: ["Jan 2025","2500000","1800000","700000","8400000"],
  metrics: ["nrr","Net Revenue Retention","saas","118","%","Q1 2025"],
};

const DB_FIELDS: Record<Exclude<TableType, "unknown">, { required: string[]; all: string[] }> = {
  companies: { required: ["company_name"], all: ["company_name","industry","stage","revenue","valuation","growth_rate","employees","location","status","ownership","arr","moic","irr","founded"] },
  deals: { required: ["company_name"], all: ["company_name","deal_type","deal_size","stage","closing_date","valuation","target_revenue","industry","assigned_to","priority","overview"] },
  financials: { required: ["period"], all: ["period","revenue","expenses","ebitda","arr"] },
  metrics: { required: ["metric_key"], all: ["metric_key","metric_label","category","value","unit","period"] },
};

const ALL_DASHBOARDS = [
  { name: "Executive Summary", icon: Activity },
  { name: "Finance P&L", icon: DollarSign },
  { name: "Cash Flow", icon: TrendingUp },
  { name: "Expenses", icon: ShoppingCart },
  { name: "Operations", icon: Zap },
  { name: "Product", icon: Globe },
  { name: "Marketing", icon: BarChart2 },
  { name: "Sales", icon: TrendingUp },
  { name: "People", icon: Users },
  { name: "Portfolio", icon: PieChart },
  { name: "M&A Support", icon: GitMerge },
  { name: "Reports & Analytics", icon: BarChart2 },
  { name: "Professional Services", icon: Briefcase },
];

const SOURCE_SYSTEM_META: Record<string, { label: string; color: string; bg: string; category: string }> = {
  erp_quickbooks_gl:      { label: "QuickBooks GL",          color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", category: "ERP" },
  erp_quickbooks_pl:      { label: "QuickBooks P&L Report",  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", category: "ERP" },
  erp_quickbooks_generic: { label: "QuickBooks Export",      color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", category: "ERP" },
  erp_netsuite:           { label: "NetSuite Export",        color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",     category: "ERP" },
  erp_generic:            { label: "ERP / Accounting",       color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",     category: "ERP" },
  crm_hubspot_deals:      { label: "HubSpot Deals",         color: "text-orange-700",  bg: "bg-orange-50 border-orange-200", category: "CRM" },
  crm_hubspot_contacts:   { label: "HubSpot Contacts",      color: "text-orange-700",  bg: "bg-orange-50 border-orange-200", category: "CRM" },
  crm_hubspot_companies:  { label: "HubSpot Companies",     color: "text-orange-700",  bg: "bg-orange-50 border-orange-200", category: "CRM" },
  crm_salesforce_opps:    { label: "Salesforce Opps",       color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",     category: "CRM" },
  crm_salesforce_leads:   { label: "Salesforce Leads",      color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",     category: "CRM" },
  crm_generic:            { label: "CRM Export",            color: "text-slate-700",   bg: "bg-slate-50 border-slate-200",   category: "CRM" },
  hr_gusto:               { label: "Gusto Payroll",         color: "text-purple-700",  bg: "bg-purple-50 border-purple-200", category: "HR" },
  hr_generic:             { label: "HR / Payroll Export",   color: "text-purple-700",  bg: "bg-purple-50 border-purple-200", category: "HR" },
  bank_statement:         { label: "Bank Statement",        color: "text-teal-700",    bg: "bg-teal-50 border-teal-200",     category: "Banking" },
  portfolio_companies:    { label: "Portfolio Data",        color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",     category: "Portfolio" },
  deals_pipeline:         { label: "Deal Pipeline",         color: "text-violet-700",  bg: "bg-violet-50 border-violet-200", category: "M&A" },
  pl_summary:             { label: "P&L Summary",           color: "text-green-700",   bg: "bg-green-50 border-green-200",   category: "Finance" },
  metrics_generic:        { label: "KPI Metrics Export",   color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",   category: "Metrics" },
  unknown:                { label: "Unknown Source",        color: "text-slate-500",   bg: "bg-slate-50 border-slate-200",   category: "Unknown" },
};

const DATA_LEVEL_META = {
  transaction: { label: "Transaction-Level", color: "text-amber-700 bg-amber-50 border-amber-200", desc: "Individual records — needs aggregation before import" },
  summary:     { label: "Summary-Level",     color: "text-green-700 bg-green-50 border-green-200",  desc: "Already aggregated — maps directly to database" },
  mixed:       { label: "Mixed Data",        color: "text-blue-700 bg-blue-50 border-blue-200",    desc: "Contains both transaction and summary level data" },
};

function downloadTemplate(type: Exclude<TableType, "unknown">) {
  const headers = TEMPLATE_HEADERS[type];
  const sample = SAMPLE_DATA[type];
  const csv = headers.join(",") + "\n" + sample.join(",") + "\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `ini_${type}_template.csv`; a.click();
  URL.revokeObjectURL(url);
}

function fmtDate(iso: string) {
  const d = new Date(iso); const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

interface PreviewResult {
  rawHeaders: string[]; tableType: TableType; rowCount: number;
  preview: Record<string, string>[]; suggestedMapping: Record<string, string>;
  allDbFields: Record<string, { required: string[]; all: string[] }>;
}

interface AiMapping {
  sourceColumn: string; targetField: string | null;
  confidence: number; reason: string; skip: boolean; userOverride?: boolean;
  aggregation?: string;
}

interface QualityIssue {
  column: string; issue: string; recommendation: string; severity: "high" | "medium" | "low";
}

interface TransformationStep {
  id: string; label: string; description: string; priority: number; required: boolean;
}

interface AiAnalysis {
  sourceSystem: string;
  sourceName: string;
  dataLevel: "transaction" | "summary" | "mixed";
  dataLevelExplanation: string;
  detectedTableType: TableType;
  targetTables: string[];
  dashboardsImpacted: string[];
  confidence: number;
  detectionReason: string;
  transformationPlan: TransformationStep[];
  mappings: AiMapping[];
  qualityIssues: QualityIssue[];
  summary: string;
}

interface TransformResult {
  transformedRows: Record<string, unknown>[];
  transformationLog: string[];
  rowsIn: number; rowsOut: number;
  warnings: string[]; summary: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: { action: string; source: string; target?: string }[];
}

interface ImportLogEntry {
  id: string; fileName: string; tableType: string;
  totalRows: number; importedRows: number; skippedRows: number;
  errorRows: number; importedAt: string;
}

interface ImportResult {
  imported: number; skipped: number; errored: number;
  errors: { row: number; message: string }[];
}

const SEVERITY_COLORS = {
  high:   "text-red-700 bg-red-50 border-red-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  low:    "text-slate-600 bg-slate-50 border-slate-200",
};

type Tab = "upload" | "map" | "result";

export default function DataAgent() {
  const { getToken } = useAuth();

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const adminToken = sessionStorage.getItem("ini_admin_token") ?? localStorage.getItem("ini_token");
    if (adminToken) return { Authorization: `Bearer ${adminToken}` };
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const [tab, setTab] = useState<Tab>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [showTransformPlan, setShowTransformPlan] = useState(true);
  const [showTransformPreview, setShowTransformPreview] = useState(false);

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [selectedType, setSelectedType] = useState<TableType>("unknown");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [aiMappings, setAiMappings] = useState<AiMapping[]>([]);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);
  const [transformResult, setTransformResult] = useState<TransformResult | null>(null);

  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<ImportLogEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [resolvedIssues, setResolvedIssues] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const hdrs = await authHeaders();
      const resp = await fetch(`${API_BASE}/api/import/logs`, { headers: hdrs });
      if (resp.ok) setHistory(await resp.json());
    } catch { /* ignore */ } finally { setHistoryLoading(false); }
  }, [authHeaders]);

  // Infer a table-type hint from the filename so AI has more context
  const typeHintFromFilename = (name: string): string | undefined => {
    const n = name.toLowerCase();
    if (n.includes("gl") || n.includes("general_ledger") || n.includes("quickbooks")) return "financials";
    if (n.includes("deal") || n.includes("pipeline") || n.includes("hubspot") || n.includes("salesforce")) return "deals";
    if (n.includes("payroll") || n.includes("gusto") || n.includes("employee") || n.includes("hr")) return "metrics";
    if (n.includes("bank") || n.includes("statement") || n.includes("transaction")) return "metrics";
    if (n.includes("compan") || n.includes("portfolio")) return "companies";
    return undefined;
  };

  // Apply AI analysis result to all related state
  const applyAiAnalysis = useCallback((data: AiAnalysis) => {
    setAiAnalysis(data);
    setAiAnalyzed(true);

    // Always populate column mappings from AI (even for "unknown" source)
    const newMapping: Record<string, string> = {};
    for (const m of (data.mappings ?? [])) {
      if (!m.skip && m.targetField) newMapping[m.sourceColumn] = m.targetField;
    }
    if (Object.keys(newMapping).length > 0) setColumnMapping(newMapping);
    setAiMappings(data.mappings ?? []);

    // Update table type only if AI is confident about it
    if (data.detectedTableType && data.detectedTableType !== "unknown") {
      setSelectedType(data.detectedTableType);
    }

    // Build chat greeting — guard against any undefined fields
    const sourceInfo = SOURCE_SYSTEM_META[data.sourceSystem] ?? SOURCE_SYSTEM_META.unknown;
    const levelInfo = DATA_LEVEL_META[data.dataLevel ?? "summary"] ?? DATA_LEVEL_META.summary;
    const sourceName = data.sourceName ?? sourceInfo.label;
    const summary = data.summary ?? "Analysis complete. Check the detection details and transformation plan above.";
    const tableListStr = (data.targetTables ?? []).filter(Boolean).join(", ") || TABLE_LABELS[data.detectedTableType] || "the database";
    const dashboardListStr = (data.dashboardsImpacted ?? []).filter(Boolean).join(", ") || "relevant dashboards";
    const requiredSteps = (data.transformationPlan ?? []).filter(t => t.required).length;

    setChat([{
      role: "assistant",
      content: `I've identified this as **${sourceName}** — ${levelInfo.label.toLowerCase()} data.\n\n${summary}\n\nThis will populate **${tableListStr}** and refresh your **${dashboardListStr}** dashboards.${requiredSteps > 0 ? `\n\n${requiredSteps} transformation step${requiredSteps > 1 ? "s" : ""} required before import (see Transformation Plan above).` : ""}\n\nAsk me anything about the mappings, transformations, or which charts will update.`,
    }]);
  }, []);

  const runPreview = useCallback(async (f: File, tableType: TableType = "unknown") => {
    setPreviewing(true); setError(null);
    setAiAnalysis(null); setAiAnalyzed(false); setAiMappings([]); setChat([]); setTransformResult(null);
    let previewData: PreviewResult | null = null;
    try {
      const hdrs = await authHeaders();
      const base64 = await fileToBase64(f);
      const resp = await fetch(`${API_BASE}/api/import/preview`, {
        method: "POST",
        headers: { ...hdrs, "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64, fileName: f.name, tableType: tableType !== "unknown" ? tableType : undefined }),
      });
      await checkRespOk(resp);
      const raw = await resp.json() as PreviewResult;
      // Strip empty/blank column headers that XLSX produces when CSV rows have
      // more columns than the header (e.g. unquoted commas in memo fields)
      const cleanHdrs = raw.rawHeaders.filter(h => h.trim() !== "");
      previewData = {
        ...raw,
        rawHeaders: cleanHdrs,
        preview: raw.preview.map(row => {
          const cleaned: Record<string, string> = {};
          for (const [k, v] of Object.entries(row)) { if (k.trim() !== "") cleaned[k] = v as string; }
          return cleaned;
        }),
      };
      setPreview(previewData);
      setSelectedType(previewData.tableType !== "unknown" ? previewData.tableType : "unknown");
      setColumnMapping(previewData.suggestedMapping ?? {});
      setTab("map");
    } catch (e) {
      console.error("[DataAgent] upload error:", e);
      const msg = (e instanceof Error && e.message) ? e.message : "Server error — check your connection and try again";
      setError(`Upload failed: ${msg}`);
    } finally { setPreviewing(false); }

    // Auto-run AI analysis immediately after preview (no manual click required)
    if (!previewData) return;
    setAnalyzing(true);
    try {
      const hdrs = await authHeaders();
      const resp = await fetch(`${API_BASE}/api/data-agent/analyze`, {
        method: "POST",
        headers: { ...hdrs, "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: previewData.rawHeaders,
          sampleRows: previewData.preview.slice(0, 8),
          tableTypeHint: typeHintFromFilename(f.name),
        }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const analysis: AiAnalysis = await resp.json();
      applyAiAnalysis(analysis);
    } catch {
      // Silent fail on auto-analyze — user can still click Re-analyze
    } finally { setAnalyzing(false); }
  }, [authHeaders]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = useCallback((f: File) => {
    setFile(f); setPreview(null); setImportResult(null); setError(null);
    runPreview(f);
  }, [runPreview]);

  const handleTypeChange = useCallback((newType: TableType) => {
    setSelectedType(newType);
    if (file && newType !== "unknown") runPreview(file, newType);
  }, [file, runPreview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  const runAiAnalysis = useCallback(async () => {
    if (!preview) return;
    setAnalyzing(true); setError(null);
    try {
      const hdrs = await authHeaders();
      const resp = await fetch(`${API_BASE}/api/data-agent/analyze`, {
        method: "POST",
        headers: { ...hdrs, "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: preview.rawHeaders,
          sampleRows: preview.preview.slice(0, 8),
          tableTypeHint: selectedType !== "unknown" ? selectedType : typeHintFromFilename(file?.name ?? ""),
        }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data: AiAnalysis = await resp.json();
      applyAiAnalysis(data);
    } catch (e) {
      setError(`AI analysis failed: ${(e as Error).message}`);
    } finally { setAnalyzing(false); }
  }, [preview, selectedType, authHeaders, applyAiAnalysis, file]);

  const runTransformPreview = useCallback(async () => {
    if (!preview || !aiAnalysis) return;
    setTransforming(true); setTransformResult(null);
    try {
      const hdrs = await authHeaders();
      const resp = await fetch(`${API_BASE}/api/data-agent/transform`, {
        method: "POST",
        headers: { ...hdrs, "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: preview.rawHeaders,
          sampleRows: preview.preview.slice(0, 20),
          sourceSystem: aiAnalysis.sourceSystem,
          transformationPlan: aiAnalysis.transformationPlan,
          targetTableType: aiAnalysis.detectedTableType,
          columnMapping,
        }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data: TransformResult = await resp.json();
      setTransformResult(data);
      setShowTransformPreview(true);
    } catch (e) {
      setError(`Transform preview failed: ${(e as Error).message}`);
    } finally { setTransforming(false); }
  }, [preview, aiAnalysis, columnMapping, authHeaders]);

  const updateAiMapping = useCallback((sourceColumn: string, targetField: string | null, skip = false) => {
    setAiMappings(prev => prev.map(m =>
      m.sourceColumn === sourceColumn ? { ...m, targetField: skip ? null : targetField, skip, userOverride: true } : m
    ));
    setColumnMapping(prev => {
      const next = { ...prev };
      if (skip || !targetField) { delete next[sourceColumn]; } else { next[sourceColumn] = targetField; }
      return next;
    });
  }, []);

  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading || !aiAnalysis || !preview) return;
    const userMsg = chatInput.trim(); setChatInput(""); setChatLoading(true);
    setChat(prev => [...prev, { role: "user", content: userMsg }]);
    const currentMappings = Object.fromEntries(aiMappings.map(m => [m.sourceColumn, m.skip ? null : (m.targetField ?? null)]));
    try {
      const hdrs = await authHeaders();
      const resp = await fetch(`${API_BASE}/api/data-agent/chat`, {
        method: "POST",
        headers: { ...hdrs, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          context: {
            headers: preview.rawHeaders,
            currentMappings,
            tableType: aiAnalysis.detectedTableType,
            sourceSystem: aiAnalysis.sourceSystem,
            sourceName: aiAnalysis.sourceName,
            dataLevel: aiAnalysis.dataLevel,
            transformationPlan: aiAnalysis.transformationPlan,
            dashboardsImpacted: aiAnalysis.dashboardsImpacted,
            qualityIssues: aiAnalysis.qualityIssues,
          },
          history: chat.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const reader = resp.body?.getReader(); const decoder = new TextDecoder();
      let fullContent = "";
      const actions: { action: string; source: string; target?: string }[] = [];
      if (reader) {
        setChat(prev => [...prev, { role: "assistant", content: "" }]);
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.content) {
                  fullContent += event.content;
                  setChat(prev => { const upd = [...prev]; upd[upd.length - 1] = { role: "assistant", content: fullContent }; return upd; });
                }
                if (event.done && event.fullContent) {
                  const jsonBlocks = event.fullContent.match(/```json\n([\s\S]*?)```/g) ?? [];
                  for (const block of jsonBlocks) {
                    try {
                      const json = JSON.parse(block.replace(/```json\n|```/g, ""));
                      if (json.action && json.source) {
                        actions.push(json);
                        if (json.action === "update_mapping") updateAiMapping(json.source, json.target ?? null, false);
                        else if (json.action === "skip") updateAiMapping(json.source, null, true);
                      }
                    } catch {}
                  }
                  if (actions.length > 0) {
                    setChat(prev => { const upd = [...prev]; upd[upd.length - 1] = { ...upd[upd.length - 1], actions }; return upd; });
                  }
                }
              } catch {}
            }
          }
        }
      }
    } catch (e) {
      setChat(prev => [...prev, { role: "assistant", content: `Error: ${(e as Error).message}` }]);
    } finally { setChatLoading(false); }
  }, [chatInput, chatLoading, aiAnalysis, aiMappings, preview, chat, authHeaders, updateAiMapping]);

  const runImport = useCallback(async () => {
    if (!file || !preview) return;
    setImporting(true); setError(null);
    try {
      const hdrs = await authHeaders();
      const base64 = await fileToBase64(file);
      const finalMapping = aiAnalyzed
        ? Object.fromEntries(aiMappings.filter(m => !m.skip && m.targetField).map(m => [m.sourceColumn, m.targetField!]))
        : columnMapping;

      // Build aggregations spec from aiMappings if any have aggregation directives
      let aggregations: { groupBy: { sourceColumn: string; granularity: string }; derived: { targetField: string; op: string; source: string; filter?: { column: string; values: string[] } }[]; computed?: { targetField: string; expression: string }[] } | undefined;
      if (aiAnalyzed) {
        const groupByM = aiMappings.find(m => m.aggregation?.startsWith("groupBy:"));
        const sumWhereMs = aiMappings.filter(m => m.aggregation?.startsWith("sumWhere:") && m.targetField);
        const filterMs = aiMappings.filter(m => m.aggregation === "filter");
        if (groupByM && sumWhereMs.length > 0) {
          const granularity = (groupByM.aggregation!.split(":")[1] ?? "month").trim();
          const filterCol = filterMs[0]?.sourceColumn ?? "";
          const derived = sumWhereMs.map(m => {
            const expr = m.aggregation!.slice("sumWhere:".length).trim();
            const inMatch = expr.match(/IN\s*\(([^)]+)\)/i);
            const values = inMatch ? inMatch[1]!.split(",").map(s => s.trim().replace(/^['"]|['"]$/g, "")) : [];
            return { targetField: m.targetField!, op: "sum" as const, source: m.sourceColumn, filter: filterCol && values.length ? { column: filterCol, values } : undefined };
          });
          aggregations = { groupBy: { sourceColumn: groupByM.sourceColumn, granularity }, derived };
          if (derived.find(d => d.targetField === "revenue") && derived.find(d => d.targetField === "expenses")) {
            aggregations.computed = [{ targetField: "ebitda", expression: "revenue-expenses" }];
          }
        }
      }

      const resp = await fetch(`${API_BASE}/api/import/commit`, {
        method: "POST",
        headers: { ...hdrs, "Content-Type": "application/json" },
        body: JSON.stringify({
          file: base64, fileName: file.name,
          tableType: selectedType !== "unknown" ? selectedType : undefined,
          columnMapping: Object.keys(finalMapping).length ? finalMapping : undefined,
          aggregations,
        }),
      });
      await checkRespOk(resp);
      const data: ImportResult = await resp.json();
      setImportResult(data); setTab("result"); loadHistory();
    } catch (e) {
      console.error("[DataAgent] import error:", e);
      const msg = (e instanceof Error && e.message) ? e.message : "Server error — check your connection and try again";
      setError(`Import failed: ${msg}`);
    } finally { setImporting(false); }
  }, [file, preview, aiAnalyzed, aiMappings, columnMapping, selectedType, authHeaders, loadHistory]);

  const reset = () => {
    setFile(null); setPreview(null); setAiAnalysis(null); setAiAnalyzed(false);
    setAiMappings([]); setChat([]); setImportResult(null); setError(null);
    setTransformResult(null); setShowTransformPreview(false);
    setSelectedType("unknown"); setColumnMapping({}); setTab("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const effectiveFields = selectedType !== "unknown" ? DB_FIELDS[selectedType] : { required: [], all: [] };

  // ============================================================================
  // RENDER
  // ============================================================================
  const sourceMeta = SOURCE_SYSTEM_META[aiAnalysis?.sourceSystem ?? "unknown"] ?? SOURCE_SYSTEM_META.unknown;
  const aiOnline = aiAnalyzed && aiAnalysis !== null;
  const isWorking = previewing || analyzing || importing;
  const targetTable = selectedType !== "unknown" ? selectedType : (preview?.tableType !== "unknown" ? preview?.tableType : null);
  const allColumns = preview?.rawHeaders ?? [];
  const detectedTypeLabel = targetTable ? TABLE_LABELS[targetTable] ?? targetTable : "—";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Agent</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drop a file. The agent figures out what it is, maps the columns, and imports it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${aiOnline ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${aiOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
            {aiOnline ? "AI on" : "Rule-based"}
          </span>
          {file && (
            <button onClick={reset} className="text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-md hover:bg-slate-100 transition">Start over</button>
          )}
        </div>
      </div>

      {/* ── Drop zone ──────────────────────────────────────────────────────── */}
      {!file ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
            ${dragging ? "border-primary bg-blue-50" : "border-slate-300 bg-white hover:border-primary/40 hover:bg-primary/5"}`}>
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-700">Drop your file here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">CSV or Excel — any source: QuickBooks, HubSpot, Salesforce, Gusto, bank, custom</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <FileText className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{file.name}</div>
            <div className="text-xs text-muted-foreground">{preview ? `${preview.rowCount} rows · ${allColumns.length} columns` : "Reading…"}</div>
          </div>
          {isWorking && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <button onClick={() => fileInputRef.current?.click()} className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md hover:bg-slate-100 transition">Replace</button>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-sm">
          <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 text-red-800">{error}</div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs">×</button>
        </div>
      )}

      {/* ── After file uploaded: Detection + Mapping + Import ─────────────── */}
      {preview && (
        <>
          {/* Detection card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${TABLE_COLORS[targetTable ?? "unknown"]}`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-semibold text-slate-900">
                      {aiAnalysis?.sourceName ?? sourceMeta.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${TABLE_COLORS[targetTable ?? "unknown"]}`}>
                      → {detectedTypeLabel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                    {aiAnalysis?.summary ?? (analyzing ? "Analyzing your data…" : `Detected as ${detectedTypeLabel}. Review the column mappings below and click Import.`)}
                  </p>
                </div>
              </div>
              {analyzing && <span className="text-xs text-primary flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Analyzing</span>}
            </div>

            {/* Type override */}
            <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100">
              <div className="text-xs font-semibold text-slate-600 mb-2">Import as</div>
              <div className="flex flex-wrap gap-2">
                {KNOWN_TYPES.map(type => (
                  <button key={type} onClick={() => handleTypeChange(type)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
                      ${selectedType === type ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30" : "border-slate-200 text-slate-600 bg-white hover:border-slate-300"}`}>
                    {TABLE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mappings table */}
          {selectedType !== "unknown" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Column Mappings</div>
                  <div className="text-xs text-muted-foreground">How each column from your file will be imported.</div>
                </div>
                {aiOnline && (
                  <button onClick={runAiAnalysis} disabled={analyzing}
                    className="text-xs text-primary hover:bg-primary/5 px-2.5 py-1 rounded-md font-medium transition inline-flex items-center gap-1 disabled:opacity-50">
                    <RefreshCw className={`w-3 h-3 ${analyzing ? "animate-spin" : ""}`} /> Re-analyze
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50 text-xs text-slate-600">
                    <tr>
                      <th className="text-left font-semibold px-4 py-2.5">Source Column</th>
                      <th className="text-left font-semibold px-4 py-2.5">Sample</th>
                      <th className="text-left font-semibold px-4 py-2.5">→ Database Field</th>
                      <th className="text-left font-semibold px-4 py-2.5 w-16">Skip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allColumns.map(col => {
                      const aiM = aiMappings.find(m => m.sourceColumn === col);
                      const currentTarget = aiM ? (aiM.skip ? "" : (aiM.targetField ?? "")) : (columnMapping[col] ?? "");
                      const isSkipped = aiM?.skip ?? false;
                      const sampleVal = preview.preview[0]?.[col] ?? "";
                      const fieldOptions = effectiveFields.all;
                      return (
                        <tr key={col} className={isSkipped ? "opacity-40" : ""}>
                          <td className="px-4 py-2 font-medium text-slate-800">{col}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-[180px]">{sampleVal || "—"}</td>
                          <td className="px-4 py-2">
                            <select
                              disabled={isSkipped}
                              value={currentTarget}
                              onChange={e => {
                                const v = e.target.value;
                                if (aiM || aiAnalyzed) updateAiMapping(col, v || null, false);
                                else setColumnMapping(prev => v ? { ...prev, [col]: v } : (() => { const n = { ...prev }; delete n[col]; return n; })());
                              }}
                              className="border border-slate-200 rounded-md text-sm px-2 py-1 bg-white w-full max-w-[220px] focus:outline-none focus:ring-2 focus:ring-primary/30">
                              <option value="">— don't import —</option>
                              {fieldOptions.map(f => (
                                <option key={f} value={f}>
                                  {f}{effectiveFields.required.includes(f) ? " *" : ""}
                                </option>
                              ))}
                            </select>
                            {aiM?.aggregation && aiM.aggregation !== "none" && aiM.aggregation !== "direct" && (
                              <div className="text-[10px] text-amber-700 italic mt-1">↻ {aiM.aggregation}</div>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <input type="checkbox" checked={isSkipped}
                              onChange={e => updateAiMapping(col, currentTarget || null, e.target.checked)}
                              className="rounded border-slate-300 text-primary focus:ring-primary" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {aiAnalysis?.dataLevel === "transaction" && targetTable === "financials" && (
                <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>This is transaction-level data — rows will be aggregated by month into financial snapshots before import.</span>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {preview.preview.length > 0 && selectedType !== "unknown" && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="text-sm font-semibold text-slate-800">Preview</div>
                <div className="text-xs text-muted-foreground">First 5 rows from your file.</div>
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50/50 text-slate-600 sticky top-0">
                    <tr>{allColumns.map(h => (<th key={h} className="text-left font-semibold px-3 py-2 whitespace-nowrap">{h}</th>))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.preview.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {allColumns.map(h => (<td key={h} className="px-3 py-1.5 text-slate-700 whitespace-nowrap max-w-[200px] truncate">{row[h] ?? ""}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import button */}
          {selectedType !== "unknown" && (
            <div className="flex items-center gap-3 sticky bottom-4 bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-800">Ready to import</div>
                <div className="text-xs text-muted-foreground">
                  {preview.rowCount} rows → {detectedTypeLabel}
                  {aiAnalysis?.dataLevel === "transaction" && targetTable === "financials" ? " (will be aggregated by month)" : ""}
                </div>
              </div>
              <button onClick={runImport} disabled={importing || !targetTable}
                className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><ArrowRight className="w-4 h-4" /> Import to {detectedTypeLabel}</>}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Result ──────────────────────────────────────────────────────────── */}
      {importResult && (
        <div className="bg-white border-2 border-emerald-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="text-base font-bold text-slate-900">Import complete</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                <span className="text-emerald-700 font-semibold">{importResult.imported}</span> imported
                {importResult.skipped > 0 && <> · <span className="text-amber-700 font-semibold">{importResult.skipped}</span> skipped</>}
                {importResult.errored > 0 && <> · <span className="text-red-700 font-semibold">{importResult.errored}</span> errored</>}
              </div>
              {importResult.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-red-700 cursor-pointer hover:underline">View {importResult.errors.length} error{importResult.errors.length > 1 ? "s" : ""}</summary>
                  <ul className="mt-2 space-y-1 text-xs text-red-700 max-h-40 overflow-y-auto">
                    {importResult.errors.slice(0, 20).map((e, i) => (<li key={i}>Row {e.row}: {e.message}</li>))}
                  </ul>
                </details>
              )}
              <div className="mt-3 flex gap-2">
                <button onClick={reset} className="text-xs text-primary hover:bg-primary/5 font-semibold px-3 py-1.5 rounded-md transition">Import another file</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Templates + Samples (only when no file) ────────────────────────── */}
      {!file && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Sample data to try
            </div>
            <p className="text-xs text-muted-foreground mb-3">Download a realistic test file then drop it above.</p>
            <div className="space-y-2">
              {[
                { csvContent: sampleQuickbooksGl, file: "quickbooks_gl_jan_mar_2025.csv", label: "QuickBooks GL", desc: "Transaction-level → aggregated to monthly financials", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                { csvContent: sampleHubspot, file: "hubspot_deal_pipeline_q1_2025.csv", label: "HubSpot Deals", desc: "12 active M&A deals", color: "bg-orange-50 text-orange-700 border-orange-200" },
                { csvContent: sampleGusto, file: "gusto_payroll_export_q1_2025.csv", label: "Gusto Payroll", desc: "27 employees, comp & tenure", color: "bg-purple-50 text-purple-700 border-purple-200" },
                { csvContent: sampleBank, file: "bank_statement_q1_2025.csv", label: "Bank Statement", desc: "42 Q1 transactions", color: "bg-teal-50 text-teal-700 border-teal-200" },
              ].map(s => (
                <button key={s.file} onClick={() => downloadCsvBlob(s.csvContent, s.file)}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition w-full text-left">
                  <Download className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">{s.label}</span>
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${s.color}`}>sample</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Blank Templates
            </div>
            <p className="text-xs text-muted-foreground mb-3">Pre-formatted CSVs with the right column headers.</p>
            <div className="grid grid-cols-2 gap-2">
              {KNOWN_TYPES.map(type => (
                <button key={type} onClick={() => downloadTemplate(type)}
                  className="flex flex-col items-start gap-1 p-2.5 rounded-lg border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition text-left">
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-semibold text-slate-700 leading-tight">{TABLE_LABELS[type]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── History ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <button onClick={() => { setHistoryOpen(!historyOpen); if (!historyOpen) loadHistory(); }}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition rounded-xl">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Import History</span>
            {history.length > 0 && <span className="text-xs text-muted-foreground">({history.length})</span>}
          </div>
          {historyOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {historyOpen && (
          <div className="border-t border-slate-100">
            {historyLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…</div>
            ) : history.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No imports yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {history.slice(0, 10).map(log => (
                  <div key={log.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">{log.fileName}</div>
                      <div className="text-xs text-muted-foreground">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${TABLE_COLORS[log.tableType] ?? TABLE_COLORS.unknown}`}>
                          {TABLE_LABELS[log.tableType] ?? log.tableType}
                        </span>
                        {" · "}{log.importedRows} imported · {fmtDate(log.importedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
