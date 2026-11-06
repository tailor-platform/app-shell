import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { ColumnPin } from "./column-state";

export type PinPlacement = { side: ColumnPin; offset: number; isBoundary: boolean };
export type PinColumn = { id: string; pin?: ColumnPin; width: number };

/** Explicit none unpins; absent/invalid overrides retain the definition default. */
export function resolvePin(
  stored: unknown,
  defaultPin: ColumnPin | undefined,
): ColumnPin | undefined {
  if (stored === "none") return undefined;
  return stored === "left" || stored === "right" ? stored : defaultPin;
}

/** Geometry follows DOM order, including fixed utility columns. */
export function computePinPlacements(columns: readonly PinColumn[]): Map<string, PinPlacement> {
  const placements = new Map<string, PinPlacement>();
  const left = columns.filter((column) => column.pin === "left");
  const right = columns.filter((column) => column.pin === "right");
  let offset = 0;
  left.forEach((column, index) => {
    placements.set(column.id, { side: "left", offset, isBoundary: index === left.length - 1 });
    offset += column.width;
  });
  offset = 0;
  for (let index = right.length - 1; index >= 0; index--) {
    const column = right[index]!;
    placements.set(column.id, { side: "right", offset, isBoundary: index === 0 });
    offset += column.width;
  }
  return placements;
}

export function pinCellProps(
  placement: PinPlacement | undefined,
  base: { style?: CSSProperties; className?: string },
  variant: "header" | "body" | "footer",
): { style?: CSSProperties; className?: string } {
  if (!placement) return base;
  const style: CSSProperties = {
    ...base.style,
    position: "sticky",
    [placement.side]: placement.offset,
  };
  const className = cn(
    base.className,
    "astw:z-[1]",
    variant !== "body"
      ? cn(
          "astw:bg-card astw:before:pointer-events-none astw:before:absolute astw:before:inset-x-0 astw:before:h-px astw:before:bg-border astw:before:content-['']",
          variant === "header" ? "astw:before:bottom-0" : "astw:before:top-0",
        )
      : cn(
          "astw:bg-card astw:transition-colors",
          "astw:group-hover:[background-color:color-mix(in_srgb,var(--muted)_50%,var(--card))]",
          "astw:group-aria-selected:bg-muted",
        ),
    // Pseudo-elements preserve the freeze shadow under collapsed table borders.
    placement.isBoundary &&
      placement.side === "left" &&
      "astw:after:pointer-events-none astw:after:absolute astw:after:inset-y-0 astw:after:right-0 astw:after:w-1 astw:after:translate-x-full astw:after:bg-gradient-to-r astw:after:from-black/10 astw:dark:after:from-black/20 astw:after:to-transparent astw:after:content-[''] astw:after:opacity-0 astw:after:transition-opacity astw:[[data-pin-shadow-left]_&]:after:opacity-100",
    placement.isBoundary &&
      placement.side === "right" &&
      "astw:after:pointer-events-none astw:after:absolute astw:after:inset-y-0 astw:after:left-0 astw:after:w-1 astw:after:-translate-x-full astw:after:bg-gradient-to-l astw:after:from-black/10 astw:dark:after:from-black/20 astw:after:to-transparent astw:after:content-[''] astw:after:opacity-0 astw:after:transition-opacity astw:[[data-pin-shadow-right]_&]:after:opacity-100",
  );
  return { style, className };
}
