// The rail's small-screen form: a left sheet behind a toolbar button.
//
// "Always visible" cannot hold below `lg` — the left column would either eat
// the table or push every row off the fold. The compromise is paid for by the
// active count on the trigger, so "is anything filtering?" is still answered
// without opening anything.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CollectionControl } from "@/types/collection";
import { Button } from "../button";
import { Sheet } from "../sheet";
import { railFields } from "./apply-layout";
import { useFilterRailT } from "./i18n";
import type { FilterRailSection } from "./types";

const COMPACT_QUERY = "(max-width: 1023.98px)";

/**
 * True below the `lg` breakpoint, where `Layout.Column area="left"` stops
 * sitting beside the main column. A media query, not CSS: rendering the rail
 * twice and hiding one copy would duplicate every input in the a11y tree.
 */
export function useFilterRailCompact(query: string = COMPACT_QUERY): boolean {
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.(query).matches === true,
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setCompact(event.matches);
    setCompact(list.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return compact;
}

type TriggerProps<TField extends string = string> = {
  /** The same control and sections given to `FilterRail.Root`, for the active count. */
  control: CollectionControl<TField>;
  sections: readonly FilterRailSection<TField>[];
  onClick: () => void;
  /** Default "Filters". */
  children?: ReactNode;
  className?: string;
};

/** A toolbar button carrying the number of active rail filters. */
function Trigger<TField extends string = string>({
  control,
  sections,
  onClick,
  children,
  className,
}: TriggerProps<TField>) {
  const t = useFilterRailT();
  const owned = useMemo(() => railFields(sections), [sections]);
  const count = control.filters.filter((filter) => owned.has(filter.field)).length;
  const label = children ?? t("title");
  const text = typeof label === "string" ? label : t("title");
  return (
    <Button
      data-slot="filter-rail-trigger"
      variant="outline"
      size="sm"
      onClick={onClick}
      aria-label={count > 0 ? t("activeCount", { label: text, count }) : text}
      className={cn("astw:self-start", className)}
    >
      <SlidersHorizontal className="astw:size-3.5" aria-hidden />
      {label}
      {count > 0 && (
        <span
          aria-hidden
          className="astw:ml-0.5 astw:rounded-full astw:bg-primary astw:px-1.5 astw:text-xs astw:font-medium astw:text-primary-foreground astw:tabular-nums"
        >
          {count}
        </span>
      )}
    </Button>
  );
}
Trigger.displayName = "FilterRail.Trigger";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible title. Default "Filters". */
  title?: string;
  /** Usually a `FilterRail.Root`. */
  children: ReactNode;
};

/** A left sheet — the edge the rail occupies on a wide screen. */
function RailSheet({ open, onOpenChange, title, children }: SheetProps) {
  const t = useFilterRailT();
  return (
    <Sheet.Root side="left" open={open} onOpenChange={onOpenChange}>
      <Sheet.Content
        size="sm"
        data-slot="filter-rail-sheet"
        className="astw:flex astw:flex-col astw:gap-0 astw:p-0 astw:[&>[data-slot=filter-rail]]:flex-1 astw:[&>[data-slot=filter-rail]]:rounded-none astw:[&>[data-slot=filter-rail]]:border-0"
      >
        <Sheet.Header className="astw:sr-only">
          <Sheet.Title>{title ?? t("title")}</Sheet.Title>
          <Sheet.Description>{t("sheetDescription")}</Sheet.Description>
        </Sheet.Header>
        {children}
      </Sheet.Content>
    </Sheet.Root>
  );
}
RailSheet.displayName = "FilterRail.Sheet";

export { Trigger, RailSheet };
export type { TriggerProps, SheetProps };
