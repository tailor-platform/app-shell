import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircleIcon, CheckCircleIcon, InfoIcon, XCircleIcon } from "lucide-react";
import { cn } from "../lib/utils";

const alertVariants = cva(
  "astw:relative astw:w-full astw:rounded-lg astw:border astw:px-4 astw:py-3 astw:text-sm astw:grid astw:grid-cols-[calc(var(--spacing)*4.5)_1fr] astw:gap-x-3 astw:gap-y-0.5 astw:items-start astw:[&>svg]:size-[17.5px] astw:[&>svg]:self-center astw:[&>svg]:shrink-0 astw:[&>svg]:text-current",
  {
    variants: {
      variant: {
        default:
          "astw:bg-primary/10 astw:text-primary astw:border-primary/20 *:data-[slot=alert-description]:astw:text-primary/80",
        success:
          "astw:bg-green-500/10 astw:text-green-700 astw:border-green-500/20 dark:astw:text-green-400 *:data-[slot=alert-description]:astw:text-green-700/80 dark:*:data-[slot=alert-description]:astw:text-green-400/80",
        error:
          "astw:bg-destructive/10 astw:text-destructive astw:border-destructive/20 *:data-[slot=alert-description]:astw:text-destructive/80",
        neutral:
          "astw:bg-secondary astw:text-secondary-foreground astw:border-border *:data-[slot=alert-description]:astw:text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const variantIcons: Record<
  NonNullable<VariantProps<typeof alertVariants>["variant"]>,
  React.ElementType
> = {
  default: AlertCircleIcon,
  success: CheckCircleIcon,
  error: XCircleIcon,
  neutral: InfoIcon,
};

type RootProps = React.ComponentProps<"div"> & VariantProps<typeof alertVariants>;

function Root({ className, variant = "default", children, ...props }: RootProps) {
  const Icon = variantIcons[variant ?? "default"];
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon />
      {children}
    </div>
  );
}
Root.displayName = "Alert.Root";

function Title({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "astw:col-start-2 astw:line-clamp-1 astw:min-h-4 astw:font-medium astw:tracking-tight",
        className,
      )}
      {...props}
    />
  );
}
Title.displayName = "Alert.Title";

function Description({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "astw:col-start-2 astw:grid astw:justify-items-start astw:gap-1 astw:text-sm [&_p]:astw:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}
Description.displayName = "Alert.Description";

export type AlertProps = RootProps;
export const Alert = { Root, Title, Description };
export { alertVariants };
