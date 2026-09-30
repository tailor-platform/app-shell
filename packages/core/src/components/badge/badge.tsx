import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "astw:inline-flex astw:cursor-default astw:items-center astw:rounded-md astw:border astw:px-2 astw:py-0.5 astw:text-xs astw:font-medium astw:transition-colors astw:focus:outline-none astw:focus:ring-2 astw:focus:ring-ring astw:focus:ring-offset-2",
  {
    variants: {
      /** Visual style variant */
      variant: {
        default:
          "astw:border-transparent astw:bg-primary astw:text-primary-foreground astw:hover:bg-primary/80",
        success:
          "astw:border-transparent astw:bg-success-solid astw:text-success-contrast astw:hover:bg-success-solid-hover",
        warning:
          "astw:border-transparent astw:bg-warning-solid astw:text-warning-contrast astw:hover:bg-warning-solid-hover",
        error:
          "astw:border-transparent astw:bg-danger-solid astw:text-danger-contrast astw:hover:bg-danger-solid-hover",
        neutral:
          "astw:border-transparent astw:bg-secondary astw:text-secondary-foreground astw:hover:bg-secondary/80",
        info: "astw:border-transparent astw:bg-info-solid astw:text-info-contrast astw:hover:bg-info-solid-hover",
        "subtle-success":
          "astw:border-transparent astw:bg-success-surface astw:text-success-text astw:hover:bg-success-surface-hover",
        "subtle-warning":
          "astw:border-transparent astw:bg-warning-surface astw:text-warning-text astw:hover:bg-warning-surface-hover",
        "subtle-error":
          "astw:border-transparent astw:bg-danger-surface astw:text-danger-text astw:hover:bg-danger-surface-hover",
        "subtle-info":
          "astw:border-transparent astw:bg-info-surface astw:text-info-text astw:hover:bg-info-surface-hover",
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
  "outline-success": "astw:bg-success-indicator",
  "outline-warning": "astw:bg-warning-indicator",
  "outline-error": "astw:bg-danger-indicator",
  "outline-info": "astw:bg-info-indicator",
  "outline-neutral": "astw:bg-neutral-indicator",
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
