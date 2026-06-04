import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  MessageCircleIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import { cn } from "../lib/utils";

const alertVariants = cva(
  "astw:relative astw:w-full astw:rounded-lg astw:border astw:px-4 astw:py-3 astw:text-sm astw:grid astw:grid-cols-[calc(var(--spacing)*4.5)_1fr_auto] astw:gap-x-3 astw:gap-y-0.5 astw:items-start astw:[&>svg]:size-[17.5px] astw:[&>svg]:self-center astw:[&>svg]:shrink-0 astw:[&>svg]:text-current",
  {
    variants: {
      variant: {
        neutral:
          "astw:bg-secondary astw:text-secondary-foreground astw:border-border *:data-[slot=alert-description]:astw:text-muted-foreground",
        success:
          "astw:bg-green-500/10 astw:text-green-700 astw:border-green-500/20 dark:astw:text-green-400 *:data-[slot=alert-description]:astw:text-green-700/80 dark:*:data-[slot=alert-description]:astw:text-green-400/80",
        warning:
          "astw:bg-yellow-500/10 astw:text-yellow-700 astw:border-yellow-500/20 dark:astw:text-yellow-500 *:data-[slot=alert-description]:astw:text-yellow-700/80 dark:*:data-[slot=alert-description]:astw:text-yellow-500/80",
        error:
          "astw:bg-destructive/10 astw:text-destructive astw:border-destructive/20 *:data-[slot=alert-description]:astw:text-destructive/80",
        info: "astw:bg-blue-500/10 astw:text-blue-700 astw:border-blue-500/20 dark:astw:text-blue-400 *:data-[slot=alert-description]:astw:text-blue-700/80 dark:*:data-[slot=alert-description]:astw:text-blue-400/80",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

const variantIcons: Record<
  NonNullable<VariantProps<typeof alertVariants>["variant"]>,
  React.ElementType
> = {
  neutral: MessageCircleIcon,
  success: CheckCircleIcon,
  warning: AlertTriangleIcon,
  error: XCircleIcon,
  info: InfoIcon,
};

type RootProps = React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    action?: React.ReactNode;
    dismissible?: boolean;
    onDismiss?: () => void;
  };

function Root({
  className,
  variant = "neutral",
  action,
  dismissible,
  onDismiss,
  children,
  ...props
}: RootProps) {
  const [visible, setVisible] = React.useState(true);
  const Icon = variantIcons[variant ?? "neutral"];

  const handleDismiss = React.useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon />
      {children}
      {action && (
        <div
          data-slot="alert-action"
          className="astw:col-start-2 astw:flex astw:items-center astw:gap-2 astw:mt-2"
        >
          {action}
        </div>
      )}
      {dismissible && (
        <button
          data-slot="alert-dismiss"
          type="button"
          onClick={handleDismiss}
          className="astw:col-start-3 astw:row-span-full astw:self-center astw:inline-flex astw:items-center astw:justify-center astw:rounded-md astw:p-1 astw:opacity-70 astw:transition-opacity hover:astw:opacity-100 focus-visible:astw:outline-none focus-visible:astw:ring-2 focus-visible:astw:ring-ring"
          aria-label="Dismiss"
        >
          <XIcon className="astw:size-4" />
        </button>
      )}
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
