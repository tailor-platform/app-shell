import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function TableFrame({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        // Clip corners without becoming a scroll owner for the sticky selection footer.
        "astw:flex astw:flex-col astw:min-h-0 astw:overflow-clip astw:border astw:border-border astw:rounded-md astw:bg-card",
        "astw:[&>[data-slot=toolbar]]:rounded-b-none astw:[&>[data-slot=toolbar]]:border-x-0 astw:[&>[data-slot=toolbar]]:border-t-0",
        className,
      )}
      {...props}
    />
  );
}

export function TableFooterSurface({
  selecting = false,
  selectionEnabled = false,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { selecting?: boolean; selectionEnabled?: boolean }) {
  return (
    <div
      data-selecting={selecting ? "" : undefined}
      className={cn(
        "astw:flex astw:shrink-0 astw:items-center astw:border-t astw:border-border astw:px-4 astw:py-2",
        selectionEnabled && "astw:transition-colors astw:motion-reduce:transition-none",
        selecting && [
          "astw:flex-wrap astw:gap-x-3 astw:gap-y-2 astw:bg-accent astw:text-accent-foreground",
          "astw:rounded-b-[calc(var(--radius-md)-1px)] astw:sticky astw:bottom-0 astw:z-20",
          // Retain DataTable's existing surface token for styling compatibility.
          "astw:[--data-table-selection-surface:var(--accent)]",
        ],
        className,
      )}
      {...props}
    >
      {selectionEnabled ? (
        <div
          className={cn(
            "astw:contents",
            selecting && [
              "astw:[--accent:color-mix(in_srgb,var(--accent-foreground)_8%,var(--data-table-selection-surface))]",
              "astw:[--muted-foreground:color-mix(in_srgb,var(--accent-foreground)_70%,var(--data-table-selection-surface))]",
            ],
          )}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
