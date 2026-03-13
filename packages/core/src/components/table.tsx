import * as React from "react";

import { cn } from "@/lib/utils";

function Root({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="astw:relative astw:w-full astw:overflow-x-auto">
      <table
        data-slot="table"
        className={cn("astw:w-full astw:caption-bottom astw:text-sm", className)}
        {...props}
      />
    </div>
  );
}

function Header({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead data-slot="table-header" className={cn("astw:[&_tr]:border-b", className)} {...props} />
  );
}

function Body({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("astw:[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function Footer({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "astw:bg-muted/50 astw:border-t astw:font-medium astw:[&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

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

function Head({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "astw:text-foreground astw:h-10 astw:px-2 astw:text-left astw:align-middle astw:font-medium astw:whitespace-nowrap astw:[&:has([role=checkbox])]:pr-0 astw:[&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function Cell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "astw:p-2 astw:align-middle astw:whitespace-nowrap astw:[&:has([role=checkbox])]:pr-0 astw:[&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function Caption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("astw:text-muted-foreground astw:mt-4 astw:text-sm", className)}
      {...props}
    />
  );
}

export const Table = { Root, Header, Body, Footer, Row, Head, Cell, Caption };
