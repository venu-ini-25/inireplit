import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  User, LogOut, Plug, Shield, Bell, ChevronRight,
  CheckCircle2, XCircle, RefreshCw, Globe, Building2,
  BarChart2, CreditCard, Mail, Slack, Github, Database,
  Edit2, Save, X, AlertCircle
} from "lucide-react";

function getStoredUser() {
  try {
    const raw = localStorage.getItem("ini_user");
    if (!raw) return null;
    return JSON.parse(raw) as { name?: string; email?: string; company?: string; provider?: string };
  } catch { return null; }
}

const INTEGRATIONS = [
  { id: "quickbooks", name: "QuickBooks Online", category: "Accounting", icon: "💼", status: "connected", lastSync: "2 min ago", desc: "Sync P&L, cash flow, and chart of accounts" },
  { id: "salesforce", name: "Salesforce CRM", category: "CRM", icon: "☁️", status: "connected", lastSync: "15 min ago", desc: "Pipeline, revenue, and customer data" },
  { id: "hubspot", name: "HubSpot", category: "CRM / Marketing", icon: "🔶", status: "not_connected", lastSync: null, desc: "Marketing performance and contact management" },
  { id: "stripe", name: "Stripe", category: "Payments", icon: "💳", status: "connected", lastSync: "1 hr ago", desc: "Revenue, MRR, churn, and subscription data" },
  { id: "netsuite", name: "NetSuite ERP", category: "ERP", icon: "🔷", status: "not_connected", lastSync: null, desc: "Full ERP sync for enterprise financials" },
  { id: "slack", name: "Slack", category: "Notifications", icon: "💬", status: "connected", lastSync: "Active", desc: "Alerts, reports, and anomaly notifications" },
  { id: "google_sheets", name: "Google Sheets", category: "Spreadsheets", icon: "📊", status: "connected", lastSync: "5 min ago", desc: "Export reports and sync budget models" },
  { id: "plaid", name: "Plaid", category: "Banking", icon: "🏦", status: "not_connected", lastSync: null, desc: "Bank account and transaction aggregation" },
  { id: "rippling", name: "Rippling", category: "HR / Payroll", icon: "👥", status: "not_connected", lastSync: null, desc: "Headcount, payroll, and benefits data" },
  { id: "carta", name: "Carta", category: "Cap Table", icon: "📑", status: "connected", lastSync: "Daily", desc: "Equity, cap table, and ownership data" },
  { id: "looker", name: "Looker / BigQuery", category: "Data Warehouse", icon: "📐", status: "not_connected", lastSync: null, desc: "Custom data warehouse and BI integration" },
  { id: "jira", name: "Jira", category: "Product", icon: "🎯", status: "not_connected", lastSync: null, desc: "Sprint velocity, backlog, and roadmap data" },
];

type Tab = "integrations" | "profile" | "notifications" | "security";

