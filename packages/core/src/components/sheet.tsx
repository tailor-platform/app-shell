import * as React from "react";
import { Drawer } from "@base-ui/react/drawer";
import { ChevronsRight, ChevronsLeft, ChevronsUp, ChevronsDown } from "lucide-react";

import { cn } from "@/lib/utils";

const sideToCloseIcon: Record<Side, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  right: ChevronsRight,
  left: ChevronsLeft,
  top: ChevronsUp,
  bottom: ChevronsDown,
};

type Side = "top" | "right" | "bottom" | "left";
type Size = "sm" | "md" | "lg" | "xl" | "full";

const sideToSwipeDirection: Record<Side, "up" | "right" | "down" | "left"> = {
  top: "up",
  right: "right",
  bottom: "down",
  left: "left",
};

const sizeClasses: Record<Size, string> = {
  sm: "astw:sm:max-w-[24rem]",
  md: "astw:sm:max-w-[32rem]",
  lg: "astw:sm:max-w-[45rem]",
  xl: "astw:sm:max-w-[60rem]",
  full: "astw:w-full astw:max-w-full",
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
        "astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:fill-mode-forwards astw:fixed astw:inset-0 astw:z-(--z-overlay) astw:bg-black/50",
        className,
      )}
      {...props}
    />
  );
}
Overlay.displayName = "Sheet.Overlay";

type SheetContentProps = React.ComponentProps<typeof Drawer.Popup> & {
  /** Controls the max-width of the sheet panel (`sm` | `md` | `lg` | `xl` | `full`). Applies to left/right sides. @default "sm" */
  size?: Size;
};

/** The main sheet panel. The `side` is inherited from `Sheet.Root` via context. */
function Content({ className, children, size = "sm", ...props }: SheetContentProps) {
  // `side` is controlled by `Root` via context, not accepted as a prop, to keep swipe direction and CSS position in sync.
  const side = React.useContext(SheetContext);
  const isHorizontal = side === "right" || side === "left";

  return (
    <Portal>
      <Overlay />
      <Drawer.Viewport
        data-slot="sheet-viewport"
        className={cn(
          "astw:fixed astw:inset-0 astw:z-(--z-overlay) astw:flex",
          side === "right" && "astw:items-stretch astw:justify-end",
          side === "left" && "astw:items-stretch astw:justify-start",
          side === "top" && "astw:items-start astw:justify-stretch",
          side === "bottom" && "astw:items-end astw:justify-stretch",
        )}
      >
        <Drawer.Popup
          data-slot="sheet-content"
          className={cn(
            "astw:bg-background astw:flex astw:flex-col astw:shadow-lg astw:transition-transform astw:ease-[cubic-bezier(0.32,0.72,0,1)] astw:duration-[450ms]",
            side === "right" &&
              "astw:h-full astw:w-3/4 astw:border-l astw:[transform:translateX(var(--drawer-swipe-movement-x))] astw:data-ending-style:[transform:translateX(100%)] astw:data-starting-style:[transform:translateX(100%)]",
            side === "left" &&
              "astw:h-full astw:w-3/4 astw:border-r astw:[transform:translateX(var(--drawer-swipe-movement-x))] astw:data-ending-style:[transform:translateX(-100%)] astw:data-starting-style:[transform:translateX(-100%)]",
            side === "top" &&
              "astw:w-full astw:h-auto astw:border-b astw:[transform:translateY(var(--drawer-swipe-movement-y))] astw:data-ending-style:[transform:translateY(-100%)] astw:data-starting-style:[transform:translateY(-100%)]",
            side === "bottom" &&
              "astw:w-full astw:h-auto astw:border-t astw:[transform:translateY(var(--drawer-swipe-movement-y))] astw:data-ending-style:[transform:translateY(100%)] astw:data-starting-style:[transform:translateY(100%)]",
            isHorizontal && sizeClasses[size],
            "astw:data-swiping:select-none",
            className,
          )}
          {...props}
        >
          <Drawer.Content data-slot="sheet-inner-content" className="astw:contents">
            {children}
          </Drawer.Content>
        </Drawer.Popup>
      </Drawer.Viewport>
    </Portal>
  );
}
Content.displayName = "Sheet.Content";

/** @internal Close button that renders a directional chevron icon based on `side`. */
function CloseButton() {
  const side = React.useContext(SheetContext);
  const Icon = sideToCloseIcon[side];
  return (
    <Drawer.Close
      data-slot="sheet-close"
      className="astw:ring-offset-bg astw:focus:ring-ring astw:flex astw:size-8 astw:shrink-0 astw:items-center astw:justify-center astw:rounded-xs astw:text-muted-foreground astw:transition-colors astw:hover:bg-accent astw:hover:text-accent-foreground astw:focus:ring-2 astw:focus:ring-offset-2 astw:focus:outline-hidden astw:disabled:pointer-events-none"
    >
      <Icon className="astw:size-4" />
      <span className="astw:sr-only">Close</span>
    </Drawer.Close>
  );
}

type SheetHeaderProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Action buttons displayed to the right of the title. */
  action?: React.ReactNode;
  children?: React.ReactNode;
};

/** A layout wrapper for the sheet title, close button, and optional action buttons. */
function Header({ className, action, children, ...props }: SheetHeaderProps) {
  const childArray = React.Children.toArray(children);
  const titleChild = childArray.find(
    (child): child is React.ReactElement => React.isValidElement(child) && child.type === Title,
  );
  const primaryChildren = titleChild ? [titleChild] : childArray;
  const secondaryChildren = titleChild ? childArray.filter((child) => child !== titleChild) : [];

  return (
    <div
      data-slot="sheet-header"
      className={cn("astw:border-b astw:px-4 astw:py-3", className)}
      {...props}
    >
      <div className="astw:flex astw:items-center astw:gap-3">
        <CloseButton />
        <div className="astw:flex astw:min-w-0 astw:flex-1 astw:items-center astw:gap-2">
          <div className="astw:min-w-0 astw:flex-1">{primaryChildren}</div>
          {action && (
            <div className="astw:flex astw:shrink-0 astw:items-center astw:gap-2">{action}</div>
          )}
        </div>
      </div>
      {secondaryChildren.length > 0 && (
        <div className="astw:flex astw:min-w-0 astw:flex-col astw:gap-1 astw:pl-11">
          {secondaryChildren}
        </div>
      )}
    </div>
  );
}
Header.displayName = "Sheet.Header";

/** A layout wrapper for sheet action buttons, typically placed at the bottom. */
function Footer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "astw:mt-auto astw:flex astw:flex-col astw:gap-2 astw:border-t astw:p-4",
        className,
      )}
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
      className={cn("astw:text-foreground astw:text-lg astw:font-semibold", className)}
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
