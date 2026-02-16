import React from "react";
import { Link as RouterLink, useHref } from "react-router";

type Props = React.ComponentProps<"a"> & {
  to: string;
  children: React.ReactNode;
};

export function Link({ to, children, ...rest }: Props) {
  // If react-router is available, use its Link
  try {
    // useHref will throw if not in a Router context
    useHref(to);
    return (
      <RouterLink to={to} {...rest}>
        {children}
      </RouterLink>
    );
  } catch {
    // Fallback to <a> if not in Router context
    return (
      <a href={to} {...rest}>
        {children}
      </a>
    );
  }
}
