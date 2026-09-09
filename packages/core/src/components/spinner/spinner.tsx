import * as React from "react";

import { cn } from "@/lib/utils";

export type SpinnerProps = React.ComponentProps<"svg">;

function Spinner({ className, ...props }: SpinnerProps) {
  const decorative =
    props["aria-hidden"] == null &&
    props.role == null &&
    props["aria-label"] == null &&
    props["aria-labelledby"] == null;

  return (
    <svg
      data-slot="spinner"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("astw:size-4 astw:animate-spin", className)}
      aria-hidden={decorative ? true : props["aria-hidden"]}
      {...props}
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="24 24"
        strokeDashoffset="8"
      />
    </svg>
  );
}
Spinner.displayName = "Spinner";

export { Spinner };
