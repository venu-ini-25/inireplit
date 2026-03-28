import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight, CheckCircle2, Shield, Zap,
  Building2, Users, DollarSign, LineChart, Briefcase,
  ChevronRight, Globe, Star, FileText, Handshake, Activity,
  PieChart, Target, Clock, Lock, Database, PlugZap, BarChart3,
  Menu, X
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
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

function WaveDown({ fromColor, toColor }: { fromColor: string; toColor: string }) {
  return (
    <div style={{ background: toColor, lineHeight: 0, fontSize: 0, overflow: "hidden", display: "block" }}>
      <svg viewBox="0 0 1440 72" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%", minWidth: "100%" }} preserveAspectRatio="none" height={72}>
        <rect width="1440" height="72" fill={fromColor} />
        <path d="M0,36 C240,72 480,0 720,36 C960,72 1200,0 1440,36 L1440,72 L0,72 Z" fill={toColor} />
      </svg>
    </div>
  );
}

function WaveUp({ fromColor, toColor }: { fromColor: string; toColor: string }) {
  return (
    <div style={{ background: fromColor, lineHeight: 0, fontSize: 0, overflow: "hidden", display: "block" }}>
      <svg viewBox="0 0 1440 72" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%", minWidth: "100%" }} preserveAspectRatio="none" height={72}>
        <rect width="1440" height="72" fill={toColor} />
        <path d="M0,36 C240,0 480,72 720,36 C960,0 1200,72 1440,36 L1440,0 L0,0 Z" fill={fromColor} />
      </svg>
    </div>
  );
}

const investorFeatures = [
  { icon: Building2, title: "Portfolio Dashboard", desc: "Live ARR, burn, IRR, MOIC, and valuation across all portfolio companies." },
  { icon: PieChart, title: "Fund KPIs", desc: "Real-time AUM, Gross IRR, DPI, TVPI, and unrealized value." },
  { icon: Handshake, title: "M&A Deal Pipeline", desc: "Full deal workflow — DD tracking, document vault, term sheets." },
  { icon: FileText, title: "Investor Reporting", desc: "Auto-generated LP reports and board decks. One-click exports." },
];

