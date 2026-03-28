import { useState } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2, XCircle, Clock, Users, RefreshCw,
  ArrowLeft, Building2, Mail, DollarSign, ChevronDown
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Status = "pending" | "approved" | "denied";

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

function StatusBadge({ status }: { status: Status }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-100 text-success text-xs font-semibold">
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
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

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

  const act = async (id: string, action: "approve" | "deny") => {
    setActing(id);
    try {
      const res = await fetch(`${API_BASE}/api/access-requests/${id}/${action}`, {
        method: "PATCH",
      });
      const updated = await res.json() as AccessRequest;
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (e) {
      console.error(e);
    } finally {
      setActing(null);
    }
  };

  const filtered = requests.filter((r) => filter === "all" || r.status === filter);
  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    denied: requests.filter((r) => r.status === "denied").length,
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => navigate("/app")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-black text-slate-900">Access Request Admin</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Review and approve demo access requests</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loaded ? "Refresh" : "Load Requests"}
          </button>
        </div>

        {!loaded && !loading && (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Click "Load Requests" to see all demo access requests.</p>
          </div>
        )}

        {loaded && (
          <>
            {/* KPI bar */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {(["all", "pending", "approved", "denied"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`bg-white rounded-xl border p-4 text-left transition-all ${
                    filter === s ? "border-primary shadow-sm" : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className={`text-2xl font-black mb-0.5 ${
                    s === "pending" ? "text-amber-600"
                    : s === "approved" ? "text-success"
                    : s === "denied" ? "text-red-500"
                    : "text-slate-900"
                  }`}>{counts[s]}</div>
                  <div className="text-xs text-muted-foreground capitalize">{s === "all" ? "Total" : s}</div>
                </button>
              ))}
            </div>

            {/* Requests table */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              {filtered.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">No requests match this filter.</div>
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
                      <>
                        <tr
                          key={req.id}
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                          onClick={() => setExpanded((e) => (e === req.id ? null : req.id))}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {req.firstName.charAt(0)}{req.lastName.charAt(0)}
                              </div>
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
                                  <button
                                    onClick={() => act(req.id, "approve")}
                                    disabled={acting === req.id}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    {acting === req.id ? "…" : "Approve"}
                                  </button>
                                  <button
                                    onClick={() => act(req.id, "deny")}
                                    disabled={acting === req.id}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    {acting === req.id ? "…" : "Deny"}
                                  </button>
                                </>
                              )}
                              {req.status === "approved" && (
                                <button
                                  onClick={() => act(req.id, "deny")}
                                  disabled={acting === req.id}
                                  className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  Revoke
                                </button>
                              )}
                              {req.status === "denied" && (
                                <button
                                  onClick={() => act(req.id, "approve")}
                                  disabled={acting === req.id}
                                  className="text-xs text-slate-400 hover:text-success transition-colors"
                                >
                                  Re-approve
                                </button>
                              )}
                              <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${expanded === req.id ? "rotate-180" : ""}`} />
                            </div>
                          </td>
                        </tr>
                        {expanded === req.id && (
                          <tr key={`${req.id}-detail`} className="border-b border-slate-100 bg-blue-50/30">
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
                      </>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
