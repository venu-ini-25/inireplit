import { cn } from "@/lib/utils";

interface PageTabsProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  className?: string;
}

export function PageTabs({ tabs, active, onChange, className }: PageTabsProps) {
  return (
    <div className={cn("flex gap-1 border-b border-border", className)}>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            active === tab
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-slate-300"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
