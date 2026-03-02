import * as React from "react";
import { VariantProps, cva } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";
import { useRender } from "@base-ui/react/use-render";

import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTablet } from "@/hooks/use-tablet";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Separator } from "@/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/tooltip";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
  isIconMode: boolean;
  openIconMode: boolean;
  setOpenIconMode: (open: boolean) => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [openIconMode, setOpenIconMode] = React.useState(false);

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;

  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }
    },
    [setOpenProp, open],
  );

  // Determine if we're in icon mode (tablet range)
  const isIconMode = isTablet && !isMobile;

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      return setOpenMobile((open) => !open);
    } else if (isIconMode) {
      // In icon mode, use overlay (similar to mobile)
      return setOpenIconMode((open) => !open);
    } else {
      return setOpen((open) => !open);
    }
  }, [isMobile, isIconMode, setOpen, setOpenMobile]);

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      isIconMode,
      openIconMode,
      setOpenIconMode,
    }),
    [
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      isIconMode,
      openIconMode,
      setOpenIconMode,
    ],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            "astw:group/sidebar-wrapper astw:has-data-[variant=inset]:bg-sidebar astw:flex astw:min-h-svh astw:w-full astw:overflow-hidden",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
}) {
  const {
    isMobile,
    state,
    openMobile,
    setOpenMobile,
    isIconMode,
    openIconMode,
    setOpenIconMode,
  } = useSidebar();

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "astw:bg-sidebar astw:text-sidebar-foreground astw:flex astw:h-full astw:w-(--sidebar-width) astw:flex-col",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="astw:bg-sidebar astw:text-sidebar-foreground astw:w-(--sidebar-width) astw:p-0 astw:[&>button]:hidden"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="astw:sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  // In icon mode, show overlay when opened (similar to mobile)
  if (isIconMode && collapsible === "icon") {
    return (
      <>
        {/* Icon-only sidebar (always visible) - use same structure as normal sidebar */}
        <div
          className="astw:group astw:peer astw:text-sidebar-foreground astw:hidden astw:md:block"
          data-state="collapsed"
          data-collapsible="icon"
          data-variant={variant}
          data-side={side}
          data-slot="sidebar"
        >
          <div
            data-slot="sidebar-gap"
            className={cn(
              "astw:relative astw:bg-transparent astw:transition-[width] astw:duration-200 astw:ease-linear",
              variant === "floating" || variant === "inset"
                ? "astw:group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
                : "astw:group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
            )}
          />
          <div
            data-slot="sidebar-container"
            className={cn(
              "astw:fixed astw:inset-y-0 astw:z-10 astw:hidden astw:h-svh astw:transition-[left,right,width] astw:duration-200 astw:ease-linear astw:md:flex",
              side === "left" ? "astw:left-0" : "astw:right-0",
              variant === "floating" || variant === "inset"
                ? "astw:p-2 astw:group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
                : "astw:group-data-[collapsible=icon]:w-(--sidebar-width-icon) astw:group-data-[side=left]:border-r astw:group-data-[side=right]:border-l",
              variant === "inset" && "astw:border-x astw:border-x-border",
            )}
          >
            <div
              data-sidebar="sidebar"
              data-slot="sidebar-inner"
              className="astw:bg-sidebar astw:group-data-[variant=floating]:border-sidebar-border astw:flex astw:h-full astw:w-full astw:flex-col astw:overflow-hidden astw:group-data-[variant=floating]:rounded-lg astw:group-data-[variant=floating]:border astw:group-data-[variant=floating]:shadow-sm"
            >
              {children}
            </div>
          </div>
        </div>
        {/* Overlay sidebar when opened */}
        <Sheet open={openIconMode} onOpenChange={setOpenIconMode} {...props}>
          <SheetContent
            data-sidebar="sidebar"
            data-slot="sidebar-overlay"
            data-icon-mode="true"
            className="astw:bg-sidebar astw:text-sidebar-foreground astw:w-(--sidebar-width) astw:p-0 astw:[&>button]:hidden"
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
              } as React.CSSProperties
            }
            side={side}
          >
            <SheetHeader className="astw:sr-only">
              <SheetTitle>Sidebar</SheetTitle>
              <SheetDescription>Displays the sidebar overlay.</SheetDescription>
            </SheetHeader>
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div
      className="astw:group astw:peer astw:text-sidebar-foreground astw:hidden astw:md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          "astw:relative astw:w-(--sidebar-width) astw:bg-transparent astw:transition-[width] astw:duration-200 astw:ease-linear",
          "astw:group-data-[collapsible=offcanvas]:w-0",
          "astw:group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "astw:group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
            : "astw:group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          "astw:fixed astw:inset-y-0 astw:z-10 astw:hidden astw:h-svh astw:w-(--sidebar-width) astw:transition-[left,right,width] astw:duration-200 astw:ease-linear astw:md:flex",
          side === "left"
            ? "astw:left-0 astw:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "astw:right-0 astw:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          // Adjust the padding for floating and inset variants.
          variant === "floating" || variant === "inset"
            ? "astw:p-2 astw:group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
            : "astw:group-data-[collapsible=icon]:w-(--sidebar-width-icon) astw:group-data-[side=left]:border-r astw:group-data-[side=right]:border-l",
          variant === "inset" && "astw:border-x astw:border-x-border",
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="astw:bg-sidebar astw:group-data-[variant=floating]:border-sidebar-border astw:flex astw:h-full astw:w-full astw:flex-col astw:group-data-[variant=floating]:rounded-lg astw:group-data-[variant=floating]:border astw:group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("astw:text-muted-foreground", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon className="astw:size-4.5" />
      <span className="astw:sr-only">Toggle Sidebar</span>
    </Button>
  );
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        "astw:hover:after:bg-sidebar-border astw:absolute astw:inset-y-0 astw:z-20 astw:hidden astw:w-4 astw:-translate-x-1/2 astw:transition-all astw:ease-linear astw:group-data-[side=left]:-right-4 astw:group-data-[side=right]:left-0 astw:after:absolute astw:after:inset-y-0 astw:after:left-1/2 astw:after:w-0.5 astw:sm:flex",
        "astw:in-data-[side=left]:cursor-w-resize astw:in-data-[side=right]:cursor-e-resize",
        "astw:[[data-side=left][data-state=collapsed]_&]:cursor-e-resize astw:[[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "astw:hover:group-data-[collapsible=offcanvas]:bg-sidebar astw:group-data-[collapsible=offcanvas]:translate-x-0 astw:group-data-[collapsible=offcanvas]:after:left-full",
        "astw:[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "astw:[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "astw:bg-background astw:relative astw:flex astw:w-full astw:flex-1 astw:flex-col",
        "astw:px-4 astw:md:peer-data-[variant=inset]:px-8 astw:md:peer-data-[variant=inset]:py-2", //  astw:md:peer-data-[variant=inset]:peer-data-[state=collapsed]:pl-2
        className,
      )}
      {...props}
    />
  );
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn(
        "astw:bg-background astw:h-8 astw:w-full astw:shadow-none",
        className,
      )}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn(
        "astw:flex astw:flex-row astw:items-center astw:gap-0.5 astw:p-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("astw:flex astw:flex-col astw:gap-2 astw:p-2", className)}
      {...props}
    />
  );
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("astw:bg-sidebar-border astw:mx-2 astw:w-auto", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "astw:flex astw:min-h-0 astw:flex-1 astw:flex-col astw:gap-2 astw:overflow-auto astw:group-data-[collapsible=icon]:overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn(
        "astw:relative astw:flex astw:w-full astw:min-w-0 astw:flex-col astw:p-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  render,
  children,
  ...props
}: React.ComponentProps<"div"> & { render?: React.ReactElement }) {
  return useRender({
    defaultTagName: "div",
    render,
    props: {
      "data-slot": "sidebar-group-label",
      "data-sidebar": "group-label",
      className: cn(
        "astw:text-sidebar-foreground/70 astw:ring-sidebar-ring astw:flex astw:h-8 astw:shrink-0 astw:items-center astw:rounded-md astw:px-2 astw:text-xs astw:font-medium astw:outline-hidden astw:transition-[margin,opacity] astw:duration-200 astw:ease-linear astw:focus-visible:ring-2 astw:[&>svg]:size-4 astw:[&>svg]:shrink-0",
        "astw:group-data-[collapsible=icon]:-mt-8 astw:group-data-[collapsible=icon]:opacity-0",
        className,
      ),
      children,
      ...props,
    },
  });
}

