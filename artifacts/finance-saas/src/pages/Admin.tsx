import { useState, useEffect, Fragment } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2, XCircle, Clock, Users, RefreshCw,
  ArrowLeft, Building2, Mail, DollarSign, ChevronDown, ShieldCheck
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Status = "pending" | "approved" | "denied";
type Tab = "active" | "all" | Status;

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
  submittedAt: string;
  reviewedAt: string | null;
}

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

export default function Admin() {
  const [, navigate] = useLocation();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = async () => {
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

  useEffect(() => { load(); }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const act = async (id: string, action: "approve" | "deny") => {
    setActing(id);
    try {
      const res = await fetch(`${API_BASE}/api/access-requests/${id}/${action}`);
      const text = await res.text();
      if (!text) throw new Error("Empty response — server may be restarting, try again");
      if (!res.ok) throw new Error(`Server error ${res.status}: ${text}`);
      const updated = JSON.parse(text) as AccessRequest;
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      if (action === "approve") {
        showToast(`✓ ${updated.firstName} ${updated.lastName} approved`, true);
        setTab("active");
      } else {
        showToast(`${updated.firstName} ${updated.lastName} denied`, false);
      }
    } catch (e) {
      console.error("Action failed:", e);
      showToast(`Failed: ${(e as Error).message}`, false);
    } finally {
      setActing(null);
    }
  };

  const approved = requests.filter((r) => r.status === "approved");
  const pending = requests.filter((r) => r.status === "pending");
  const denied = requests.filter((r) => r.status === "denied");

  const filtered =
    tab === "active" ? approved :
    tab === "pending" ? pending :
    tab === "denied" ? denied :
    requests;

  const tabs: { key: Tab; label: string; count: number }[] = [
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => navigate("/app")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-black text-slate-900">Access Control</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage who has access to the iNi platform</p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

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

        {loading && (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
            <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-3 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading…</p>
          </div>
        )}

        {!loading && loaded && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                    tab === t.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}>
                  {t.key === "active" && <ShieldCheck className="w-4 h-4" />}
                  {t.key === "pending" && <Clock className="w-4 h-4" />}
                  {t.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    tab === t.key ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"
                  }`}>{t.count}</span>
                </button>
              ))}
            </div>

            {/* Active users card grid */}
            {tab === "active" && approved.length === 0 && (
              <div className="p-16 text-center">
                <ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-700 font-semibold mb-1">No approved users yet</p>
                <p className="text-muted-foreground text-sm">Approve requests from the Pending tab.</p>
              </div>
            )}

            {tab === "active" && approved.length > 0 && (
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
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Approved {req.reviewedAt ? timeAgo(req.reviewedAt) : ""}
                        </span>
                        <button onClick={() => act(req.id, "deny")} disabled={acting === req.id}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium">
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Table for pending / denied / all */}
            {tab !== "active" && (
              <>
                {filtered.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-sm">
                    {tab === "pending" && "No pending requests."}
                    {tab === "denied" && "No denied requests."}
                    {tab === "all" && "No requests yet."}
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
                                    <button onClick={() => act(req.id, "approve")} disabled={acting === req.id}
                                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {acting === req.id ? "…" : "Approve"}
                                    </button>
                                    <button onClick={() => act(req.id, "deny")} disabled={acting === req.id}
                                      className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                                      <XCircle className="w-3 h-3" />
                                      {acting === req.id ? "…" : "Deny"}
                                    </button>
                                  </>
                                )}
                                {req.status === "approved" && (
                                  <button onClick={() => act(req.id, "deny")} disabled={acting === req.id}
                                    className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                                    Revoke
                                  </button>
                                )}
                                {req.status === "denied" && (
                                  <button onClick={() => act(req.id, "approve")} disabled={acting === req.id}
                                    className="text-xs text-slate-400 hover:text-green-600 transition-colors">
                                    Re-approve
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
      </div>
    </div>
  );
}
