import { useState, useEffect, useRef, useCallback } from "react";
import { Search, LayoutGrid, DollarSign, Settings, Users, Box, Megaphone, ShoppingCart, Building2, HandshakeIcon, BarChart2, Wrench, Database, X } from "lucide-react";
import { useLocation } from "wouter";

interface SearchItem {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  category: string;
  keywords: string[];
}

const PAGES: SearchItem[] = [
  { id: "dashboard", label: "Executive Summary", description: "KPI overview and fund performance", path: "/app", icon: <LayoutGrid className="w-4 h-4" />, category: "Navigation", keywords: ["home", "overview", "dashboard", "kpi", "summary"] },
  { id: "finance-pl", label: "P&L Statement", description: "Revenue, expenses and EBITDA", path: "/finance/pl", icon: <DollarSign className="w-4 h-4" />, category: "Finance", keywords: ["profit", "loss", "income", "ebitda", "revenue"] },
  { id: "finance-cf", label: "Cash Flow", description: "Cash inflows, outflows and runway", path: "/finance/cashflow", icon: <DollarSign className="w-4 h-4" />, category: "Finance", keywords: ["cash", "runway", "burn", "inflow", "outflow"] },
  { id: "finance-exp", label: "Expenses", description: "Spending analysis by department and vendor", path: "/finance/expenses", icon: <DollarSign className="w-4 h-4" />, category: "Finance", keywords: ["spend", "cost", "budget", "vendor"] },
  { id: "operations", label: "Operations", description: "Headcount, burn rate and unit economics", path: "/operations", icon: <Settings className="w-4 h-4" />, category: "Metrics", keywords: ["headcount", "burn", "margin", "cac"] },
  { id: "product", label: "Product", description: "DAU, MAU, engagement and churn", path: "/product", icon: <Box className="w-4 h-4" />, category: "Metrics", keywords: ["dau", "mau", "engagement", "churn", "retention"] },
  { id: "marketing", label: "Marketing", description: "MQL, CAC by channel and campaigns", path: "/marketing", icon: <Megaphone className="w-4 h-4" />, category: "Metrics", keywords: ["mql", "cac", "campaigns", "leads", "funnel"] },
  { id: "sales", label: "Sales", description: "Bookings, pipeline and quota attainment", path: "/sales", icon: <ShoppingCart className="w-4 h-4" />, category: "Metrics", keywords: ["bookings", "pipeline", "quota", "arr", "deals"] },
  { id: "people", label: "People", description: "Hiring plan, attrition and compensation", path: "/people", icon: <Users className="w-4 h-4" />, category: "Metrics", keywords: ["hiring", "attrition", "headcount", "comp", "hr"] },
  { id: "portfolio", label: "Portfolio", description: "All portfolio companies and KPIs", path: "/portfolio", icon: <Building2 className="w-4 h-4" />, category: "Portfolio", keywords: ["companies", "investments", "portfolio"] },
  { id: "ma", label: "M&A Support", description: "Deal pipeline and due diligence", path: "/ma", icon: <HandshakeIcon className="w-4 h-4" />, category: "Portfolio", keywords: ["deals", "acquisition", "merger", "due diligence", "pipeline"] },
  { id: "reports", label: "Reports & Analytics", description: "Board packs, investor updates and benchmarks", path: "/reports", icon: <BarChart2 className="w-4 h-4" />, category: "Reports", keywords: ["board", "investor", "benchmark", "annual"] },
  { id: "services", label: "Professional Services", description: "FP&A, strategic finance and corp dev engagements", path: "/services", icon: <Wrench className="w-4 h-4" />, category: "Reports", keywords: ["fpa", "advisory", "engagement", "consulting"] },
  { id: "data-agent", label: "Data Agent", description: "AI-powered data import, mapping and cleaning", path: "/data-agent", icon: <Database className="w-4 h-4" />, category: "Tools", keywords: ["import", "csv", "excel", "mapping", "ai", "clean", "upload"] },
  { id: "settings-integrations", label: "Integrations", description: "QuickBooks, HubSpot, Stripe and more", path: "/settings/integrations", icon: <Settings className="w-4 h-4" />, category: "Settings", keywords: ["quickbooks", "hubspot", "stripe", "gusto", "sheets", "connect"] },
  { id: "settings-notifications", label: "Notifications", description: "Email alerts and notification preferences", path: "/settings/notifications", icon: <Settings className="w-4 h-4" />, category: "Settings", keywords: ["email", "alerts", "notifications"] },
];

const CATEGORY_ORDER = ["Navigation", "Finance", "Metrics", "Portfolio", "Reports", "Tools", "Settings"];

interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function SearchPalette({ open, onClose }: SearchPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim().length === 0
    ? PAGES
    : PAGES.filter(p => {
        const q = query.toLowerCase();
        return (
          p.label.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.keywords.some(k => k.includes(q))
        );
      });

  const grouped = CATEGORY_ORDER.reduce<Record<string, SearchItem[]>>((acc, cat) => {
    const items = filtered.filter(p => p.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  const handleSelect = useCallback((item: SearchItem) => {
    navigate(item.path);
    onClose();
    setQuery("");
    setSelected(0);
  }, [navigate, onClose]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected(s => Math.min(s + 1, flatFiltered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected(s => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatFiltered[selected]) handleSelect(flatFiltered[selected]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flatFiltered, selected, handleSelect, onClose]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[70vh]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, features, settings..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-0.5 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200">ESC</kbd>
        </div>

        <div ref={listRef} className="overflow-y-auto flex-1">
          {flatFiltered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No results for "{query}"</div>
          ) : (
            <div className="py-2">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </div>
                  {items.map(item => {
                    const globalIdx = flatFiltered.indexOf(item);
                    const isSelected = globalIdx === selected;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelected(globalIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isSelected ? "bg-primary/5 text-primary" : "hover:bg-slate-50"}`}
                      >
                        <div className={`shrink-0 p-1.5 rounded-md ${isSelected ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"}`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.label}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                        </div>
                        {isSelected && (
                          <kbd className="hidden sm:inline text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">↵</kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="font-mono bg-slate-100 px-1 rounded">↑↓</kbd> Navigate</span>
          <span className="flex items-center gap-1"><kbd className="font-mono bg-slate-100 px-1 rounded">↵</kbd> Go</span>
          <span className="flex items-center gap-1"><kbd className="font-mono bg-slate-100 px-1 rounded">ESC</kbd> Close</span>
          <span className="ml-auto flex items-center gap-1"><kbd className="font-mono bg-slate-100 px-1 rounded">⌘K</kbd> Open</span>
        </div>
      </div>
    </div>
  );
}
