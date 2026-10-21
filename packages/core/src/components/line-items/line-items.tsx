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
import { useLineItemsT } from "./i18n";
import { LineItemsTable } from "./line-items-table";
import type { LineItemsRowData, UseLineItemsReturn } from "./types";

/**
 * Fullscreen is uncontrolled by default. Controlling it takes both props: with
 * `fullscreen` alone, the toggle and Escape would have no way out of the overlay.
 */
type LineItemsFullscreenControl =
  | {
      /** Controlled fullscreen state. */
      fullscreen: boolean;
      /** Called when the toggle or Escape asks to change it. */
      onFullscreenChange: (next: boolean) => void;
    }
  | {
      fullscreen?: undefined;
      /** Observes fullscreen changes while Root owns the state. */
      onFullscreenChange?: (next: boolean) => void;
    };

export type LineItemsRootProps<T extends LineItemsRowData> = {
  /** The `useLineItems()` return value this subtree renders. */
  value: UseLineItemsReturn<T>;
  children?: React.ReactNode;
  className?: string;
} & LineItemsFullscreenControl;

/** Elements Tab can land on, for keeping focus inside the fullscreen overlay. */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Provides the line-items document to the parts beneath it. Root holds no row
 * data of its own — `useLineItems()` owns all of it.
 *
 * @example
 * const lineItems = useLineItems({ fields, defaultLines: lines });
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
 *       <LineItems.Table renderRowActions={(_row, { lineKey }) => <RemoveButton lineKey={lineKey} />} />
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

  const t = useLineItemsT();

  // The page behind a modal overlay must not scroll under it.
  React.useEffect(() => {
    if (!fullscreen) return;
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previous;
    };
  }, [fullscreen]);

  /**
   * Escape closes, unless something inside already handled it (a cell editor
   * abandoning its edit, a combobox closing its popup). Tab wraps within the
   * overlay so focus can't wander to the page hidden behind it.
   */
  const onOverlayKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      if (e.defaultPrevented) return;
      e.preventDefault();
      setFullscreen(false);
      return;
    }
    if (e.key !== "Tab") return;
    const focusable = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

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

  // The same elements render in both states — `contents` wrappers while
  // inline — so toggling fullscreen never remounts the document: focus stays on
  // the toggle and half-typed cells keep their drafts.
  return (
    <LineItemsContextProvider value={ctx as LineItemsContextValue}>
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- the role is computed: "dialog" whenever the handlers are attached */}
      <div
        data-slot="line-items-fullscreen"
        data-state={fullscreen ? "open" : "closed"}
        // Inline the wrapper is `display: contents` and carries no semantics.
        role={fullscreen ? "dialog" : "presentation"}
        aria-modal={fullscreen || undefined}
        aria-label={fullscreen ? t("fullscreenLabel") : undefined}
        onKeyDown={fullscreen ? onOverlayKeyDown : undefined}
        // Only a press on the dimmed padding itself closes — never one that
        // bubbled up from the card.
        onPointerDown={
          fullscreen
            ? (e) => {
                if (e.target === e.currentTarget) setFullscreen(false);
              }
            : undefined
        }
        className={cn(
          fullscreen
            ? [
                "astw:fixed astw:inset-0 astw:z-(--z-overlay) astw:flex astw:flex-col astw:bg-black/80 astw:p-6 astw:backdrop-blur-sm",
                "astw:animate-in astw:fade-in-0 astw:duration-200 astw:motion-reduce:animate-none",
              ]
            : "astw:contents",
        )}
      >
        <div
          className={cn(
            fullscreen
              ? [
                  // The panel rises as the backdrop fades in; closing is instant.
                  "astw:flex astw:min-h-0 astw:flex-1 astw:flex-col",
                  "astw:animate-in astw:fade-in-0 astw:slide-in-from-bottom-6 astw:duration-300 astw:ease-out astw:motion-reduce:animate-none",
                ]
              : "astw:contents",
          )}
        >
          {body}
        </div>
      </div>
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
