import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight, CheckCircle2, BarChart2, Shield, Zap, TrendingUp,
  Building2, Users, DollarSign, LineChart, Briefcase, Bot,
  ChevronRight, Globe, Star, FileText, Handshake, Activity,
  PieChart, Target, Clock, Lock
} from "lucide-react";

const logoImg = "/images/ini-logo-transparent.png";
const illustrationImg = "/images/illustration-tech.png";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const investorFeatures = [
  { icon: Building2, title: "Portfolio Dashboard", desc: "Unified view of all portfolio companies — ARR, burn, IRR, MOIC, headcount, and valuation in one place." },
  { icon: PieChart, title: "Fund KPIs", desc: "Real-time AUM, Gross IRR, DPI, TVPI, and unrealized value across your entire fund." },
  { icon: Handshake, title: "M&A Deal Pipeline", desc: "Full deal workflow from sourcing through closing — DD tracking, document vault, term sheets, and synergy models." },
  { icon: FileText, title: "Investor Reporting", desc: "Auto-generated LP reports, board decks, and portfolio summaries. One-click quarterly exports." },
];

const companyFeatures = [
  { icon: DollarSign, title: "Finance Command Center", desc: "Cash flow, P&L, expenses, and runway — all live from your data sources. No spreadsheet consolidation." },
  { icon: Activity, title: "Operational Metrics", desc: "Headcount, burn rate, unit economics, and KPIs tracked automatically and compared to plan." },
  { icon: LineChart, title: "Driver-Based Forecasting", desc: "Model different scenarios, run what-ifs, and present a defensible financial forecast to your board." },
  { icon: Target, title: "GTM Performance", desc: "Sales pipeline, marketing attribution, product adoption — aligned with your financial model." },
];

const modules = [
  { name: "Finance & Cash Flow", color: "bg-blue-500", desc: "P&L · Cash Flow · Expenses · Runway" },
  { name: "Portfolio Management", color: "bg-purple-500", desc: "Companies · Cap Tables · KPI Tracking" },
  { name: "M&A Support", color: "bg-amber-500", desc: "Deal Pipeline · Due Diligence · Term Sheets" },
  { name: "Operations", color: "bg-emerald-500", desc: "Headcount · Burn · Unit Economics" },
  { name: "Sales & Marketing", color: "bg-rose-500", desc: "ARR Bridge · Pipeline · CAC · Attribution" },
  { name: "Reports & Analytics", color: "bg-cyan-500", desc: "Benchmarks · LP Reports · Board Decks" },
  { name: "Professional Services", color: "bg-indigo-500", desc: "FP&A Advisory · M&A Consulting" },
  { name: "People Analytics", color: "bg-orange-500", desc: "Hiring · Compensation · Attrition" },
  { name: "Product Metrics", color: "bg-teal-500", desc: "DAU/MAU · NPS · Feature Adoption" },
  { name: "AI Insights", color: "bg-violet-500", desc: "Anomaly Detection · Forecasting · Alerts" },
];

const metrics = [
  { value: "2–4 weeks", label: "Reporting delay eliminated" },
  { value: "80–85%", label: "Target gross margin" },
  { value: "$50B+", label: "Total addressable market" },
  { value: "30–40%", label: "Finance bandwidth recovered" },
];

