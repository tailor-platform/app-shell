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

function Root({
  side = "right",
  ...props
}: React.ComponentProps<typeof Drawer.Root> & { side?: Side }) {
  return (
    <SheetContext.Provider value={side}>
      <Drawer.Root data-slot="sheet" swipeDirection={sideToSwipeDirection[side]} {...props} />
    </SheetContext.Provider>
  );
}

function Trigger({ ...props }: React.ComponentProps<typeof Drawer.Trigger>) {
  return <Drawer.Trigger data-slot="sheet-trigger" {...props} />;
}

function Close({ ...props }: React.ComponentProps<typeof Drawer.Close>) {
  return <Drawer.Close data-slot="sheet-close" {...props} />;
}

function Portal({ ...props }: React.ComponentProps<typeof Drawer.Portal>) {
  return <Drawer.Portal data-slot="sheet-portal" {...props} />;
}

function Overlay({ className, ...props }: React.ComponentProps<typeof Drawer.Backdrop>) {
  return (
    <Drawer.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:fixed astw:inset-0 astw:z-50 astw:bg-black/50",
        className,
      )}
      {...props}
    />
  );
}

function Content({
  className,
  children,
  side: sideProp,
  ...props
}: React.ComponentProps<typeof Drawer.Popup> & {
  side?: Side;
}) {
  const sideFromContext = React.useContext(SheetContext);
  const side = sideProp ?? sideFromContext;

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

function Header({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("astw:flex astw:flex-col astw:gap-1.5 astw:p-4", className)}
      {...props}
    />
  );
}

function Footer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("astw:mt-auto astw:flex astw:flex-col astw:gap-2 astw:p-4", className)}
      {...props}
    />
  );
}

function Title({ className, ...props }: React.ComponentProps<typeof Drawer.Title>) {
  return (
    <Drawer.Title
      data-slot="sheet-title"
      className={cn("astw:text-foreground astw:font-semibold", className)}
      {...props}
    />
  );
}

function Description({ className, ...props }: React.ComponentProps<typeof Drawer.Description>) {
  return (
    <Drawer.Description
      data-slot="sheet-description"
      className={cn("astw:text-muted-foreground astw:text-sm", className)}
      {...props}
    />
  );
}

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
