import * as React from "react";

import { cn } from "@/lib/utils";

type RootProps = React.ComponentProps<"table"> & {
  /** Additional CSS classes for the outer scrollable `<div>` container. Use this to control height, overflow, or container-level layout. */
  containerClassName?: string;
};

/**
 * The root table element with a horizontally scrollable container.
 *
 * Note: `className` targets the inner `<table>` element, while `containerClassName` targets the outer scrollable `<div>` wrapper.
 *
 * @example
 * ```tsx
 * <Table.Root>
 *   <Table.Header>
 *     <Table.Row>
 *       <Table.Head>Name</Table.Head>
 *       <Table.Head>Status</Table.Head>
 *     </Table.Row>
 *   </Table.Header>
 *   <Table.Body>
 *     <Table.Row>
 *       <Table.Cell>Item 1</Table.Cell>
 *       <Table.Cell>Active</Table.Cell>
 *     </Table.Row>
 *   </Table.Body>
 * </Table.Root>
 * ```
 */
function Root({ className, containerClassName, ...props }: RootProps) {
  return (
    <div
      data-slot="table-container"
      className={cn("astw:relative astw:w-full astw:overflow-x-auto", containerClassName)}
    >
      <table
        data-slot="table"
        className={cn("astw:w-full astw:caption-bottom astw:text-sm", className)}
        {...props}
      />
    </div>
  );
}
Root.displayName = "Table.Root";

/** The table header section (`<thead>`). */
function Header({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead data-slot="table-header" className={cn("astw:[&_tr]:border-b", className)} {...props} />
  );
}
Header.displayName = "Table.Header";

/** The table body section (`<tbody>`). */
function Body({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("astw:[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}
Body.displayName = "Table.Body";

/** The table footer section (`<tfoot>`). */
function Footer({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("astw:border-t astw:font-medium astw:[&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
}
Footer.displayName = "Table.Footer";

/** A table row (`<tr>`). */
function Row({ className, ...props }: React.ComponentProps<"tr">) {
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
Row.displayName = "Table.Row";

/** A table header cell (`<th>`). */
function Head({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "astw:text-foreground astw:h-10 astw:px-2 astw:first:pl-6 astw:last:pr-6 astw:text-left astw:align-middle astw:font-medium astw:whitespace-nowrap astw:[&:has([role=checkbox])]:pr-0 astw:[&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}
Head.displayName = "Table.Head";

/** A table data cell (`<td>`). */
function Cell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "astw:px-2 astw:py-2 astw:first:pl-6 astw:last:pr-6 astw:align-middle astw:whitespace-nowrap astw:[&:has([role=checkbox])]:pr-0 astw:[&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}
Cell.displayName = "Table.Cell";

/** A table caption element. */
function Caption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("astw:text-muted-foreground astw:mt-4 astw:text-sm", className)}
      {...props}
    />
  );
}
Caption.displayName = "Table.Caption";

export const Table = { Root, Header, Body, Footer, Row, Head, Cell, Caption };
