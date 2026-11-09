import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table } from "@/components/table";
import { Button } from "@/components/button";
import { useDataTableT } from "./i18n";

// Drives both the CSS transition and how long the detail row stays mounted while
// collapsing, so the two cannot drift apart.
const EXPAND_TRANSITION_MS = 300;

// `useLayoutEffect` warns during SSR; the measurement it drives is client-only,
// so fall back to `useEffect` on the server.
const useIsomorphicLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect;

interface RowExpandToggleProps {
  id: string;
  expanded: boolean;
  label: string | undefined;
  panelId: string;
  onToggle: () => void;
}

/**
 * The chevron trigger. A native `<button>` (via app-shell's `Button`), so
 * Enter/Space activation and the focus ring come for free — no custom key
 * handling. `aria-expanded` is what announces the state change on activation.
 *
 * @internal
 */
function RowExpandToggle({ id, expanded, label, panelId, onToggle }: RowExpandToggleProps) {
  const t = useDataTableT();
  // A contextual name ("Expand row INV-1001") — "Expand row" repeated down the
  // column conveys nothing. The locale owns word order and the unnamed fallback.
  const name = t(expanded ? "collapseRow" : "expandRow", { label });

  return (
    <Button
      id={id}
      type="button"
      variant="ghost"
      size="icon"
      aria-expanded={expanded}
      // Only while expanded — it must never point at an id absent from the DOM.
      aria-controls={expanded ? panelId : undefined}
      aria-label={name}
      onClick={onToggle}
    >
      <ChevronRight
        className={cn(
          "astw:size-4 astw:transition-transform astw:motion-reduce:transition-none",
          expanded && "astw:rotate-90",
        )}
      />
    </Button>
  );
}

// =============================================================================
// DataTableExpandedRow (internal)
// =============================================================================

interface DataTableExpandedRowProps {
  open: boolean;
  totalColSpan: number;
  panelId: string;
  triggerId: string;
  label: string | undefined;
  render: () => ReactNode;
}

/**
 * The detail row: one full-width `<tr>` with a single `colSpan` cell, rendered
 * immediately after its parent row so forward-tabbing reaches the panel next.
 *
 * Mounted for every expandable row (returning `null` while closed) so the
 * collapse has something to animate. `render` is a thunk, not `children`, so
 * `rowExpansion.render` only runs while the panel is on screen.
 *
 * @internal
 */
