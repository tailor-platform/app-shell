import * as React from "react";
import { Drawer } from "@base-ui/react/drawer";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Side = "top" | "right" | "bottom" | "left";

const sideToSwipeDirection: Record<Side, "up" | "right" | "down" | "left"> = {
  top: "up",
  right: "right",
  bottom: "down",
  left: "left",
};

const SheetContext = React.createContext<Side>("right");

// Only the props relevant to the Sheet abstraction are picked from Drawer.Root.
// Drawer-specific props (e.g. snapPoints, dismissThreshold) are intentionally excluded
// because Sheet is not a general-purpose drawer.
type SheetRootProps = Pick<
  React.ComponentProps<typeof Drawer.Root>,
  "open" | "defaultOpen" | "onOpenChange" | "modal"
> & {
  children: React.ReactNode;
  side?: Side;
};

/**
 * The root component that manages sheet open/close state.
 * The `side` prop controls which edge of the screen the sheet slides in from.
 *
 * @example
 * ```tsx
 * <Sheet.Root side="right">
 *   <Sheet.Trigger render={<Button />}>Open</Sheet.Trigger>
 *   <Sheet.Content>
 *     <Sheet.Header>
 *       <Sheet.Title>Settings</Sheet.Title>
 *       <Sheet.Description>Manage your preferences.</Sheet.Description>
 *     </Sheet.Header>
 *     <Sheet.Footer>
 *       <Button>Save</Button>
 *     </Sheet.Footer>
 *   </Sheet.Content>
 * </Sheet.Root>
 * ```
 */
function Root({ side = "right", ...props }: SheetRootProps) {
  return (
    <SheetContext.Provider value={side}>
      <Drawer.Root data-slot="sheet" swipeDirection={sideToSwipeDirection[side]} {...props} />
    </SheetContext.Provider>
  );
}
Root.displayName = "Sheet.Root";

/** The element that opens the sheet when clicked. */
function Trigger({ ...props }: React.ComponentProps<typeof Drawer.Trigger>) {
  return <Drawer.Trigger data-slot="sheet-trigger" {...props} />;
}
Trigger.displayName = "Sheet.Trigger";

/** A button that closes the sheet. */
function Close({ ...props }: React.ComponentProps<typeof Drawer.Close>) {
  return <Drawer.Close data-slot="sheet-close" {...props} />;
}
Close.displayName = "Sheet.Close";

/** @internal Renders sheet content into a React portal. */
function Portal({ ...props }: React.ComponentProps<typeof Drawer.Portal>) {
  return <Drawer.Portal data-slot="sheet-portal" {...props} />;
}
Portal.displayName = "Sheet.Portal";

/** The backdrop overlay that appears behind the sheet. */
function Overlay({ className, ...props }: React.ComponentProps<typeof Drawer.Backdrop>) {
  return (
    <Drawer.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:fill-mode-forwards astw:fixed astw:inset-0 astw:z-50 astw:bg-black/50",
        className,
      )}
      {...props}
    />
  );
}
Overlay.displayName = "Sheet.Overlay";

/** The main sheet panel. The `side` is inherited from `Sheet.Root` via context. */
function Content({ className, children, ...props }: React.ComponentProps<typeof Drawer.Popup>) {
  // `side` is controlled by `Root` via context, not accepted as a prop, to keep swipe direction and CSS position in sync.
  const side = React.useContext(SheetContext);

  return (
    <Portal>
      <Overlay />
      <Drawer.Viewport
        data-slot="sheet-viewport"
        className={cn(
          "astw:fixed astw:inset-0 astw:z-50 astw:flex",
          side === "right" && "astw:items-stretch astw:justify-end",
          side === "left" && "astw:items-stretch astw:justify-start",
          side === "top" && "astw:items-start astw:justify-stretch",
          side === "bottom" && "astw:items-end astw:justify-stretch",
        )}
      >
        <Drawer.Popup
          data-slot="sheet-content"
          className={cn(
            "astw:bg-background astw:flex astw:flex-col astw:gap-4 astw:shadow-lg astw:transition-transform astw:ease-[cubic-bezier(0.32,0.72,0,1)] astw:duration-[450ms]",
            side === "right" &&
              "astw:h-full astw:w-3/4 astw:border-l astw:sm:max-w-sm astw:[transform:translateX(var(--drawer-swipe-movement-x))] astw:data-ending-style:[transform:translateX(100%)] astw:data-starting-style:[transform:translateX(100%)]",
            side === "left" &&
              "astw:h-full astw:w-3/4 astw:border-r astw:sm:max-w-sm astw:[transform:translateX(var(--drawer-swipe-movement-x))] astw:data-ending-style:[transform:translateX(-100%)] astw:data-starting-style:[transform:translateX(-100%)]",
            side === "top" &&
              "astw:w-full astw:h-auto astw:border-b astw:[transform:translateY(var(--drawer-swipe-movement-y))] astw:data-ending-style:[transform:translateY(-100%)] astw:data-starting-style:[transform:translateY(-100%)]",
            side === "bottom" &&
              "astw:w-full astw:h-auto astw:border-t astw:[transform:translateY(var(--drawer-swipe-movement-y))] astw:data-ending-style:[transform:translateY(100%)] astw:data-starting-style:[transform:translateY(100%)]",
            "astw:data-swiping:select-none",
            className,
          )}
          {...props}
        >
          <Drawer.Content data-slot="sheet-inner-content" className="astw:contents">
            {children}
          </Drawer.Content>
          <Drawer.Close className="astw:ring-offset-bg astw:focus:ring-ring astw:data-open:bg-secondary astw:absolute astw:top-4 astw:right-4 astw:rounded-xs astw:opacity-70 astw:transition-opacity astw:hover:opacity-100 astw:focus:ring-2 astw:focus:ring-offset-2 astw:focus:outline-hidden astw:disabled:pointer-events-none">
            <XIcon className="astw:size-4" />
            <span className="astw:sr-only">Close</span>
          </Drawer.Close>
        </Drawer.Popup>
      </Drawer.Viewport>
    </Portal>
  );
}
Content.displayName = "Sheet.Content";

/** A layout wrapper for the sheet title and description. */
function Header({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("astw:flex astw:flex-col astw:gap-1.5 astw:p-4", className)}
      {...props}
    />
  );
}
Header.displayName = "Sheet.Header";

/** A layout wrapper for sheet action buttons, typically placed at the bottom. */
function Footer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("astw:mt-auto astw:flex astw:flex-col astw:gap-2 astw:p-4", className)}
      {...props}
    />
  );
}
Footer.displayName = "Sheet.Footer";

/** The title of the sheet, announced by screen readers. */
function Title({ className, ...props }: React.ComponentProps<typeof Drawer.Title>) {
  return (
    <Drawer.Title
      data-slot="sheet-title"
      className={cn("astw:text-foreground astw:font-semibold", className)}
      {...props}
    />
  );
}
Title.displayName = "Sheet.Title";

/** A description that provides additional context for the sheet. */
function Description({ className, ...props }: React.ComponentProps<typeof Drawer.Description>) {
  return (
    <Drawer.Description
      data-slot="sheet-description"
      className={cn("astw:text-muted-foreground astw:text-sm", className)}
      {...props}
    />
  );
}
Description.displayName = "Sheet.Description";

export const Sheet = {
  Root,
  Trigger,
  Close,
  Content,
  Header,
  Footer,
  Title,
  Description,
};
