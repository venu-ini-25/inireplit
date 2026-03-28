import { useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";

const logoImg = "/images/ini-logo-transparent.png";

type Role = "investor" | "portfolio_company" | "advisor" | "other";

const roleOptions: { value: Role; label: string; desc: string }[] = [
  {
    value: "investor",
    label: "Investor / Fund Manager",
    desc: "Monitor portfolio companies, track IRR/MOIC, manage deal pipeline",
  },
  {
    value: "portfolio_company",
    label: "Portfolio Company / Operator",
    desc: "Manage financials, track KPIs, prepare investor reporting",
  },
  {
    value: "advisor",
    label: "Advisor / Consultant",
    desc: "Support clients with FP&A, M&A advisory, and due diligence",
  },
  {
    value: "other",
    label: "Other",
    desc: "Explore the platform for other use cases",
  },
];

function getStoredUser() {
  try {
    const raw = localStorage.getItem("ini_user");
    if (!raw) return null;
    return JSON.parse(raw) as { name?: string; email?: string; company?: string };
  } catch { return null; }
}

export default function RequestAccess() {
  const [, navigate] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const storedUser = getStoredUser();
  const [nameParts] = useState(() => {
    const parts = (storedUser?.name ?? "").trim().split(" ");
    return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
  });
  const [form, setForm] = useState({
    firstName: nameParts.first,
    lastName: nameParts.last,
    email: storedUser?.email ?? "",
    company: storedUser?.company ?? "",
    role: "" as Role | "",
    aum: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (!form.company.trim()) e.company = "Required";
    if (!form.role) e.role = "Please select your role";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    setLoading(false);
    setSubmitted(true);
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: "" }));
  };

  const inputCls = (field: string) =>
    `w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 bg-white transition-colors outline-none focus:ring-2 focus:ring-primary/20 ${
      errors[field] ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-primary"
    }`;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Access Requested!</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Thank you, <strong>{form.firstName}</strong>. We've received your request for demo access to the iNi platform.
            Our team will review your request and reach out to <strong>{form.email}</strong> within 1–2 business days.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 text-left mb-6">
            <p className="text-xs text-primary font-semibold mb-1">What happens next?</p>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• Venu reviews your request personally</li>
              <li>• We'll schedule a 30-min personalized demo</li>
              <li>• You'll get full access to the demo environment</li>
            </ul>
          </div>
          <button
            onClick={() => navigate("/")}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Nav */}
      <nav className="h-14 flex items-center justify-between px-6 md:px-10 bg-white/80 backdrop-blur border-b border-slate-100">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <img src={logoImg} alt="iNi" className="h-8 w-auto" style={{ mixBlendMode: "multiply" }} />
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </button>
      </nav>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            {storedUser?.email && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700 text-xs font-medium mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Signed in as <strong>{storedUser.email}</strong>
              </div>
            )}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-primary text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              Demo Access — Early Stage
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Request Demo Access</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
              We're in early access. Fill out your details and Venu will personally review your request and set up your demo environment.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-5">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
                <input value={form.firstName} onChange={set("firstName")} className={inputCls("firstName")} placeholder="Jane" />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last Name</label>
                <input value={form.lastName} onChange={set("lastName")} className={inputCls("lastName")} placeholder="Smith" />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work Email</label>
              <input type="email" value={form.email} onChange={set("email")} className={inputCls("email")} placeholder="jane@company.com" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            {/* Company */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company / Fund Name</label>
              <input value={form.company} onChange={set("company")} className={inputCls("company")} placeholder="Acme Ventures" />
              {errors.company && <p className="text-xs text-red-500 mt-1">{errors.company}</p>}
            </div>

            {/* Role selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">I am a... <span className="text-red-400">*</span></label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setForm((f) => ({ ...f, role: opt.value })); setErrors((e) => ({ ...e, role: "" })); }}
                    className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                      form.role === opt.value
                        ? "border-primary bg-blue-50"
                        : "border-slate-150 bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className={`text-xs font-bold mb-0.5 ${form.role === opt.value ? "text-primary" : "text-slate-800"}`}>{opt.label}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">{opt.desc}</div>
                  </button>
                ))}
              </div>
              {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
            </div>

            {/* AUM / Revenue context */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                AUM / Annual Revenue <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <select value={form.aum} onChange={set("aum")} className={inputCls("aum")}>
                <option value="">Select range...</option>
                <option>Under $1M</option>
                <option>$1M – $10M</option>
                <option>$10M – $50M</option>
                <option>$50M – $200M</option>
                <option>$200M – $1B</option>
                <option>Over $1B</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                What brings you to iNi? <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={form.message}
                onChange={set("message")}
                rows={3}
                className={`${inputCls("message")} resize-none`}
                placeholder="Tell us about your use case or what you're looking to solve..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Request Demo Access →"}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Already have access?{" "}
              <button type="button" onClick={() => navigate("/app")} className="text-primary font-medium hover:underline">
                Enter Dashboard
              </button>
            </p>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Questions? Email <a href="mailto:venu.vegi@inventninvest.com" className="text-primary hover:underline">venu.vegi@inventninvest.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
