import * as React from "react";
import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";

import { cn } from "@/lib/utils";

function AlertDialogRoot({ ...props }: React.ComponentProps<typeof BaseAlertDialog.Root>) {
  return <BaseAlertDialog.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({ ...props }: React.ComponentProps<typeof BaseAlertDialog.Trigger>) {
  return <BaseAlertDialog.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseAlertDialog.Popup>) {
  return (
    <BaseAlertDialog.Portal>
      <BaseAlertDialog.Backdrop
        data-slot="alert-dialog-overlay"
        className="astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:fixed astw:inset-0 astw:z-50 astw:bg-black/50"
      />
      <BaseAlertDialog.Popup
        data-slot="alert-dialog-content"
        className={cn(
          "astw:bg-background astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:data-ending-style:zoom-out-95 astw:data-open:zoom-in-95 astw:fixed astw:top-[50%] astw:left-[50%] astw:z-50 astw:grid astw:w-full astw:max-w-[calc(100%-2rem)] astw:translate-x-[-50%] astw:translate-y-[-50%] astw:gap-4 astw:rounded-lg astw:border astw:p-6 astw:shadow-lg astw:duration-200 astw:sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
      </BaseAlertDialog.Popup>
    </BaseAlertDialog.Portal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "astw:flex astw:flex-col astw:gap-2 astw:text-center astw:sm:text-left",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "astw:flex astw:flex-col-reverse astw:gap-2 astw:sm:flex-row astw:sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof BaseAlertDialog.Title>) {
  return (
    <BaseAlertDialog.Title
      data-slot="alert-dialog-title"
      className={cn("astw:text-lg astw:leading-none astw:font-semibold", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof BaseAlertDialog.Description>) {
  return (
    <BaseAlertDialog.Description
      data-slot="alert-dialog-description"
      className={cn("astw:text-muted-foreground astw:text-sm", className)}
      {...props}
    />
  );
}

function AlertDialogAction({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="alert-dialog-action"
      className={cn(
        "astw:inline-flex astw:items-center astw:justify-center astw:gap-2 astw:whitespace-nowrap astw:rounded-md astw:text-sm astw:font-medium astw:outline-none astw:transition-colors",
        "astw:bg-primary astw:text-primary-foreground astw:shadow-xs astw:hover:bg-primary/90",
        "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:h-9 astw:px-4 astw:py-2",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof BaseAlertDialog.Close>) {
  return (
    <BaseAlertDialog.Close
      data-slot="alert-dialog-cancel"
      className={cn(
        "astw:inline-flex astw:items-center astw:justify-center astw:gap-2 astw:whitespace-nowrap astw:rounded-md astw:text-sm astw:font-medium astw:outline-none astw:transition-colors",
        "astw:border astw:border-input astw:bg-background astw:shadow-xs astw:hover:bg-accent astw:hover:text-accent-foreground",
        "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:h-9 astw:px-4 astw:py-2",
        className,
      )}
      {...props}
    />
  );
}

const AlertDialog = {
  Root: AlertDialogRoot,
  Trigger: AlertDialogTrigger,
  Content: AlertDialogContent,
  Header: AlertDialogHeader,
  Footer: AlertDialogFooter,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Action: AlertDialogAction,
  Cancel: AlertDialogCancel,
};

export { AlertDialog };