function DataTableExpandedRow({
  open,
  totalColSpan,
  panelId,
  triggerId,
  label,
  render,
}: DataTableExpandedRowProps) {
  // `present` is DOM presence, `entered` the visual state. Opening must mount
  // collapsed so the transition has a "from" value; closing must stay mounted
  // until it has played out.
  const [present, setPresent] = useState(open);
  const [entered, setEntered] = useState(false);

  useIsomorphicLayoutEffect(() => {
    if (open) setPresent(true);
  }, [open]);

  // One frame after mounting, so `0fr → 1fr` is a transition, not an initial value.
  useIsomorphicLayoutEffect(() => {
    if (!open || !present) return;
    if (typeof requestAnimationFrame !== "function") {
      // No frame scheduler — reveal immediately rather than stay stuck collapsed.
      setEntered(true);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open, present]);

  // A timer rather than `transitionend`: under `prefers-reduced-motion` there is
  // no transition, so the event would never fire and the row would never unmount.
  useEffect(() => {
    if (open || !present) return;
    setEntered(false);
    const timer = setTimeout(() => setPresent(false), EXPAND_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [open, present]);

  if (!present) return null;

  return (
    <ExpandedRowContent
      open={open}
      entered={entered}
      totalColSpan={totalColSpan}
      panelId={panelId}
      triggerId={triggerId}
      label={label}
      render={render}
    />
  );
}

interface ExpandedRowContentProps extends DataTableExpandedRowProps {
  entered: boolean;
}

/**
 * The rendered detail row. Split from the presence owner above so that it truly
 * unmounts when the collapse finishes: the focus handoff runs from a layout
 * effect's cleanup, which only fires before React detaches the nodes when the
 * component itself is removed. Keeping it in the always-mounted parent would run
 * the cleanup after the panel had already left the DOM, by which point
 * `document.activeElement` has fallen back to `<body>` and the handoff is a
 * no-op — the exact bug it exists to prevent.
 *
 * @internal
 */
function ExpandedRowContent({
  open,
  entered,
  totalColSpan,
  panelId,
  triggerId,
  label,
  render,
}: ExpandedRowContentProps) {
  const t = useDataTableT();
  const panelRef = useRef<HTMLElement>(null);

  // Hand focus back when the collapse starts, before the panel goes `inert`
  // below — making an element inert while it holds focus drops focus to <body>.
  useIsomorphicLayoutEffect(() => {
    if (open) return;
    const panel = panelRef.current;
    if (!panel || !panel.contains(document.activeElement)) return;
    document.getElementById(triggerId)?.focus();
  }, [open, triggerId]);

  // Safety net for the row unmounting outright (refetch, filter, pagination).
  // Both targets are resolved at setup, while still in the document; by cleanup
  // the trigger may be gone too, so the scroll container is the fallback.
  useIsomorphicLayoutEffect(() => {
    const panel = panelRef.current;
    const trigger = document.getElementById(triggerId);
    const container = panel?.closest<HTMLElement>("[data-slot='table-container']") ?? null;
    return () => {
      if (!panel || !panel.contains(document.activeElement)) return;
      if (trigger?.isConnected) {
        trigger.focus();
        return;
      }
      if (container?.isConnected) {
        // Borrow `tabindex` only for the focus call: a scrollable div is tabbable
        // by default *unless* the author sets one, and this container is shared
        // by every `Table.Root` consumer.
        const hadTabIndex = container.hasAttribute("tabindex");
        if (!hadTabIndex) container.setAttribute("tabindex", "-1");
        container.focus();
        if (!hadTabIndex) container.removeAttribute("tabindex");
      }
    };
  }, [triggerId]);

  return (
    <Table.Row
      data-slot="data-table-expanded-row"
      data-state={open ? "open" : "closed"}
      className="astw:bg-muted/30 astw:hover:bg-transparent"
    >
      {/* `p-0!` — this cell is both first and last, and `Table.Cell`'s
          `first:pl-6 last:pr-6` outranks a plain `p-0` on specificity, insetting
          the sticky panel by 24px. */}
      <Table.Cell colSpan={totalColSpan} className="astw:p-0!">
        {/* The colSpan cell spans the whole table, so pin the panel to the left
            edge of the scrollport or it sits off-screen once scrolled. The
            `min(100%, …)` makes this a no-op when the table already fits. */}
        <div
          className="astw:sticky astw:left-0"
          style={{ width: "min(100%, var(--data-table-viewport, 100%))" }}
        >
          {/* `0fr → 1fr` resolves to the panel's exact natural height, so consumer
              content of any size is neither clipped nor left with dead time at the
              end. The `<tr>`/`<td>` are left alone — rows size to their content,
              and animating row heights under `border-collapse` is unreliable. */}
          <div
            className="astw:grid astw:transition-[grid-template-rows,opacity] astw:ease-out astw:motion-reduce:transition-none"
            style={{
              gridTemplateRows: entered ? "1fr" : "0fr",
              opacity: entered ? 1 : 0,
              transitionDuration: `${EXPAND_TRANSITION_MS}ms`,
            }}
          >
            {/* `min-h-0` — grid items default to `min-height: auto` and would
                refuse to collapse. `overflow-y-hidden` clips mid-reveal;
                `overflow-x-auto` keeps wide content reachable. */}
            <div className="astw:min-h-0 astw:overflow-x-auto astw:overflow-y-hidden">
              {/* A named `<section>` maps to `role="region"`. `inert` covers the
                  closing window — zero height and opacity still leave descendants
                  focusable and announced. */}
              <section
                ref={panelRef}
                id={panelId}
                inert={open ? undefined : true}
                aria-label={t("expandedDetails", { label })}
                className="astw:px-6 astw:py-3"
              >
                {render()}
              </section>
            </div>
          </div>
        </div>
      </Table.Cell>
    </Table.Row>
  );
}

export { RowExpandToggle, DataTableExpandedRow };
