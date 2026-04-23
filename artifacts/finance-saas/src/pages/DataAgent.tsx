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
    throw new Error((d.error as string) ?? resp.statusText ?? `HTTP ${resp.status}`);
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
    const adminToken = sessionStorage.getItem("ini_admin_token");
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
      setError(`Upload failed: ${(e as Error).message}`);
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
      const resp = await fetch(`${API_BASE}/api/import/commit`, {
        method: "POST",
        headers: { ...hdrs, "Content-Type": "application/json" },
        body: JSON.stringify({
          file: base64, fileName: file.name,
          tableType: selectedType !== "unknown" ? selectedType : undefined,
          columnMapping: Object.keys(finalMapping).length ? finalMapping : undefined,
        }),
      });
      await checkRespOk(resp);
      const data: ImportResult = await resp.json();
      setImportResult(data); setTab("result"); loadHistory();
    } catch (e) {
      setError(`Import failed: ${(e as Error).message}`);
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

  const tabs: { id: Tab; label: string; disabled: boolean }[] = [
    { id: "upload", label: "1 · Upload", disabled: false },
    { id: "map", label: "2 · Map & Transform", disabled: !preview },
    { id: "result", label: "3 · Result", disabled: !importResult },
  ];

  const sourceMeta = SOURCE_SYSTEM_META[aiAnalysis?.sourceSystem ?? "unknown"] ?? SOURCE_SYSTEM_META.unknown;
  const levelMeta = DATA_LEVEL_META[aiAnalysis?.dataLevel ?? "summary"];
  const impactedSet = new Set(aiAnalysis?.dashboardsImpacted ?? []);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Data Agent</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload data from any source — QuickBooks, HubSpot, Salesforce, Gusto, bank exports, or custom CSVs. The agent detects the source system, plans the transformations, and shows exactly which dashboards will be refreshed.
        </p>
      </div>

      <div className="flex items-center gap-0 bg-white border border-slate-200 rounded-xl overflow-hidden w-fit shadow-sm">
        {tabs.map((t, i) => (
          <button key={t.id} onClick={() => !t.disabled && setTab(t.id)} disabled={t.disabled}
            className={`px-5 py-2.5 text-sm font-medium transition-colors
              ${t.id === tab ? "bg-primary text-white" : t.disabled ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:bg-slate-50"}
              ${i > 0 ? "border-l border-slate-200" : ""}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
        </div>
      )}

      {/* ── UPLOAD TAB ─────────────────────────────────────────────────────────── */}
      {tab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            {previewing ? (
              <div className="border-2 border-dashed border-primary/40 rounded-2xl p-12 text-center bg-primary/5">
                <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin mb-3" />
                <div className="font-semibold text-slate-700">Reading {file?.name}…</div>
                <div className="text-sm text-muted-foreground mt-1">Detecting structure and column types</div>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                  ${dragging ? "border-primary bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"}`}>
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <Upload className="w-8 h-8 text-primary/70" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-700">Drop your file here or click to browse</p>
                    <p className="text-sm text-muted-foreground mt-1">CSV or Excel (.xlsx, .xls) — up to 10,000 rows, 20 MB</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 text-xs">
                    {["QuickBooks GL", "HubSpot Deals", "Salesforce Opps", "Gusto Payroll", "Bank Statement", "Custom CSV"].map(s => (
                      <span key={s} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">{s}</span>
                    ))}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>The agent auto-detects the source system (ERP, CRM, HR, banking) and granularity (transaction vs summary), then plans the transformations needed before the data can feed your dashboards.</span>
            </div>

            {/* Sample data downloads */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Try with sample data
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Download a realistic test file — each one exercises different detection and transformation paths.
              </p>
              <div className="space-y-2">
                {[
                  {
                    csvContent: sampleQuickbooksGl,
                    file: "quickbooks_gl_jan_mar_2025.csv",
                    label: "QuickBooks General Ledger",
                    desc: "32 journal entries (Jan–Mar 2025) → rolled up to 3 monthly P&L rows",
                    badge: "ERP · Transaction-level",
                    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    impact: "Finance P&L · Cash Flow · Expenses",
                  },
                  {
                    csvContent: sampleHubspot,
                    file: "hubspot_deal_pipeline_q1_2025.csv",
                    label: "HubSpot Deal Pipeline",
                    desc: "12 active deals across all M&A stages — Sourcing → LOI Signed",
                    badge: "CRM · Summary-level",
                    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
                    impact: "M&A Support · Sales · Portfolio",
                  },
                  {
                    csvContent: sampleGusto,
                    file: "gusto_payroll_export_q1_2025.csv",
                    label: "Gusto Payroll Export",
                    desc: "27 employees across 6 departments with comp, tenure, and diversity data",
                    badge: "HR · Transaction-level",
                    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
                    impact: "People · Operations",
                  },
                  {
                    csvContent: sampleBank,
                    file: "bank_statement_q1_2025.csv",
                    label: "Bank Statement",
                    desc: "42 transactions (Q1 2025) — revenue deposits, payroll, vendors, rent",
                    badge: "Banking · Transaction-level",
                    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
                    impact: "Cash Flow · Expenses",
                  },
                ].map(s => (
                  <button
                    key={s.file}
                    onClick={() => downloadCsvBlob(s.csvContent, s.file)}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all group w-full text-left"
                  >
                    <Download className="w-4 h-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs font-semibold text-slate-800">{s.label}</span>
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${s.badgeColor}`}>{s.badge}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                      <p className="text-[10px] text-primary/70 font-medium mt-0.5">Impacts: {s.impact}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="text-sm font-semibold text-slate-700 mb-1">Download Templates</div>
              <p className="text-xs text-muted-foreground mb-3">Pre-formatted templates with the correct column names.</p>
              <div className="grid grid-cols-2 gap-2">
                {KNOWN_TYPES.map(type => (
                  <button key={type} onClick={e => { e.stopPropagation(); downloadTemplate(type); }}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-slate-100 hover:border-primary/30 hover:bg-slate-50 transition-colors text-center group">
                    <Download className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-medium text-slate-700 leading-tight">{TABLE_LABELS[type]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" /> Platform Data Flow
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                {[
                  { src: "QuickBooks GL", arrow: "→", dst: "Finance P&L, Cash Flow, Expenses" },
                  { src: "HubSpot / Salesforce", arrow: "→", dst: "M&A, Sales, Marketing, Portfolio" },
                  { src: "Gusto / HR exports", arrow: "→", dst: "People, Operations dashboards" },
                  { src: "Bank statements", arrow: "→", dst: "Cash Flow, Expenses dashboards" },
                  { src: "Portfolio CSVs", arrow: "→", dst: "Portfolio, Executive Summary" },
                ].map(row => (
                  <div key={row.src} className="flex items-start gap-1.5">
                    <span className="font-medium text-slate-700 shrink-0">{row.src}</span>
                    <span className="text-primary">{row.arrow}</span>
                    <span className="text-muted-foreground">{row.dst}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button onClick={() => { setHistoryOpen(v => !v); if (!historyOpen) loadHistory(); }}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                <span className="flex items-center gap-2"><History className="w-4 h-4 text-muted-foreground" /> Import History</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${historyOpen ? "rotate-180" : ""}`} />
              </button>
              {historyOpen && (
                <div className="border-t border-slate-100">
                  {historyLoading ? (
                    <div className="flex items-center gap-2 px-4 py-4 text-xs text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                    </div>
                  ) : history.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-muted-foreground text-center">No imports yet.</div>
                  ) : (
                    <table className="w-full text-xs">
                      <tbody>
                        {history.slice(0, 8).map(log => (
                          <tr key={log.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                            <td className="px-3 py-2 text-slate-700 font-medium truncate max-w-[90px]">{log.fileName}</td>
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${TABLE_COLORS[log.tableType] ?? TABLE_COLORS.unknown}`}>
                                {TABLE_LABELS[log.tableType] ?? log.tableType}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-600"><span className="text-green-600 font-semibold">{log.importedRows}</span></td>
                            <td className="px-3 py-2 text-muted-foreground">{fmtDate(log.importedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MAP & TRANSFORM TAB ────────────────────────────────────────────────── */}
      {tab === "map" && preview && (
        <div className="space-y-4">
          {/* File info bar */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex items-center gap-3">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-slate-800">{file?.name}</span>
              <span className="text-xs text-muted-foreground ml-2">{preview.rowCount.toLocaleString()} rows · {preview.rawHeaders.length} columns</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {analyzing && !aiAnalyzed && (
                <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing with AI…
                </span>
              )}
              {(!analyzing || aiAnalyzed) && (
                <button onClick={runAiAnalysis} disabled={analyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50 border border-primary/20">
                  {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {aiAnalyzed ? "Re-analyze" : "Analyze with AI"}
                </button>
              )}
              <button onClick={reset} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />New file
              </button>
            </div>
          </div>

          {/* ── AI ANALYSIS IN PROGRESS ── */}
          {analyzing && !aiAnalyzed && (
            <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-1">Analyzing your data…</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  The AI is detecting the source system, classifying columns, and building a transformation plan. This takes about 30–60 seconds.
                </p>
              </div>
              <div className="flex gap-1.5">
                {["Identifying source", "Mapping columns", "Planning transformations", "Scoring dashboards"].map((step, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] text-primary font-medium animate-pulse"
                    style={{ animationDelay: `${i * 0.3}s` }}>{step}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── INTELLIGENCE CARD (shown after AI analysis) ── */}
          {aiAnalyzed && aiAnalysis && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-start gap-4 flex-wrap">
                  {/* Source system badge */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Source System</div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${sourceMeta.bg} ${sourceMeta.color}`}>
                      <Database className="w-3.5 h-3.5" />
                      {aiAnalysis.sourceName ?? sourceMeta.label}
                      <span className="opacity-60 text-[10px]">({sourceMeta.category})</span>
                    </span>
                  </div>
                  {/* Data level badge */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Data Level</div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${levelMeta.color}`}>
                      {aiAnalysis.dataLevel === "transaction" ? <Activity className="w-3.5 h-3.5" /> : <BarChart2 className="w-3.5 h-3.5" />}
                      {levelMeta.label}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">{levelMeta.desc}</p>
                  </div>
                  {/* Target tables */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Target Tables</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(aiAnalysis.targetTables ?? [aiAnalysis.detectedTableType]).map(t => (
                        <span key={t} className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${TABLE_COLORS[t] ?? TABLE_COLORS.unknown}`}>
                          {TABLE_LABELS[t] ?? t}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Confidence */}
                  <div className="ml-auto text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Detection Confidence</div>
                    <div className="text-2xl font-bold text-slate-800">{aiAnalysis.confidence}%</div>
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 ml-auto">
                      <div className={`h-full rounded-full ${aiAnalysis.confidence >= 80 ? "bg-green-500" : aiAnalysis.confidence >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${aiAnalysis.confidence}%` }} />
                    </div>
                  </div>
                </div>
                {aiAnalysis.dataLevelExplanation && (
                  <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />
                    {aiAnalysis.dataLevelExplanation}
                  </p>
                )}
              </div>

              {/* Dashboard Impact Grid */}
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Dashboard Impact — {impactedSet.size} of {ALL_DASHBOARDS.length} dashboards will refresh
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                  {ALL_DASHBOARDS.map(({ name, icon: Icon }) => {
                    const impacted = impactedSet.has(name);
                    return (
                      <div key={name}
                        className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl border text-center transition-all
                          ${impacted
                            ? "border-primary/30 bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10"
                            : "border-slate-100 bg-slate-50/50 text-slate-300"}`}>
                        <Icon className={`w-4 h-4 ${impacted ? "text-primary" : "text-slate-300"}`} />
                        <span className={`text-[10px] font-semibold leading-tight ${impacted ? "text-slate-700" : "text-slate-300"}`}>
                          {name}
                        </span>
                        {impacted && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="px-5 py-3">
                <p className="text-xs text-slate-600 leading-relaxed">{aiAnalysis.summary}</p>
              </div>
            </div>
          )}

          {/* ── TRANSFORMATION PLAN ── */}
          {aiAnalyzed && aiAnalysis && (aiAnalysis.transformationPlan ?? []).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowTransformPlan(v => !v)}
                className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Wand2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-slate-800">Transformation Plan</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {aiAnalysis.transformationPlan.length} step{aiAnalysis.transformationPlan.length > 1 ? "s" : ""}
                  </span>
                  {aiAnalysis.transformationPlan.filter(t => t.required).length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                      {aiAnalysis.transformationPlan.filter(t => t.required).length} required
                    </span>
                  )}
                </div>
                {showTransformPlan ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {showTransformPlan && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {aiAnalysis.transformationPlan.sort((a, b) => a.priority - b.priority).map((step, i) => (
                    <div key={step.id} className="px-5 py-3 flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-slate-800">{step.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${step.required ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                            {step.required ? "Required" : "Optional"}
                          </span>
                          <code className="text-[10px] font-mono text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded">{step.id}</code>
                        </div>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                  <div className="px-5 py-3 flex items-center justify-between bg-slate-50/50">
                    <p className="text-xs text-muted-foreground">Preview the transformed data before importing to the database</p>
                    <button onClick={runTransformPreview} disabled={transforming}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors disabled:opacity-60 shrink-0">
                      {transforming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                      {transforming ? "Transforming…" : "Preview Transformed Data"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TRANSFORM PREVIEW ── */}
          {showTransformPreview && transformResult && (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-emerald-100 bg-emerald-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-800">Transformed Data Preview</span>
                  <span className="text-xs text-muted-foreground">
                    {transformResult.rowsIn} rows in → {transformResult.rowsOut} rows out
                  </span>
                </div>
                <button onClick={() => setShowTransformPreview(false)} className="text-xs text-muted-foreground hover:text-slate-700">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-3 border-b border-slate-100 space-y-1.5">
                {transformResult.transformationLog.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />{log}
                  </div>
                ))}
                {transformResult.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{w}
                  </div>
                ))}
              </div>
              {transformResult.transformedRows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {Object.keys(transformResult.transformedRows[0]).map(k => (
                          <th key={k} className="text-left px-4 py-2 font-semibold text-slate-500 whitespace-nowrap">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transformResult.transformedRows.slice(0, 8).map((row, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-4 py-2 text-slate-700 whitespace-nowrap max-w-[160px] truncate">{String(val ?? "—")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="px-5 py-3 bg-emerald-50/30 border-t border-emerald-100">
                <p className="text-xs text-emerald-700 font-medium">{transformResult.summary}</p>
              </div>
            </div>
          )}

          {/* Data type selector */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="text-sm font-semibold text-slate-700 mb-2">Target Database Table</div>
            <div className="flex flex-wrap gap-2">
              {KNOWN_TYPES.map(type => (
                <button key={type} onClick={() => handleTypeChange(type)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
                    ${selectedType === type ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20" : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
                  {TABLE_LABELS[type]}
                </button>
              ))}
            </div>
            {selectedType === "unknown" && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Select a target table above to enable import.
              </p>
            )}
          </div>

          {/* Mappings + Chat */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 space-y-4">
              {!aiAnalyzed ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">Column Mapping</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Map columns manually or use AI for smart suggestions.</p>
                    </div>
                    <button onClick={runAiAnalysis} disabled={analyzing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 shrink-0">
                      {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {analyzing ? "Analyzing…" : "Analyze with AI"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {preview.rawHeaders.map((raw, idx) => {
                      const mapped = columnMapping[raw] ?? "";
                      const isRequired = effectiveFields.required.some(r => r === mapped);
                      const available = effectiveFields.all;
                      const usedByOther = new Set(Object.entries(columnMapping).filter(([k, v]) => k !== raw && v).map(([, v]) => v));
                      return (
                        <div key={idx} className="grid grid-cols-[1fr_24px_1fr] items-center gap-1">
                          <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono truncate
                            ${mapped ? "border-primary/30 bg-primary/5 text-slate-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                            {raw}
                          </div>
                          <ArrowRight className={`w-3.5 h-3.5 shrink-0 mx-auto ${mapped ? "text-primary" : "text-slate-300"}`} />
                          <select value={mapped}
                            onChange={e => {
                              const v = e.target.value;
                              setColumnMapping(prev => {
                                const next = { ...prev };
                                if (v) { for (const [k, val] of Object.entries(next)) { if (k !== raw && val === v) next[k] = ""; } }
                                next[raw] = v; return next;
                              });
                            }}
                            disabled={selectedType === "unknown"}
                            className={`w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white disabled:bg-slate-50 disabled:text-slate-400 font-mono transition-colors
                              ${isRequired ? "border-green-400 text-green-800 bg-green-50" : mapped ? "border-primary/30 text-slate-700" : "border-slate-200 text-slate-400"}`}>
                            <option value="">— skip —</option>
                            {available.map(field => (
                              <option key={field} value={field} disabled={usedByOther.has(field) && mapped !== field}>
                                {field}{usedByOther.has(field) ? " (used)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">AI-Suggested Mappings</h3>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${TABLE_COLORS[aiAnalysis?.detectedTableType ?? "unknown"]}`}>
                        {TABLE_LABELS[aiAnalysis?.detectedTableType ?? "unknown"]} · {aiAnalysis?.confidence}%
                      </span>
                      <button onClick={() => { setAiAnalyzed(false); setAiMappings([]); }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors">Manual</button>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500">
                        <th className="text-left px-4 py-2">Source Column</th>
                        <th className="text-left px-4 py-2">Maps to</th>
                        <th className="text-left px-4 py-2 hidden md:table-cell">Override</th>
                        <th className="text-left px-4 py-2 hidden lg:table-cell">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiMappings.map(m => (
                        <tr key={m.sourceColumn} className={`border-b border-slate-50 ${m.skip ? "opacity-50" : ""}`}>
                          <td className="px-4 py-2">
                            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{m.sourceColumn}</span>
                            {m.userOverride && <span className="ml-1.5 text-[10px] text-primary font-semibold">edited</span>}
                          </td>
                          <td className="px-4 py-2">
                            {m.skip
                              ? <span className="text-xs text-muted-foreground italic">skipped</span>
                              : <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${m.targetField ? "bg-primary/10 text-primary" : "text-muted-foreground italic"}`}>
                                  {m.targetField ?? "—"}
                                </span>
                            }
                          </td>
                          <td className="px-4 py-2 hidden md:table-cell">
                            <select value={m.skip ? "__skip__" : (m.targetField ?? "")}
                              onChange={e => {
                                const v = e.target.value;
                                if (v === "__skip__") updateAiMapping(m.sourceColumn, null, true);
                                else updateAiMapping(m.sourceColumn, v || null, false);
                              }}
                              className="border border-slate-200 rounded px-1.5 py-1 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-primary/30">
                              <option value="__skip__">— skip —</option>
                              {effectiveFields.all.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${m.confidence >= 80 ? "bg-green-500" : m.confidence >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                                  style={{ width: `${m.confidence}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{m.confidence}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {aiAnalyzed && aiAnalysis && aiAnalysis.qualityIssues?.length > 0 && (() => {
                const openIssues = aiAnalysis.qualityIssues.filter((_, i) => !resolvedIssues.has(i));
                const resolvedCount = resolvedIssues.size;
                if (openIssues.length === 0 && resolvedCount === 0) return null;
                return (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        Data Quality Issues
                        {openIssues.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{openIssues.length} open</span>
                        )}
                        {resolvedCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">{resolvedCount} resolved</span>
                        )}
                      </h3>
                      {resolvedCount > 0 && openIssues.length === 0 && (
                        <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> All issues resolved
                        </span>
                      )}
                    </div>
                    {openIssues.length > 0 && (
                      <div className="divide-y divide-slate-50">
                        {aiAnalysis.qualityIssues.map((issue, i) => {
                          if (resolvedIssues.has(i)) return null;
                          const canSkip = aiMappings.some(m => m.sourceColumn === issue.column);
                          return (
                            <div key={i} className="px-4 py-3.5 space-y-2">
                              <div className="flex items-start gap-2.5">
                                <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide shrink-0 mt-0.5 ${SEVERITY_COLORS[issue.severity]}`}>
                                  {issue.severity}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-700 font-medium">
                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded mr-1.5">{issue.column}</span>
                                    {issue.issue}
                                  </p>
                                </div>
                              </div>
                              <div className={`ml-8 pl-3 border-l-2 py-1 rounded-r ${issue.severity === "high" ? "border-red-300 bg-red-50/50" : issue.severity === "medium" ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-slate-50/50"}`}>
                                <p className="text-[11px] text-slate-600 font-medium">Recommended fix:</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{issue.recommendation}</p>
                              </div>
                              <div className="ml-8 flex items-center gap-2 flex-wrap">
                                {canSkip && (
                                  <button
                                    onClick={() => {
                                      updateAiMapping(issue.column, null, true);
                                      setResolvedIssues(prev => new Set([...prev, i]));
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-xs text-slate-600 font-medium transition-colors"
                                  >
                                    <XCircle className="w-3 h-3" /> Skip column
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setChatInput(`Tell me more about the data quality issue with "${issue.column}" — ${issue.issue}`);
                                    chatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-xs text-primary font-medium transition-colors"
                                >
                                  <Bot className="w-3 h-3" /> Ask agent
                                </button>
                                <button
                                  onClick={() => setResolvedIssues(prev => new Set([...prev, i]))}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-50 hover:bg-green-100 text-xs text-green-700 font-medium transition-colors border border-green-200"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Mark fixed
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center justify-between pt-1">
                <button onClick={() => setTab("upload")} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={runImport} disabled={importing || selectedType === "unknown"}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {importing ? "Importing…" : "Import to Database"}
                </button>
              </div>
            </div>

            {/* Chat panel */}
            <div className="lg:col-span-2" ref={chatPanelRef}>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[560px] sticky top-4">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-slate-800">Data Agent</h3>
                  {!aiAnalyzed && <span className="ml-auto text-[10px] text-muted-foreground italic">Click "Analyze with AI" first</span>}
                  {aiAnalyzed && (
                    <span className="ml-auto text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Active
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {!aiAnalyzed && chat.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-4">
                      <Sparkles className="w-8 h-8 text-slate-200" />
                      <p className="text-xs text-muted-foreground">Click "Analyze with AI" to detect your data source, plan transformations, and get smart mapping suggestions.</p>
                    </div>
                  )}
                  {chat.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs
                        ${msg.role === "user" ? "bg-primary text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"}`}>
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {msg.content.replace(/```json[\s\S]*?```/g, "").replace(/\*\*(.*?)\*\*/g, "$1").trim()}
                        </div>
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.actions.map((a, j) => (
                              <div key={j} className="flex items-center gap-1.5 px-2 py-1 bg-white/80 rounded text-[10px] text-slate-600">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                {a.action === "skip" ? `Skipped "${a.source}"` : `Mapped "${a.source}" → "${a.target}"`}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="px-3 py-3 border-t border-slate-100">
                  <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-colors
                    ${!aiAnalyzed ? "bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed" : "bg-slate-50 border-slate-200 focus-within:border-primary/50 focus-within:bg-white"}`}>
                    <input value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && aiAnalyzed) { e.preventDefault(); sendChat(); } }}
                      placeholder={aiAnalyzed ? "Ask about mappings, transformations, dashboard impact…" : "Analyze with AI first…"}
                      disabled={!aiAnalyzed || chatLoading}
                      className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed" />
                    <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading || !aiAnalyzed}
                      className="p-1 text-primary hover:text-primary/80 transition-colors disabled:opacity-40">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULT TAB ─────────────────────────────────────────────────────────── */}
      {tab === "result" && (
        <div className="max-w-2xl space-y-4">
          {importResult && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                {importResult.errored === 0
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  : <AlertCircle className="w-6 h-6 text-amber-500" />}
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    {importResult.errored === 0 ? "Import Complete" : "Import Finished with Warnings"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {importResult.imported} imported · {importResult.skipped} skipped · {importResult.errored} errors
                  </p>
                </div>
              </div>

              {aiAnalysis && impactedSet.size > 0 && (
                <div className="px-6 py-4 border-b border-slate-100 bg-emerald-50/30">
                  <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Dashboards now updated with your {aiAnalysis.sourceName ?? "imported"} data:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(impactedSet).map(d => (
                      <span key={d} className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold">{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="px-6 py-4 space-y-1.5">
                  {importResult.errors.slice(0, 10).map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-red-700">
                      <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>Row {err.row}: {err.message}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="px-6 py-4 flex items-center gap-3">
                <button onClick={reset}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
                  <RefreshCw className="w-4 h-4" /> Import another file
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
