import { useState, useEffect, Fragment } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import {
  CheckCircle2, XCircle, Clock, Users, RefreshCw,
  ArrowLeft, Building2, Mail, DollarSign, ChevronDown, ShieldCheck,
  Database, TrendingUp, Briefcase, Plus, Trash2, Edit2, AlertCircle, Upload
} from "lucide-react";
import BulkImport from "./BulkImport";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ===== ACCESS CONTROL TYPES =====
type Status = "pending" | "approved" | "denied";
type Action = "approve" | "deny" | "revoke";
type AccessTab = "active" | "all" | Status;
type PlatformAccess = "app" | "demo" | "both" | "admin";

interface AccessRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  role: string;
  aum: string;
  message: string;
  status: Status;
  platformAccess: PlatformAccess;
  submittedAt: string;
  reviewedAt: string | null;
}

function PlatformBadge({ access }: { access: PlatformAccess | undefined }) {
  const a = access ?? "demo";
  if (a === "admin") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">Admin Only</span>
  );
  if (a === "both") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">App + Demo</span>
  );
  if (a === "app") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-primary">App Only</span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">Demo</span>
  );
}

// ===== DATA MANAGEMENT TYPES =====
type DataTab = "status" | "companies" | "deals" | "snapshots" | "import";

interface DBStatus {
  companies: number;
  deals: number;
  financialSnapshots: number;
  usingMockData: { companies: boolean; deals: boolean; financialSnapshots: boolean };
}

interface CompanyRow {
  id: string;
  name: string;
  industry: string;
  stage: string;
  revenue: number;
  valuation: number;
  growthRate: number;
  employees: number;
  location: string;
  status: string;
  dataVerified: boolean;
  ndaSigned: boolean;
  founded?: number | null;
  ownership?: string | null;
  arr?: string | null;
  arrGrowthPct?: number | null;
  irr?: string | null;
  moic?: string | null;
  lastValDate?: string | null;
}

interface DealRow {
  id: string;
  companyName: string;
  industry: string;
  dealType: string;
  stage: string;
  dealSize: number;
  valuation: number;
  targetRevenue: number;
  assignedTo: string;
  priority: string;
  closingDate?: string | null;
  ndaSigned: boolean;
  overview: string;
}

interface SnapshotRow {
  id: string;
  period: string;
  revenue: number;
  expenses: number;
  ebitda: number;
  arr: number;
  sortOrder: number;
}

