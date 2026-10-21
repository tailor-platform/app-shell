import { useDataTableContext } from "../context";
import { useCollectionControlOptional } from "@/contexts/collection-control-context";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { FilterableColumn } from "./types";
import { FilterChip } from "./chip";
import { AddFilterPanel } from "./add-panel";

/** Use `DataTable.Filters` instead of calling this directly. */
function DataTableFilters({
  className,
  slot = "all",
  addIconOnly = true,
}: {
  className?: string;
  /**
   * Which part to render, for custom toolbar layouts:
   * - `"all"` (default) — active filter chips plus the **Add filter** trigger.
   * - `"chips"` — only the active filter chips (renders nothing when there are none).
   * - `"add"` — only the **Add filter** trigger.
   *
   * Render `"add"` and `"chips"` separately to place the trigger and the chips on
   * different rows (e.g. the trigger in a header row, chips on the row below).
   */
  slot?: "all" | "chips" | "add";
  /**
   * Render the **Add filter** trigger as an icon-only button (label → `aria-label`).
   * Defaults to `true`; pass `addIconOnly={false}` to show the "Add filter" text label.
   */
  addIconOnly?: boolean;
}) {
  const ctx = useDataTableContext();
  const control = useCollectionControlOptional();
  if (!control) {
    throw new Error(
      "<DataTable.Filters> requires collection control. Pass `control` from `useCollectionVariables()` to `useDataTable()`.",
    );
  }

  // Collect all columns that have a filter config
  const filterableColumns = useMemo(
    () => ctx.columns.filter((col): col is FilterableColumn => !!col.filter),
    [ctx.columns],
  );

  if (filterableColumns.length === 0) return null;

  const chips = filterableColumns
    .map((col) => {
      const active = control.filters.find((f) => f.field === col.filter.field);
      return active ? (
        <FilterChip key={col.filter.field} column={col} filter={active} control={control} />
      ) : null;
    })
    .filter(Boolean);

  // The Add filter trigger only. Wrapped in a shrink-to-content box so the button
  // keeps its natural width instead of stretching to fill a column-flex toolbar
  // (DataTable.Toolbar is `flex-col`, which stretches its children by default).
  if (slot === "add") {
    return (
      <div className={cn("astw:w-fit", className)}>
        <AddFilterPanel columns={filterableColumns} control={control} iconOnly={addIconOnly} />
      </div>
    );
  }

  // Active chips only — nothing when there are no active filters.
  if (slot === "chips") {
    if (chips.length === 0) return null;
    return (
      <div
        data-slot="data-table-filters"
        className={cn("astw:flex astw:flex-wrap astw:items-center astw:gap-2", className)}
      >
        {chips}
      </div>
    );
  }

  // Default: the left-aligned Add filter trigger + chips (grow to fill) to its right.
  return (
    <div
      data-slot="data-table-filters"
      className={cn("astw:flex astw:items-start astw:gap-2", className)}
    >
      {/* Trigger comes first so it stays pinned left and doesn't shift as chips are
          added — the chips grow to its right inside their own flex-1 container. */}
      <AddFilterPanel columns={filterableColumns} control={control} iconOnly={addIconOnly} />
      <div className="astw:flex astw:flex-1 astw:flex-wrap astw:items-center astw:gap-2">
        {chips}
      </div>
    </div>
  );
}

DataTableFilters.displayName = "DataTable.Filters";

export { DataTableFilters };
