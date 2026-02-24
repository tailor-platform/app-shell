import * as React from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Link } from "./client-side-link";
import { renderOrDefault } from "@/lib/render-utils";

function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "astw:text-muted-foreground astw:flex astw:flex-wrap astw:items-center astw:gap-1.5 astw:text-sm astw:break-words astw:sm:gap-2.5",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("astw:inline-flex astw:items-center astw:gap-1.5", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  render,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & {
  render?: React.ReactElement;
}) {
  return renderOrDefault(
    render,
    Link,
    {
      "data-slot": "breadcrumb-link",
      className: cn("astw:hover:text-foreground astw:transition-colors", className),
      ...props,
    },
    children,
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("astw:text-foreground astw:font-normal", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("astw:[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn("astw:flex astw:size-9 astw:items-center astw:justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="astw:size-4" />
      <span className="astw:sr-only">More</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
