import * as React from "react";
import { Toolbar as BaseToolbar } from "@base-ui/react/toolbar";

import { cn } from "@/lib/utils";

function ToolbarRoot({ className, ...props }: React.ComponentProps<typeof BaseToolbar.Root>) {
  return (
    <BaseToolbar.Root
      data-slot="toolbar"
      className={cn(
        "astw:flex astw:items-center astw:gap-1 astw:rounded-md astw:border astw:border-input astw:bg-transparent astw:p-1",
        className,
      )}
      {...props}
    />
  );
}

function ToolbarButton({ className, ...props }: React.ComponentProps<typeof BaseToolbar.Button>) {
  return (
    <BaseToolbar.Button
      data-slot="toolbar-button"
      className={cn(
        "astw:inline-flex astw:items-center astw:justify-center astw:rounded-md astw:px-2.5 astw:py-1.5 astw:text-sm astw:font-medium astw:outline-none astw:transition-colors",
        "astw:hover:bg-muted astw:hover:text-muted-foreground",
        "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:disabled:pointer-events-none astw:disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function ToolbarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof BaseToolbar.Separator>) {
  return (
    <BaseToolbar.Separator
      data-slot="toolbar-separator"
      className={cn("astw:mx-1 astw:h-5 astw:w-px astw:shrink-0 astw:bg-border", className)}
      {...props}
    />
  );
}

function ToolbarGroup({ className, ...props }: React.ComponentProps<typeof BaseToolbar.Group>) {
  return (
    <BaseToolbar.Group
      data-slot="toolbar-group"
      className={cn("astw:flex astw:items-center astw:gap-1", className)}
      {...props}
    />
  );
}

function ToolbarLink({ className, ...props }: React.ComponentProps<typeof BaseToolbar.Link>) {
  return (
    <BaseToolbar.Link
      data-slot="toolbar-link"
      className={cn(
        "astw:inline-flex astw:items-center astw:justify-center astw:rounded-md astw:px-2.5 astw:py-1.5 astw:text-sm astw:font-medium astw:underline-offset-4 astw:outline-none",
        "astw:hover:underline",
        "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        className,
      )}
      {...props}
    />
  );
}

const Toolbar = {
  Root: ToolbarRoot,
  Button: ToolbarButton,
  Separator: ToolbarSeparator,
  Group: ToolbarGroup,
  Link: ToolbarLink,
};

export { Toolbar };
