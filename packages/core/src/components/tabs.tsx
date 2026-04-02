import * as React from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

// Only the props relevant to the Tabs abstraction are picked from Base UI.
// Base UI-internal props are intentionally excluded so that upstream changes
// don't leak as breaking changes to consumers.
type RootProps = Pick<
  React.ComponentProps<typeof BaseTabs.Root>,
  "defaultValue" | "value" | "onValueChange" | "orientation"
> & {
  children: React.ReactNode;
  className?: string;
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
function Root({ className, children, ...props }: RootProps) {
  return (
    <BaseTabs.Root data-slot="tabs" className={className} {...props}>
      {children}
    </BaseTabs.Root>
  );
}
Root.displayName = "Tabs.Root";

type ListProps = Pick<React.ComponentProps<typeof BaseTabs.List>, "children" | "className">;

/** Groups the individual tab buttons. */
function List({ className, children, ...props }: ListProps) {
  return (
    <BaseTabs.List
      data-slot="tabs-list"
      className={cn(
        "astw:bg-muted astw:text-muted-foreground astw:relative astw:inline-flex astw:h-9 astw:items-center astw:justify-center astw:rounded-lg astw:p-1",
        className,
      )}
      {...props}
    >
      {children}
    </BaseTabs.List>
  );
}
List.displayName = "Tabs.List";

type TabProps = Pick<
  React.ComponentProps<typeof BaseTabs.Tab>,
  "value" | "disabled" | "children" | "className"
>;

/** An individual interactive tab button that toggles the corresponding panel. */
function Tab({ className, children, ...props }: TabProps) {
  return (
    <BaseTabs.Tab
      data-slot="tabs-tab"
      className={cn(
        "astw:inline-flex astw:cursor-pointer astw:items-center astw:justify-center astw:whitespace-nowrap astw:rounded-md astw:px-3 astw:py-1 astw:text-sm astw:font-medium astw:transition-[color,box-shadow] astw:duration-200",
        "astw:text-muted-foreground",
        "astw:data-active:bg-background astw:data-active:text-foreground astw:data-active:shadow-sm",
        "astw:focus-visible:outline-ring/70 astw:focus-visible:ring-ring/50 astw:focus-visible:outline-1 astw:focus-visible:ring-[3px]",
        "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </BaseTabs.Tab>
  );
}
Tab.displayName = "Tabs.Tab";

type PanelProps = Pick<
  React.ComponentProps<typeof BaseTabs.Panel>,
  "value" | "keepMounted" | "children" | "className"
>;

/** A panel displayed when the corresponding tab is active. */
function Panel({ className, children, ...props }: PanelProps) {
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
