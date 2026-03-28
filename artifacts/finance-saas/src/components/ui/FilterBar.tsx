import { cn } from "@/lib/utils";

interface FilterBarProps {
  options: string[];
  active: string;
  onChange: (opt: string) => void;
  className?: string;
}

export function FilterBar({ options, active, onChange, className }: FilterBarProps) {
  return (
    <div className={cn("flex gap-1 bg-slate-100 p-1 rounded-lg", className)}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            active === opt
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
