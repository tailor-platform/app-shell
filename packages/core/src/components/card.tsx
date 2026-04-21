import * as React from "react";

import { cn } from "@/lib/utils";

function Root({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "astw:bg-card astw:text-card-foreground astw:flex astw:flex-col astw:rounded-xl astw:border astw:shadow-xs",
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
        <h3
          data-slot="card-title"
          className="astw:text-lg astw:font-semibold astw:leading-none astw:text-card-foreground"
        >
          {title}
        </h3>
      )}
      {description && (
        <div data-slot="card-description" className="astw:text-muted-foreground astw:text-sm">
          {description}
        </div>
      )}
      {children}
    </div>
  );
}
Header.displayName = "Card.Header";

function Content({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("astw:px-6 astw:pb-6 astw:first:pt-6", className)}
      {...props}
    />
  );
}
Content.displayName = "Card.Content";

export const Card = { Root, Header, Content };