const companyFeatures = [
  { icon: DollarSign, title: "Finance Command Center", desc: "Cash flow, P&L, expenses, and runway — live from your data sources." },
  { icon: Activity, title: "Operational Metrics", desc: "Headcount, burn rate, unit economics tracked vs plan automatically." },
  { icon: LineChart, title: "Driver-Based Forecasting", desc: "Model scenarios, run what-ifs, present a defensible forecast." },
  { icon: Target, title: "GTM Performance", desc: "Sales pipeline, marketing attribution aligned with your financial model." },
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

const testimonials = [
  { quote: "iNi replaced three tools and two consultants. Our board pack that took two weeks now takes two hours.", name: "CFO", company: "Series B SaaS Company", role: "portfolio_company", stars: 5 },
  { quote: "The M&A module alone saved us $80K in advisory fees on our last deal. The DD checklist is comprehensive.", name: "Managing Director", company: "Mid-Market PE Fund", role: "investor", stars: 5 },
  { quote: "Finally a finance platform built by finance people. The driver-based models actually make sense.", name: "VP Finance", company: "Growth-Stage Startup", role: "portfolio_company", stars: 5 },
];

const integrations = [
  "QuickBooks", "Salesforce", "Stripe", "NetSuite", "Workday",
  "Carta", "Slack", "HubSpot", "Rippling", "Plaid",
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"investor" | "company">("investor");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const goRequestAccess = () => { setMobileOpen(false); navigate("/request-access"); };
  const goSignIn = () => { setMobileOpen(false); navigate("/login"); };
  const goApp = () => navigate("/login");

  const navLinks = [
    { label: "Solutions", href: "#solutions" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Platform", href: "#platform" },
    { label: "About", href: "#about" },
    { label: "Contact Us", href: "#contact" },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden">

      {/* ── Sticky Nav ── */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/97 backdrop-blur-md shadow-md border-b border-slate-100" : "bg-white/80 backdrop-blur-sm"
      }`}>
        <div className="flex items-center justify-between px-5 sm:px-8 lg:px-14">
          {/* Logo — responsive height */}
          <img
            src={logoImg}
            alt="iNi"
            className="w-auto shrink-0"
            style={{ height: "clamp(60px, 8vw, 100px)", mixBlendMode: "multiply" }}
          />

          {/* Desktop nav links — only lg+ */}
          <div className="hidden lg:flex items-center gap-7">
            {navLinks.map(({ label, href }) => (
              <a key={label} href={href} className="text-sm text-slate-600 hover:text-primary transition-colors font-semibold whitespace-nowrap">
                {label}
              </a>
            ))}
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={goSignIn} className="hidden lg:block px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all whitespace-nowrap">
              Sign In
            </button>
            <button onClick={goRequestAccess} className="px-4 py-2 sm:px-5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg whitespace-nowrap">
              Request Access
            </button>
            {/* Hamburger — hidden on lg+ */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet menu drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white/97 backdrop-blur-md px-5 py-4 flex flex-col gap-1 shadow-lg">
            {navLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
              >
                {label}
              </a>
            ))}
            <div className="border-t border-slate-100 mt-2 pt-3 flex gap-2">
              <button onClick={goSignIn} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all">
                Sign In
              </button>
              <button onClick={goRequestAccess} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-all">
                Request Access
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-16 pb-32 px-6 md:px-10 overflow-hidden bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-br from-blue-100/50 to-purple-100/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-100/30 to-blue-100/30 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-primary text-xs font-semibold mb-6" style={{ animation: "fadeInDown 0.6s ease forwards" }}>
              <Zap className="w-3.5 h-3.5" /> Now in early access · Limited spots available
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.06] mb-6" style={{ animation: "fadeInDown 0.7s ease 0.1s both" }}>
              The Finance Platform
              <br /><span className="text-primary">Built for Growth-</span>
              <br /><span className="text-primary">Stage Leaders</span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-lg" style={{ animation: "fadeInDown 0.7s ease 0.2s both" }}>
              iNi unifies portfolio management, FP&A, M&A support, and strategic reporting into one AI-powered platform.
              Replace weeks of manual work with real-time intelligence — built by a seasoned FP&A leader, for CFOs and fund managers.
            </p>
            <div className="flex flex-wrap items-center gap-3" style={{ animation: "fadeInDown 0.7s ease 0.3s both" }}>
              <button onClick={goRequestAccess} className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white rounded-xl font-semibold text-base hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                Request Demo Access <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={goApp} className="flex items-center gap-2 px-6 py-3.5 border border-slate-200 rounded-xl font-medium text-base text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all">
                Explore Dashboard
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-4">No credit card required · Founder personally reviews every request</p>
            <div className="flex items-center gap-5 mt-8 pt-6 border-t border-slate-100">
              {[
                { icon: Shield, text: "Enterprise-grade security" },
                { icon: Lock, text: "SOC 2 ready" },
                { icon: Clock, text: "14-day onboarding" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Icon className="w-3.5 h-3.5 text-slate-400" />{text}
                </div>
              ))}
            </div>
          </div>
          <div className="relative hidden lg:flex items-center justify-center" style={{ animation: "fadeInRight 0.9s ease 0.2s both" }}>
            <div className="relative w-full max-w-md">
              <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-3xl p-8 shadow-xl border border-slate-100 flex items-center justify-center" style={{ minHeight: 340 }}>
                <img src={illustrationImg} alt="Platform illustration" className="w-4/5 object-contain" />
              </div>
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

      {/* ── Wave: hero → integrations ── */}
      <WaveDown fromColor="#ffffff" toColor="#0f172a" />

      {/* ── Integrations strip (dark) ── */}
      <section className="bg-slate-900 py-10 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-6">Connects with your existing tools</p>
          <div className="flex flex-wrap justify-center gap-4">
            {integrations.map((name) => (
              <div key={name} className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:border-blue-500/50 hover:text-white transition-all">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wave: dark → why ini ── */}
      <WaveUp fromColor="#0f172a" toColor="#eff6ff" />

      {/* ── Why iNi? (improved) ── */}
      <section className="bg-blue-50 pb-20 px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-primary text-xs font-bold uppercase tracking-widest mb-4">Why iNi</span>
              <h2 className="text-4xl font-black text-slate-900 mb-4">Finance teams are drowning in<br />manual work. iNi fixes that.</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                Customers choose iNi because it eliminates the spreadsheet chaos that slows down every finance team.
              </p>
            </div>
          </Reveal>

          {/* Before / After comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <Reveal delay={0}>
              <div className="bg-white border border-red-100 rounded-2xl p-6 h-full">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="text-sm font-bold text-red-500 uppercase tracking-wide">The Old Way</span>
                </div>
                <div className="space-y-3">
                  {[
                    "Chasing portfolio companies for spreadsheets every quarter",
                    "2–4 weeks to close books and produce board reports",
                    "Finance team spends 40% of time just consolidating data",
                    "No single source of truth across fund + portfolio",
                    "M&A due diligence managed in email threads and shared drives",
                    "Manual reconciliation across 5+ disconnected tools",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <div className="w-4 h-4 rounded-full bg-red-100 text-red-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✕</div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="bg-white border border-emerald-100 rounded-2xl p-6 h-full">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-sm font-bold text-emerald-600 uppercase tracking-wide">The iNi Way</span>
                </div>
                <div className="space-y-3">
                  {[
                    "Portfolio data flows in automatically — no chasing needed",
                    "Real-time books and one-click board pack generation",
                    "Finance team focuses entirely on strategy and decisions",
                    "One unified platform for fund, portfolio, and M&A",
                    "Structured deal pipeline with automated DD checklists",
                    "All tools connected — QuickBooks, Salesforce, Carta, and more",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "30%", label: "Faster Decisions", desc: "Automated reporting saves weeks every quarter", color: "text-[#2563EB]" },
              { value: "2x", label: "More Efficient", desc: "Cut deal costs by removing intermediaries", color: "text-emerald-500" },
              { value: "Real-Time", label: "Live Insights", desc: "Data updated continuously, not once a month", color: "text-purple-600" },
              { value: "100%", label: "Verified Data", desc: "Secure, auditable data you can trust", color: "text-teal-500" },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 80}>
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <div className={`text-4xl font-black mb-1 ${stat.color}`}>{stat.value}</div>
                  <div className="font-bold text-slate-800 text-sm mb-1">{stat.label}</div>
                  <div className="text-xs text-slate-500 leading-relaxed">{stat.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wave: why ini → how it works ── */}
      <WaveDown fromColor="#eff6ff" toColor="#ffffff" />

      {/* ── How It Works ── */}
      <section id="how-it-works" className="bg-white pb-24 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest mb-4">How It Works</span>
              <h2 className="text-4xl font-black text-slate-900 mb-4">From fragmented data to<br />real-time intelligence in 3 steps</h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200" style={{ left: "18%", right: "18%" }} />
            {[
              {
                step: "01",
                icon: PlugZap,
                title: "Connect Your Tools",
                desc: "Link QuickBooks, Salesforce, Carta, Stripe, and 20+ other tools in minutes. iNi pulls your data automatically — no manual exports.",
                color: "bg-blue-50 border-blue-100",
                iconColor: "text-blue-600",
                numColor: "text-blue-300",
              },
              {
                step: "02",
                icon: Database,
                title: "iNi Unifies & Analyzes",
                desc: "Our AI engine normalizes, reconciles, and enriches your data across fund and portfolio — giving you one live, trusted source of truth.",
                color: "bg-purple-50 border-purple-100",
                iconColor: "text-purple-600",
                numColor: "text-purple-300",
              },
              {
                step: "03",
                icon: BarChart3,
                title: "Insights On Demand",
                desc: "Get real-time dashboards, automated reports, anomaly alerts, and board-ready exports. Decisions in hours, not weeks.",
                color: "bg-emerald-50 border-emerald-100",
                iconColor: "text-emerald-600",
                numColor: "text-emerald-300",
              },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 120}>
                <div className="flex flex-col items-center text-center px-6">
                  <div className={`w-20 h-20 rounded-2xl border-2 ${s.color} flex items-center justify-center mb-5 relative z-10 shadow-md`}>
                    <s.icon className={`w-8 h-8 ${s.iconColor}`} />
                  </div>
                  <div className={`text-5xl font-black ${s.numColor} mb-2 leading-none`}>{s.step}</div>
                  <div className="font-bold text-slate-800 text-lg mb-3">{s.title}</div>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wave: white → solutions ── */}
      <WaveDown fromColor="#ffffff" toColor="#f8fafc" />

      {/* ── Two User Profiles ── */}
      <section id="solutions" className="bg-slate-50 pb-24 px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <span className="inline-block px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest mb-4">Solutions</span>
              <h2 className="text-4xl font-black text-slate-900 mb-3">Built for Two Perspectives</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                Whether you're managing a fund or running a portfolio company — iNi gives you exactly what you need.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="flex items-center justify-center gap-3 mb-10">
              {[
                { id: "investor", label: "Investor / Fund Manager", icon: Building2 },
                { id: "company", label: "Portfolio Company / Operator", icon: Users },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id as "investor" | "company")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                    activeTab === id ? "bg-primary text-white border-primary shadow-md" : "bg-white text-slate-600 border-slate-200 hover:border-primary/40"
                  }`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>
          </Reveal>

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
                      <div key={i} className="p-4 rounded-xl border border-slate-100 bg-white hover:border-primary/20 hover:shadow-sm transition-all group">
                        <f.icon className="w-5 h-5 text-primary mb-2" />
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
                      <div key={i} className="p-4 rounded-xl border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-sm transition-all group">
                        <f.icon className="w-5 h-5 text-emerald-600 mb-2" />
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
                          <div className={`h-2 rounded-full ${d.status === "over" ? "bg-red-400" : "bg-emerald-500"}`} style={{ width: `${Math.min(d.pct, 100)}%` }} />
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

      {/* ── Wave: slate → dark platform ── */}
      <WaveDown fromColor="#f8fafc" toColor="#0f172a" />

      {/* ── Platform modules (dark) ── */}
      <section id="platform" className="bg-slate-900 pb-24 px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-block px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Platform</span>
              <h2 className="text-4xl font-black text-white mb-3">One Platform. Every Business Function.</h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                10 modules covering every business function — from daily operations to growth strategy and M&A.
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {modules.map((mod, i) => (
              <Reveal key={mod.name} delay={i * 40}>
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 hover:border-slate-500 hover:bg-slate-750 transition-all group cursor-default">
                  <div className={`w-8 h-8 rounded-lg ${mod.color} mb-3 flex items-center justify-center`}>
                    <div className="w-3 h-3 bg-white/70 rounded-sm" />
                  </div>
                  <div className="font-bold text-slate-200 text-xs mb-1 leading-tight">{mod.name}</div>
                  <div className="text-[10px] text-slate-500 leading-snug">{mod.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wave: dark → M&A ── */}
      <WaveUp fromColor="#0f172a" toColor="#ffffff" />

      {/* ── M&A Highlight ── */}
      <section className="bg-white pb-24 px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold mb-5">
                <Briefcase className="w-3.5 h-3.5" /> M&A Support
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4">End-to-End Deal Management</h2>
              <p className="text-slate-500 leading-relaxed mb-6">
                From first sourcing conversation to post-merger integration — iNi manages every step of your M&A workflow. Track deals through a visual pipeline, automate due diligence checklists, manage your document vault, and model synergies — all in one place.
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
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />{item}
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

      {/* ── Wave: white → testimonials ── */}
      <WaveDown fromColor="#ffffff" toColor="#f8fafc" />

      {/* ── Testimonials ── */}
      <section className="bg-slate-50 pb-24 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <span className="inline-block px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest mb-4">What Finance Leaders Say</span>
              <h2 className="text-3xl font-black text-slate-900">Trusted by CFOs and Fund Managers</h2>
            </div>
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

      {/* ── Wave: slate → about ── */}
      <WaveUp fromColor="#f8fafc" toColor="#ffffff" />

      {/* ── About ── */}
      <section id="about" className="bg-white pb-24 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-primary text-xs font-semibold mb-4">
                  <Globe className="w-3.5 h-3.5" /> About iNi
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4">Built from real finance experience.<br />For real finance teams.</h2>
                <p className="text-slate-500 leading-relaxed mb-4">
                  iNi was created by a finance leader with 12+ years of FP&A experience at Fortune 500 companies including Visa, Macy's, and Gap — someone who lived the pain of spreadsheet-heavy finance work and knew there had to be a better way.
                </p>
                <p className="text-slate-500 leading-relaxed mb-6">
                  iNi isn't just software — it's a purpose-built platform that brings together financial planning, portfolio oversight, M&A support, and investor reporting in a single, intelligent workspace. No more tool sprawl. No more manual consolidation.
                </p>
                <div className="flex flex-wrap gap-3">
                  {["12+ Years FP&A", "Fortune 500 Experience", "Visa · Macy's · Gap"].map((tag) => (
                    <div key={tag} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold">{tag}</div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: "🏗️", title: "Purpose-Built", desc: "Every module designed around how finance teams actually work." },
                  { icon: "⚡", title: "Real-Time Intelligence", desc: "Live data across portfolio companies, deals, and financials." },
                  { icon: "🔗", title: "End-to-End Coverage", desc: "From FP&A and cash flow to M&A due diligence and LP reporting." },
                  { icon: "🎯", title: "Two User Profiles", desc: "Tailored for Investors/Fund Managers and Portfolio Operators." },
                ].map((card) => (
                  <div key={card.title} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:border-primary/20 hover:shadow-sm transition-all">
                    <div className="text-2xl mb-2">{card.icon}</div>
                    <div className="font-bold text-slate-800 text-sm mb-1">{card.title}</div>
                    <div className="text-slate-500 text-xs leading-relaxed">{card.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Wave: white → contact ── */}
      <WaveDown fromColor="#ffffff" toColor="#f8fafc" />

      {/* ── Contact Us ── */}
      <section id="contact" className="bg-slate-50 pb-24 px-6 md:px-10">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <span className="inline-block px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest mb-4">Get in Touch</span>
              <h2 className="text-4xl font-black text-slate-900 mb-3">Contact Us</h2>
              <p className="text-slate-500 text-lg max-w-xl mx-auto">Have questions or want to learn more? We'd love to hear from you.</p>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "✉️", title: "Email Us", value: "info@inventninvest.com", href: "mailto:info@inventninvest.com", desc: "We typically respond within 24 hours" },
              { icon: "🌐", title: "Visit Our Website", value: "inventninvest.com", href: "https://inventninvest.com", desc: "Learn more about Invent N Invest" },
              { icon: "🚀", title: "Request Access", value: "Get Early Access", href: "/request-access", desc: "Limited spots available — apply today" },
            ].map((item) => (
              <Reveal key={item.title} delay={80}>
                <a href={item.href} className="block bg-white rounded-2xl p-6 border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all group text-center">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div className="font-bold text-slate-800 text-sm mb-1">{item.title}</div>
                  <div className="text-primary font-semibold text-sm mb-2 group-hover:underline">{item.value}</div>
                  <div className="text-xs text-slate-500">{item.desc}</div>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wave: slate → CTA ── */}
      <WaveDown fromColor="#f8fafc" toColor="#2563EB" />

      {/* ── CTA ── */}
      <section className="bg-primary py-20 px-6 text-white text-center">
        <Reveal>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-black mb-4">Ready to Transform Your Finance Stack?</h2>
            <p className="text-blue-100 mb-8 leading-relaxed">
              Join growth-stage companies and investors using iNi to replace manual, fragmented business intelligence with a single real-time platform.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <button onClick={goRequestAccess} className="flex items-center gap-2 px-7 py-3.5 bg-white text-primary rounded-xl font-bold hover:bg-blue-50 transition-all shadow-md">
                Request Demo Access <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={goApp} className="px-7 py-3.5 border border-blue-300/50 text-white rounded-xl font-semibold hover:bg-white/10 transition-all">
                Explore Dashboard
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400 pt-14 pb-8 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <img src={logoImg} alt="iNi" className="w-auto mb-4" style={{ height: "70px", filter: "brightness(0) invert(1)" }} />
              <p className="text-xs leading-relaxed text-slate-500">
                The AI-powered finance platform built for growth-stage investors and portfolio companies.
              </p>
            </div>
            {/* Platform */}
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">Platform</div>
              <ul className="space-y-2.5 text-sm">
                {["Portfolio Management", "Finance & FP&A", "M&A Support", "Reports & Analytics", "AI Insights"].map(l => (
                  <li key={l}><a href="#platform" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            {/* Solutions */}
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">Solutions</div>
              <ul className="space-y-2.5 text-sm">
                {["Investors & Fund Managers", "Portfolio Companies", "M&A Teams", "FP&A Teams"].map(l => (
                  <li key={l}><a href="#solutions" className="hover:text-white transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
            {/* Contact */}
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">Contact</div>
              <ul className="space-y-2.5 text-sm">
                <li><a href="mailto:info@inventninvest.com" className="hover:text-white transition-colors">info@inventninvest.com</a></li>
                <li><a href="https://inventninvest.com" className="hover:text-white transition-colors">www.inventninvest.com</a></li>
                <li className="pt-2">
                  <button onClick={goRequestAccess} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-all">
                    Request Access
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <span>© 2025 Invent N Invest. All rights reserved.</span>
            <span>Built by a seasoned FP&A leader, for CFOs and fund managers.</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInRight { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes floatA { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes floatB { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(10px); } }
        @keyframes floatC { 0%, 100% { transform: translateY(-50%) translateX(0px); } 50% { transform: translateY(-50%) translateX(-6px); } }
      `}</style>
    </div>
  );
}
