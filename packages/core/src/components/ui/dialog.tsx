import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "astw:data-[state=open]:animate-in astw:data-[state=closed]:animate-out astw:data-[state=closed]:fade-out-0 astw:data-[state=open]:fade-in-0 astw:fixed astw:inset-0 astw:z-50 astw:bg-black/50",
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
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "astw:bg-background astw:data-[state=open]:animate-in astw:data-[state=closed]:animate-out astw:data-[state=closed]:fade-out-0 astw:data-[state=open]:fade-in-0 astw:data-[state=closed]:zoom-out-95 astw:data-[state=open]:zoom-in-95 astw:fixed astw:top-[50%] astw:left-[50%] astw:z-50 astw:grid astw:w-full astw:max-w-[calc(100%-2rem)] astw:translate-x-[-50%] astw:translate-y-[-50%] astw:gap-4 astw:rounded-lg astw:border astw:p-6 astw:shadow-lg astw:duration-200 astw:sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="astw:ring-offset-bg astw:focus:ring-ring astw:data-[state=open]:bg-accent astw:data-[state=open]:text-muted-foreground astw:absolute astw:top-4 astw:right-4 astw:rounded-xs astw:opacity-70 astw:transition-opacity astw:hover:opacity-100 astw:focus:ring-2 astw:focus:ring-offset-2 astw:focus:outline-hidden astw:disabled:pointer-events-none astw:[&_svg]:pointer-events-none astw:[&_svg]:shrink-0 astw:[&_svg:not([class*='size-'])]:size-4">
          <XIcon />
          <span className="astw:sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
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
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("astw:text-lg astw:leading-none astw:font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
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