// ===== HELPERS =====
const ROLE_LABELS: Record<string, string> = {
  investor: "Investor / Fund Manager",
  portfolio_company: "Portfolio Company",
  advisor: "Advisor / Consultant",
  other: "Other",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function Avatar({ req }: { req: AccessRequest }) {
  return (
    <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
      {req.firstName.charAt(0)}{req.lastName.charAt(0)}
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-100 text-green-700 text-xs font-semibold">
        <CheckCircle2 className="w-3 h-3" /> Approved
      </span>
    );
  if (status === "denied")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-semibold">
        <XCircle className="w-3 h-3" /> Denied
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

// ===== COMPANY FORM =====
const BLANK_COMPANY = {
  name: "", industry: "", stage: "seed", revenue: "", valuation: "",
  growthRate: "", employees: "", location: "", status: "active",
  dataVerified: false, ndaSigned: false, founded: "", ownership: "",
  arr: "", arrGrowthPct: "", irr: "", moic: "", lastValDate: "",
};

function CompanyForm({ onSave, onCancel, initial }: {
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  initial?: Partial<typeof BLANK_COMPANY>;
}) {
  const [f, setF] = useState({ ...BLANK_COMPANY, ...initial });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        name: f.name,
        industry: f.industry,
        stage: f.stage,
        revenue: Number(f.revenue) || 0,
        valuation: Number(f.valuation) || 0,
        growthRate: Number(f.growthRate) || 0,
        employees: Number(f.employees) || 0,
        location: f.location,
        status: f.status,
        dataVerified: f.dataVerified,
        ndaSigned: f.ndaSigned,
        founded: f.founded ? Number(f.founded) : null,
        ownership: f.ownership || null,
        arr: f.arr || null,
        arrGrowthPct: f.arrGrowthPct ? Number(f.arrGrowthPct) : null,
        irr: f.irr || null,
        moic: f.moic || null,
        lastValDate: f.lastValDate || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
  const sel = inp + " bg-white";
  const lbl = "block text-xs font-semibold text-slate-600 mb-1";

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50/40 border border-blue-100 rounded-xl p-5 mb-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="col-span-2 md:col-span-1">
          <label className={lbl}>Company Name *</label>
          <input required className={inp} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Acme Corp" />
        </div>
        <div>
          <label className={lbl}>Industry</label>
          <input className={inp} value={f.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Fintech" />
        </div>
        <div>
          <label className={lbl}>Stage</label>
          <select className={sel} value={f.stage} onChange={(e) => set("stage", e.target.value)}>
            {["seed", "series_a", "series_b", "series_c", "growth", "pre_ipo"].map((s) => (
              <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Revenue ($)</label>
          <input className={inp} type="number" value={f.revenue} onChange={(e) => set("revenue", e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={lbl}>Valuation ($)</label>
          <input className={inp} type="number" value={f.valuation} onChange={(e) => set("valuation", e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={lbl}>Growth Rate (%)</label>
          <input className={inp} type="number" value={f.growthRate} onChange={(e) => set("growthRate", e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={lbl}>Employees</label>
          <input className={inp} type="number" value={f.employees} onChange={(e) => set("employees", e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={lbl}>Location</label>
          <input className={inp} value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. San Francisco, CA" />
        </div>
        <div>
          <label className={lbl}>Status</label>
          <select className={sel} value={f.status} onChange={(e) => set("status", e.target.value)}>
            {["active", "monitoring", "watchlist", "exited", "inactive"].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Founded</label>
          <input className={inp} type="number" value={f.founded} onChange={(e) => set("founded", e.target.value)} placeholder="2020" />
        </div>
        <div>
          <label className={lbl}>Ownership %</label>
          <input className={inp} value={f.ownership} onChange={(e) => set("ownership", e.target.value)} placeholder="e.g. 18.5%" />
        </div>
        <div>
          <label className={lbl}>ARR</label>
          <input className={inp} value={f.arr} onChange={(e) => set("arr", e.target.value)} placeholder="e.g. $8.4M" />
        </div>
        <div>
          <label className={lbl}>ARR Growth %</label>
          <input className={inp} type="number" value={f.arrGrowthPct} onChange={(e) => set("arrGrowthPct", e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={lbl}>IRR</label>
          <input className={inp} value={f.irr} onChange={(e) => set("irr", e.target.value)} placeholder="e.g. 31.2%" />
        </div>
        <div>
          <label className={lbl}>MOIC</label>
          <input className={inp} value={f.moic} onChange={(e) => set("moic", e.target.value)} placeholder="e.g. 2.4x" />
        </div>
        <div>
          <label className={lbl}>Last Valuation Date</label>
          <input className={inp} value={f.lastValDate} onChange={(e) => set("lastValDate", e.target.value)} placeholder="e.g. Oct 2024" />
        </div>
        <div className="flex items-center gap-4 col-span-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={f.dataVerified} onChange={(e) => set("dataVerified", e.target.checked)} className="rounded" />
            Data Verified
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={f.ndaSigned} onChange={(e) => set("ndaSigned", e.target.checked)} className="rounded" />
            NDA Signed
          </label>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? "Saving…" : "Save Company"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ===== DEAL FORM =====
const BLANK_DEAL = {
  companyName: "", industry: "", dealType: "investment", stage: "sourcing",
  dealSize: "", valuation: "", targetRevenue: "", assignedTo: "",
  priority: "medium", closingDate: "", ndaSigned: false, dataRoomAccess: false,
  overview: "", thesis: "",
};

function DealForm({ onSave, onCancel, initial }: {
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  initial?: Partial<typeof BLANK_DEAL>;
}) {
  const [f, setF] = useState({ ...BLANK_DEAL, ...initial });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        companyName: f.companyName,
        industry: f.industry,
        dealType: f.dealType,
        stage: f.stage,
        dealSize: Number(f.dealSize) || 0,
        valuation: Number(f.valuation) || 0,
        targetRevenue: Number(f.targetRevenue) || 0,
        assignedTo: f.assignedTo,
        priority: f.priority,
        closingDate: f.closingDate || null,
        ndaSigned: f.ndaSigned,
        dataRoomAccess: f.dataRoomAccess,
        overview: f.overview,
        thesis: f.thesis,
      });
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
  const sel = inp + " bg-white";
  const lbl = "block text-xs font-semibold text-slate-600 mb-1";

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50/40 border border-blue-100 rounded-xl p-5 mb-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="col-span-2 md:col-span-1">
          <label className={lbl}>Company Name *</label>
          <input required className={inp} value={f.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="e.g. Meridian Analytics" />
        </div>
        <div>
          <label className={lbl}>Industry</label>
          <input className={inp} value={f.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Data & Analytics" />
        </div>
        <div>
          <label className={lbl}>Deal Type</label>
          <select className={sel} value={f.dealType} onChange={(e) => set("dealType", e.target.value)}>
            {["investment", "acquisition", "merger", "divestiture"].map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Stage</label>
          <select className={sel} value={f.stage} onChange={(e) => set("stage", e.target.value)}>
            {["sourcing", "nda", "due_diligence", "negotiation", "closing", "closed", "passed"].map((s) => (
              <option key={s} value={s}>{s.replace("_", " ").charAt(0).toUpperCase() + s.replace("_", " ").slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Deal Size ($)</label>
          <input className={inp} type="number" value={f.dealSize} onChange={(e) => set("dealSize", e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={lbl}>Valuation ($)</label>
          <input className={inp} type="number" value={f.valuation} onChange={(e) => set("valuation", e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={lbl}>Target Revenue ($)</label>
          <input className={inp} type="number" value={f.targetRevenue} onChange={(e) => set("targetRevenue", e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={lbl}>Assigned To</label>
          <input className={inp} value={f.assignedTo} onChange={(e) => set("assignedTo", e.target.value)} placeholder="e.g. Sarah Chen" />
        </div>
        <div>
          <label className={lbl}>Priority</label>
          <select className={sel} value={f.priority} onChange={(e) => set("priority", e.target.value)}>
            {["low", "medium", "high"].map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Expected Close Date</label>
          <input className={inp} type="date" value={f.closingDate} onChange={(e) => set("closingDate", e.target.value)} />
        </div>
        <div className="col-span-2 md:col-span-3">
          <label className={lbl}>Overview</label>
          <textarea className={inp + " resize-none"} rows={2} value={f.overview} onChange={(e) => set("overview", e.target.value)} placeholder="Brief deal overview…" />
        </div>
        <div className="col-span-2 md:col-span-3">
          <label className={lbl}>Investment Thesis</label>
          <textarea className={inp + " resize-none"} rows={2} value={f.thesis} onChange={(e) => set("thesis", e.target.value)} placeholder="Strategic rationale…" />
        </div>
        <div className="flex items-center gap-4 col-span-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={f.ndaSigned} onChange={(e) => set("ndaSigned", e.target.checked)} className="rounded" />
            NDA Signed
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={f.dataRoomAccess} onChange={(e) => set("dataRoomAccess", e.target.checked)} className="rounded" />
            Data Room Access
          </label>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? "Saving…" : "Save Deal"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ===== SNAPSHOT FORM =====
const BLANK_SNAPSHOT = { period: "", revenue: "", expenses: "", arr: "" };

function SnapshotForm({ onSave, onCancel, nextOrder, initial }: {
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  nextOrder: number;
  initial?: Partial<typeof BLANK_SNAPSHOT>;
}) {
  const [f, setF] = useState({ ...BLANK_SNAPSHOT, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const rev = Number(f.revenue) || 0;
    const exp = Number(f.expenses) || 0;
    try {
      await onSave({
        period: f.period,
        revenue: rev,
        expenses: exp,
        ebitda: rev - exp,
        arr: Number(f.arr) || 0,
        sortOrder: nextOrder,
      });
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
  const lbl = "block text-xs font-semibold text-slate-600 mb-1";

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50/40 border border-blue-100 rounded-xl p-5 mb-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className={lbl}>Period *</label>
          <input required className={inp} value={f.period} onChange={(e) => set("period", e.target.value)} placeholder="e.g. Jan '25" />
        </div>
        <div>
          <label className={lbl}>Revenue ($)</label>
          <input className={inp} type="number" value={f.revenue} onChange={(e) => set("revenue", e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={lbl}>Expenses ($)</label>
          <input className={inp} type="number" value={f.expenses} onChange={(e) => set("expenses", e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className={lbl}>ARR ($)</label>
          <input className={inp} type="number" value={f.arr} onChange={(e) => set("arr", e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? "Saving…" : "Save Snapshot"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ===== MAIN COMPONENT =====
export default function Admin() {
  const { getToken } = useAuth();
  const [, navigate] = useLocation();

  // Top-level section
  const [section, setSection] = useState<"access" | "data">("access");

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // ===== ACCESS CONTROL STATE =====
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [accessTab, setAccessTab] = useState<AccessTab>("active");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingAccessLevel, setPendingAccessLevel] = useState<Record<string, PlatformAccess>>({});

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/access-requests`);
      const data = await res.json() as { requests: AccessRequest[] };
      setRequests(data.requests);
      setLoaded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const act = async (id: string, action: Action, platform?: PlatformAccess) => {
    setActing(id + action);
    try {
      let url = `${API_BASE}/api/admin?id=${encodeURIComponent(id)}&action=${action}`;
      if (platform) url += `&platform=${platform}`;
      const token = adminToken ?? await getToken();
      const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Server error ${res.status}`);
      const updated = JSON.parse(text) as AccessRequest;
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      if (action === "approve") {
        showToast(`✓ ${updated.firstName} ${updated.lastName} approved`, true);
        setAccessTab("active");
      } else if (action === "revoke") {
        showToast(`Access revoked for ${updated.firstName} ${updated.lastName}`, false);
        setAccessTab("pending");
      } else {
        showToast(`${updated.firstName} ${updated.lastName} denied`, false);
      }
    } catch (e) {
      showToast(`Failed: ${(e as Error).message}`, false);
    } finally {
      setActing(null);
    }
  };

  const updateAccess = async (id: string, platform: PlatformAccess) => {
    try {
      const url = `${API_BASE}/api/admin?id=${encodeURIComponent(id)}&action=set-access&platform=${encodeURIComponent(platform)}`;
      const token = adminToken ?? await getToken();
      const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Server error ${res.status}`);
      const updated = JSON.parse(text) as AccessRequest;
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      showToast(`Platform access updated to "${platform}"`, true);
    } catch (e) {
      showToast(`Failed: ${(e as Error).message}`, false);
    }
  };

  // ===== DATA MANAGEMENT STATE =====
  const [dataTab, setDataTab] = useState<DataTab>("status");
  const [dbStatus, setDbStatus] = useState<DBStatus | null>(null);
  const [dbStatusError, setDbStatusError] = useState(false);

  const [dbCompanies, setDbCompanies] = useState<CompanyRow[]>([]);
  const [dbDeals, setDbDeals] = useState<DealRow[]>([]);
  const [dbSnapshots, setDbSnapshots] = useState<SnapshotRow[]>([]);

  const [adminToken, setAdminToken] = useState<string | null>(() => sessionStorage.getItem("ini_admin_token"));
  const [tokenEmail, setTokenEmail] = useState("");
  const [tokenPassword, setTokenPassword] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);

  const loginForToken = async () => {
    setTokenLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tokenEmail, password: tokenPassword }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        showToast(err.error ?? "Login failed", false);
        return;
      }
      const { token } = await res.json() as { token: string };
      setAdminToken(token);
      sessionStorage.setItem("ini_admin_token", token);
      showToast("Admin session started", true);
    } catch (e) {
      showToast(`Login error: ${(e as Error).message}`, false);
    } finally {
      setTokenLoading(false);
    }
  };

  const authHeaders = (extra?: Record<string, string>): Record<string, string> => ({
    "Content-Type": "application/json",
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
    ...extra,
  });

  const [addingCompany, setAddingCompany] = useState(false);
  const [addingDeal, setAddingDeal] = useState(false);
  const [addingSnapshot, setAddingSnapshot] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null);
  const [editingDeal, setEditingDeal] = useState<DealRow | null>(null);
  const [editingSnapshot, setEditingSnapshot] = useState<SnapshotRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDbStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/data/status`);
      if (!res.ok) throw new Error("Not available");
      const data = await res.json() as DBStatus;
      setDbStatus(data);
      setDbStatusError(false);
    } catch {
      setDbStatusError(true);
    }
  };

  const loadDbCompanies = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/data/companies`);
      if (!res.ok) return;
      const data = await res.json() as { companies: CompanyRow[] };
      setDbCompanies(data.companies);
    } catch (e) {
      console.warn("loadDbCompanies failed:", (e as Error).message);
    }
  };

  const loadDbDeals = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/data/deals`);
      if (!res.ok) return;
      const data = await res.json() as { deals: DealRow[] };
      setDbDeals(data.deals);
    } catch (e) {
      console.warn("loadDbDeals failed:", (e as Error).message);
    }
  };

  const loadDbSnapshots = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/data/financial-snapshots`);
      if (!res.ok) return;
      const data = await res.json() as { snapshots: SnapshotRow[] };
      setDbSnapshots(data.snapshots);
    } catch (e) {
      console.warn("loadDbSnapshots failed:", (e as Error).message);
    }
  };

  useEffect(() => {
    if (section === "data") {
      loadDbStatus();
      loadDbCompanies();
      loadDbDeals();
      loadDbSnapshots();
    }
  }, [section]);

  const saveCompany = async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/api/data/companies`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    setAddingCompany(false);
    showToast("Company saved to database", true);
    await Promise.all([loadDbCompanies(), loadDbStatus()]);
  };

  const updateCompany = async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/api/data/companies/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    setEditingCompany(null);
    showToast("Company updated", true);
    await loadDbCompanies();
  };

  const deleteCompany = async (id: string) => {
    if (!confirm("Delete this company from the database?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/data/companies/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast("Company deleted", false);
      await Promise.all([loadDbCompanies(), loadDbStatus()]);
    } catch (e) {
      showToast(`Delete failed: ${(e as Error).message}`, false);
    } finally {
      setDeletingId(null);
    }
  };

  const saveDeal = async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/api/data/deals`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    setAddingDeal(false);
    showToast("Deal saved to database", true);
    await Promise.all([loadDbDeals(), loadDbStatus()]);
  };

  const updateDeal = async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/api/data/deals/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    setEditingDeal(null);
    showToast("Deal updated", true);
    await loadDbDeals();
  };

  const deleteDeal = async (id: string) => {
    if (!confirm("Delete this deal from the database?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/data/deals/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast("Deal deleted", false);
      await Promise.all([loadDbDeals(), loadDbStatus()]);
    } catch (e) {
      showToast(`Delete failed: ${(e as Error).message}`, false);
    } finally {
      setDeletingId(null);
    }
  };

  const saveSnapshot = async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/api/data/financial-snapshots`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    setAddingSnapshot(false);
    showToast("Snapshot saved to database", true);
    await Promise.all([loadDbSnapshots(), loadDbStatus()]);
  };

  const updateSnapshot = async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/api/data/financial-snapshots/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    setEditingSnapshot(null);
    showToast("Snapshot updated", true);
    await loadDbSnapshots();
  };

  const deleteSnapshot = async (id: string) => {
    if (!confirm("Delete this snapshot?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/data/financial-snapshots/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast("Snapshot deleted", false);
      await Promise.all([loadDbSnapshots(), loadDbStatus()]);
    } catch (e) {
      showToast(`Delete failed: ${(e as Error).message}`, false);
    } finally {
      setDeletingId(null);
    }
  };

  // ===== DERIVED ACCESS STATE =====
  const approved = requests.filter((r) => r.status === "approved");
  const pending = requests.filter((r) => r.status === "pending");
  const denied = requests.filter((r) => r.status === "denied");
  const filtered =
    accessTab === "active" ? approved :
    accessTab === "pending" ? pending :
    accessTab === "denied" ? denied :
    requests;
  const accessTabs: { key: AccessTab; label: string; count: number }[] = [
    { key: "active", label: "Active Users", count: approved.length },
    { key: "pending", label: "Pending", count: pending.length },
    { key: "denied", label: "Denied", count: denied.length },
    { key: "all", label: "All", count: requests.length },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${
          toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => navigate("/app")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-black text-slate-900">Admin Panel</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage users and data for the iNi platform</p>
          </div>
        </div>

        {/* Top-level nav */}
        <div className="flex gap-1 mb-6 bg-white border border-slate-100 rounded-xl p-1 w-fit">
          <button onClick={() => setSection("access")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              section === "access" ? "bg-primary text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}>
            <ShieldCheck className="w-4 h-4" /> Access Control
          </button>
          <button onClick={() => setSection("data")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              section === "data" ? "bg-primary text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}>
            <Database className="w-4 h-4" /> Data Management
          </button>
        </div>

        {/* ===== ACCESS CONTROL SECTION ===== */}
        {section === "access" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-slate-100 p-4">
                <div className="text-2xl font-black text-green-600 mb-0.5">{approved.length}</div>
                <div className="text-xs text-muted-foreground">Active Users</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4">
                <div className="text-2xl font-black text-amber-600 mb-0.5">{pending.length}</div>
                <div className="text-xs text-muted-foreground">Pending Review</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4">
                <div className="text-2xl font-black text-slate-900 mb-0.5">{requests.length}</div>
                <div className="text-xs text-muted-foreground">Total Requests</div>
              </div>
            </div>

            <div className="flex justify-end mb-3">
              <button onClick={loadRequests} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-60">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            {loading && (
              <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
                <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-3 animate-spin" />
                <p className="text-muted-foreground text-sm">Loading…</p>
              </div>
            )}

            {!loading && loaded && (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="flex border-b border-slate-100">
                  {accessTabs.map(t => (
                    <button key={t.key} onClick={() => setAccessTab(t.key)}
                      className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                        accessTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}>
                      {t.key === "active" && <ShieldCheck className="w-4 h-4" />}
                      {t.key === "pending" && <Clock className="w-4 h-4" />}
                      {t.label}
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                        accessTab === t.key ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"
                      }`}>{t.count}</span>
                    </button>
                  ))}
                </div>

                {accessTab === "active" && approved.length === 0 && (
                  <div className="p-16 text-center">
                    <ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-700 font-semibold mb-1">No approved users yet</p>
                    <p className="text-muted-foreground text-sm">Approve requests from the Pending tab.</p>
                  </div>
                )}

                {accessTab === "active" && approved.length > 0 && (
                  <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {approved.map(req => (
                        <div key={req.id} className="border border-green-100 bg-green-50/40 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar req={req} />
                              <div>
                                <div className="font-bold text-slate-800 text-sm">{req.firstName} {req.lastName}</div>
                                <div className="text-xs text-muted-foreground">{req.email}</div>
                              </div>
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          </div>
                          {req.company && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                              <Building2 className="w-3 h-3 text-slate-400" /> {req.company}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                            <Users className="w-3 h-3 text-slate-400" /> {ROLE_LABELS[req.role] ?? req.role}
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <PlatformBadge access={req.platformAccess} />
                            <div className="ml-auto flex items-center gap-1.5">
                              <select
                                value={pendingAccessLevel[req.id] ?? req.platformAccess ?? "demo"}
                                onChange={(e) => setPendingAccessLevel(prev => ({ ...prev, [req.id]: e.target.value as PlatformAccess }))}
                                className="text-[10px] border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-600 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30"
                              >
                                <option value="demo">Demo only</option>
                                <option value="app">App only</option>
                                <option value="both">App + Demo</option>
                                <option value="admin">Admin only</option>
                              </select>
                              {pendingAccessLevel[req.id] && pendingAccessLevel[req.id] !== req.platformAccess && (
                                <button
                                  onClick={async () => {
                                    await updateAccess(req.id, pendingAccessLevel[req.id]);
                                    setPendingAccessLevel(prev => { const n = { ...prev }; delete n[req.id]; return n; });
                                  }}
                                  className="text-[10px] bg-primary text-white rounded px-2 py-0.5 font-semibold hover:bg-primary/90 transition-colors"
                                >
                                  Save
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Approved {req.reviewedAt ? timeAgo(req.reviewedAt) : ""}
                            </span>
                            <button onClick={() => act(req.id, "revoke")} disabled={acting === req.id + "revoke"}
                              className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium disabled:opacity-50">
                              {acting === req.id + "revoke" ? "Revoking…" : "Revoke"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {accessTab !== "active" && (
                  <>
                    {filtered.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground text-sm">
                        {accessTab === "pending" && "No pending requests."}
                        {accessTab === "denied" && "No denied requests."}
                        {accessTab === "all" && "No requests yet."}
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Applicant</th>
                            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden sm:table-cell">Role</th>
                            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Status</th>
                            <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden md:table-cell">Submitted</th>
                            <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((req) => (
                            <Fragment key={req.id}>
                              <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                                onClick={() => setExpanded((e) => (e === req.id ? null : req.id))}>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <Avatar req={req} />
                                    <div>
                                      <div className="font-semibold text-slate-800">{req.firstName} {req.lastName}</div>
                                      <div className="text-xs text-muted-foreground">{req.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 hidden sm:table-cell">
                                  <div className="text-xs text-slate-600">{ROLE_LABELS[req.role] ?? req.role}</div>
                                  {req.company && <div className="text-xs text-muted-foreground">{req.company}</div>}
                                </td>
                                <td className="px-4 py-3.5"><StatusBadge status={req.status} /></td>
                                <td className="px-4 py-3.5 text-xs text-muted-foreground hidden md:table-cell">{timeAgo(req.submittedAt)}</td>
                                <td className="px-5 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                    {req.status === "pending" && (
                                      <>
                                        <select
                                          value={pendingAccessLevel[req.id] ?? "demo"}
                                          onChange={(e) => setPendingAccessLevel((p) => ({ ...p, [req.id]: e.target.value as PlatformAccess }))}
                                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30"
                                        >
                                          <option value="demo">Demo</option>
                                          <option value="app">App</option>
                                          <option value="both">App + Demo</option>
                                        </select>
                                        <button onClick={() => act(req.id, "approve", pendingAccessLevel[req.id] ?? "demo")} disabled={!!acting}
                                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                                          <CheckCircle2 className="w-3 h-3" />
                                          {acting === req.id + "approve" ? "…" : "Approve"}
                                        </button>
                                        <button onClick={() => act(req.id, "deny")} disabled={!!acting}
                                          className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                                          <XCircle className="w-3 h-3" />
                                          {acting === req.id + "deny" ? "…" : "Deny"}
                                        </button>
                                      </>
                                    )}
                                    {req.status === "approved" && (
                                      <button onClick={() => act(req.id, "revoke")} disabled={!!acting}
                                        className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors disabled:opacity-50">
                                        {acting === req.id + "revoke" ? "Revoking…" : "Revoke"}
                                      </button>
                                    )}
                                    {req.status === "denied" && (
                                      <button onClick={() => act(req.id, "approve")} disabled={!!acting}
                                        className="text-xs text-green-500 hover:text-green-700 font-medium transition-colors disabled:opacity-50">
                                        {acting === req.id + "approve" ? "…" : "Re-approve"}
                                      </button>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${expanded === req.id ? "rotate-180" : ""}`} />
                                  </div>
                                </td>
                              </tr>
                              {expanded === req.id && (
                                <tr className="border-b border-slate-100 bg-blue-50/30">
                                  <td colSpan={5} className="px-5 py-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                      <div>
                                        <div className="font-semibold text-slate-500 mb-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" /> Company</div>
                                        <div className="text-slate-700">{req.company || "—"}</div>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-slate-500 mb-0.5 flex items-center gap-1"><DollarSign className="w-3 h-3" /> AUM / Revenue</div>
                                        <div className="text-slate-700">{req.aum || "—"}</div>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-slate-500 mb-0.5 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</div>
                                        <a href={`mailto:${req.email}`} className="text-primary hover:underline">{req.email}</a>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-slate-500 mb-0.5">Reviewed</div>
                                        <div className="text-slate-700">{req.reviewedAt ? timeAgo(req.reviewedAt) : "Not yet"}</div>
                                      </div>
                                      {req.message && (
                                        <div className="col-span-2 md:col-span-4">
                                          <div className="font-semibold text-slate-500 mb-0.5">Message</div>
                                          <div className="text-slate-700 italic">"{req.message}"</div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ===== DATA MANAGEMENT SECTION ===== */}
        {section === "data" && (
          <div>
            {dbStatusError && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 text-sm">Data API not available</p>
                  <p className="text-amber-700 text-xs mt-0.5">The API server may not be running. Data management requires the api-server to be active.</p>
                </div>
              </div>
            )}

            {/* Admin API Session Panel */}
            <div className={`mb-5 rounded-xl border p-4 ${adminToken ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}>
              {adminToken ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-semibold text-green-800">Admin API session active</span>
                    <span className="text-xs text-green-600">— mutations are authenticated</span>
                  </div>
                  <button
                    onClick={() => { setAdminToken(null); sessionStorage.removeItem("ini_admin_token"); showToast("Session cleared", false); }}
                    className="text-xs text-green-700 underline hover:no-underline"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-3">Sign in to enable data mutations (Add / Edit / Delete)</p>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-blue-700 font-medium">Email</label>
                      <input
                        type="email"
                        value={tokenEmail}
                        onChange={(e) => setTokenEmail(e.target.value)}
                        placeholder="pitch@inventninvest.com"
                        className="w-full mt-0.5 px-3 py-1.5 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-blue-700 font-medium">Password</label>
                      <input
                        type="password"
                        value={tokenPassword}
                        onChange={(e) => setTokenPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && loginForToken()}
                        placeholder="••••••••"
                        className="w-full mt-0.5 px-3 py-1.5 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <button
                      onClick={loginForToken}
                      disabled={tokenLoading || !tokenEmail || !tokenPassword}
                      className="px-4 py-1.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {tokenLoading ? "..." : "Sign In"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* DB Status Cards */}
            {dbStatus && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className={`bg-white rounded-xl border p-4 ${dbStatus.usingMockData.companies ? "border-amber-200" : "border-green-200"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dbStatus.usingMockData.companies ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                      {dbStatus.usingMockData.companies ? "Mock" : "Live"}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-800">{dbStatus.companies}</div>
                  <div className="text-xs text-muted-foreground">Portfolio Companies</div>
                </div>
                <div className={`bg-white rounded-xl border p-4 ${dbStatus.usingMockData.deals ? "border-amber-200" : "border-green-200"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dbStatus.usingMockData.deals ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                      {dbStatus.usingMockData.deals ? "Mock" : "Live"}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-800">{dbStatus.deals}</div>
                  <div className="text-xs text-muted-foreground">M&A Deals</div>
                </div>
                <div className={`bg-white rounded-xl border p-4 ${dbStatus.usingMockData.financialSnapshots ? "border-amber-200" : "border-green-200"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dbStatus.usingMockData.financialSnapshots ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                      {dbStatus.usingMockData.financialSnapshots ? "Mock" : "Live"}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-800">{dbStatus.financialSnapshots}</div>
                  <div className="text-xs text-muted-foreground">Financial Snapshots</div>
                </div>
              </div>
            )}

            {/* Data sub-tabs */}
            <div className="flex border-b border-slate-200 mb-5 bg-white rounded-t-xl overflow-hidden">
              {([
                { key: "companies" as DataTab, label: "Companies", icon: Building2 },
                { key: "deals" as DataTab, label: "Deals", icon: Briefcase },
                { key: "snapshots" as DataTab, label: "Financial Snapshots", icon: TrendingUp },
                { key: "import" as DataTab, label: "Import Data", icon: Upload },
              ]).map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setDataTab(key)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                    dataTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {/* ---- COMPANIES TAB ---- */}
            {dataTab === "companies" && (
              <div className="bg-white rounded-b-xl rounded-tr-xl border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                  <p className="text-sm text-slate-500">
                    {dbCompanies.length === 0
                      ? "No companies in database — app is using mock data"
                      : `${dbCompanies.length} compan${dbCompanies.length === 1 ? "y" : "ies"} in database`}
                  </p>
                  <button onClick={() => { setEditingCompany(null); setAddingCompany(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Company
                  </button>
                </div>
                <div className="p-5">
                  {addingCompany && (
                    <CompanyForm onSave={saveCompany} onCancel={() => setAddingCompany(false)} />
                  )}
                  {editingCompany && (
                    <CompanyForm
                      initial={{
                        name: editingCompany.name, industry: editingCompany.industry,
                        stage: editingCompany.stage, revenue: String(editingCompany.revenue),
                        valuation: String(editingCompany.valuation), growthRate: String(editingCompany.growthRate),
                        employees: String(editingCompany.employees), location: editingCompany.location,
                        status: editingCompany.status, dataVerified: editingCompany.dataVerified,
                        ndaSigned: editingCompany.ndaSigned, founded: String(editingCompany.founded ?? ""),
                        ownership: editingCompany.ownership ?? "", arr: editingCompany.arr ?? "",
                        arrGrowthPct: String(editingCompany.arrGrowthPct ?? ""),
                        irr: editingCompany.irr ?? "", moic: editingCompany.moic ?? "",
                        lastValDate: editingCompany.lastValDate ?? "",
                      }}
                      onSave={(data) => updateCompany(editingCompany.id, data)}
                      onCancel={() => setEditingCompany(null)}
                    />
                  )}
                  {dbCompanies.length === 0 && !addingCompany ? (
                    <div className="py-10 text-center text-slate-400 text-sm">
                      No real data yet. Click "Add Company" to enter your first portfolio company.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-4">Company</th>
                            <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-4">Industry</th>
                            <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-4">Stage</th>
                            <th className="text-right text-xs font-semibold text-slate-500 py-2 pr-4">Revenue</th>
                            <th className="text-right text-xs font-semibold text-slate-500 py-2 pr-4">Valuation</th>
                            <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-4">Status</th>
                            <th className="text-right text-xs font-semibold text-slate-500 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {dbCompanies.map((c) => (
                            <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="py-2.5 pr-4 font-semibold text-slate-800">{c.name}</td>
                              <td className="py-2.5 pr-4 text-xs text-slate-500">{c.industry}</td>
                              <td className="py-2.5 pr-4 text-xs">{c.stage}</td>
                              <td className="py-2.5 pr-4 text-xs text-right">{fmt$(c.revenue)}</td>
                              <td className="py-2.5 pr-4 text-xs text-right">{fmt$(c.valuation)}</td>
                              <td className="py-2.5 pr-4">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  c.status === "active" ? "bg-green-50 text-green-700" :
                                  c.status === "monitoring" ? "bg-amber-50 text-amber-700" :
                                  "bg-slate-100 text-slate-600"
                                }`}>{c.status}</span>
                              </td>
                              <td className="py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => { setAddingCompany(false); setEditingCompany(c); }}
                                    className="p-1.5 text-slate-300 hover:text-primary transition-colors">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => deleteCompany(c.id)} disabled={deletingId === c.id}
                                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---- DEALS TAB ---- */}
            {dataTab === "deals" && (
              <div className="bg-white rounded-b-xl rounded-tr-xl border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                  <p className="text-sm text-slate-500">
                    {dbDeals.length === 0
                      ? "No deals in database — app is using mock data"
                      : `${dbDeals.length} deal${dbDeals.length === 1 ? "" : "s"} in database`}
                  </p>
                  <button onClick={() => { setEditingDeal(null); setAddingDeal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Deal
                  </button>
                </div>
                <div className="p-5">
                  {addingDeal && (
                    <DealForm onSave={saveDeal} onCancel={() => setAddingDeal(false)} />
                  )}
                  {editingDeal && (
                    <DealForm
                      initial={{
                        companyName: editingDeal.companyName, industry: editingDeal.industry,
                        dealType: editingDeal.dealType, stage: editingDeal.stage,
                        dealSize: String(editingDeal.dealSize), valuation: String(editingDeal.valuation),
                        targetRevenue: String(editingDeal.targetRevenue), assignedTo: editingDeal.assignedTo,
                        priority: editingDeal.priority, closingDate: editingDeal.closingDate ?? "",
                        ndaSigned: editingDeal.ndaSigned, overview: editingDeal.overview,
                      }}
                      onSave={(data) => updateDeal(editingDeal.id, data)}
                      onCancel={() => setEditingDeal(null)}
                    />
                  )}
                  {dbDeals.length === 0 && !addingDeal ? (
                    <div className="py-10 text-center text-slate-400 text-sm">
                      No real data yet. Click "Add Deal" to enter your first M&A deal.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-4">Company</th>
                            <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-4">Type</th>
                            <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-4">Stage</th>
                            <th className="text-right text-xs font-semibold text-slate-500 py-2 pr-4">Deal Size</th>
                            <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-4">Assigned</th>
                            <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-4">Priority</th>
                            <th className="text-right text-xs font-semibold text-slate-500 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {dbDeals.map((d) => (
                            <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="py-2.5 pr-4 font-semibold text-slate-800">{d.companyName}</td>
                              <td className="py-2.5 pr-4 text-xs text-slate-500">{d.dealType}</td>
                              <td className="py-2.5 pr-4 text-xs">{d.stage}</td>
                              <td className="py-2.5 pr-4 text-xs text-right">{fmt$(d.dealSize)}</td>
                              <td className="py-2.5 pr-4 text-xs text-slate-500">{d.assignedTo}</td>
                              <td className="py-2.5 pr-4">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  d.priority === "high" ? "bg-red-50 text-red-700" :
                                  d.priority === "medium" ? "bg-amber-50 text-amber-700" :
                                  "bg-slate-100 text-slate-600"
                                }`}>{d.priority}</span>
                              </td>
                              <td className="py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => { setAddingDeal(false); setEditingDeal(d); }}
                                    className="p-1.5 text-slate-300 hover:text-primary transition-colors">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => deleteDeal(d.id)} disabled={deletingId === d.id}
                                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---- SNAPSHOTS TAB ---- */}
            {dataTab === "snapshots" && (
              <div className="bg-white rounded-b-xl rounded-tr-xl border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                  <p className="text-sm text-slate-500">
                    {dbSnapshots.length === 0
                      ? "No financial snapshots — app is using mock revenue data"
                      : `${dbSnapshots.length} snapshot${dbSnapshots.length === 1 ? "" : "s"} in database`}
                  </p>
                  <button onClick={() => { setEditingSnapshot(null); setAddingSnapshot(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Snapshot
                  </button>
                </div>
                <div className="p-5">
                  {addingSnapshot && (
                    <SnapshotForm onSave={saveSnapshot} onCancel={() => setAddingSnapshot(false)} nextOrder={dbSnapshots.length} />
                  )}
                  {editingSnapshot && (
                    <SnapshotForm
                      initial={{
                        period: editingSnapshot.period,
                        revenue: String(editingSnapshot.revenue),
                        expenses: String(editingSnapshot.expenses),
                        arr: String(editingSnapshot.arr),
                      }}
                      onSave={(data) => updateSnapshot(editingSnapshot.id, data)}
                      onCancel={() => setEditingSnapshot(null)}
                      nextOrder={editingSnapshot.sortOrder}
                    />
                  )}
                  {dbSnapshots.length === 0 && !addingSnapshot ? (
                    <div className="py-10 text-center text-slate-400 text-sm">
                      No real data yet. Add monthly snapshots to power the Revenue Analytics chart.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-4">Period</th>
                            <th className="text-right text-xs font-semibold text-slate-500 py-2 pr-4">Revenue</th>
                            <th className="text-right text-xs font-semibold text-slate-500 py-2 pr-4">Expenses</th>
                            <th className="text-right text-xs font-semibold text-slate-500 py-2 pr-4">EBITDA</th>
                            <th className="text-right text-xs font-semibold text-slate-500 py-2 pr-4">ARR</th>
                            <th className="text-right text-xs font-semibold text-slate-500 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {dbSnapshots.map((s) => (
                            <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="py-2.5 pr-4 font-semibold text-slate-800">{s.period}</td>
                              <td className="py-2.5 pr-4 text-xs text-right">{fmt$(s.revenue)}</td>
                              <td className="py-2.5 pr-4 text-xs text-right">{fmt$(s.expenses)}</td>
                              <td className={`py-2.5 pr-4 text-xs text-right font-medium ${s.ebitda >= 0 ? "text-green-700" : "text-red-600"}`}>
                                {fmt$(Math.abs(s.ebitda))}{s.ebitda < 0 ? " loss" : ""}
                              </td>
                              <td className="py-2.5 pr-4 text-xs text-right">{fmt$(s.arr)}</td>
                              <td className="py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => { setAddingSnapshot(false); setEditingSnapshot(s); }}
                                    className="p-1.5 text-slate-300 hover:text-primary transition-colors">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => deleteSnapshot(s.id)} disabled={deletingId === s.id}
                                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* ---- IMPORT DATA TAB ---- */}
            {dataTab === "import" && (
              <div className="bg-white rounded-b-xl rounded-tr-xl border border-slate-100 p-6">
                <BulkImport />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
