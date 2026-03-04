import * as React from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

function TabsRoot({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.Root>) {
  return (
    <BaseTabs.Root
      data-slot="tabs"
      className={cn("astw:flex astw:flex-col astw:gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      data-slot="tabs-list"
      className={cn(
        "astw:bg-muted astw:text-muted-foreground astw:inline-flex astw:h-9 astw:w-fit astw:items-center astw:justify-center astw:rounded-lg astw:p-0.75",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      data-slot="tabs-trigger"
      className={cn(
        "astw:inline-flex astw:items-center astw:justify-center astw:gap-1.5 astw:whitespace-nowrap astw:rounded-md astw:px-2.5 astw:py-1 astw:text-sm astw:font-medium astw:outline-none astw:transition-all",
        "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:data-selected:bg-background astw:data-selected:text-foreground astw:data-selected:shadow-sm",
        "astw:disabled:pointer-events-none astw:disabled:opacity-50",
        "astw:[&_svg]:pointer-events-none astw:[&_svg:not([class*='size-'])]:size-4 astw:[&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.Panel>) {
  return (
    <BaseTabs.Panel
      data-slot="tabs-content"
      className={cn(
        "astw:flex-1 astw:outline-none",
        "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        className,
      )}
      {...props}
    />
  );
}

const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
};

export { Tabs };
