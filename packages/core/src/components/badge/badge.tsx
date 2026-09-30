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
          "astw:border-transparent astw:bg-semantic-success-solid astw:text-semantic-success-on-solid astw:hover:bg-semantic-success-solid-hover",
        warning:
          "astw:border-transparent astw:bg-semantic-warning-solid astw:text-semantic-warning-on-solid astw:hover:bg-semantic-warning-solid-hover",
        error:
          "astw:border-transparent astw:bg-semantic-danger-solid astw:text-semantic-danger-on-solid astw:hover:bg-semantic-danger-solid-hover",
        neutral:
          "astw:border-transparent astw:bg-secondary astw:text-secondary-foreground astw:hover:bg-secondary/80",
        info: "astw:border-transparent astw:bg-semantic-info-solid astw:text-semantic-info-on-solid astw:hover:bg-semantic-info-solid-hover",
        "subtle-success":
          "astw:border-transparent astw:bg-semantic-success-surface astw:text-semantic-success-text astw:hover:bg-semantic-success-surface-hover",
        "subtle-warning":
          "astw:border-transparent astw:bg-semantic-warning-surface astw:text-semantic-warning-text astw:hover:bg-semantic-warning-surface-hover",
        "subtle-error":
          "astw:border-transparent astw:bg-semantic-danger-surface astw:text-semantic-danger-text astw:hover:bg-semantic-danger-surface-hover",
        "subtle-info":
          "astw:border-transparent astw:bg-semantic-info-surface astw:text-semantic-info-text astw:hover:bg-semantic-info-surface-hover",
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
  "outline-success": "astw:bg-semantic-success-indicator",
  "outline-warning": "astw:bg-semantic-warning-indicator",
  "outline-error": "astw:bg-semantic-danger-indicator",
  "outline-info": "astw:bg-semantic-info-indicator",
  "outline-neutral": "astw:bg-semantic-neutral-indicator",
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
