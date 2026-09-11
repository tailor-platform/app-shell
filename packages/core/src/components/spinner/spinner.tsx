import * as React from "react";

import { cn } from "@/lib/utils";

const SPINNER_SIZES = {
  xs: 12,
  sm: 14,
  default: 16,
  lg: 20,
} as const;

export type SpinnerProps = React.ComponentProps<"svg"> & {
  size?: keyof typeof SPINNER_SIZES;
};

function Spinner({ className, size = "default", width, height, ...props }: SpinnerProps) {
  const hasAccessibleName = props["aria-label"] != null || props["aria-labelledby"] != null;
  const decorative =
    props["aria-hidden"] === true ||
    (props["aria-hidden"] == null && props.role == null && !hasAccessibleName);
  const resolvedSize = SPINNER_SIZES[size];

  return (
    <svg
      data-slot="spinner"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      width={width ?? resolvedSize}
      height={height ?? resolvedSize}
      className={cn("astw:animate-spin astw:shrink-0", className)}
      role={decorative ? undefined : (props.role ?? "status")}
      aria-hidden={decorative ? true : props["aria-hidden"]}
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
export { Spinner };
