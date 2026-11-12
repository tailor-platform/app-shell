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
  /** Actions displayed to the right of the title, wrapping when space is limited. */
  action?: React.ReactNode;
};

function Header({ className, title, description, action, children, ...props }: HeaderProps) {
  const hasAction = action != null && action !== false;
  const titleElement = title && (
    <Text.h3
      variant="heading-md"
      className={cn(
        "astw:leading-none astw:text-card-foreground",
        hasAction && "astw:min-w-0 astw:max-w-full astw:wrap-anywhere",
      )}
      data-slot="card-title"
    >
      {title}
    </Text.h3>
  );

  return (
    <div
      data-slot="card-header"
      className={cn(
        "astw:@container/card-header astw:grid astw:auto-rows-min astw:grid-rows-[auto_auto] astw:items-start astw:gap-2 astw:px-6 astw:pt-6 astw:pb-4 astw:[.border-b]:pb-6",
        className,
      )}
      {...props}
    >
      {hasAction ? (
        <div
          data-slot="card-header-title-row"
          className="astw:flex astw:min-w-0 astw:flex-wrap astw:items-center astw:gap-2"
        >
          {titleElement}
          <div
            data-slot="card-header-action"
            className="astw:ml-auto astw:flex astw:min-w-0 astw:max-w-full astw:flex-wrap astw:items-center astw:justify-end astw:gap-2"
          >
            {action}
          </div>
        </div>
      ) : (
        titleElement
      )}
      {description && (
        <Text.div className="astw:text-muted-foreground" data-slot="card-description">
          {description}
        </Text.div>
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

/** A right-aligned, wrapping action region separated from the body by a top border. */
function Footer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "astw:flex astw:flex-wrap astw:items-center astw:justify-end astw:gap-2 astw:border-t astw:border-border astw:px-6 astw:py-4",
        className,
      )}
      {...props}
    />
  );
}
Footer.displayName = "Card.Footer";

export const Card = { Root, Header, Content, Footer };
