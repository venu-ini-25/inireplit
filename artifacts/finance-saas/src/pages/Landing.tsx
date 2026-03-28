import { useLocation } from "wouter";
import {
  BarChart2, Shield, Zap, TrendingUp, Building2, Users, ArrowRight, CheckCircle2,
  DollarSign, LineChart, Briefcase, Bot, Globe, Award
} from "lucide-react";
import logoImg from "/images/ini-logo.jpeg";

const features = [
  {
    icon: DollarSign,
    title: "Finance Intelligence",
    desc: "Real-time cash flow, P&L, expense tracking, and driver-based forecasting — no more spreadsheets.",
    color: "bg-blue-50 text-primary",
  },
  {
    icon: Building2,
    title: "Portfolio Management",
    desc: "Unified view of all portfolio companies with KPIs, cap tables, documents, and investor notes.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Briefcase,
    title: "M&A Deal Workflow",
    desc: "End-to-end deal pipeline with due diligence tracking, document management, and deal analytics.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: LineChart,
    title: "Reports & Analytics",
    desc: "Automated reporting with industry benchmarking, trend analysis, and one-click investor exports.",
    color: "bg-green-50 text-success",
  },
  {
    icon: Bot,
    title: "AI-Powered Insights",
    desc: "Finance-intelligent engine that understands how CFOs think — automating analysis, not just data.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: Users,
    title: "Professional Services",
    desc: "Expert FP&A and M&A advisory embedded directly into the platform — strategy meets execution.",
    color: "bg-cyan-50 text-cyan-600",
  },
];

const metrics = [
  { value: "2–4 weeks", label: "Reporting delay eliminated" },
  { value: "80–85%", label: "Gross margin target" },
  { value: "$50B+", label: "Total addressable market" },
  { value: "30–40%", label: "Finance bandwidth recovered" },
];

const benefits = [
  "Real-time consolidated financial data",
  "Automated driver-based forecasting",
  "Due diligence workflow automation",
  "Industry benchmark comparisons",
  "One-click investor reporting",
  "Secure data room with access controls",
  "Cap table & valuation tracking",
  "12+ years of embedded FP&A expertise",
];

const testimonials = [
  {
    quote: "iNi replaced three tools and two consultants. Our board pack that took two weeks now takes two hours.",
    name: "CFO, Series B SaaS Company",
    company: "Portfolio Company",
  },
  {
    quote: "The M&A module alone saved us $80K in advisory fees on our last deal. The DD checklist is comprehensive.",
    name: "Managing Director",
    company: "Mid-Market PE Fund",
  },
  {
    quote: "Finally a finance platform built by finance people. The driver-based models actually make sense.",
    name: "VP Finance",
    company: "Growth-Stage Startup",
  },
];

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="h-16 border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 bg-white/95 backdrop-blur z-40">
        <img src={logoImg} alt="iNi" className="h-8 w-auto" />
        <div className="flex items-center gap-4">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#metrics" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Why iNi</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground hover:bg-slate-50 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            Launch Dashboard
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white pt-20 pb-24 px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#dbeafe_0%,_transparent_60%)] opacity-60" />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-primary text-xs font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            Now in early access — $20K+ in paid engagements validated
          </div>
          <h1 className="text-5xl font-black text-foreground leading-tight mb-6">
            The Finance Platform<br />
            <span className="text-primary">Built for Growth-Stage Leaders</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            iNi unifies portfolio management, FP&A, M&A support, and reporting into one AI-powered platform.
            Replace weeks of manual work with real-time strategic intelligence.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white rounded-lg text-base font-semibold hover:bg-primary/90 transition-colors shadow-md"
            >
              Open Dashboard <ArrowRight className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 px-6 py-3.5 border border-border rounded-lg text-base font-medium text-foreground hover:bg-slate-50 transition-colors">
              Schedule a Demo
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">No credit card required · 14-day free trial</p>
        </div>
      </section>

      {/* Metrics bar */}
      <section id="metrics" className="bg-primary py-10 px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center text-white">
          {metrics.map((m) => (
            <div key={m.label}>
              <div className="text-3xl font-black mb-1">{m.value}</div>
              <div className="text-sm text-blue-200">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-foreground mb-3">One Platform. Every Finance Function.</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              10 modules covering the complete CFO mandate — from daily cash flow to complex M&A transactions.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-border hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-8 bg-slate-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h2 className="text-3xl font-black text-foreground mb-4">
              Replace Disconnected Tools<br />with a Unified System
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Growth-stage CFOs spend 30–40% of their bandwidth consolidating data across ERP, CRM, HR, and Excel.
              iNi ingests, cleanses, and consolidates automatically — freeing your team for strategic work.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {benefits.map((b) => (
                <div key={b} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  {b}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-border bg-slate-50">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fund Overview</div>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: "AUM", value: "$284M", delta: "+12.4%", good: true },
                { label: "Gross IRR", value: "28.6%", delta: "+3.1pp", good: true },
                { label: "Portfolio Companies", value: "8", delta: "+2 this yr", good: true },
                { label: "Cash Runway", value: "18 months", delta: "Stable", good: true },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-muted-foreground">{r.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800">{r.value}</span>
                    <span className="text-xs text-success bg-green-50 px-2 py-0.5 rounded-full">{r.delta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-foreground text-center mb-12">What Finance Leaders Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="p-6 rounded-2xl bg-slate-50 border border-border">
                <p className="text-slate-700 text-sm leading-relaxed mb-4 italic">"{t.quote}"</p>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-black text-foreground mb-3">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground">Start with SaaS, extend with expert advisory when you need it.</p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              name: "SaaS Platform",
              price: "$5K–$15K",
              period: "/month",
              desc: "Full platform access for your finance team",
              features: ["All 10 modules", "Unlimited users", "API integrations", "Automated reporting", "Priority support"],
              cta: "Start Free Trial",
              primary: true,
            },
            {
              name: "Professional Services",
              price: "$25K–$150K",
              period: "/engagement",
              desc: "Expert-led FP&A, M&A, and strategic finance",
              features: ["Dedicated finance expert", "Custom financial modeling", "M&A advisory & DD", "Investor presentation prep", "SaaS onboarding included"],
              cta: "Talk to an Expert",
              primary: false,
            },
          ].map((plan) => (
            <div key={plan.name} className={`rounded-2xl p-8 border ${plan.primary ? "border-primary bg-primary text-white shadow-lg" : "border-border bg-white"}`}>
              <div className={`text-sm font-semibold mb-1 ${plan.primary ? "text-blue-200" : "text-muted-foreground"}`}>{plan.name}</div>
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
                onClick={() => navigate("/")}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors ${
                  plan.primary
                    ? "bg-white text-primary hover:bg-blue-50"
                    : "bg-primary text-white hover:bg-primary/90"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-8 bg-primary text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black mb-4">Ready to Transform Your Finance Stack?</h2>
          <p className="text-blue-100 mb-8">
            Join growth-stage companies using iNi to replace manual finance work with real-time intelligence.
            Raising $700K–$1.2M seed to accelerate product-to-market scale.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Launch Dashboard <ArrowRight className="w-4 h-4" />
            </button>
            <button className="px-6 py-3 border border-blue-300 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors">
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="iNi" className="h-6 w-auto" />
            <span className="text-xs text-muted-foreground">© 2024 Invent N Invest. All rights reserved.</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Venu Vegi, Founder & CEO · venu.vegi@inventninvest.com · www.inventninvest.com
          </div>
        </div>
      </footer>
    </div>
  );
}