function SidebarGroupAction({
  className,
  render,
  children,
  ...props
}: React.ComponentProps<"button"> & { render?: React.ReactElement }) {
  return useRender({
    defaultTagName: "button",
    render,
    props: {
      "data-slot": "sidebar-group-action",
      "data-sidebar": "group-action",
      className: cn(
        "astw:text-sidebar-foreground astw:ring-sidebar-ring astw:hover:bg-sidebar-accent astw:hover:text-sidebar-accent-foreground astw:absolute astw:top-3.5 astw:right-3 astw:flex astw:aspect-square astw:w-5 astw:items-center astw:justify-center astw:rounded-md astw:p-0 astw:outline-hidden astw:transition-transform astw:focus-visible:ring-2 astw:[&>svg]:size-4 astw:[&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "astw:after:absolute astw:after:-inset-2 astw:md:after:hidden",
        "astw:group-data-[collapsible=icon]:hidden",
        className,
      ),
      children,
      ...props,
    },
  });
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("astw:w-full astw:text-sm", className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn(
        "astw:flex astw:w-full astw:min-w-0 astw:flex-col astw:gap-1",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("astw:group/menu-item astw:relative", className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  "astw:peer/menu-button astw:flex astw:w-full astw:items-center astw:gap-2 astw:overflow-hidden astw:rounded-md astw:p-2 astw:text-left astw:text-sm astw:outline-hidden astw:ring-sidebar-ring astw:transition-[width,height,padding] astw:hover:bg-sidebar-accent astw:hover:text-sidebar-accent-foreground astw:focus-visible:ring-2 astw:active:bg-sidebar-accent astw:active:text-sidebar-accent-foreground astw:disabled:pointer-events-none astw:disabled:opacity-50 astw:group-has-data-[sidebar=menu-action]/menu-item:pr-8 astw:aria-disabled:pointer-events-none astw:aria-disabled:opacity-50 astw:data-[active=true]:bg-sidebar-accent astw:data-[active=true]:font-medium astw:data-[active=true]:text-sidebar-accent-foreground astw:data-[state=open]:hover:bg-sidebar-accent astw:data-[state=open]:hover:text-sidebar-accent-foreground astw:group-data-[collapsible=icon]:size-8! astw:group-data-[collapsible=icon]:p-2! astw:[&>span:last-child]:truncate astw:group-data-[collapsible=icon]:[&>span:last-child]:hidden astw:[&>svg]:size-4 astw:[&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "astw:hover:bg-sidebar-accent astw:hover:text-sidebar-accent-foreground",
        outline:
          "astw:bg-background astw:shadow-[0_0_0_1px_hsl(var(--sidebar-border))] astw:hover:bg-sidebar-accent astw:hover:text-sidebar-accent-foreground astw:hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "astw:h-8 astw:text-sm",
        sm: "astw:h-7 astw:rounded-md astw:gap-1.5 astw:px-3 astw:has-[>svg]:px-2.5",
        lg: "astw:h-12 astw:text-sm astw:group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function SidebarMenuButton({
  render,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  render?: React.ReactElement;
  isActive?: boolean;
  tooltip?: string | React.ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const { isMobile, state } = useSidebar();

  const button = useRender({
    defaultTagName: "button",
    render,
    props: {
      "data-slot": "sidebar-menu-button",
      "data-sidebar": "menu-button",
      "data-size": size,
      "data-active": isActive,
      className: cn(sidebarMenuButtonVariants({ variant, size }), className),
      children,
      ...props,
    },
  });

  if (!tooltip) {
    return button;
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    };
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...tooltip}
      />
    </Tooltip>
  );
}

function SidebarMenuAction({
  className,
  render,
  showOnHover = false,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  render?: React.ReactElement;
  showOnHover?: boolean;
}) {
  return useRender({
    defaultTagName: "button",
    render,
    props: {
      "data-slot": "sidebar-menu-action",
      "data-sidebar": "menu-action",
      className: cn(
        "astw:text-sidebar-foreground astw:ring-sidebar-ring astw:hover:bg-sidebar-accent astw:hover:text-sidebar-accent-foreground astw:peer-hover/menu-button:text-sidebar-accent-foreground astw:absolute astw:top-1.5 astw:right-1 astw:flex astw:aspect-square astw:w-5 astw:items-center astw:justify-center astw:rounded-md astw:p-0 astw:outline-hidden astw:transition-transform astw:focus-visible:ring-2 astw:[&>svg]:size-4 astw:[&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "astw:after:absolute astw:after:-inset-2 astw:md:after:hidden",
        "astw:peer-data-[size=sm]/menu-button:top-1",
        "astw:peer-data-[size=default]/menu-button:top-1.5",
        "astw:peer-data-[size=lg]/menu-button:top-2.5",
        "astw:group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "astw:peer-data-[active=true]/menu-button:text-sidebar-accent-foreground astw:group-focus-within/menu-item:opacity-100 astw:group-hover/menu-item:opacity-100 astw:data-[state=open]:opacity-100 astw:md:opacity-0",
        className,
      ),
      children,
      ...props,
    },
  });
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "astw:text-sidebar-foreground astw:pointer-events-none astw:absolute astw:right-1 astw:flex astw:h-5 astw:min-w-5 astw:items-center astw:justify-center astw:rounded-md astw:px-1 astw:text-xs astw:font-medium astw:tabular-nums astw:select-none",
        "astw:peer-hover/menu-button:text-sidebar-accent-foreground astw:peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "astw:peer-data-[size=sm]/menu-button:top-1",
        "astw:peer-data-[size=default]/menu-button:top-1.5",
        "astw:peer-data-[size=lg]/menu-button:top-2.5",
        "astw:group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        "astw:border-sidebar-border astw:ml-3.5 astw:mr-0 astw:flex astw:min-w-0 astw:translate-x-px astw:flex-col astw:gap-1 astw:border-l astw:pl-2.5 astw:pr-0 astw:py-0.5",
        "astw:group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn("astw:group/menu-sub-item astw:relative", className)}
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  render,
  size = "md",
  isActive = false,
  className,
  children,
  ...props
}: React.ComponentProps<"a"> & {
  render?: React.ReactElement;
  size?: "sm" | "md";
  isActive?: boolean;
}) {
  return useRender({
    defaultTagName: "a",
    render,
    props: {
      "data-slot": "sidebar-menu-sub-button",
      "data-sidebar": "menu-sub-button",
      "data-size": size,
      "data-active": isActive,
      className: cn(
        "astw:text-sidebar-foreground astw:ring-sidebar-ring astw:hover:bg-sidebar-accent astw:hover:text-sidebar-accent-foreground astw:active:bg-sidebar-accent astw:active:text-sidebar-accent-foreground astw:[&>svg]:text-sidebar-accent-foreground astw:flex astw:h-7 astw:min-w-0 astw:-translate-x-px astw:items-center astw:gap-2 astw:overflow-hidden astw:rounded-md astw:px-2 astw:outline-hidden astw:focus-visible:ring-2 astw:disabled:pointer-events-none astw:disabled:opacity-50 astw:aria-disabled:pointer-events-none astw:aria-disabled:opacity-50 astw:[&>span:last-child]:truncate astw:group-data-[collapsible=icon]:[&>span:last-child]:hidden astw:[&>svg]:size-4 astw:[&>svg]:shrink-0",
        "astw:data-[active=true]:bg-sidebar-accent astw:data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "astw:text-xs",
        size === "md" && "astw:text-sm",
        "astw:group-data-[collapsible=icon]:hidden",
        className,
      ),
      children,
      ...props,
    },
  });
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