export default function Settings() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/settings/:tab");
  const activeTab: Tab = (params?.tab as Tab) || "profile";

  const user = getStoredUser();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    company: user?.company ?? "",
    role: "Investor / Fund Manager",
  });
  const [saved, setSaved] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "connected" | "not_connected">("all");

  const handleLogout = () => {
    localStorage.removeItem("ini_user");
    navigate("/");
  };

  const handleSync = async (id: string) => {
    setSyncing(id);
    await new Promise((r) => setTimeout(r, 1500));
    setSyncing(null);
  };

  const handleSaveProfile = () => {
    const updated = { ...user, ...profileForm };
    localStorage.setItem("ini_user", JSON.stringify(updated));
    setEditingProfile(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const filtered = INTEGRATIONS.filter((i) =>
    filterStatus === "all" ? true : i.status === filterStatus
  );
  const connectedCount = INTEGRATIONS.filter((i) => i.status === "connected").length;

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

      <div className="flex gap-6 items-start">
        {/* Sidebar Nav */}
        <div className="w-52 shrink-0">
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(`/settings/${tab.id}`)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-slate-50 last:border-0 ${
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          {activeTab === "integrations" && (
            <div className="mt-3 bg-white rounded-xl border border-slate-100 p-4 text-center">
              <div className="text-2xl font-black text-primary">{connectedCount}</div>
              <div className="text-xs text-muted-foreground">of {INTEGRATIONS.length} connected</div>
            </div>
          )}
        </div>

        {/* Content */}
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
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingProfile(false)}
                        className="flex items-center gap-1 text-sm text-slate-500 hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        className="flex items-center gap-1.5 text-sm text-white bg-primary px-3 py-1.5 rounded-lg font-medium hover:bg-primary/90"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-2xl">
                    {(profileForm.name || user?.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{profileForm.name || "—"}</div>
                    <div className="text-sm text-muted-foreground">{profileForm.email}</div>
                    <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 rounded-full text-xs text-primary font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                      Demo Access Requested
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
                      <div className="text-xs text-muted-foreground">{user?.email ?? "—"}</div>
                    </div>
                  </div>
                  <span className="text-xs text-success font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Active</span>
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm text-red-600 font-medium hover:text-red-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out of all devices
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Integrations ── */}
          {activeTab === "integrations" && (
            <div>
              <div className="bg-white rounded-xl border border-slate-100 p-4 mb-4 flex items-center gap-3">
                <div className="flex gap-2">
                  {(["all", "connected", "not_connected"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        filterStatus === s ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {s === "all" ? "All" : s === "connected" ? "Connected" : "Available"}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground ml-auto">{filtered.length} integrations</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Integration</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden sm:table-cell">Category</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Status</th>
                      <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden md:table-cell">Last Sync</th>
                      <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((integration, i) => (
                      <tr key={integration.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${i === filtered.length - 1 ? "border-0" : ""}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{integration.icon}</span>
                            <div>
                              <div className="font-semibold text-slate-800 text-sm">{integration.name}</div>
                              <div className="text-xs text-muted-foreground hidden lg:block">{integration.desc}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{integration.category}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {integration.status === "connected" ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                <span className="text-xs font-medium text-success">Connected</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-slate-300" />
                                <span className="text-xs font-medium text-slate-400">Not connected</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell text-xs text-muted-foreground">
                          {integration.lastSync ?? "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {integration.status === "connected" ? (
                            <button
                              onClick={() => handleSync(integration.id)}
                              disabled={syncing === integration.id}
                              className="inline-flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3 h-3 ${syncing === integration.id ? "animate-spin" : ""}`} />
                              {syncing === integration.id ? "Syncing…" : "Sync"}
                            </button>
                          ) : (
                            <button className="inline-flex items-center gap-1.5 text-xs text-white bg-primary px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
                              <Plug className="w-3 h-3" />
                              Connect
                            </button>
                          )}
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
                    <button
                      className={`w-10 h-5.5 rounded-full relative transition-colors ${item.enabled ? "bg-primary" : "bg-slate-200"}`}
                      style={{ width: 40, height: 22 }}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${item.enabled ? "translate-x-5" : "translate-x-0.5"}`}
                        style={{ left: 2 }}
                      />
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
                    <button className="text-xs text-primary font-semibold border border-primary px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                      Enable 2FA
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-50">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Change Password</div>
                      <div className="text-xs text-muted-foreground">Last changed: Never</div>
                    </div>
                    <button className="text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      Update
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Active Sessions</div>
                      <div className="text-xs text-muted-foreground">1 active session — this device</div>
                    </div>
                    <button onClick={handleLogout} className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      Sign Out All
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 rounded-xl border border-red-100 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-red-800">Danger Zone</div>
                    <div className="text-xs text-red-600 mt-1 mb-3">These actions are irreversible. Please proceed with caution.</div>
                    <button className="text-xs text-red-600 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors font-medium">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
