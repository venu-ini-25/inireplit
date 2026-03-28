import { Sidebar } from "./Sidebar";
import { Search, Bell, RotateCw } from "lucide-react";
import { useLocation } from "wouter";
import { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header matching screenshot 1 */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 shrink-0">
          <div className="flex-1 flex items-center">
            {/* Search Input */}
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search portfolios, companies..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-transparent focus:bg-white focus:border-border rounded-md text-sm outline-none transition-all placeholder:text-muted-foreground"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Data Synced</span>
            </div>
            
            <button className="relative p-1 text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full border border-white"></span>
            </button>
            
            <div className="flex items-center gap-3 border-l border-border pl-6">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-foreground leading-none">venu@venuvegi.com</span>
                <span className="text-xs text-muted-foreground mt-1">Business Access</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-medium shadow-sm">
                V
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 relative bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
