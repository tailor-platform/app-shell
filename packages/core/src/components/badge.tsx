import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "astw:inline-flex astw:items-center astw:rounded-md astw:border astw:px-2 astw:py-0.5 astw:text-xs astw:font-medium astw:transition-colors astw:focus:outline-none astw:focus:ring-2 astw:focus:ring-ring astw:focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "astw:border-transparent astw:bg-blue-500/10 astw:text-blue-700 astw:dark:text-blue-500 astw:hover:bg-blue-500/20",
        success:
          "astw:border-transparent astw:bg-green-500/10 astw:text-green-700 astw:dark:text-green-500 astw:hover:bg-green-500/20",
        warning:
          "astw:border-transparent astw:bg-yellow-500/10 astw:text-yellow-700 astw:dark:text-yellow-500 astw:hover:bg-yellow-500/20",
        error:
          "astw:border-transparent astw:bg-destructive/10 astw:text-destructive astw:hover:bg-destructive/20",
        neutral:
          "astw:border-transparent astw:bg-secondary/50 astw:text-secondary-foreground astw:hover:bg-secondary/70",
        // Outline variants with status dots - matches Figma design
        "outline-success":
          "astw:gap-0.5 astw:pl-1.5 astw:pr-2 astw:border-border astw:bg-card astw:text-foreground",
        "outline-warning":
          "astw:gap-0.5 astw:pl-1.5 astw:pr-2 astw:border-border astw:bg-card astw:text-foreground",
        "outline-error":
          "astw:gap-0.5 astw:pl-1.5 astw:pr-2 astw:border-border astw:bg-card astw:text-foreground",
        "outline-info":
          "astw:gap-0.5 astw:pl-1.5 astw:pr-2 astw:border-border astw:bg-card astw:text-foreground",
        "outline-neutral":
          "astw:gap-0.5 astw:pl-1.5 astw:pr-2 astw:border-border astw:bg-card astw:text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// Status dot colors for outline variants
const statusDotColors: Record<string, string> = {
  "outline-success": "astw:bg-green-500",
  "outline-warning": "astw:bg-orange-500",
  "outline-error": "astw:bg-red-500",
  "outline-info": "astw:bg-blue-500",
  "outline-neutral": "astw:bg-neutral-400",
};

function StatusDot({ variant }: { variant: string }) {
  const dotColor = statusDotColors[variant];
  if (!dotColor) return null;

  return (
    <div className="astw:size-3 astw:shrink-0 astw:flex astw:items-center astw:justify-center">
      <div className={cn("astw:size-1.75 astw:rounded-full", dotColor)} />
    </div>
  );
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  const isOutline = variant?.toString().startsWith("outline-");

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {isOutline && <StatusDot variant={variant as string} />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
export default Badge;
