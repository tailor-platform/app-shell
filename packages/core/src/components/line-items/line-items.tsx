import * as React from "react";

import { cn } from "@/lib/utils";
import {
  LineItemsContextProvider,
  type LineItemsContextValue,
  type LineItemsTotalsRenderer,
} from "./line-items-context";
import {
  LineItemsAddRow,
  LineItemsDirtyBar,
  LineItemsFloatingDock,
  LineItemsFullscreenToggle,
  LineItemsSaveActions,
  LineItemsSearch,
  LineItemsSearchToggle,
  LineItemsTotalsRow,
} from "./line-items-parts";
import { LineItemsTable } from "./line-items-table";
import type { LineItemsRowData, UseLineItemsReturn } from "./types";

export type LineItemsRootProps<T extends LineItemsRowData> = {
  /** The `useLineItems()` return value this subtree renders. */
  value: UseLineItemsReturn<T>;
  children?: React.ReactNode;
  /** Controlled fullscreen state. Omit to let Root own it. */
  fullscreen?: boolean;
  onFullscreenChange?: (next: boolean) => void;
  className?: string;
};

/**
 * Fades the backdrop in and lifts the card, so entering fullscreen reads as the
 * panel rising rather than the page snapping. Closing is deliberately instant.
 */
const FULLSCREEN_KEYFRAMES = `
@keyframes line-items-fs-backdrop{from{opacity:0}to{opacity:1}}
@keyframes line-items-fs-card{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
`;

/**
 * Provides the line-items document to the parts beneath it. Root holds no row
 * data of its own — `useLineItems()` owns all of it.
 *
 * @example
 * const lineItems = useLineItems({ fields, data: lines });
 *
 * <LineItems.Root value={lineItems}>
 *   <Card.Root>
 *     <Card.Header title="Line items" action={
 *       <>
 *         <LineItems.SearchToggle />
 *         <LineItems.FullscreenToggle />
 *       </>
 *     } />
 *     <Card.Content>
 *       <LineItems.Table rowActions={(row: POLine) => <RemoveButton lineRef={row.lineRef} />} />
 *       <LineItems.TotalsRow>{(lines) => ({ total: sum(lines) })}</LineItems.TotalsRow>
 *       <LineItems.AddRow>
 *         <CatalogCombobox onPick={(item) => lineItems.addLine(item)} />
 *       </LineItems.AddRow>
 *     </Card.Content>
 *   </Card.Root>
 *   <LineItems.FloatingDock>
 *     <LineItems.DirtyBar warnOnNav onSave={submit} />
 *   </LineItems.FloatingDock>
 * </LineItems.Root>
 */
function LineItemsRoot<T extends LineItemsRowData>({
  value,
  children,
  fullscreen: fullscreenProp,
  onFullscreenChange,
  className,
}: LineItemsRootProps<T>) {
  const [uncontrolledFullscreen, setUncontrolledFullscreen] = React.useState(false);
  const fullscreen = fullscreenProp ?? uncontrolledFullscreen;

  const setFullscreen = React.useCallback(
    (next: boolean) => {
      if (fullscreenProp === undefined) setUncontrolledFullscreen(next);
      onFullscreenChange?.(next);
    },
    [fullscreenProp, onFullscreenChange],
  );

  const [totalsRenderer, setTotalsRenderer] = React.useState<LineItemsTotalsRenderer | undefined>(
    undefined,
  );

  // Stored as a thunk: a plain setState would call the renderer as an updater.
  const registerTotals = React.useCallback((renderer: LineItemsTotalsRenderer | undefined) => {
    setTotalsRenderer(() => renderer);
  }, []);

  const ctx = React.useMemo<LineItemsContextValue<T>>(
    () => ({
      lineItems: value,
      fullscreen,
      setFullscreen,
      totalsRenderer,
      setTotalsRenderer: registerTotals,
    }),
    [fullscreen, registerTotals, setFullscreen, totalsRenderer, value],
  );

  React.useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setFullscreen(false);
    };
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [fullscreen, setFullscreen]);

  const body = (
    <div
      data-slot="line-items"
      data-mode={value.mode}
      className={cn(
        "astw:flex astw:w-full astw:flex-col astw:gap-3",
        fullscreen &&
          cn(
            "astw:min-h-0 astw:flex-1",
            // Stretch a hosted Card so the grid fills the overlay and scrolls
            // inside the card rather than the page.
            "astw:[&>[data-slot=card]]:flex astw:[&>[data-slot=card]]:h-full astw:[&>[data-slot=card]]:min-h-0 astw:[&>[data-slot=card]]:flex-col astw:[&>[data-slot=card]]:overflow-hidden",
            "astw:[&_[data-slot=card-content]]:flex astw:[&_[data-slot=card-content]]:min-h-0 astw:[&_[data-slot=card-content]]:flex-1 astw:[&_[data-slot=card-content]]:flex-col",
          ),
        className,
      )}
    >
      {children}
    </div>
  );

  return (
    <LineItemsContextProvider value={ctx as LineItemsContextValue}>
      {fullscreen ? (
        <>
          <style>{FULLSCREEN_KEYFRAMES}</style>
          <div
            data-slot="line-items-fullscreen"
            // Only a press on the dimmed padding itself closes — never one that
            // bubbled up from the card.
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setFullscreen(false);
            }}
            className="astw:fixed astw:inset-0 astw:z-50 astw:flex astw:flex-col astw:bg-black/80 astw:p-6 astw:backdrop-blur-sm"
            style={{ animation: "line-items-fs-backdrop 220ms ease-out" }}
          >
            <div
              className="astw:flex astw:min-h-0 astw:flex-1 astw:flex-col"
              style={{ animation: "line-items-fs-card 280ms cubic-bezier(0.16,1,0.3,1)" }}
            >
              {body}
            </div>
          </div>
        </>
      ) : (
        body
      )}
    </LineItemsContextProvider>
  );
}
LineItemsRoot.displayName = "LineItems.Root";

export const LineItems = {
  Root: LineItemsRoot,
  Table: LineItemsTable,
  Search: LineItemsSearch,
  SearchToggle: LineItemsSearchToggle,
  AddRow: LineItemsAddRow,
  FullscreenToggle: LineItemsFullscreenToggle,
  SaveActions: LineItemsSaveActions,
  TotalsRow: LineItemsTotalsRow,
  FloatingDock: LineItemsFloatingDock,
  DirtyBar: LineItemsDirtyBar,
};