const testimonials = [
  {
    quote: "iNi replaced three tools and two consultants. Our board pack that took two weeks now takes two hours.",
    name: "CFO",
    company: "Series B SaaS Company",
    role: "portfolio_company",
    stars: 5,
  },
  {
    quote: "The M&A module alone saved us $80K in advisory fees on our last deal. The DD checklist is comprehensive.",
    name: "Managing Director",
    company: "Mid-Market PE Fund",
    role: "investor",
    stars: 5,
  },
  {
    quote: "Finally a finance platform built by finance people. The driver-based models actually make sense.",
    name: "VP Finance",
    company: "Growth-Stage Startup",
    role: "portfolio_company",
    stars: 5,
  },
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"investor" | "company">("investor");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const goRequestAccess = () => navigate("/request-access");
  const goApp = () => navigate("/app");

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden">

      {/* ── Sticky Nav ── */}
      <nav className={`h-16 flex items-center justify-between px-6 md:px-10 sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100" : "bg-transparent"
      }`}>
        <img src={logoImg} alt="iNi" className="h-10 w-auto" style={{ mixBlendMode: "multiply" }} />
        <div className="hidden md:flex items-center gap-6">
          <a href="#solutions" className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">Solutions</a>
          <a href="#platform" className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">Platform</a>
          <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">Pricing</a>
          <a href="#about" className="text-sm text-slate-600 hover:text-slate-900 transition-colors font-medium">About</a>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={goApp}
            className="hidden md:block px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            Sign In
          </button>
          <button
            onClick={goRequestAccess}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
          >
            Request Access
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-16 pb-24 px-6 md:px-10 overflow-hidden">
        {/* Gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-br from-blue-100/60 to-purple-100/40 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-100/40 to-blue-100/40 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div>
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-primary text-xs font-semibold mb-6"
              style={{ animation: "fadeInDown 0.6s ease forwards" }}
            >
              <Zap className="w-3.5 h-3.5" />
              Now in early access · Raising $700K–$1.2M seed
            </div>

            <h1
              className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.06] mb-6"
              style={{ animation: "fadeInDown 0.7s ease 0.1s both" }}
            >
              The Finance Platform
              <br />
              <span className="text-primary">Built for Growth-</span>
              <br />
              <span className="text-primary">Stage Leaders</span>
            </h1>

            <p
              className="text-lg text-slate-600 leading-relaxed mb-8 max-w-lg"
              style={{ animation: "fadeInDown 0.7s ease 0.2s both" }}
            >
              iNi unifies portfolio management, FP&A, M&A support, and strategic reporting into one AI-powered platform.
              Replace weeks of manual work with real-time intelligence — built by a CFO, for CFOs.
            </p>

            <div
              className="flex flex-wrap items-center gap-3"
              style={{ animation: "fadeInDown 0.7s ease 0.3s both" }}
            >
              <button
                onClick={goRequestAccess}
                className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                Request Demo Access <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={goApp}
                className="flex items-center gap-2 px-6 py-3.5 border border-slate-200 rounded-xl font-medium text-base text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Explore Dashboard
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-4">No credit card required · Founder personally reviews every request</p>

            {/* Trust bar */}
            <div className="flex items-center gap-5 mt-8 pt-6 border-t border-slate-100">
              {[
                { icon: Shield, text: "Enterprise-grade security" },
                { icon: Lock, text: "SOC 2 ready" },
                { icon: Clock, text: "14-day onboarding" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right: illustration + floating KPI cards */}
          <div className="relative hidden lg:flex items-center justify-center" style={{ animation: "fadeInRight 0.9s ease 0.2s both" }}>
            <div className="relative w-full max-w-md">
              {/* Main illustration */}
              <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-3xl p-8 shadow-xl border border-slate-100 flex items-center justify-center" style={{ minHeight: 340 }}>
                <img src={illustrationImg} alt="Platform illustration" className="w-4/5 object-contain" />
              </div>

              {/* Floating KPI cards */}
              <div className="absolute -top-4 -left-6 bg-white rounded-2xl shadow-lg border border-slate-100 px-4 py-3 text-left" style={{ animation: "floatA 3.5s ease-in-out infinite" }}>
                <div className="text-xs text-muted-foreground">Portfolio IRR</div>
                <div className="text-xl font-black text-success">28.6%</div>
                <div className="text-xs text-success">↑ 3.1pp vs target</div>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-lg border border-slate-100 px-4 py-3 text-left" style={{ animation: "floatB 4s ease-in-out infinite" }}>
                <div className="text-xs text-muted-foreground">Cash Runway</div>
                <div className="text-xl font-black text-primary">18 months</div>
                <div className="text-xs text-slate-400">Updated 2h ago</div>
              </div>
              <div className="absolute top-1/2 -right-8 -translate-y-1/2 bg-white rounded-2xl shadow-lg border border-slate-100 px-4 py-3 text-left" style={{ animation: "floatC 3s ease-in-out infinite" }}>
                <div className="text-xs text-muted-foreground">AUM</div>
                <div className="text-xl font-black text-slate-800">$284M</div>
                <div className="text-xs text-success">↑ 12.4% YoY</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Metrics bar ── */}
      <section className="bg-primary py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
          {metrics.map((m, i) => (
            <Reveal key={m.label} delay={i * 80}>
              <div className="text-3xl font-black mb-1">{m.value}</div>
              <div className="text-sm text-blue-200">{m.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Two User Profiles ── */}
      <section id="solutions" className="py-24 px-6 md:px-10 bg-white">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-slate-900 mb-3">Built for Two Perspectives</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                Whether you're managing a fund or running a portfolio company — iNi gives you exactly what you need.
              </p>
            </div>
          </Reveal>

          {/* Tab switcher */}
          <Reveal delay={100}>
            <div className="flex items-center justify-center gap-3 mb-10">
              {[
                { id: "investor", label: "Investor / Fund Manager", icon: Building2 },
                { id: "company", label: "Portfolio Company / Operator", icon: Users },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as "investor" | "company")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                    activeTab === id
                      ? "bg-primary text-white border-primary shadow-md"
                      : "bg-white text-slate-600 border-slate-200 hover:border-primary/40"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </Reveal>

          {/* Investor view */}
          {activeTab === "investor" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <Reveal delay={50}>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold mb-4">
                    <Building2 className="w-3.5 h-3.5" /> For Investors & Fund Managers
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-4">See your entire portfolio — in real time</h3>
                  <p className="text-slate-500 leading-relaxed mb-6">
                    Stop chasing portfolio companies for spreadsheets. iNi connects directly to your companies' data sources and gives you a live dashboard of every metric that matters — ARR growth, burn rate, MOIC, IRR, and cap table — across all portfolio companies simultaneously.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {investorFeatures.map((f, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-primary/20 hover:bg-blue-50/30 transition-all group">
                        <f.icon className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                        <div className="font-bold text-slate-800 text-sm mb-1">{f.title}</div>
                        <div className="text-xs text-muted-foreground leading-snug">{f.desc}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={goRequestAccess} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm">
                    Get Investor Access <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </Reveal>
              <Reveal delay={150}>
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl p-6 border border-slate-100">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">FUND OVERVIEW — LIVE</div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: "AUM", val: "$284M", delta: "+12.4%", color: "text-success" },
                      { label: "Gross IRR", val: "28.6%", delta: "+3.1pp", color: "text-success" },
                      { label: "MOIC", val: "2.7x", delta: "vs 2.1x target", color: "text-primary" },
                      { label: "Avg Runway", val: "18 mo", delta: "Across portfolio", color: "text-slate-500" },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="text-xs text-muted-foreground mb-1">{kpi.label}</div>
                        <div className="text-2xl font-black text-slate-800">{kpi.val}</div>
                        <div className={`text-xs font-medium ${kpi.color}`}>{kpi.delta}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: "NovaPay", arr: "$8.4M", growth: "+48.2%", stage: "Series B", dot: "bg-success" },
                      { name: "DataStream AI", arr: "$12.8M", growth: "+88.6%", stage: "Series B", dot: "bg-primary" },
                      { name: "RetailEdge", arr: "$22.5M", growth: "+19.3%", stage: "Growth", dot: "bg-success" },
                    ].map((co) => (
                      <div key={co.name} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 text-sm shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full ${co.dot}`} />
                          <span className="font-semibold text-slate-800">{co.name}</span>
                          <span className="text-xs text-muted-foreground">{co.stage}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-700">{co.arr}</span>
                          <span className="text-xs font-semibold text-success">{co.growth}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          )}

          {/* Company view */}
          {activeTab === "company" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <Reveal delay={50}>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold mb-4">
                    <Users className="w-3.5 h-3.5" /> For Portfolio Companies & Operators
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-4">Your entire finance stack — automated</h3>
                  <p className="text-slate-500 leading-relaxed mb-6">
                    Growth-stage finance teams spend 30–40% of their time just consolidating data. iNi pulls from your ERP, CRM, HR, and banking systems automatically — giving you a real-time financial command center and freeing your team for actual strategy.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {companyFeatures.map((f, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                        <f.icon className="w-5 h-5 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                        <div className="font-bold text-slate-800 text-sm mb-1">{f.title}</div>
                        <div className="text-xs text-muted-foreground leading-snug">{f.desc}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={goRequestAccess} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm">
                    Get Company Access <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </Reveal>
              <Reveal delay={150}>
                <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-3xl p-6 border border-slate-100">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">COMPANY DASHBOARD — LIVE</div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: "Monthly Revenue", val: "$2.1M", delta: "+15.3%", color: "text-success" },
                      { label: "Cash Runway", val: "18 months", delta: "+2mo extension", color: "text-primary" },
                      { label: "Burn Rate", val: "$340K/mo", delta: "↓5.1% vs plan", color: "text-success" },
                      { label: "Headcount", val: "89", delta: "+21.9% YoY", color: "text-slate-500" },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="text-xs text-muted-foreground mb-1">{kpi.label}</div>
                        <div className="text-xl font-black text-slate-800">{kpi.val}</div>
                        <div className={`text-xs font-medium ${kpi.color}`}>{kpi.delta}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-xs font-semibold text-slate-600 mb-2">Budget vs Actual — Current Quarter</div>
                    {[
                      { label: "Engineering", pct: 88, status: "good" },
                      { label: "Sales", pct: 112, status: "over" },
                      { label: "Marketing", pct: 79, status: "good" },
                    ].map((d) => (
                      <div key={d.label} className="flex items-center gap-3 mb-2">
                        <span className="text-xs text-slate-600 w-20 shrink-0">{d.label}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${d.status === "over" ? "bg-red-400" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(d.pct, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-10 text-right ${d.status === "over" ? "text-red-500" : "text-emerald-600"}`}>{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          )}
        </div>
      </section>

      {/* ── Platform modules ── */}
      <section id="platform" className="py-24 px-6 md:px-10 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <h2 className="text-4xl font-black text-slate-900 mb-3">One Platform. Every Finance Function.</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                10 modules covering the complete CFO mandate — from daily cash flow to complex M&A transactions.
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {modules.map((mod, i) => (
              <Reveal key={mod.name} delay={i * 40}>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-default">
                  <div className={`w-8 h-8 rounded-lg ${mod.color} mb-3 flex items-center justify-center`}>
                    <div className="w-3 h-3 bg-white/70 rounded-sm" />
                  </div>
                  <div className="font-bold text-slate-800 text-xs mb-1 leading-tight">{mod.name}</div>
                  <div className="text-[10px] text-muted-foreground leading-snug">{mod.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── M&A Highlight ── */}
      <section className="py-24 px-6 md:px-10 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold mb-5">
                <Briefcase className="w-3.5 h-3.5" /> M&A Support
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4">End-to-End Deal Management</h2>
              <p className="text-slate-500 leading-relaxed mb-6">
                From first sourcing conversation to post-merger integration — iNi manages every step of your M&A workflow.
                Track deals through a visual pipeline, automate due diligence checklists, manage your document vault, and model synergies — all in one place.
              </p>
              <div className="space-y-3">
                {[
                  "Visual deal pipeline with stage-gating",
                  "Automated due diligence checklist (50+ items)",
                  "Secure document vault with version control",
                  "Term sheet and LOI tracker",
                  "Financial model & synergy analysis",
                  "Integration planning & milestone tracking",
                  "Advisor and stakeholder management",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <button onClick={goApp} className="mt-6 flex items-center gap-2 text-primary font-semibold text-sm hover:gap-3 transition-all">
                Explore M&A Module <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="bg-slate-900 rounded-3xl p-6 text-white">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Deal Pipeline</span>
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">5 active deals</span>
              </div>
              <div className="space-y-2">
                {[
                  { stage: "Sourcing", deal: "SkyBridge Capital", val: "$120M", priority: "LOW", dot: "bg-slate-400" },
                  { stage: "NDA", deal: "FlexForce HR", val: "$12M", priority: "MED", dot: "bg-blue-400" },
                  { stage: "Due Diligence", deal: "Meridian Analytics", val: "$45M", priority: "HIGH", dot: "bg-amber-400" },
                  { stage: "Negotiation", deal: "GreenRoute Logistics", val: "$78M", priority: "HIGH", dot: "bg-purple-400" },
                  { stage: "Closing", deal: "Orbit DevOps", val: "$18M", priority: "MED", dot: "bg-green-400" },
                ].map((d) => (
                  <div key={d.deal} className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${d.dot}`} />
                      <div>
                        <div className="text-xs text-slate-400">{d.stage}</div>
                        <div className="text-sm font-semibold text-white">{d.deal}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-white">{d.val}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        d.priority === "HIGH" ? "bg-red-900/50 text-red-400" :
                        d.priority === "MED" ? "bg-amber-900/50 text-amber-400" :
                        "bg-slate-700 text-slate-400"
                      }`}>{d.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 px-6 md:px-10 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="text-3xl font-black text-slate-900 text-center mb-12">What Finance Leaders Say</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all h-full">
                  <div className="flex mb-3">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed mb-4 italic">"{t.quote}"</p>
                  <div className="pt-3 border-t border-slate-100">
                    <div className="font-semibold text-slate-800 text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.company}</div>
                    <div className={`text-xs font-medium mt-1 ${t.role === "investor" ? "text-purple-600" : "text-emerald-600"}`}>
                      {t.role === "investor" ? "Fund Manager" : "Portfolio Company"}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Founder + About ── */}
      <section id="about" className="py-20 px-6 md:px-10 bg-white">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-primary text-xs font-semibold mb-4">
                  <Globe className="w-3.5 h-3.5" /> About iNi
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4">Built by a CFO.<br />For CFOs.</h2>
                <p className="text-slate-500 leading-relaxed mb-4">
                  Venu Vegi brings 12+ years of FP&A leadership at Visa, Macy's, and Gap — and built iNi because no platform existed that truly understood how finance teams work.
                </p>
                <p className="text-slate-500 leading-relaxed mb-6">
                  iNi isn't just software — it's the culmination of real enterprise finance experience, built to eliminate the manual work that consumes growth-stage finance teams and replaces it with real-time intelligence.
                </p>
                <div className="flex flex-wrap gap-3">
                  {["Visa", "Macy's", "Gap"].map((co) => (
                    <div key={co} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold">{co}</div>
                  ))}
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-3xl p-8 border border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-2xl mb-4">V</div>
                <div className="font-black text-slate-900 text-xl mb-0.5">Venu Vegi</div>
                <div className="text-primary text-sm font-semibold mb-3">Founder & CEO</div>
                <div className="text-slate-500 text-sm leading-relaxed mb-4">
                  12+ years FP&A at Fortune 500 companies. Built financial models that drove $B+ decisions. Now building the platform he always wished existed.
                </div>
                <a href="mailto:venu.vegi@inventninvest.com" className="text-xs text-primary font-medium hover:underline">
                  venu.vegi@inventninvest.com
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 px-6 md:px-10 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-slate-900 mb-2">Simple, Transparent Pricing</h2>
              <p className="text-muted-foreground">Start with SaaS, extend with expert advisory when you need it.</p>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              {
                name: "SaaS Platform",
                price: "$5K–$15K",
                period: "/month",
                desc: "Full platform access for your finance team",
                features: ["All 10 modules included", "Unlimited users & companies", "API integrations", "Automated reporting", "Priority support", "14-day onboarding"],
                cta: "Request Access",
                primary: true,
                action: goRequestAccess,
              },
              {
                name: "Professional Services",
                price: "$25K–$150K",
                period: "/engagement",
                desc: "Expert-led FP&A, M&A, and strategic finance",
                features: ["Dedicated finance expert", "Custom financial modeling", "M&A advisory & due diligence", "Investor presentation prep", "SaaS platform included", "Ongoing advisory retainer"],
                cta: "Talk to Venu",
                primary: false,
                action: goRequestAccess,
              },
            ].map((plan) => (
              <Reveal key={plan.name} delay={100}>
                <div className={`rounded-2xl p-8 border ${plan.primary ? "border-primary bg-primary text-white shadow-xl" : "border-slate-200 bg-white"}`}>
                  <div className={`text-xs font-semibold mb-1 ${plan.primary ? "text-blue-200" : "text-muted-foreground"}`}>{plan.name}</div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-black">{plan.price}</span>
                    <span className={`text-sm ${plan.primary ? "text-blue-200" : "text-muted-foreground"}`}>{plan.period}</span>
                  </div>
                  <p className={`text-sm mb-6 ${plan.primary ? "text-blue-100" : "text-muted-foreground"}`}>{plan.desc}</p>
                  <ul className="space-y-2.5 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${plan.primary ? "text-blue-200" : "text-success"}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={plan.action}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                      plan.primary ? "bg-white text-primary hover:bg-blue-50" : "bg-primary text-white hover:bg-primary/90"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 bg-gradient-to-r from-primary to-blue-700 text-white text-center">
        <Reveal>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-black mb-4">Ready to Transform Your Finance Stack?</h2>
            <p className="text-blue-100 mb-8 leading-relaxed">
              Join growth-stage companies and investors using iNi to replace manual finance work with real-time intelligence. Raising $700K–$1.2M seed to accelerate product-market scale.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <button
                onClick={goRequestAccess}
                className="flex items-center gap-2 px-7 py-3.5 bg-white text-primary rounded-xl font-bold hover:bg-blue-50 transition-all shadow-md"
              >
                Request Demo Access <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={goApp}
                className="px-7 py-3.5 border border-blue-300/50 text-white rounded-xl font-semibold hover:bg-white/10 transition-all"
              >
                Explore Dashboard
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-8 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="iNi" className="h-7 w-auto" style={{ mixBlendMode: "multiply" }} />
            <span className="text-xs text-muted-foreground">© 2025 Invent N Invest. All rights reserved.</span>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Venu Vegi, Founder & CEO · venu.vegi@inventninvest.com · www.inventninvest.com
          </div>
        </div>
      </footer>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes floatA {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(10px); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(-50%) translateX(0px); }
          50% { transform: translateY(-50%) translateX(-6px); }
        }
      `}</style>
    </div>
  );
}
