import * as React from "react";
import {
  Dialog as BaseDialog,
  DialogRootProps as BaseDialogRootProps,
} from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// Only the props relevant to the Dialog abstraction are picked from BaseDialog.Root.
// Base UI-internal props (e.g. dismissible, animated) are intentionally excluded
// so that upstream changes don't leak as breaking changes to consumers.
type DialogRootProps = Pick<
  BaseDialogRootProps,
  "open" | "defaultOpen" | "onOpenChange" | "modal"
> & {
  children: React.ReactNode;
};

/**
 * The root component that manages dialog open/close state.
 *
 * @example
 * ```tsx
 * <Dialog.Root>
 *   <Dialog.Trigger render={<Button />}>Open</Dialog.Trigger>
 *   <Dialog.Content>
 *     <Dialog.Header>
 *       <Dialog.Title>Are you sure?</Dialog.Title>
 *       <Dialog.Description>This action cannot be undone.</Dialog.Description>
 *     </Dialog.Header>
 *     <Dialog.Footer>
 *       <Button variant="outline">Cancel</Button>
 *       <Button>Confirm</Button>
 *     </Dialog.Footer>
 *   </Dialog.Content>
 * </Dialog.Root>
 * ```
 */
function Root({ ...props }: DialogRootProps) {
  return <BaseDialog.Root data-slot="dialog" {...props} />;
}
Root.displayName = "Dialog.Root";

/** The element that opens the dialog when clicked. */
function Trigger({ ...props }: React.ComponentProps<typeof BaseDialog.Trigger>) {
  return <BaseDialog.Trigger data-slot="dialog-trigger" {...props} />;
}
Trigger.displayName = "Dialog.Trigger";

/** @internal Renders dialog content into a React portal. */
function Portal({ ...props }: React.ComponentProps<typeof BaseDialog.Portal>) {
  return <BaseDialog.Portal data-slot="dialog-portal" {...props} />;
}
Portal.displayName = "Dialog.Portal";

/** A button that closes the dialog. */
function Close({ ...props }: React.ComponentProps<typeof BaseDialog.Close>) {
  return <BaseDialog.Close data-slot="dialog-close" {...props} />;
}
Close.displayName = "Dialog.Close";

/** @internal The backdrop overlay that appears behind the dialog. */
function Overlay({ className, ...props }: React.ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:fill-mode-forwards astw:fixed astw:inset-0 astw:z-50 astw:bg-black/50",
        className,
      )}
      {...props}
    />
  );
}
Overlay.displayName = "Dialog.Overlay";

/** The main dialog panel that contains the dialog content. Automatically includes a close button and overlay. */
function Content({ className, children, ...props }: React.ComponentProps<typeof BaseDialog.Popup>) {
  return (
    <Portal data-slot="dialog-portal">
      <Overlay />
      <BaseDialog.Popup
        data-slot="dialog-content"
        className={cn(
          "astw:bg-background astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:data-ending-style:zoom-out-95 astw:data-open:zoom-in-95 astw:fill-mode-forwards astw:fixed astw:top-[50%] astw:left-[50%] astw:z-50 astw:grid astw:w-full astw:max-w-[calc(100%-2rem)] astw:translate-x-[-50%] astw:translate-y-[-50%] astw:gap-4 astw:rounded-lg astw:border astw:p-6 astw:shadow-lg astw:duration-200 astw:sm:max-w-lg",
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
    </Portal>
  );
}
Content.displayName = "Dialog.Content";

/** A layout wrapper for the dialog title and description. */
function Header({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "astw:flex astw:flex-col astw:gap-2 astw:text-center astw:sm:text-left",
        className,
      )}
      {...props}
    />
  );
}
Header.displayName = "Dialog.Header";

/** A layout wrapper for dialog action buttons, typically placed at the bottom. */
function Footer({ className, ...props }: React.ComponentProps<"div">) {
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
Footer.displayName = "Dialog.Footer";

/** The title of the dialog, announced by screen readers. */
function Title({ className, ...props }: React.ComponentProps<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      data-slot="dialog-title"
      className={cn("astw:text-lg astw:leading-none astw:font-semibold", className)}
      {...props}
    />
  );
}
Title.displayName = "Dialog.Title";

/** A description that provides additional context for the dialog. */
function Description({ className, ...props }: React.ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description
      data-slot="dialog-description"
      className={cn("astw:text-muted-foreground astw:text-sm", className)}
      {...props}
    />
  );
}
Description.displayName = "Dialog.Description";

export const Dialog = {
  Root,
  Close,
  Content,
  Description,
  Footer,
  Header,
  Title,
  Trigger,
};
