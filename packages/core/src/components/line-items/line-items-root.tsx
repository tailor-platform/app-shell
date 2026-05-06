import * as React from "react";

import { cn } from "@/lib/utils";

import type { LineItemsRowData, UseLineItemsReturn } from "./types";

/* ======================================================================== */
/* Root context (shared between LineItems.* compound parts)                  */
/* ======================================================================== */

/** Optional render-fn for a totals row. Returns one value per column key. */
export type LineItemsTotalsRowFn<T extends LineItemsRowData = LineItemsRowData> = (
  lines: T[],
) => Record<string, React.ReactNode>;

export type LineItemsRootContextValue<T extends LineItemsRowData> = {
  hook: UseLineItemsReturn<T>;
  fullscreen: boolean;
  setFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  /** Set by `<LineItems.TotalsRow>` when present; consumed by `<LineItems.Table>`. */
  totalsRowFn: LineItemsTotalsRowFn<T> | null;
  setTotalsRowFn: React.Dispatch<React.SetStateAction<LineItemsTotalsRowFn<T> | null>>;
};

const LineItemsRootContext =
  React.createContext<LineItemsRootContextValue<LineItemsRowData> | null>(null);

export function useLineItemsRoot<T extends LineItemsRowData>(): LineItemsRootContextValue<T> {
  const v = React.useContext(LineItemsRootContext);
  if (!v) {
    throw new Error(
      "LineItems compound parts must be rendered inside <LineItems.Root>. " +
        "Wrap your tree with <LineItems.Root value={useLineItems(...)}>.",
    );
  }
  return v as unknown as LineItemsRootContextValue<T>;
}

/* ======================================================================== */
/* Root component                                                            */
/* ======================================================================== */

export type LineItemsRootProps<T extends LineItemsRowData> = {
  /** The hook return value from `useLineItems()`. */
  value: UseLineItemsReturn<T>;
  className?: string;
  children: React.ReactNode;
};

export function LineItemsRoot<T extends LineItemsRowData>({
  value,
  className,
  children,
}: LineItemsRootProps<T>) {
  const [fullscreen, setFullscreen] = React.useState(false);
  const [totalsRowFn, setTotalsRowFn] =
    React.useState<LineItemsTotalsRowFn<T> | null>(null);

  React.useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const ctx = React.useMemo<LineItemsRootContextValue<T>>(
    () => ({ hook: value, fullscreen, setFullscreen, totalsRowFn, setTotalsRowFn }),
    [value, fullscreen, totalsRowFn],
  );

  // Click on the backdrop (the wrapper itself, not a child) closes fullscreen.
  // Children with their own pointer handlers don't bubble target===currentTarget,
  // so this only fires for the dimmed padding around the card.
  const onBackdropPointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!fullscreen) return;
      if (e.target === e.currentTarget) setFullscreen(false);
    },
    [fullscreen],
  );

  return (
    <LineItemsRootContext.Provider
      value={ctx as unknown as LineItemsRootContextValue<LineItemsRowData>}
    >
      <div
        data-slot="line-items"
        data-fullscreen={fullscreen ? "true" : undefined}
        onPointerDown={onBackdropPointerDown}
        className={cn(
          "astw:flex astw:w-full astw:flex-col astw:gap-1",
          // Fullscreen overlay: viewport-filling with a dark backdrop. Descendant
          // selectors stretch a single Card child + its Card.Content so the table
          // can fill the screen and scroll inside the card.
          fullscreen && [
            "astw:fixed astw:inset-0 astw:z-50 astw:overflow-hidden astw:bg-black/80 astw:p-6 astw:backdrop-blur-sm",
            "astw:[&>[data-slot=card]]:h-full astw:[&>[data-slot=card]]:overflow-hidden",
            "astw:[&_[data-slot=card-content]]:flex astw:[&_[data-slot=card-content]]:flex-1 astw:[&_[data-slot=card-content]]:min-h-0 astw:[&_[data-slot=card-content]]:flex-col",
          ],
          className,
        )}
      >
        {children}
      </div>
    </LineItemsRootContext.Provider>
  );
}
LineItemsRoot.displayName = "LineItems.Root";
