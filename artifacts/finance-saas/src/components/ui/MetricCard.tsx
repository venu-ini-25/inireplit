import { ReactNode } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, formatPercentage } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: ReactNode;
  delay?: number;
}

export function MetricCard({ title, value, change, icon, delay = 0 }: MetricCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const isNeutral = !change || change === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors"
    >
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500 text-primary">
        {icon}
      </div>
      
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-muted/50 text-muted-foreground border border-white/5">
          {icon}
        </div>
        <h3 className="font-medium text-muted-foreground text-sm">{title}</h3>
      </div>
      
      <div className="flex items-baseline gap-3">
        <h2 className="text-3xl font-display font-bold text-foreground">{value}</h2>
      </div>

      {change !== undefined && (
        <div className="mt-4 flex items-center gap-1.5 text-sm">
          <span
            className={cn(
              "flex items-center gap-0.5 font-medium px-2 py-0.5 rounded-md",
              isPositive && "bg-success/10 text-success",
              isNegative && "bg-destructive/10 text-destructive",
              isNeutral && "bg-muted text-muted-foreground"
            )}
          >
            {isPositive && <TrendingUp className="w-3.5 h-3.5" />}
            {isNegative && <TrendingDown className="w-3.5 h-3.5" />}
            {isNeutral && <Minus className="w-3.5 h-3.5" />}
            {formatPercentage(Math.abs(change))}
          </span>
          <span className="text-muted-foreground">vs last period</span>
        </div>
      )}
    </motion.div>
  );
}

export function MetricCardSkeleton({ delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="glass-card rounded-2xl p-6 border-white/5"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
        <div className="w-24 h-4 rounded bg-muted animate-pulse" />
      </div>
      <div className="w-32 h-8 rounded bg-muted animate-pulse mb-4" />
      <div className="w-20 h-5 rounded bg-muted animate-pulse" />
    </motion.div>
  );
}
