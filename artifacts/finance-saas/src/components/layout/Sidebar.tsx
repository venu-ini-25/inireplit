import { Link, useLocation } from "wouter";
import { 
  LayoutGrid, 
  ChevronDown,
  Settings,
  Box,
  Megaphone,
  ShoppingCart,
  Users,
  BarChart2,
  Briefcase,
  Building2,
  HandshakeIcon,
  Wrench,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
const logoImg = "/images/ini-logo-transparent.png";

type NavSection = "finance" | "portfolio" | null;

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState<NavSection>("finance");

  const toggle = (section: NavSection) =>
    setExpanded((prev) => (prev === section ? null : section));

  const isActive = (path: string) => location === path;
  const isPrefix = (prefix: string) => location.startsWith(prefix);

  const navClick = () => onClose?.();

  const linkCls = (path: string) =>
    cn(
      "flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors",
      isActive(path)
        ? "bg-primary text-white shadow-sm"
        : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
    );

  const subLinkCls = (path: string) =>
    cn(
      "flex items-center px-3 py-2 rounded-md font-medium text-sm transition-colors",
      isActive(path)
        ? "bg-primary text-white shadow-sm"
        : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
    );

  const sectionBtnCls = (prefix: string) =>
    cn(
      "w-full flex items-center justify-between px-3 py-2 rounded-md font-medium text-sm transition-colors",
      isPrefix(prefix) && expanded !== prefix
        ? "text-primary"
        : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
    );

  return (
    <aside className="w-64 h-screen flex flex-col bg-white border-r border-border z-40">
      {/* Logo */}
      <div className="h-14 md:h-16 flex items-center px-4 border-b border-border shrink-0 gap-2">
        <Link href="/app" className="flex items-center gap-2 flex-1 min-w-0" onClick={onClose}>
          <img
            src={logoImg}
            alt="INVENT N INVEST"
            className="h-9 w-auto object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
        </Link>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 border border-green-100 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className="text-[10px] font-medium text-success">Connected</span>
        </div>
      </div>

      <div className="flex-1 py-4 px-3 flex flex-col gap-0.5 overflow-y-auto">
        {/* Executive Summary */}
        <Link href="/app" className={linkCls("/app")} onClick={navClick}>
          <LayoutGrid className="w-4 h-4 shrink-0" />
          Executive Summary
        </Link>

        {/* Finance Section */}
        <div className="mt-1">
          <button onClick={() => toggle("finance")} className={sectionBtnCls("/finance")}>
            <div className="flex items-center gap-3">
              <span className="font-bold text-base leading-none w-4 h-4 text-center">$</span>
              Finance
            </div>
            <ChevronDown className={cn("w-4 h-4 transition-transform", expanded === "finance" ? "rotate-180" : "")} />
          </button>
          {expanded === "finance" && (
            <div className="mt-0.5 ml-4 pl-3 border-l border-border flex flex-col gap-0.5">
              <Link href="/finance/pl" className={subLinkCls("/finance/pl")} onClick={navClick}>P&L</Link>
              <Link href="/finance/cashflow" className={subLinkCls("/finance/cashflow")} onClick={navClick}>Cash Flow</Link>
              <Link href="/finance/expenses" className={subLinkCls("/finance/expenses")} onClick={navClick}>Expenses</Link>
            </div>
          )}
        </div>

        {/* Operations */}
        <Link href="/operations" className={linkCls("/operations")} onClick={navClick}>
          <Settings className="w-4 h-4 shrink-0" />
          Operations
        </Link>

        {/* Product */}
        <Link href="/product" className={linkCls("/product")} onClick={navClick}>
          <Box className="w-4 h-4 shrink-0" />
          Product
        </Link>

        {/* Marketing */}
        <Link href="/marketing" className={linkCls("/marketing")} onClick={navClick}>
          <Megaphone className="w-4 h-4 shrink-0" />
          Marketing
        </Link>

        {/* Sales */}
        <Link href="/sales" className={linkCls("/sales")} onClick={navClick}>
          <ShoppingCart className="w-4 h-4 shrink-0" />
          Sales
        </Link>

        {/* People */}
        <Link href="/people" className={linkCls("/people")} onClick={navClick}>
          <Users className="w-4 h-4 shrink-0" />
          People
        </Link>

        <div className="border-t border-border my-2" />

        {/* Portfolio */}
        <Link href="/portfolio" className={cn(linkCls("/portfolio"), isPrefix("/portfolio") && !isActive("/portfolio") ? "bg-blue-50 text-primary" : "")} onClick={navClick}>
          <Building2 className="w-4 h-4 shrink-0" />
          Portfolio
        </Link>

        {/* M&A Support */}
        <Link href="/ma" className={linkCls("/ma")} onClick={navClick}>
          <HandshakeIcon className="w-4 h-4 shrink-0" />
          M&A Support
        </Link>

        {/* Reports & Analytics */}
        <Link href="/reports" className={linkCls("/reports")} onClick={navClick}>
          <BarChart2 className="w-4 h-4 shrink-0" />
          Reports & Analytics
        </Link>

        {/* Professional Services */}
        <Link href="/services" className={linkCls("/services")} onClick={navClick}>
          <Wrench className="w-4 h-4 shrink-0" />
          Professional Services
        </Link>
      </div>

      {/* Landing page link */}
      <div className="border-t border-border mt-2 pt-2 px-3">
        <Link href="/" className={linkCls("/")} onClick={navClick}>
          <Globe className="w-4 h-4 shrink-0" />
          Landing Page
        </Link>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <p className="text-[10px] text-muted-foreground text-center">iNi Finance Platform v1.0</p>
      </div>
    </aside>
  );
}
