import { useState, useEffect, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import {
  User, LogOut, Plug, Shield, Bell, RefreshCw, Mail,
  CheckCircle2, XCircle, AlertCircle, Edit2, Save, X,
  ExternalLink, Loader2, Unplug
} from "lucide-react";
import { useUser, useClerk, useAuth } from "@clerk/clerk-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface IntegrationStatus {
  provider: string;
  displayName: string;
  status: "connected" | "disconnected";
  lastSyncAt: string | null;
  connectionId: string | null;
  configured: boolean;
}

const PROVIDER_META: Record<string, { icon: string; category: string; desc: string; authType: "oauth" | "apikey" | "sheets" }> = {
  quickbooks: { icon: "💼", category: "Accounting", desc: "Sync P&L, cash flow, and chart of accounts", authType: "oauth" },
  hubspot: { icon: "🔶", category: "CRM", desc: "Pipeline, revenue, and contact management", authType: "oauth" },
  stripe: { icon: "💳", category: "Payments", desc: "Revenue, MRR, churn, and subscription data", authType: "apikey" },
  sheets: { icon: "📊", category: "Spreadsheets", desc: "Import financials, companies, and deals from sheets", authType: "sheets" },
  gusto: { icon: "👥", category: "HR / Payroll", desc: "Headcount, payroll, and department data", authType: "oauth" },
};

const DEMO_INTEGRATIONS = [
  { id: "salesforce", name: "Salesforce CRM", category: "CRM", icon: "☁️", status: "connected", lastSync: "15 min ago", desc: "Pipeline and customer data" },
  { id: "slack", name: "Slack", category: "Notifications", icon: "💬", status: "connected", lastSync: "Active", desc: "Alerts and notifications" },
  { id: "carta", name: "Carta", category: "Cap Table", icon: "📑", status: "connected", lastSync: "Daily", desc: "Equity and cap table" },
  { id: "plaid", name: "Plaid", category: "Banking", icon: "🏦", status: "not_connected", lastSync: null, desc: "Bank account aggregation" },
  { id: "netsuite", name: "NetSuite ERP", category: "ERP", icon: "🔷", status: "not_connected", lastSync: null, desc: "Enterprise financials" },
  { id: "jira", name: "Jira", category: "Product", icon: "🎯", status: "not_connected", lastSync: null, desc: "Sprint velocity and roadmap" },
  { id: "looker", name: "Looker / BigQuery", category: "Data Warehouse", icon: "📐", status: "not_connected", lastSync: null, desc: "Custom BI integration" },
];

