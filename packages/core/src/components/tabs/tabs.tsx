import * as React from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";
import { mergeRefs, useToolbarItem } from "../toolbar/toolbar";

type TabsVariant = "default" | "line" | "capsule";
type TabsSize = "xs" | "sm" | "default" | "lg";

const LIST_VARIANT_CLASSES: Record<TabsVariant, string> = {
  line: "astw:h-9 astw:gap-2",
  capsule: "astw:gap-0.5 astw:rounded-md astw:bg-black/5 astw:dark:bg-input/30 astw:p-1",
  default: "astw:text-muted-foreground astw:h-9 astw:gap-1",
};

const TAB_VARIANT_CLASSES: Record<TabsVariant, string> = {
  line: "astw:px-3 astw:py-1.5 astw:-mb-px astw:border-b-2 astw:border-transparent astw:data-active:border-primary astw:data-active:text-foreground",
  capsule:
    "astw:rounded-md astw:px-3 astw:has-[>svg:only-child]:px-0 astw:[&_svg:not([class*='size-'])]:size-4 astw:data-active:bg-card astw:dark:data-active:bg-input/60 astw:data-active:text-primary astw:data-active:shadow-sm",
  default:
    "astw:rounded-md astw:px-3 astw:py-1 astw:data-active:bg-primary/10 astw:data-active:text-primary",
};

// The `size` prop mirrors Button's height tiers. The min-height is a floor —
// content taller than it (e.g. a badge) still grows — while icon-only tabs
// (detected via `>svg:only-child`) also pick up a matching min-width so they
// stay square. Sizes only affect the `capsule` variant, whose track height is
// item min-height + the list's `p-1`, keeping it aligned with a sibling Button:
// xs → 28px (h-7), sm → 32px (h-8), default → 36px (h-9), lg → 40px (h-10).
const TAB_SIZE_CLASSES: Record<TabsSize, string> = {
  xs: "astw:min-h-5 astw:has-[>svg:only-child]:min-w-5",
  sm: "astw:min-h-6 astw:has-[>svg:only-child]:min-w-6",
  default: "astw:min-h-7 astw:has-[>svg:only-child]:min-w-7",
  lg: "astw:min-h-8 astw:has-[>svg:only-child]:min-w-8",
};

const TabsVariantContext = React.createContext<TabsVariant>("default");
const TabsSizeContext = React.createContext<TabsSize>("default");

// Only the props relevant to the Tabs abstraction are picked from BaseTabs.Root.
// Base UI-internal props are intentionally excluded so that upstream changes
// don't leak as breaking changes to consumers.
type RootProps = Pick<
  React.ComponentProps<typeof BaseTabs.Root>,
  "defaultValue" | "value" | "onValueChange"
> & {
  children: React.ReactNode;
  className?: string;
  variant?: TabsVariant;
  /**
   * Minimum size of the tabs, mirroring Button's height tiers. Only affects the
   * `capsule` variant, keeping its track aligned with a sibling Button and its
   * icon-only tabs square.
   */
  size?: TabsSize;
};

/**
 * The root component that manages tab selection state.
 *
 * @example
 * ```tsx
 * <Tabs.Root defaultValue="overview">
 *   <Tabs.List>
 *     <Tabs.Tab value="overview">Overview</Tabs.Tab>
 *     <Tabs.Tab value="projects">Projects</Tabs.Tab>
 *     <Tabs.Tab value="account">Account</Tabs.Tab>
 *   </Tabs.List>
 *   <Tabs.Panel value="overview">Overview content</Tabs.Panel>
 *   <Tabs.Panel value="projects">Projects content</Tabs.Panel>
 *   <Tabs.Panel value="account">Account content</Tabs.Panel>
 * </Tabs.Root>
 * ```
 */
function Root({ className, children, variant = "default", size = "default", ...props }: RootProps) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsSizeContext.Provider value={size}>
        <BaseTabs.Root data-slot="tabs" className={className} {...props}>
          {children}
        </BaseTabs.Root>
      </TabsSizeContext.Provider>
    </TabsVariantContext.Provider>
  );
}
Root.displayName = "Tabs.Root";

// The list sits in a scroll container so that tabs wider than the available
// width scroll sideways instead of growing the page. The scrollbar is hidden:
// touch, trackpad, and the arrow keys scroll it, and the tab cut off at the edge
// shows there is more. The container's padding / negative margin pair gives the
// 3px focus ring room inside the clip box without changing the list's footprint,
// and the max-width lets the border box extend by that same margin. The values
// are in px so that `LIST_CONTAINER_PADDING` and the classes cannot drift apart.
const LIST_CONTAINER_PADDING = 4;
const LIST_CONTAINER_CLASSES =
  "astw:-m-[4px] astw:flex astw:max-w-[calc(100%+8px)] astw:overflow-x-auto astw:overflow-y-hidden astw:overscroll-x-contain astw:p-[4px] astw:[scrollbar-width:none] astw:[&::-webkit-scrollbar]:hidden";

