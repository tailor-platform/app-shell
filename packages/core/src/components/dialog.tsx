import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Dialog({
  ...props
}: React.ComponentProps<typeof BaseDialog.Root>) {
  return <BaseDialog.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof BaseDialog.Trigger>) {
  return <BaseDialog.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof BaseDialog.Portal>) {
  return <BaseDialog.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof BaseDialog.Close>) {
  return <BaseDialog.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:fixed astw:inset-0 astw:z-50 astw:bg-black/50",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseDialog.Popup>) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <BaseDialog.Popup
        data-slot="dialog-content"
        className={cn(
          "astw:bg-background astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:data-ending-style:zoom-out-95 astw:data-open:zoom-in-95 astw:fixed astw:top-[50%] astw:left-[50%] astw:z-50 astw:grid astw:w-full astw:max-w-[calc(100%-2rem)] astw:translate-x-[-50%] astw:translate-y-[-50%] astw:gap-4 astw:rounded-lg astw:border astw:p-6 astw:shadow-lg astw:duration-200 astw:sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        <BaseDialog.Close className="astw:ring-offset-bg astw:focus:ring-ring astw:data-open:bg-accent astw:data-open:text-muted-foreground astw:absolute astw:top-4 astw:right-4 astw:rounded-xs astw:opacity-70 astw:transition-opacity astw:hover:opacity-100 astw:focus:ring-2 astw:focus:ring-offset-2 astw:focus:outline-hidden astw:disabled:pointer-events-none astw:[&_svg]:pointer-events-none astw:[&_svg]:shrink-0 astw:[&_svg:not([class*='size-'])]:size-4">
          <XIcon />
          <span className="astw:sr-only">Close</span>
        </BaseDialog.Close>
      </BaseDialog.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("astw:flex astw:flex-col astw:gap-2 astw:text-center astw:sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "astw:flex astw:flex-col-reverse astw:gap-2 astw:sm:flex-row astw:sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      data-slot="dialog-title"
      className={cn("astw:text-lg astw:leading-none astw:font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description
      data-slot="dialog-description"
      className={cn("astw:text-muted-foreground astw:text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
