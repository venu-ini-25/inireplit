import { ReactNode } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  isPositiveGood?: boolean;
  icon?: ReactNode;
  iconBg?: string;
  subtitle?: string;
}

export function KpiCard({
  title,
  value,
  change,
  changeLabel = "vs last period",
  isPositiveGood = true,
  icon,
  iconBg = "bg-blue-50 text-primary",
  subtitle,
}: KpiCardProps) {
  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;
  const isGood = isPositiveGood ? isUp : isDown;
  const isBad = isPositiveGood ? isDown : isUp;

  return (
    <div className="bg-white p-5 rounded-xl border border-border shadow-sm flex flex-col gap-2">
      <div className="text-sm text-muted-foreground font-medium">{title}</div>
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {icon && (
          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", iconBg)}>
            {icon}
          </div>
        )}
      </div>
      {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      {change !== undefined && (
        <div className="flex items-center gap-1 text-sm">
          <span
            className={cn(
              "flex items-center font-medium gap-0.5",
              isGood && "text-success",
              isBad && "text-destructive",
              !isGood && !isBad && "text-muted-foreground"
            )}
          >
            {isUp && <ArrowUp className="w-3 h-3" />}
            {isDown && <ArrowDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
          <span className="text-muted-foreground text-xs">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}
