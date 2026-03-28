import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Wallet, 
  LineChart, 
  Settings, 
  LogOut,
  Hexagon
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: LineChart },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 h-screen sticky top-0 left-0 flex flex-col glass-panel z-40">
      <div className="h-20 flex items-center px-6 border-b border-border/50">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center shadow-lg shadow-primary/20">
            <Hexagon className="w-6 h-6 text-white fill-white/20" />
          </div>
          <span className="font-display font-bold text-xl tracking-wide text-foreground">
            FinTech<span className="text-primary">Pro</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 py-8 px-4 flex flex-col gap-2">
        <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Main Menu
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              )}
              <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-primary")} />
              {item.label}
            </Link>
          );
        })}

        <div className="px-3 mt-8 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Preferences
        </div>
        <button className="flex items-center gap-3 px-3 py-3 rounded-xl font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200 group text-left">
          <Settings className="w-5 h-5 transition-transform group-hover:rotate-45" />
          Settings
        </button>
      </div>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group">
          <img 
            src={`${import.meta.env.BASE_URL}images/avatar-placeholder.png`} 
            alt="User avatar" 
            className="w-10 h-10 rounded-full border-2 border-border object-cover"
          />
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-foreground truncate">Alex Morgan</p>
            <p className="text-xs text-muted-foreground truncate">alex@fintech.pro</p>
          </div>
          <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors" />
        </div>
      </div>
    </aside>
  );
}
