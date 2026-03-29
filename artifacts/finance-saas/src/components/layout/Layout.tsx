import { Sidebar } from "./Sidebar";
import { Search, Bell, RotateCw, Menu } from "lucide-react";
import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";

const ADMIN_EMAILS = ["venu.vegi@inventninvest.com"];

export function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useUser();

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const displayName = user?.fullName || user?.firstName || userEmail;
  const initials = (user?.firstName || userEmail || "U").charAt(0).toUpperCase();
  const isMaster = ADMIN_EMAILS.includes(userEmail);

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
            <div className="relative w-full max-w-xs md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search portfolios, companies..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-transparent focus:bg-white focus:border-border rounded-md text-sm outline-none transition-all placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6 shrink-0">
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Data Synced</span>
            </div>

            <button className="relative p-1 text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full border border-white" />
            </button>

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
    </div>
  );
}