type Tab = "integrations" | "profile" | "notifications" | "security";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} hr ago`;
  return d.toLocaleDateString();
}

export default function Settings() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/settings/:tab");
  const activeTab: Tab = (params?.tab as Tab) || "profile";

  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();

  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loadingInts, setLoadingInts] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "connected" | "not_connected">("all");
  const [flashMsg, setFlashMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [stripeModal, setStripeModal] = useState(false);
  const [stripeKey, setStripeKey] = useState("");
  const [stripeError, setStripeError] = useState("");

  const [sheetsModal, setSheetsModal] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [sheetsTab, setSheetsTab] = useState("Sheet1");
  const [sheetsError, setSheetsError] = useState("");

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.fullName ?? "", email: user?.primaryEmailAddress?.emailAddress ?? "", company: "", role: "Investor / Fund Manager" });
  const [saved, setSaved] = useState(false);

  const adminToken = sessionStorage.getItem("ini_admin_token");

  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({ ...prev, name: user.fullName ?? prev.name, email: user.primaryEmailAddress?.emailAddress ?? prev.email }));
    }
  }, [user]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const connected = q.get("connected");
    const error = q.get("error");
    if (connected) {
      setFlashMsg({ type: "success", text: `Successfully connected ${PROVIDER_META[connected]?.category ?? connected}!` });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (error) {
      setFlashMsg({ type: "error", text: `Connection failed: ${error.replace(/_/g, " ")}` });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const loadIntegrations = useCallback(async () => {
    setLoadingInts(true);
    try {
      const resp = await fetch(`${API_BASE}/api/integrations`);
      if (resp.ok) setIntegrations(await resp.json());
    } catch {
    } finally {
      setLoadingInts(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "integrations") loadIntegrations();
  }, [activeTab, loadIntegrations]);

  const getAuthHeader = useCallback(async (): Promise<Record<string, string>> => {
    if (adminToken) return { Authorization: `Bearer ${adminToken}` };
    const token = await getToken();
    if (token) return { Authorization: `Bearer ${token}` };
    return {};
  }, [adminToken, getToken]);

  const handleSync = async (provider: string) => {
    setSyncing(provider);
    try {
      const headers = await getAuthHeader();
      const resp = await fetch(`${API_BASE}/api/integrations/${provider}/sync`, { method: "POST", headers });
      const data = await resp.json() as { ok?: boolean; error?: string; recordsSynced?: number };
      if (!resp.ok) throw new Error(data.error ?? "Sync failed");
      setFlashMsg({ type: "success", text: `${PROVIDER_META[provider]?.category ?? provider} synced — ${data.recordsSynced ?? 0} records updated` });
      await loadIntegrations();
    } catch (err) {
      setFlashMsg({ type: "error", text: (err as Error).message });
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Disconnect ${PROVIDER_META[provider]?.category ?? provider}? This will stop data syncing.`)) return;
    setDisconnecting(provider);
    try {
      const headers = await getAuthHeader();
      const resp = await fetch(`${API_BASE}/api/integrations/${provider}`, { method: "DELETE", headers });
      if (!resp.ok) throw new Error("Disconnect failed");
      setFlashMsg({ type: "success", text: `${provider} disconnected` });
      await loadIntegrations();
    } catch (err) {
      setFlashMsg({ type: "error", text: (err as Error).message });
    } finally {
      setDisconnecting(null);
    }
  };

  const handleOAuthConnect = async (provider: string) => {
    setConnecting(provider);
    try {
      const headers = await getAuthHeader();
      const resp = await fetch(`${API_BASE}/api/integrations/${provider}/oauth-url`, { headers });
      const data = await resp.json() as { url?: string; error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Could not get OAuth URL");
      window.location.href = data.url!;
    } catch (err) {
      setFlashMsg({ type: "error", text: (err as Error).message });
      setConnecting(null);
    }
  };

  const handleStripeConnect = async () => {
    if (!stripeKey.trim()) { setStripeError("API key is required"); return; }
    setConnecting("stripe");
    setStripeError("");
    try {
      const headers = await getAuthHeader();
      const resp = await fetch(`${API_BASE}/api/integrations/stripe/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ apiKey: stripeKey.trim() }),
      });
      const data = await resp.json() as { ok?: boolean; error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Connection failed");
      setStripeModal(false);
      setStripeKey("");
      setFlashMsg({ type: "success", text: "Stripe connected successfully!" });
      await loadIntegrations();
    } catch (err) {
      setStripeError((err as Error).message);
    } finally {
      setConnecting(null);
    }
  };

  const handleSheetsConnect = async () => {
    if (!sheetsUrl.trim()) { setSheetsError("Spreadsheet URL is required"); return; }
    setConnecting("sheets");
    setSheetsError("");
    try {
      const headers = await getAuthHeader();
      const resp = await fetch(`${API_BASE}/api/integrations/sheets/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ spreadsheetUrl: sheetsUrl.trim(), sheetName: sheetsTab.trim() || "Sheet1" }),
      });
      const data = await resp.json() as { ok?: boolean; error?: string; tableType?: string; rowCount?: number };
      if (!resp.ok) throw new Error(data.error ?? "Connection failed");
      setSheetsModal(false);
      setSheetsUrl("");
      setSheetsTab("Sheet1");
      setFlashMsg({ type: "success", text: `Google Sheets connected — ${data.rowCount ?? 0} rows detected (${data.tableType ?? "unknown"} format)` });
      await loadIntegrations();
    } catch (err) {
      setSheetsError((err as Error).message);
    } finally {
      setConnecting(null);
    }
  };

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const handleSaveProfile = () => {
    localStorage.setItem("ini_user", JSON.stringify({ ...user, ...profileForm }));
    setEditingProfile(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const isAdmin = Boolean(adminToken || user?.primaryEmailAddress?.emailAddress?.match(/venu\.vegi|pitch@inventninvest/));

  const liveConnectedCount = integrations.filter(i => i.status === "connected").length;
  const totalCount = integrations.length + DEMO_INTEGRATIONS.length;
  const demoConnectedCount = DEMO_INTEGRATIONS.filter(i => i.status === "connected").length;
  const connectedCount = liveConnectedCount + demoConnectedCount;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "User Profile", icon: <User className="w-4 h-4" /> },
    { id: "integrations", label: "Integrations", icon: <Plug className="w-4 h-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your account, integrations, and preferences</p>
      </div>

      {flashMsg && (
        <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${flashMsg.type === "success" ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"}`}>
          {flashMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {flashMsg.text}
          <button onClick={() => setFlashMsg(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="flex gap-6 items-start">
        <div className="w-52 shrink-0">
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => navigate(`/settings/${tab.id}`)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-slate-50 last:border-0 ${activeTab === tab.id ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
          {activeTab === "integrations" && (
            <div className="mt-3 bg-white rounded-xl border border-slate-100 p-4 text-center">
              <div className="text-2xl font-black text-primary">{connectedCount}</div>
              <div className="text-xs text-muted-foreground">of {totalCount} connected</div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">

          {/* ── Profile ── */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              {saved && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4" /> Profile updated successfully.
                </div>
              )}
              <div className="bg-white rounded-xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-black text-slate-900">Account Information</h2>
                  {!editingProfile ? (
                    <button onClick={() => setEditingProfile(true)} className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setEditingProfile(false)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-foreground">
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                      <button onClick={handleSaveProfile} className="flex items-center gap-1.5 text-sm text-white bg-primary px-3 py-1.5 rounded-lg font-medium hover:bg-primary/90">
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-2xl">
                    {(profileForm.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{profileForm.name || "—"}</div>
                    <div className="text-sm text-muted-foreground">{profileForm.email}</div>
                    <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 rounded-full text-xs text-primary font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                      {isAdmin ? "Admin" : "Demo Access"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name", field: "name", placeholder: "Your full name" },
                    { label: "Work Email", field: "email", placeholder: "you@company.com" },
                    { label: "Company / Fund", field: "company", placeholder: "Acme Ventures" },
                    { label: "Role", field: "role", placeholder: "Your role" },
                  ].map(({ label, field, placeholder }) => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
                      {editingProfile ? (
                        <input
                          value={(profileForm as Record<string, string>)[field]}
                          onChange={(e) => setProfileForm((f) => ({ ...f, [field]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      ) : (
                        <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700">
                          {(profileForm as Record<string, string>)[field] || <span className="text-muted-foreground">—</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-6">
                <h2 className="font-black text-slate-900 mb-4">Sign In Method</h2>
                <div className="flex items-center justify-between py-3 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm font-medium text-slate-800">Email & Password</div>
                      <div className="text-xs text-muted-foreground">{profileForm.email || "—"}</div>
                    </div>
                  </div>
                  <span className="text-xs text-success font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Active</span>
                </div>
                <div className="pt-4">
                  <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-600 font-medium hover:text-red-700 transition-colors">
                    <LogOut className="w-4 h-4" /> Sign out of all devices
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Integrations ── */}
          {activeTab === "integrations" && (
            <div className="space-y-4">
              {!isAdmin && (
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Integration management requires admin access. Contact your administrator to connect data sources.
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Live Connectors</span>
                  <button onClick={loadIntegrations} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
                    <RefreshCw className={`w-3 h-3 ${loadingInts ? "animate-spin" : ""}`} /> Refresh
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Integration</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden sm:table-cell">Category</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden md:table-cell">Last Sync</th>
                      <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingInts ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading integrations…
                        </td>
                      </tr>
                    ) : integrations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                          API server not reachable — live integration status unavailable
                        </td>
                      </tr>
                    ) : integrations.map((int, i) => {
                      const meta = PROVIDER_META[int.provider];
                      const isSyncing = syncing === int.provider;
                      const isConnecting = connecting === int.provider;
                      const isDisconnecting = disconnecting === int.provider;
                      return (
                        <tr key={int.provider} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${i === integrations.length - 1 ? "border-0" : ""}`}>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{meta?.icon ?? "🔌"}</span>
                              <div>
                                <div className="font-semibold text-slate-800 text-sm">{int.displayName}</div>
                                <div className="text-xs text-muted-foreground hidden lg:block">{meta?.desc}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 hidden sm:table-cell">
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{meta?.category}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              {int.status === "connected" ? (
                                <><CheckCircle2 className="w-3.5 h-3.5 text-success" /><span className="text-xs font-medium text-success">Connected</span></>
                              ) : (
                                <><XCircle className="w-3.5 h-3.5 text-slate-300" /><span className="text-xs font-medium text-slate-400">Not connected</span></>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 hidden md:table-cell text-xs text-muted-foreground">{fmtDate(int.lastSyncAt)}</td>
                          <td className="px-5 py-3.5 text-right">
                            {int.status === "connected" ? (
                              <div className="flex items-center gap-2 justify-end">
                                {isAdmin && (
                                  <>
                                    <button onClick={() => handleSync(int.provider)} disabled={isSyncing}
                                      className="inline-flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
                                      <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                                      {isSyncing ? "Syncing…" : "Sync"}
                                    </button>
                                    <button onClick={() => handleDisconnect(int.provider)} disabled={isDisconnecting}
                                      className="inline-flex items-center gap-1.5 text-xs text-red-600 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                                      <Unplug className="w-3 h-3" />
                                      {isDisconnecting ? "…" : "Disconnect"}
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : isAdmin ? (
                              <button
                                disabled={isConnecting || !int.configured}
                                onClick={() => {
                                  if (meta?.authType === "oauth") handleOAuthConnect(int.provider);
                                  else if (meta?.authType === "apikey") setStripeModal(true);
                                  else if (meta?.authType === "sheets") setSheetsModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 text-xs text-white bg-primary px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                                title={!int.configured ? "OAuth credentials not configured — add env vars first" : undefined}
                              >
                                {isConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />}
                                {isConnecting ? "Connecting…" : !int.configured ? "Not configured" : "Connect"}
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Additional Integrations</span>
                  <span className="text-xs text-muted-foreground ml-2">(coming soon)</span>
                </div>
                <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
                  {(["all", "connected", "not_connected"] as const).map((s) => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterStatus === s ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {s === "all" ? "All" : s === "connected" ? "Connected" : "Available"}
                    </button>
                  ))}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Integration</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden sm:table-cell">Category</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden md:table-cell">Last Sync</th>
                      <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_INTEGRATIONS.filter(i => filterStatus === "all" ? true : (filterStatus === "connected" ? i.status === "connected" : i.status === "not_connected")).map((int, i, arr) => (
                      <tr key={int.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${i === arr.length - 1 ? "border-0" : ""}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{int.icon}</span>
                            <div>
                              <div className="font-semibold text-slate-800 text-sm">{int.name}</div>
                              <div className="text-xs text-muted-foreground hidden lg:block">{int.desc}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{int.category}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {int.status === "connected"
                            ? <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /><span className="text-xs font-medium text-success">Connected</span></div>
                            : <div className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-slate-300" /><span className="text-xs font-medium text-slate-400">Not connected</span></div>
                          }
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell text-xs text-muted-foreground">{int.lastSync ?? "—"}</td>
                        <td className="px-5 py-3.5 text-right">
                          {int.status === "connected"
                            ? <span className="text-xs text-muted-foreground italic">Demo data</span>
                            : <button className="inline-flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg cursor-not-allowed opacity-60"><ExternalLink className="w-3 h-3" />Request access</button>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-xl border border-slate-100 p-6">
              <h2 className="font-black text-slate-900 mb-5">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { label: "Weekly Portfolio Summary", desc: "A digest of portfolio performance every Monday", enabled: true },
                  { label: "Cash Flow Alerts", desc: "Alert when runway drops below 6 months", enabled: true },
                  { label: "Deal Stage Updates", desc: "Notify when M&A deals move to a new stage", enabled: true },
                  { label: "KPI Anomaly Detection", desc: "Alert when a metric exceeds 2σ from baseline", enabled: false },
                  { label: "New Report Available", desc: "Notify when a new investor report is generated", enabled: true },
                  { label: "Integration Sync Errors", desc: "Alert when a data source fails to sync", enabled: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                    <button className={`rounded-full relative transition-colors ${item.enabled ? "bg-primary" : "bg-slate-200"}`} style={{ width: 40, height: 22 }}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${item.enabled ? "translate-x-5" : "translate-x-0.5"}`} style={{ left: 2 }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Security ── */}
          {activeTab === "security" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-100 p-6">
                <h2 className="font-black text-slate-900 mb-5">Security Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-50">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Two-Factor Authentication</div>
                      <div className="text-xs text-muted-foreground">Add an extra layer of security to your account</div>
                    </div>
                    <button className="text-xs text-primary font-semibold border border-primary px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Enable 2FA</button>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-50">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Change Password</div>
                      <div className="text-xs text-muted-foreground">Last changed: Never</div>
                    </div>
                    <button className="text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">Update</button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Active Sessions</div>
                      <div className="text-xs text-muted-foreground">1 active session — this device</div>
                    </div>
                    <button onClick={handleLogout} className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">Sign Out All</button>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 rounded-xl border border-red-100 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-red-800">Danger Zone</div>
                    <div className="text-xs text-red-600 mt-1 mb-3">These actions are irreversible. Please proceed with caution.</div>
                    <button className="text-xs text-red-600 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors font-medium">Delete Account</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stripe Connect Modal */}
      {stripeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">💳</span>
              <div>
                <h3 className="font-black text-slate-900">Connect Stripe</h3>
                <p className="text-xs text-muted-foreground">Enter your Stripe secret key to sync revenue data</p>
              </div>
              <button onClick={() => { setStripeModal(false); setStripeKey(""); setStripeError(""); }} className="ml-auto text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Stripe Secret Key</label>
              <input
                type="password"
                value={stripeKey}
                onChange={(e) => setStripeKey(e.target.value)}
                placeholder="sk_live_..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
              {stripeError && <p className="text-xs text-red-600 mt-1.5">{stripeError}</p>}
              <p className="text-xs text-muted-foreground mt-2">Your key is stored encrypted and never displayed again. Use a restricted key with read-only access.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setStripeModal(false); setStripeKey(""); setStripeError(""); }} className="text-sm text-slate-600 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleStripeConnect} disabled={connecting === "stripe"} className="text-sm text-white bg-primary px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {connecting === "stripe" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…</> : <><Plug className="w-3.5 h-3.5" /> Connect Stripe</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sheets Connect Modal */}
      {sheetsModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="font-black text-slate-900">Connect Google Sheets</h3>
                <p className="text-xs text-muted-foreground">Import data from a shared Google Sheet</p>
              </div>
              <button onClick={() => { setSheetsModal(false); setSheetsUrl(""); setSheetsTab("Sheet1"); setSheetsError(""); }} className="ml-auto text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Spreadsheet URL</label>
                <input
                  value={sheetsUrl}
                  onChange={(e) => setSheetsUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sheet / Tab Name</label>
                <input
                  value={sheetsTab}
                  onChange={(e) => setSheetsTab(e.target.value)}
                  placeholder="Sheet1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              {sheetsError && <p className="text-xs text-red-600">{sheetsError}</p>}
              <p className="text-xs text-muted-foreground">The sheet must be shared with the iNi service account. Supported formats: companies, financials, deals.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setSheetsModal(false); setSheetsUrl(""); setSheetsTab("Sheet1"); setSheetsError(""); }} className="text-sm text-slate-600 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleSheetsConnect} disabled={connecting === "sheets"} className="text-sm text-white bg-primary px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {connecting === "sheets" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…</> : <><Plug className="w-3.5 h-3.5" /> Connect Sheet</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
