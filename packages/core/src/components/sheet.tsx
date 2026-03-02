import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Sheet({ ...props }: React.ComponentProps<typeof BaseDialog.Root>) {
  return <BaseDialog.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof BaseDialog.Trigger>) {
  return <BaseDialog.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof BaseDialog.Close>) {
  return <BaseDialog.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof BaseDialog.Portal>) {
  return <BaseDialog.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:fixed astw:inset-0 astw:z-50 astw:bg-black/50",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof BaseDialog.Popup> & {
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <BaseDialog.Popup
        data-slot="sheet-content"
        className={cn(
          "astw:bg-background astw:data-open:animate-in astw:data-ending-style:animate-out astw:fixed astw:z-50 astw:flex astw:flex-col astw:gap-4 astw:shadow-lg astw:transition astw:ease-in-out astw:data-ending-style:duration-300 astw:data-open:duration-500",
          side === "right" &&
            "astw:data-ending-style:slide-out-to-right astw:data-open:slide-in-from-right astw:inset-y-0 astw:right-0 astw:h-full astw:w-3/4 astw:border-l astw:sm:max-w-sm",
          side === "left" &&
            "astw:data-ending-style:slide-out-to-left astw:data-open:slide-in-from-left astw:inset-y-0 astw:left-0 astw:h-full astw:w-3/4 astw:border-r astw:sm:max-w-sm",
          side === "top" &&
            "astw:data-ending-style:slide-out-to-top astw:data-open:slide-in-from-top astw:inset-x-0 astw:top-0 astw:h-auto astw:border-b",
          side === "bottom" &&
            "astw:data-ending-style:slide-out-to-bottom astw:data-open:slide-in-from-bottom astw:inset-x-0 astw:bottom-0 astw:h-auto astw:border-t",
          className,
        )}
        {...props}
      >
        {children}
        <BaseDialog.Close className="astw:ring-offset-bg astw:focus:ring-ring astw:data-open:bg-secondary astw:absolute astw:top-4 astw:right-4 astw:rounded-xs astw:opacity-70 astw:transition-opacity astw:hover:opacity-100 astw:focus:ring-2 astw:focus:ring-offset-2 astw:focus:outline-hidden astw:disabled:pointer-events-none">
          <XIcon className="astw:size-4" />
          <span className="astw:sr-only">Close</span>
        </BaseDialog.Close>
      </BaseDialog.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("astw:flex astw:flex-col astw:gap-1.5 astw:p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("astw:mt-auto astw:flex astw:flex-col astw:gap-2 astw:p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      data-slot="sheet-title"
      className={cn("astw:text-foreground astw:font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description
      data-slot="sheet-description"
      className={cn("astw:text-muted-foreground astw:text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
