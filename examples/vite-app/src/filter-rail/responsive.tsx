// ✅ Reusable Component: the rail's small-screen form.
//
// ─── Decision 1 has to bend here, and only here ──────────────────────────────
//
// "Always visible, never a modal" is the rail's first principle, and below
// roughly 1024px it is not physically available: `Layout.Column area="left"` is
// a fixed 320px that only goes side-by-side at `lg`, so on a narrow screen the
// rail either eats the table or stacks above it and pushes every row off the
// fold. Both are worse than a sheet.
//
// So on small screens the rail becomes a left sheet behind a toolbar button,
// sitting next to `Columns` — the same place, the same shape, so the two
// controls that reshape the table live together.
//
// The compromise is paid for by **putting the active count on the trigger**. The
// reason decision 1 exists is that a filter you cannot see is a filter you
// forget; a button reading "Filters 3" still answers "is anything filtering?"
// without opening anything, which is the part that actually matters.

import { Button, Sheet } from "@tailor-platform/app-shell";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/**
 * True below app-shell's `lg` breakpoint — the width at which
 * `Layout.Column area="left"` stops sitting beside the main column.
 *
 * A media query and not a CSS class, deliberately: rendering the rail twice and
 * hiding one copy would duplicate every input, every `aria-label` and every
 * section id in the accessibility tree, and give a screen reader two "Category"
 * groups to choose from. One instance moves between two homes instead.
 */
export const useIsCompact = (maxWidth = 1023.98) => {
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia(`(max-width: ${maxWidth}px)`).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const onChange = (event: MediaQueryListEvent) => setCompact(event.matches);
    setCompact(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [maxWidth]);

  return compact;
};

/**
 * The toolbar button, shaped to sit beside `Columns`.
 *
 * `data-slot="button"` is load-bearing — the theme restyles outline buttons
 * through that selector, and it is dropped when `Button` is rendered as someone
 * else's trigger. Raised with the app-shell team.
 */
export const FilterRailTrigger = ({
  count,
  onClick,
  label = "Filters",
}: {
  /** Active filters the rail owns. Shown on the button so nothing is hidden. */
  count: number;
  onClick: () => void;
  label?: ReactNode;
}) => (
  <Button
    variant="outline"
    size="sm"
    data-slot="button"
    onClick={onClick}
    aria-label={count > 0 ? `${label}, ${count} active` : String(label)}
    // `self-start` because `DataTable.Toolbar` puts its children in a
    // `flex-col flex-1` — a slot shaped for a full-width search field. A
    // column's cross axis is horizontal, so the default `stretch` blows the
    // button out to the toolbar's full width (measured: 578px) and centres its
    // label in the middle of it. `self-start` shrinks it back to its content.
    className="self-start"
  >
    <SlidersHorizontal className="size-3.5" aria-hidden />
    {label}
    {count > 0 && (
      <span
        aria-hidden
        className="ml-0.5 rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground tabular-nums"
      >
        {count}
      </span>
    )}
  </Button>
);

/**
 * The sheet the rail lives in on small screens.
 *
 * `side="left"` to match where the rail sits on a wide screen — the panel
 * arrives from the edge it would have occupied, so the same mental model
 * survives the breakpoint.
 */
export const FilterRailSheet = ({
  open,
  onOpenChange,
  title = "Filters",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
}) => (
  <Sheet.Root side="left" open={open} onOpenChange={onOpenChange}>
    {/* `p-0` and a flex column: the rail brings its own header, its own scroll
        area and its own pinned footer, so the sheet contributes a shell and
        nothing else. Sheet padding here would double every one of them. */}
    <Sheet.Content size="sm" className="flex flex-col p-0">
      <Sheet.Header className="sr-only">
        <Sheet.Title>{title}</Sheet.Title>
        <Sheet.Description>Filter the results.</Sheet.Description>
      </Sheet.Header>
      {children}
    </Sheet.Content>
  </Sheet.Root>
);
