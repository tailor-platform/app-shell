import * as React from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

type TabsVariant = "default" | "line" | "capsule";

const TabsVariantContext = React.createContext<TabsVariant>("default");

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
function Root({ className, children, variant = "default", ...props }: RootProps) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <BaseTabs.Root data-slot="tabs" className={className} {...props}>
        {children}
      </BaseTabs.Root>
    </TabsVariantContext.Provider>
  );
}
Root.displayName = "Tabs.Root";

/** Groups the individual tab buttons. */
function List({ className, children, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  const variant = React.useContext(TabsVariantContext);
  return (
    <BaseTabs.List
      data-slot="tabs-list"
      className={cn(
        "astw:relative astw:inline-flex astw:items-center astw:justify-center",
        variant === "line"
          ? "astw:h-9 astw:gap-2"
          : variant === "capsule"
            ? "astw:h-10 astw:gap-0.5 astw:rounded-md astw:bg-muted astw:p-1"
            : "astw:text-muted-foreground astw:h-9 astw:gap-1",
        className,
      )}
      {...props}
    >
      {children}
    </BaseTabs.List>
  );
}
List.displayName = "Tabs.List";

/** An individual interactive tab button that toggles the corresponding panel. */
function Tab({ className, children, ...props }: React.ComponentProps<typeof BaseTabs.Tab>) {
  const variant = React.useContext(TabsVariantContext);
  return (
    <BaseTabs.Tab
      data-slot="tabs-tab"
      className={cn(
        "astw:inline-flex astw:cursor-pointer astw:items-center astw:justify-center astw:whitespace-nowrap astw:text-sm astw:font-medium astw:transition-[color,box-shadow] astw:duration-200",
        "astw:text-muted-foreground",
        "astw:focus-visible:outline-ring/70 astw:focus-visible:ring-ring/50 astw:focus-visible:outline-1 astw:focus-visible:ring-[3px]",
        "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
        variant === "line"
          ? "astw:px-3 astw:py-1.5 astw:-mb-px astw:border-b-2 astw:border-transparent astw:data-active:border-primary astw:data-active:text-foreground"
          : variant === "capsule"
            ? "astw:rounded-md astw:px-3 astw:py-1.5 astw:data-active:bg-background astw:data-active:text-foreground astw:data-active:shadow-sm"
            : "astw:rounded-md astw:px-3 astw:py-1 astw:data-active:bg-muted astw:data-active:text-foreground",
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
