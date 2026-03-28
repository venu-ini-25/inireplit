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
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Sidebar() {
  const [location] = useLocation();
  const [financeExpanded, setFinanceExpanded] = useState(true);

  const isFinanceActive = location.startsWith("/finance");

  return (
    <aside className="w-64 h-screen sticky top-0 left-0 flex flex-col bg-white border-r border-border z-40">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-border shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center gap-1 text-primary">
            {/* Simple logo icon representing two figures */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <circle cx="9" cy="8" r="4" />
              <path d="M9 14C5.13401 14 2 17.134 2 21H16C16 17.134 12.866 14 9 14Z" />
              <circle cx="17" cy="10" r="3" />
              <path d="M17 15C15.9324 15 14.9201 15.238 14.0152 15.6592C15.2492 16.9208 16 18.8746 16 21H22C22 17.6863 19.7614 15 17 15Z" />
            </svg>
          </div>
          <span className="font-bold text-foreground tracking-tight">INVENT N INVEST</span>
        </Link>
        <div className="ml-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 border border-green-100">
          <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
          <span className="text-[10px] font-medium text-success">Connected</span>
        </div>
      </div>

      <div className="flex-1 py-6 px-4 flex flex-col gap-1 overflow-y-auto">
        {/* Executive Summary */}
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors",
            location === "/" 
              ? "bg-primary text-white shadow-sm" 
              : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          Executive Summary
        </Link>

        {/* Finance Section */}
        <div className="mt-2">
          <button 
            onClick={() => setFinanceExpanded(!financeExpanded)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md font-medium text-sm transition-colors",
              isFinanceActive && !financeExpanded
                ? "text-primary"
                : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="font-bold font-serif text-lg leading-none tracking-tighter w-4 h-4 text-center inline-block">$</span>
              Finance
            </div>
            <ChevronDown className={cn("w-4 h-4 transition-transform", financeExpanded ? "rotate-180" : "")} />
          </button>
          
          {financeExpanded && (
            <div className="mt-1 ml-4 pl-4 border-l border-border flex flex-col gap-1">
              <Link
                href="/finance/pl"
                className={cn(
                  "flex items-center px-3 py-2 rounded-md font-medium text-sm transition-colors",
                  location === "/finance/pl" 
                    ? "bg-primary text-white shadow-sm" 
                    : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
                )}
              >
                P&L
              </Link>
              <Link
                href="/finance/cashflow"
                className={cn(
                  "flex items-center px-3 py-2 rounded-md font-medium text-sm transition-colors",
                  location === "/finance/cashflow" 
                    ? "bg-primary text-white shadow-sm" 
                    : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
                )}
              >
                Cash Flow
              </Link>
              <Link
                href="/finance/expenses"
                className={cn(
                  "flex items-center px-3 py-2 rounded-md font-medium text-sm transition-colors",
                  location === "/finance/expenses" 
                    ? "bg-primary text-white shadow-sm" 
                    : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
                )}
              >
                Expenses
              </Link>
            </div>
          )}
        </div>

        {/* Other menu items */}
        <div className="mt-2 flex flex-col gap-1">
          <button className="flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm text-muted-foreground hover:bg-slate-50 hover:text-foreground transition-colors w-full text-left">
            <Settings className="w-4 h-4" />
            Operations
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm text-muted-foreground hover:bg-slate-50 hover:text-foreground transition-colors w-full text-left">
            <Box className="w-4 h-4" />
            Product
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm text-muted-foreground hover:bg-slate-50 hover:text-foreground transition-colors w-full text-left">
            <Megaphone className="w-4 h-4" />
            Marketing
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm text-muted-foreground hover:bg-slate-50 hover:text-foreground transition-colors w-full text-left">
            <ShoppingCart className="w-4 h-4" />
            Sales
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm text-muted-foreground hover:bg-slate-50 hover:text-foreground transition-colors w-full text-left">
            <Users className="w-4 h-4" />
            People
          </button>
          <Link
            href="/reports"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors",
              location === "/reports" 
                ? "bg-primary text-white shadow-sm" 
                : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
            )}
          >
            <BarChart2 className="w-4 h-4" />
            Reports & Analytics
          </Link>
          <Link
            href="/ma"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors",
              location === "/ma" 
                ? "bg-primary text-white shadow-sm" 
                : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
            )}
          >
            <Briefcase className="w-4 h-4" />
            M&A Support
          </Link>
        </div>
      </div>
    </aside>
  );
}
