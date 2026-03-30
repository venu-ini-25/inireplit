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
  Building2,
  HandshakeIcon,
  Wrench,
  LogOut,
  User,
  Plug,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";

const logoImg = "/images/ini-logo-transparent.png";

const ADMIN_EMAILS = ["venu.vegi@inventninvest.com"];

type NavSection = "finance" | "portfolio" | "settings" | null;

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location, navigate] = useLocation();
  const [expanded, setExpanded] = useState<NavSection>(() => {
    if (location.startsWith("/finance")) return "finance";
    if (location.startsWith("/settings")) return "settings";
    return "finance";
  });

  const { user } = useUser();
  const { signOut } = useClerk();

  const [platformAccess, setPlatformAccess] = useState<string>(
    () => localStorage.getItem("ini_platform_access") ?? "demo"
  );
  const [canToggle, setCanToggle] = useState<boolean>(
    () => (localStorage.getItem("ini_platform_access_allowed") ?? "demo") === "both"
  );
  const isAdminOnly = (localStorage.getItem("ini_platform_access_allowed") ?? "demo") === "admin";

  useEffect(() => {
    setPlatformAccess(localStorage.getItem("ini_platform_access") ?? "demo");
    setCanToggle((localStorage.getItem("ini_platform_access_allowed") ?? "demo") === "both");
  }, []);

  const toggleMode = () => {
    const next = platformAccess === "demo" ? "app" : "demo";
    localStorage.setItem("ini_platform_access", next);
    window.location.reload();
  };

  const toggle = (section: NavSection) =>
    setExpanded((prev) => (prev === section ? null : section));

  const isActive = (path: string) => location === path;
  const isPrefix = (prefix: string) => location.startsWith(prefix);

  const navClick = () => onClose?.();

  const handleLogout = async () => {
    localStorage.removeItem("ini_platform_access");
    localStorage.removeItem("ini_platform_access_allowed");
    await signOut();
    onClose?.();
    navigate("/");
  };

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

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const userName = user?.fullName || user?.firstName || userEmail;
  const initials = (user?.firstName || userEmail || "U").charAt(0).toUpperCase();
  const isMaster = ADMIN_EMAILS.includes(userEmail);

  return (
    <aside className="w-64 h-screen flex flex-col bg-white border-r border-border z-40">
      <div className="h-20 md:h-24 flex items-center px-4 border-b border-border shrink-0 gap-2">
        <Link href="/app" className="flex items-center gap-2 flex-1 min-w-0" onClick={onClose}>
          <img
            src={logoImg}
            alt="INVENT N INVEST"
            className="h-16 md:h-20 w-auto object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
        </Link>
        {isAdminOnly ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span className="text-[10px] font-semibold text-purple-700 uppercase tracking-wide">Admin</span>
          </div>
        ) : canToggle ? (
          <button
            onClick={toggleMode}
            title={`Switch to ${platformAccess === "demo" ? "Live" : "Demo"} mode`}
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded-full border shrink-0 transition-all hover:scale-105 active:scale-95 cursor-pointer group",
              platformAccess === "demo"
                ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
                : "bg-green-50 border-green-200 hover:bg-green-100"
            )}
          >
            {platformAccess === "demo" ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Demo</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Live</span>
              </>
            )}
            <span className="text-[9px] text-slate-400 group-hover:text-slate-500 ml-0.5">⇄</span>
          </button>
        ) : platformAccess === "demo" ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Demo</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 border border-green-100 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Live</span>
          </div>
        )}
      </div>

      <div className="flex-1 py-4 px-3 flex flex-col gap-0.5 overflow-y-auto">
        {isAdminOnly && (
          <div className="mb-3 px-3 py-2 rounded-md bg-purple-50 border border-purple-100 text-xs text-purple-700 font-medium">
            Admin access — panel only
          </div>
        )}
        {!isAdminOnly && <Link href="/app" className={linkCls("/app")} onClick={navClick}>
          <LayoutGrid className="w-4 h-4 shrink-0" />
          Executive Summary
        </Link>}

        {!isAdminOnly && (
          <>
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

            <Link href="/operations" className={linkCls("/operations")} onClick={navClick}>
              <Settings className="w-4 h-4 shrink-0" />
              Operations
            </Link>

            <Link href="/product" className={linkCls("/product")} onClick={navClick}>
              <Box className="w-4 h-4 shrink-0" />
              Product
            </Link>

            <Link href="/marketing" className={linkCls("/marketing")} onClick={navClick}>
              <Megaphone className="w-4 h-4 shrink-0" />
              Marketing
            </Link>

            <Link href="/sales" className={linkCls("/sales")} onClick={navClick}>
              <ShoppingCart className="w-4 h-4 shrink-0" />
              Sales
            </Link>

            <Link href="/people" className={linkCls("/people")} onClick={navClick}>
              <Users className="w-4 h-4 shrink-0" />
              People
            </Link>

            <div className="border-t border-border my-2" />

            <Link
              href="/portfolio"
              className={cn(linkCls("/portfolio"), isPrefix("/portfolio") && !isActive("/portfolio") ? "bg-blue-50 text-primary" : "")}
              onClick={navClick}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              Portfolio
            </Link>

            <Link href="/ma" className={linkCls("/ma")} onClick={navClick}>
              <HandshakeIcon className="w-4 h-4 shrink-0" />
              M&A Support
            </Link>

            <Link href="/reports" className={linkCls("/reports")} onClick={navClick}>
              <BarChart2 className="w-4 h-4 shrink-0" />
              Reports & Analytics
            </Link>

            <Link href="/services" className={linkCls("/services")} onClick={navClick}>
              <Wrench className="w-4 h-4 shrink-0" />
              Professional Services
            </Link>
          </>
        )}

        <div className="border-t border-border my-2" />

        {(isMaster || isAdminOnly) && (
          <Link href="/admin" className={linkCls("/admin")} onClick={navClick}>
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Admin Panel
          </Link>
        )}

        {isMaster && (
          <Link href="/import" className={linkCls("/import")} onClick={navClick}>
            <Upload className="w-4 h-4 shrink-0" />
            Bulk Import
          </Link>
        )}

        <div>
          <button onClick={() => toggle("settings")} className={sectionBtnCls("/settings")}>
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4" />
              Settings
            </div>
            <ChevronDown className={cn("w-4 h-4 transition-transform", expanded === "settings" ? "rotate-180" : "")} />
          </button>
          {expanded === "settings" && (
            <div className="mt-0.5 ml-4 pl-3 border-l border-border flex flex-col gap-0.5">
              <Link href="/settings/profile" className={subLinkCls("/settings/profile")} onClick={navClick}>
                <User className="w-3.5 h-3.5 mr-2" />
                User Profile
              </Link>
              <Link href="/settings/integrations" className={subLinkCls("/settings/integrations")} onClick={navClick}>
                <Plug className="w-3.5 h-3.5 mr-2" />
                Integrations
              </Link>
              <Link href="/settings/notifications" className={subLinkCls("/settings/notifications")} onClick={navClick}>
                <span className="w-3.5 h-3.5 mr-2 text-xs">🔔</span>
                Notifications
              </Link>
              <Link href="/settings/security" className={subLinkCls("/settings/security")} onClick={navClick}>
                <span className="w-3.5 h-3.5 mr-2 text-xs">🔒</span>
                Security
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-3 border-t border-border shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 group">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1.5">
              {userName}
              {isMaster && (
                <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary uppercase tracking-wide">Master</span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">{userEmail}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
