import { Sidebar } from "./Sidebar";
import { SearchPalette } from "./SearchPalette";
import { Search, RotateCw, Menu, ArrowRightLeft } from "lucide-react";
import { ReactNode, useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import { cn } from "@/lib/utils";

const ADMIN_EMAILS = ["venu.vegi@inventninvest.com", "pitch@inventninvest.com"];

export function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useUser();

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const displayName = user?.fullName || user?.firstName || userEmail;
  const initials = (user?.firstName || userEmail || "U").charAt(0).toUpperCase();
  const isMaster = ADMIN_EMAILS.includes(userEmail);

  const [mode, setMode] = useState<"demo" | "app">(() =>
    (localStorage.getItem("ini_platform_access") ?? "demo") as "demo" | "app"
  );
  const [selectedMode, setSelectedMode] = useState<"demo" | "app">(() =>
    (localStorage.getItem("ini_platform_access") ?? "demo") as "demo" | "app"
  );

  const syncMode = useCallback(() => {
    const stored = (localStorage.getItem("ini_platform_access") ?? "demo") as "demo" | "app";
    setMode(stored);
    setSelectedMode(stored);
  }, []);

  useEffect(() => {
    syncMode();
    window.addEventListener("ini-access-updated", syncMode);
    return () => window.removeEventListener("ini-access-updated", syncMode);
  }, [syncMode]);

  const applyMode = () => {
    localStorage.setItem("ini_platform_access", selectedMode);
    window.location.reload();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`
          fixed inset-y-0 left-0 z-40 md:relative md:block
          transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-14 md:h-16 bg-white border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0 gap-3">
          <button
            className="md:hidden p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center min-w-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="relative w-full max-w-xs md:max-w-md flex items-center gap-2 px-3 py-2 bg-slate-50 border border-transparent hover:border-border hover:bg-white rounded-md text-sm text-muted-foreground transition-all text-left cursor-text"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="flex-1">Search pages, features...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-400">⌘K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Data Synced</span>
            </div>

            <div className={cn(
              "hidden sm:flex items-center gap-1.5 rounded-lg border px-1 py-1",
              selectedMode === "demo" ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"
            )}>
              <select
                value={selectedMode}
                onChange={e => setSelectedMode(e.target.value as "demo" | "app")}
                className={cn(
                  "bg-transparent text-xs font-semibold outline-none cursor-pointer pr-1 pl-1.5 py-0.5",
                  selectedMode === "demo" ? "text-amber-700" : "text-green-700"
                )}
              >
                <option value="demo">Demo Mode — sample data</option>
                <option value="app">Live — real data</option>
              </select>
              <button
                onClick={applyMode}
                disabled={selectedMode === mode}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                  selectedMode === mode
                    ? "bg-transparent text-slate-400 cursor-not-allowed"
                    : selectedMode === "demo"
                      ? "bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-sm"
                      : "bg-green-600 text-white hover:bg-green-700 active:scale-95 shadow-sm"
                )}
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>Switch</span>
              </button>
            </div>

            <button
              onClick={() => navigate("/settings/profile")}
              className="flex items-center gap-2 md:gap-3 md:border-l md:border-border md:pl-4 hover:opacity-80 transition-opacity"
            >
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-foreground leading-none">{displayName}</span>
                <span className="text-xs text-muted-foreground mt-1">{isMaster ? "Master Admin" : "Platform Access"}</span>
              </div>
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-sm text-sm shrink-0 overflow-hidden">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
