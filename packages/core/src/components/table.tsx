import * as React from "react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "./scroll-area";

function TableRoot({
  className,
  containerClassName,
  containerStyle,
  ...props
}: React.ComponentProps<"table"> & {
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}) {
  return (
    <ScrollArea.Root
      data-slot="table-container"
      className={cn("astw:relative astw:w-full", containerClassName)}
      style={containerStyle}
    >
      <table data-slot="table" className={cn("astw:w-full astw:text-sm", className)} {...props} />
    </ScrollArea.Root>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "astw:[&_tr]:border-b astw:sticky astw:top-0 astw:z-10 astw:bg-background",
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("astw:[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "astw:bg-muted astw:border-t astw:font-medium astw:[&>tr]:last:border-b-0 astw:sticky astw:bottom-0 astw:z-10",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "astw:hover:bg-muted/50 astw:data-[state=selected]:bg-muted astw:border-b astw:transition-colors",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "astw:text-foreground astw:h-10 astw:px-2 astw:text-left astw:align-middle astw:font-medium astw:whitespace-nowrap astw:[&:has([role=checkbox])]:pr-0 astw:*:[[role=checkbox]]:translate-y-0.5",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "astw:p-2 astw:align-middle astw:whitespace-nowrap astw:[&:has([role=checkbox])]:pr-0 astw:*:[[role=checkbox]]:translate-y-0.5",
        className,
      )}
      {...props}
    />
  );
}

const Table = {
  Root: TableRoot,
  Header: TableHeader,
  Body: TableBody,
  Footer: TableFooter,
  Head: TableHead,
  Row: TableRow,
  Cell: TableCell,
};

export { Table };