// Scrolls the list container, and only the container, so that `tab` is fully
// visible with the ring's room on both sides. `scrollIntoView` is not used
// because it would also scroll the page when the tabs are below the fold, and
// Base UI moves focus between tabs without scrolling.
function revealTab(container: HTMLElement, tab: HTMLElement) {
  const c = container.getBoundingClientRect();
  // A hidden list (`display: none`, a closed dialog) has no geometry yet; the
  // resize observer reveals the tab once it has one.
  if (c.width === 0) return;
  const t = tab.getBoundingClientRect();
  const left = c.left + LIST_CONTAINER_PADDING;
  const right = c.right - LIST_CONTAINER_PADDING;
  // A tab wider than the container shows its start, where reading begins.
  if (t.left < left || t.width > right - left) {
    container.scrollLeft -= left - t.left;
  } else if (t.right > right) {
    container.scrollLeft += t.right - right;
  }
}

/**
 * Groups the individual tab buttons. Tabs stay on one row; when they are wider
 * than the container, the list scrolls sideways (scrollbar hidden) and the
 * active tab is scrolled into view on mount.
 */
function List({ className, children, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  const variant = React.useContext(TabsVariantContext);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Keep the active tab in view: on mount, whenever `data-active` moves (a
  // click, or a controlled `value` change from outside), and whenever the
  // container is resized — which is also how a list that mounted hidden
  // (a closed dialog, `display: none`) gets its first real measurement.
  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reveal = () => {
      const active = container.querySelector<HTMLElement>("[data-slot=tabs-tab][data-active]");
      if (active) revealTab(container, active);
    };
    reveal();
    const mutations = new MutationObserver(reveal);
    mutations.observe(container, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-active"],
    });
    const resizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(reveal);
    resizes?.observe(container);
    return () => {
      mutations.disconnect();
      resizes?.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-slot="tabs-list-container"
      className={LIST_CONTAINER_CLASSES}
      // Arrow keys move focus between tabs without activating or scrolling, so
      // the tab that receives focus is scrolled into view here. React's
      // `onFocus` bubbles, so one handler covers every tab in the list.
      onFocus={(event) => {
        const tab = (event.target as HTMLElement).closest<HTMLElement>("[data-slot=tabs-tab]");
        if (tab && event.currentTarget.contains(tab)) revealTab(event.currentTarget, tab);
      }}
    >
      <BaseTabs.List
        data-slot="tabs-list"
        className={cn(
          "astw:relative astw:inline-flex astw:items-center astw:justify-center",
          LIST_VARIANT_CLASSES[variant],
          className,
        )}
        {...props}
      >
        {children}
      </BaseTabs.List>
    </div>
  );
}
List.displayName = "Tabs.List";

/** An individual interactive tab button that toggles the corresponding panel. */
function Tab({
  className,
  children,
  ref: forwardedRef,
  ...props
}: React.ComponentProps<typeof BaseTabs.Tab>) {
  const variant = React.useContext(TabsVariantContext);
  const size = React.useContext(TabsSizeContext);
  const ref = React.useRef<HTMLButtonElement>(null);
  useToolbarItem(ref, { handlesDirectionalKeys: true });

  return (
    <BaseTabs.Tab
      ref={mergeRefs(ref, forwardedRef)}
      data-slot="tabs-tab"
      className={cn(
        "astw:inline-flex astw:cursor-pointer astw:items-center astw:justify-center astw:whitespace-nowrap astw:text-label-md astw:transition-[color,box-shadow] astw:duration-200",
        "astw:text-muted-foreground",
        "astw:focus-visible:outline-ring/70 astw:focus-visible:ring-ring/50 astw:focus-visible:outline-1 astw:focus-visible:ring-[3px]",
        "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
        TAB_VARIANT_CLASSES[variant],
        variant === "capsule" && TAB_SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {children}
    </BaseTabs.Tab>
  );
}
Tab.displayName = "Tabs.Tab";

/** A panel displayed when the corresponding tab is active. */
function Panel({ className, children, ...props }: React.ComponentProps<typeof BaseTabs.Panel>) {
  return (
    <BaseTabs.Panel
      data-slot="tabs-panel"
      className={cn(
        "astw:mt-2 astw:focus-visible:outline-ring/70 astw:focus-visible:ring-ring/50 astw:focus-visible:outline-1 astw:focus-visible:ring-[3px]",
        className,
      )}
      {...props}
    >
      {children}
    </BaseTabs.Panel>
  );
}
Panel.displayName = "Tabs.Panel";

export const Tabs = {
  Root,
  List,
  Tab,
  Panel,
};
