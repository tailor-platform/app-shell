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
import { cn } from "../../lib/utils";

const alertVariants = cva(
  "astw:relative astw:w-full astw:rounded-lg astw:border astw:px-4 astw:py-3 astw:text-sm astw:grid astw:grid-cols-[calc(var(--spacing)*4.5)_1fr_auto] astw:gap-x-3 astw:gap-y-0.5 astw:items-start astw:[&>svg]:size-[17.5px] astw:[&>svg]:self-center astw:[&>svg]:shrink-0 astw:[&>svg]:text-current",
  {
    variants: {
      /** Visual style and automatic icon */
      variant: {
        // Each variant reads the semantic colour roles of its intent. The
        // description inherits the title colour; only neutral mutes it.
        neutral:
          "astw:bg-neutral-surface astw:text-neutral-text astw:border-neutral-border astw:*:data-[slot=alert-description]:text-muted-foreground",
        success: "astw:bg-success-surface astw:text-success-text astw:border-success-border",
        warning: "astw:bg-warning-surface astw:text-warning-text astw:border-warning-border",
        error: "astw:bg-danger-surface astw:text-danger-text astw:border-danger-border",
        info: "astw:bg-info-surface astw:text-info-text astw:border-info-border",
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
    /** Action element rendered below the description */
    action?: React.ReactNode;
    /** Shows a dismiss button; hides the alert when clicked */
    dismissible?: boolean;
    /** Callback invoked when the dismiss button is clicked */
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
          className="astw:col-start-3 astw:row-span-full astw:self-center astw:inline-flex astw:items-center astw:justify-center astw:rounded-md astw:p-1 astw:opacity-70 astw:transition-opacity astw:hover:opacity-100 astw:focus-visible:outline-none astw:focus-visible:ring-2 astw:focus-visible:ring-ring"
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
        "astw:col-start-2 astw:grid astw:justify-items-start astw:gap-1 astw:text-sm astw:[&_p]:leading-relaxed",
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
