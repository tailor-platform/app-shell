import * as React from "react";

import { cn } from "@/lib/utils";
import { Text } from "../text";

function Root({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "astw:bg-card astw:text-card-foreground astw:flex astw:flex-col astw:rounded-xl astw:border astw:border-border astw:shadow-xs",
        className,
      )}
      {...props}
    />
  );
}
Root.displayName = "Card.Root";

type HeaderProps = Omit<React.ComponentProps<"div">, "title"> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
};

function Header({ className, title, description, children, ...props }: HeaderProps) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "astw:@container/card-header astw:grid astw:auto-rows-min astw:grid-rows-[auto_auto] astw:items-start astw:gap-2 astw:px-6 astw:pt-6 astw:pb-4 astw:[.border-b]:pb-6",
        className,
      )}
      {...props}
    >
      {title && (
        <Text
          variant="heading-md"
          className="astw:leading-none astw:text-card-foreground"
          // eslint-disable-next-line jsx-a11y/heading-has-content
          render={<h3 data-slot="card-title" />}
        >
          {title}
        </Text>
      )}
      {description && (
        <Text
          variant="body-md"
          className="astw:text-muted-foreground"
          render={<div data-slot="card-description" />}
        >
          {description}
        </Text>
      )}
      {children}
    </div>
  );
}
Header.displayName = "Card.Header";

type ContentProps = React.ComponentProps<"div"> & {
  /**
   * `"none"` renders the content edge-to-edge, for a `Table`, `DataTable` or
   * divided list that should meet the card's border.
   * @default "default"
   */
  padding?: "default" | "none";
};

// Flush content carries the card's corner radius (no overflow of its own, so a
// consumer's `overflow-y-auto` still works) and hands it to a direct table
// child, whose own overflow clipping keeps row backgrounds inside the corners.
// A nested DataTable drops its border so it does not draw a box in the box.
const flushClassName = cn(
  "astw:first:rounded-t-[inherit] astw:last:rounded-b-[inherit]",
  "astw:[&>[data-slot=table-container]]:rounded-[inherit]",
  "astw:[&>[data-slot=data-table]]:rounded-[inherit] astw:[&>[data-slot=data-table]]:border-0",
);

function Content({ className, padding = "default", ...props }: ContentProps) {
  return (
    <div
      data-slot="card-content"
      data-padding={padding}
      className={cn(
        padding === "none" ? flushClassName : "astw:px-6 astw:pb-6 astw:first:pt-6",
        className,
      )}
      {...props}
    />
  );
}
Content.displayName = "Card.Content";

export const Card = { Root, Header, Content };
