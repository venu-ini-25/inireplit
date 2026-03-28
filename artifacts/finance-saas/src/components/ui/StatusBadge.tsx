import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary border border-primary/20",
        success:
          "bg-success/10 text-success border border-success/20",
        warning:
          "bg-warning/10 text-warning border border-warning/20",
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/20",
        muted:
          "bg-muted text-muted-foreground border border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  status: string;
}

export function StatusBadge({ className, variant, status, ...props }: StatusBadgeProps) {
  let mappedVariant = variant;

  if (!variant) {
    const s = status.toLowerCase();
    if (s === "completed" || s === "active" || s === "income") mappedVariant = "success";
    else if (s === "pending" || s === "frozen") mappedVariant = "warning";
    else if (s === "failed" || s === "cancelled" || s === "expense") mappedVariant = "destructive";
    else if (s === "inactive" || s === "transfer") mappedVariant = "muted";
    else mappedVariant = "default";
  }

  return (
    <div className={cn(badgeVariants({ variant: mappedVariant }), className)} {...props}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </div>
  );
}
