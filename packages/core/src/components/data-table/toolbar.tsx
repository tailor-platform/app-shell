import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { Checkbox } from "@base-ui/react/checkbox";
import { ChevronDown, Filter as FilterIcon, X, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCollectionControlOptional } from "@/contexts/collection-control-context";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Select } from "@/components/select-standalone";
import { DatePicker } from "@/components/date-field";
import { Calendar } from "@/components/calendar";
import { Tooltip } from "@/components/tooltip";
import { parseDate, DateFormatter } from "@internationalized/date";
import { useResolvedLocale } from "@/contexts/appshell-context";
import { useDataTableContext } from "./data-table-context";
import { useDataTableT } from "./i18n";
import type {
  CollectionControl,
  Filter,
  FilterConfig,
  FilterOperator,
  SelectOption,
} from "@/types/collection";
import type { Column } from "./types";

// =============================================================================
// DataTable.Toolbar
// =============================================================================

/** Use `DataTable.Toolbar` instead of calling this directly. */
function DataTableToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-slot="data-table-toolbar"
      className={cn(
        "astw:flex astw:shrink-0 astw:flex-col astw:gap-2 astw:border-b astw:border-border astw:p-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
DataTableToolbar.displayName = "DataTable.Toolbar";

// =============================================================================
// DataTable.Filters
// =============================================================================

/** Default operator per filter type used when adding a new filter chip. */
const DEFAULT_OPERATOR: Record<FilterConfig["type"], FilterOperator> = {
  enum: "in",
  boolean: "eq",
  string: "contains",
  number: "eq",
  datetime: "eq",
  date: "eq",
  time: "eq",
  uuid: "eq",
};

/** Number/temporal operators available in the operator selector. */
const NUMERIC_TEMPORAL_OPERATORS = ["eq", "ne", "gt", "gte", "lt", "lte", "between"] as const;
type NumericTemporalOperator = (typeof NUMERIC_TEMPORAL_OPERATORS)[number];

// Date filters use a slimmer, friendlier operator set: an exact date, inclusive
// "after"/"before" (gte/lte), and a between range. No gt/lt/ne.
const DATE_OPERATORS = ["eq", "gte", "lte", "between"] as const;

/** Operators offered for a temporal editor, narrowed for `date` columns. */
function temporalOperatorsFor(type: FilterConfig["type"]): readonly NumericTemporalOperator[] {
  return type === "date" ? DATE_OPERATORS : NUMERIC_TEMPORAL_OPERATORS;
}

/**
 * Operator options + initial selection for a numeric/temporal editor.
 *
 * A saved view or `useCollectionVariables` config can hold a filter whose
 * operator is no longer in the standard set — most importantly a `date` filter
 * on the now-dropped `gt`/`lt`/`ne` (the pre-narrowing operator set). In that
 * case we keep the incoming operator as a selectable, preselected option rather
 * than resetting to `eq`, so opening the editor and hitting Apply never silently
 * rewrites the filter's operator (e.g. "after X" → "on X"). A truly unknown
 * operator falls back to `eq`.
 */
function resolveTemporalOperator(
  standard: readonly NumericTemporalOperator[],
  current: FilterOperator,
): { items: readonly NumericTemporalOperator[]; initial: NumericTemporalOperator } {
  if (standard.includes(current as NumericTemporalOperator)) {
    return { items: standard, initial: current as NumericTemporalOperator };
  }
  if ((NUMERIC_TEMPORAL_OPERATORS as readonly string[]).includes(current)) {
    return {
      items: [...standard, current as NumericTemporalOperator],
      initial: current as NumericTemporalOperator,
    };
  }
  return { items: standard, initial: "eq" };
}

/** String operators available in the operator selector. */
const STRING_OPERATORS = ["eq", "ne", "contains", "notContains", "hasPrefix", "hasSuffix"] as const;
type StringOperator = (typeof STRING_OPERATORS)[number];
type FilterableColumn = Column<Record<string, unknown>> & {
  filter: FilterConfig;
};
type AddFilterDraftValue = string | string[];

/** Use `DataTable.Filters` instead of calling this directly. */
function DataTableFilters({
  className,
  slot = "all",
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

  // The Add filter trigger only.
  if (slot === "add") {
    return <AddFilterPanel columns={filterableColumns} control={control} />;
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

  // Default: chips (grow to fill) + the right-aligned Add filter trigger.
  return (
    <div
      data-slot="data-table-filters"
      className={cn("astw:flex astw:items-start astw:gap-2", className)}
    >
      <div className="astw:flex astw:flex-1 astw:flex-wrap astw:items-center astw:gap-2">
        {chips}
      </div>
      {/* Trigger stays pinned right so it doesn't shift as chips are added. */}
      <AddFilterPanel columns={filterableColumns} control={control} />
    </div>
  );
}
DataTableFilters.displayName = "DataTable.Filters";

// =============================================================================
// AddFilterPanel — the add-filter surface: one popover with three columns
// (field ▸ condition ▸ value). The condition column appears for fields with
// more than one operator. Values are drafted and committed with an Apply button
// (the panel stays open so several filters can be added in a row).
// =============================================================================

const PANEL_COLUMN_ROW = cn(
  "astw:flex astw:w-full astw:items-center astw:gap-2 astw:rounded-sm astw:px-2 astw:py-1.5",
  "astw:text-left astw:text-sm astw:outline-hidden astw:cursor-default astw:transition-colors",
);
// Distinct row states: hover is a subtle muted tint; selection is the solid accent
// (+ bold). Applied exclusively — hover is only added when the row isn't selected —
// so hovering the selected row doesn't repaint it and the two never look alike.
const PANEL_ROW_HOVER = "astw:hover:bg-muted astw:focus-visible:bg-muted";
const PANEL_ROW_SELECTED = "astw:bg-accent astw:font-medium astw:text-accent-foreground";

/**
 * Seed the add-panel's operator for a field: reuse an active filter's operator
 * when it's valid for the field type, so re-opening an already-filtered field
 * shows its current condition (and lets the value editor prefill) instead of
 * resetting to the default — which on Apply could silently overwrite the filter.
 * Falls back to the type default when there's no active filter.
 */
function seedPanelOperator(
  control: CollectionControl,
  col: FilterableColumn | undefined,
): FilterOperator {
  if (!col) return "eq";
  const active = control.filters.find((f) => f.field === col.filter.field);
  const ops = getAddFilterOperators(col.filter.type);
  if (active && ops.includes(active.operator)) return active.operator;
  return DEFAULT_OPERATOR[col.filter.type];
}

function AddFilterPanel({
  columns,
  control,
}: {
  columns: FilterableColumn[];
  control: CollectionControl;
}) {
  const t = useDataTableT();
  const [open, setOpen] = useState(false);
  const [fieldName, setFieldName] = useState<string>(columns[0]?.filter.field ?? "");

  const selectedColumn = columns.find((c) => c.filter.field === fieldName) ?? columns[0];
  const config = selectedColumn?.filter;
  const operators = config ? getAddFilterOperators(config.type) : [];
  // Show the condition column for any field that has more than one operator
  // (single-operator types like enum/uuid go straight field ▸ value).
  const showConditions = operators.length > 1;

  const [operator, setOperator] = useState<FilterOperator>(() =>
    seedPanelOperator(control, selectedColumn),
  );

  const selectField = (name: string) => {
    setFieldName(name);
    const col = columns.find((c) => c.filter.field === name);
    if (col) setOperator(seedPanelOperator(control, col));
  };

  // Always reopen on the first field rather than wherever the user last was.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) selectField(columns[0]?.filter.field ?? "");
  };

  const activeFields = new Set(control.filters.map((f) => f.field));
  const activeFilter = control.filters.find((f) => f.field === fieldName);
  let effectiveOperator: FilterOperator | undefined;
  if (config) {
    effectiveOperator = showConditions ? operator : DEFAULT_OPERATOR[config.type];
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        render={
          <Button variant="outline" size="xs">
            <FilterIcon className="astw:size-3" />
            {t("addFilter")}
          </Button>
        }
      />
      <Popover.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
        {/* align="end" anchors the panel's right edge to the (right-aligned) trigger
            so it grows/shrinks toward the right as columns appear/disappear. We keep
            anchor tracking on (no disableAnchorTracking) so the positioner re-aligns
            the right edge when the width changes; the trigger itself no longer moves
            when chips are added (they live in a separate flex-1 container), so there's
            nothing to jump away from. */}
        <Popover.Positioner sideOffset={4} side="bottom" align="end">
          <Popover.Popup
            data-slot="data-table-filter-panel"
            className={cn(
              // Fixed height + width so switching field/condition never resizes the
              // popup: the width stays constant whether the condition column (2 vs 3
              // columns) is shown — column 3 flexes to absorb the difference — so the
              // panel and its left column never shift under the cursor. The width is
              // sized so column 3 fits the inline calendar (~290px) even in 3-column
              // mode (col1 11rem + col2 12rem + ~19.5rem for the value editor).
              // Height fits the tallest editor: the datetime range (From/To tabs +
              // inline calendar + "Choose time" picker) without the time being clipped.
              "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:flex astw:h-[28rem] astw:w-[42.5rem] astw:items-stretch astw:overflow-hidden astw:rounded-md astw:border astw:border-border astw:shadow-md",
              "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
            )}
          >
            {/* Column 1 — fields (scrolls), with a sticky "Clear all" footer */}
            <div className="astw:flex astw:w-44 astw:flex-col">
              <div className="astw:flex-1 astw:overflow-y-auto astw:p-1">
                {columns.map((col) => {
                  const isSelected = col.filter.field === fieldName;
                  return (
                    <button
                      key={col.filter.field}
                      type="button"
                      onClick={() => selectField(col.filter.field)}
                      className={cn(
                        PANEL_COLUMN_ROW,
                        isSelected ? PANEL_ROW_SELECTED : PANEL_ROW_HOVER,
                      )}
                    >
                      <span className="astw:truncate">{col.label ?? col.filter.field}</span>
                      {activeFields.has(col.filter.field) && (
                        <span className="astw:ml-auto astw:size-1.5 astw:shrink-0 astw:rounded-full astw:bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
              {control.filters.length > 0 && (
                <div className="astw:border-t astw:border-border astw:p-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => control.clearFilters()}
                    className="astw:w-full astw:justify-start astw:text-muted-foreground"
                  >
                    {t("clearAllFilters")}
                  </Button>
                </div>
              )}
            </div>

            {/* Column 2 — conditions (only when the field opts into choosing one) */}
            {showConditions && config && (
              <div className="astw:flex astw:w-48 astw:flex-col astw:overflow-y-auto astw:border-l astw:border-border astw:p-1">
                {operators.map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setOperator(op)}
                    className={cn(
                      PANEL_COLUMN_ROW,
                      op === operator ? PANEL_ROW_SELECTED : PANEL_ROW_HOVER,
                    )}
                  >
                    <span className="astw:truncate">{getOperatorLabel(op, t, config.type)}</span>
                    {op === operator && (
                      <Check className="astw:ml-auto astw:size-3.5 astw:shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Column 3 — value editor; flex-1 so it absorbs the width freed when
                the condition column is hidden, keeping the popup width constant. */}
            <div className="astw:flex astw:min-w-0 astw:flex-1 astw:flex-col astw:border-l astw:border-border">
              {selectedColumn && effectiveOperator && (
                <PanelValueEditor
                  key={`${fieldName}:${effectiveOperator}`}
                  column={selectedColumn}
                  operator={effectiveOperator}
                  filter={activeFilter}
                  control={control}
                />
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
AddFilterPanel.displayName = "DataTable.AddFilterPanel";

/**
 * Inline calendar for the panel's single-date editor — our `Calendar` rendered
 * directly in the value column (no popover to nest inside the panel). The
 * pointer-down guard stops the panel's outside-press dismissal from firing when
 * a day cell re-renders on selection.
 */
function PanelDateInput({
  ariaLabel,
  value,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const calValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDate(value) : null;
  return (
    // Center the fixed-width (w-fit) calendar within the wider value column.
    <div
      className="astw:flex astw:justify-center"
      onPointerDownCapture={(e) => e.stopPropagation()}
      onMouseDownCapture={(e) => e.stopPropagation()}
    >
      <Calendar
        aria-label={ariaLabel}
        value={calValue}
        onChange={(v) => onChange(v ? v.toString() : "")}
      />
    </div>
  );
}

/**
 * Single-datetime editor for the panel: the inline `Calendar` up front with a
 * labelled time picker beneath it, bridging a local ISO `"YYYY-MM-DDTHH:mm:ss"`
 * string. (The chip and the "between" range keep the compact date-picker + time
 * box to stay short.)
 */
function PanelDateTimeInput({
  ariaLabel,
  value,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useDataTableT();
  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/);
  const datePart = match?.[1] ?? "";
  const timePart = match?.[2] ?? "";
  const calValue = /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? parseDate(datePart) : null;
  const emit = (nextDate: string, nextTime: string) => {
    onChange(nextDate ? `${nextDate}T${nextTime || "00:00"}:00` : "");
  };
  return (
    <div className="astw:flex astw:flex-col astw:gap-3">
      <div
        className="astw:flex astw:justify-center"
        onPointerDownCapture={(e) => e.stopPropagation()}
        onMouseDownCapture={(e) => e.stopPropagation()}
      >
        <Calendar
          aria-label={ariaLabel}
          value={calValue}
          onChange={(v) => emit(v ? v.toString() : "", timePart)}
        />
      </div>
      <div className="astw:flex astw:flex-col astw:gap-1">
        <span className="astw:text-xs astw:text-muted-foreground">{t("chooseTime")}</span>
        <Input
          type="time"
          aria-label={`${ariaLabel} (${t("chooseTime")})`}
          value={timePart}
          onChange={(e) => emit(datePart, e.target.value)}
          className="astw:h-8 astw:text-sm"
        />
      </div>
    </div>
  );
}

/**
 * Range editor for date / datetime "between" in the panel: one inline calendar
 * (reusing the single-value editors) with a From/To tab bar on top. Picking a
 * bound edits whichever tab is active; each tab shows its current value. Keeps
 * the range on a single calendar instead of two stacked fields.
 */
function PanelDateRangeInput({
  label,
  min,
  max,
  onChangeMin,
  onChangeMax,
  withTime = false,
}: {
  label: string;
  min: string;
  max: string;
  onChangeMin: (value: string) => void;
  onChangeMax: (value: string) => void;
  /** datetime range — the active bound also gets a time picker. */
  withTime?: boolean;
}) {
  const t = useDataTableT();
  const { locale } = useResolvedLocale();
  const [active, setActive] = useState<"from" | "to">("from");

  const fmt = (v: string) => {
    if (!v) return "—";
    return withTime ? formatDateTimeValue(v, locale) : formatDateValue(v, locale);
  };
  const bounds = [
    { key: "from" as const, label: t("filterBetweenFrom"), value: min, onChange: onChangeMin },
    { key: "to" as const, label: t("filterBetweenTo"), value: max, onChange: onChangeMax },
  ];
  const activeBound = bounds.find((b) => b.key === active) ?? bounds[0];
  const error = betweenOrderError(
    withTime ? "datetime" : "date",
    min,
    max,
    t("filterBetweenFrom"),
    t("filterBetweenTo"),
    t,
  );

  return (
    <div className="astw:flex astw:flex-col astw:gap-3">
      {/* From / To tab bar (each tab shows its picked value) */}
      <div className="astw:grid astw:grid-cols-2 astw:gap-1 astw:rounded-md astw:bg-muted astw:p-1">
        {bounds.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setActive(b.key)}
            className={cn(
              "astw:flex astw:flex-col astw:items-start astw:gap-0.5 astw:overflow-hidden astw:rounded-sm astw:px-2 astw:py-1 astw:text-left",
              active === b.key && "astw:bg-background astw:shadow-sm",
            )}
          >
            <span className="astw:text-xs astw:text-muted-foreground">{b.label}</span>
            <span
              className={cn(
                "astw:w-full astw:truncate astw:text-sm",
                active === b.key ? "astw:text-foreground" : "astw:text-muted-foreground",
              )}
            >
              {fmt(b.value)}
            </span>
          </button>
        ))}
      </div>

      {/* Inline calendar (+ time) for the active bound */}
      {withTime ? (
        <PanelDateTimeInput
          ariaLabel={`${label} — ${activeBound.label}`}
          value={activeBound.value}
          onChange={activeBound.onChange}
        />
      ) : (
        <PanelDateInput
          ariaLabel={`${label} — ${activeBound.label}`}
          value={activeBound.value}
          onChange={activeBound.onChange}
        />
      )}

      {error && <p className="astw:text-destructive astw:text-xs">{error}</p>}
    </div>
  );
}

/**
 * Draft value editor for the panel's third column, keyed by field + operator.
 * Holds local draft state and commits via an explicit Apply button (the panel
 * stays open so several filters can be added in a row).
 */
function PanelValueEditor({
  column,
  operator,
  filter,
  control,
}: {
  column: FilterableColumn;
  operator: FilterOperator;
  filter: Filter | undefined;
  control: CollectionControl;
}) {
  const t = useDataTableT();
  const config = column.filter;
  const field = config.field;
  const label = column.label ?? field;
  const type = config.type;
  const isBetween = operator === "between";

  // Draft state, prefilled from an existing filter on the same field/operator.
  const [enumSel, setEnumSel] = useState<string[]>(
    type === "enum" && Array.isArray(filter?.value) ? (filter.value as string[]) : [],
  );
  const [boolVal, setBoolVal] = useState(typeof filter?.value === "boolean" ? filter.value : true);
  const [text, setText] = useState(() => {
    if (isBetween) return "";
    if (typeof filter?.value === "string") return filter.value;
    if (typeof filter?.value === "number") return String(filter.value);
    return "";
  });
  const range =
    isBetween && filter?.value && typeof filter.value === "object"
      ? (filter.value as { min?: unknown; max?: unknown })
      : null;
  const [min, setMin] = useState(range?.min != null ? String(range.min) : "");
  const [max, setMax] = useState(range?.max != null ? String(range.max) : "");

  const apply = () => {
    if (type === "enum") {
      if (enumSel.length === 0) control.removeFilter(field);
      else control.addFilter(field, "in", enumSel);
      return;
    }
    if (type === "boolean") {
      control.addFilter(field, operator, boolVal);
      return;
    }
    if (isBetween) {
      const draft: AddFilterDraftValue = [min, max];
      if (!isAddFilterDraftValueValid(type, "between", draft)) return;
      if (!isRangeOrdered(type, min, max)) return;
      control.addFilter(field, "between", toAddFilterSubmittedValue(type, "between", draft));
      return;
    }
    if (text.trim() === "") {
      control.removeFilter(field);
      return;
    }
    if (!isAddFilterDraftValueValid(type, operator, text)) return;
    control.addFilter(
      field,
      operator,
      toAddFilterSubmittedValue(type, operator, text),
      // Preserve the existing filter's case-sensitivity (the panel has no toggle;
      // the chip's string editor owns it) instead of silently clearing it.
      type === "string" ? { caseSensitive: filter?.caseSensitive ?? false } : undefined,
    );
  };

  // Remove this field's active filter and reset the draft. Shown only while a
  // filter is active (there's nothing to clear on a fresh add).
  const clearThis = () => {
    control.removeFilter(field);
    setEnumSel([]);
    setBoolVal(true);
    setText("");
    setMin("");
    setMax("");
  };

  // Gate the Apply button so it's disabled on invalid input (rather than enabled
  // but inert). An empty draft is allowed only when it clears an existing filter.
  const canApply = (() => {
    if (type === "enum") return enumSel.length > 0 || !!filter;
    if (type === "boolean") return true;
    if (isBetween) {
      const minEmpty = min.trim() === "";
      const maxEmpty = max.trim() === "";
      if (minEmpty && maxEmpty) return !!filter;
      if (minEmpty || maxEmpty) return false;
      if (!isAddFilterDraftValueValid(type, "between", [min, max])) return false;
      return isRangeOrdered(type, min, max);
    }
    if (text.trim() === "") return !!filter;
    return isAddFilterDraftValueValid(type, operator, text);
  })();

  let editor: ReactNode;
  if (type === "enum") {
    editor = (
      <EnumOptionList
        options={config.options}
        selected={enumSel}
        onToggle={(v) =>
          setEnumSel((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
        }
      />
    );
  } else if (type === "boolean") {
    editor = (
      <div className="astw:p-1">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => setBoolVal(v)}
            className={cn(PANEL_COLUMN_ROW, boolVal === v ? PANEL_ROW_SELECTED : PANEL_ROW_HOVER)}
          >
            <span>{v ? t("filterBooleanTrue") : t("filterBooleanFalse")}</span>
            {boolVal === v && <Check className="astw:ml-auto astw:size-3.5 astw:shrink-0" />}
          </button>
        ))}
      </div>
    );
  } else if (isBetween && type === "date") {
    // Range dates: one inline calendar with From/To tabs on top.
    editor = (
      <div className="astw:p-2">
        <PanelDateRangeInput
          label={label}
          min={min}
          max={max}
          onChangeMin={setMin}
          onChangeMax={setMax}
        />
      </div>
    );
  } else if (isBetween && type === "datetime") {
    // Range datetimes: one inline calendar + time with From/To tabs on top.
    editor = (
      <div className="astw:p-2">
        <PanelDateRangeInput
          label={label}
          min={min}
          max={max}
          onChangeMin={setMin}
          onChangeMax={setMax}
          withTime
        />
      </div>
    );
  } else if (isBetween) {
    // Non-date range: two simple From/To (or Min/Max) text boxes.
    const numeric = type === "number";
    const labels: [string, string] = numeric
      ? [t("filterBetweenMin"), t("filterBetweenMax")]
      : [t("filterBetweenFrom"), t("filterBetweenTo")];
    editor = (
      <div className="astw:p-2">
        <BetweenInputGroup
          labels={labels}
          values={[min, max]}
          onChangeMin={setMin}
          onChangeMax={setMax}
          onSubmit={apply}
          inputProps={
            numeric ? { type: "number" } : getTemporalInputProps(type as "datetime" | "time")
          }
          error={betweenOrderError(type, min, max, labels[0], labels[1], t)}
        />
      </div>
    );
  } else if (type === "date") {
    editor = (
      <div className="astw:p-2">
        <PanelDateInput ariaLabel={label} value={text} onChange={setText} />
      </div>
    );
  } else if (type === "datetime") {
    // Single datetime: inline calendar up front + a labelled time picker below.
    editor = (
      <div className="astw:p-2">
        <PanelDateTimeInput ariaLabel={label} value={text} onChange={setText} />
      </div>
    );
  } else if (isTemporalFilterType(type)) {
    // Single-value `time` uses the native time input. (`date`/`datetime` above.)
    editor = (
      <div className="astw:p-2">
        <Input
          {...getTemporalInputProps(type)}
          aria-label={label}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply();
          }}
          className="astw:h-8 astw:text-sm"
        />
      </div>
    );
  } else {
    editor = (
      <div className="astw:p-2">
        <Input
          type={type === "number" ? "number" : "text"}
          value={text}
          placeholder={t("filterValuePlaceholder", { field: label })}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply();
          }}
          className="astw:h-8 astw:text-sm"
        />
      </div>
    );
  }

  return (
    <div className="astw:flex astw:flex-1 astw:flex-col astw:overflow-hidden">
      <div className="astw:flex-1 astw:overflow-y-auto">{editor}</div>
      <div className="astw:flex astw:items-center astw:gap-1 astw:border-t astw:border-border astw:p-1">
        {/* Icon-only Clear, shown only when there's an active filter to remove. */}
        {filter && (
          <Tooltip.Provider delay={300}>
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={clearThis}
                    aria-label={t("clearFilter")}
                  >
                    <X className="astw:size-3" />
                  </Button>
                }
              />
              <Tooltip.Content>{t("clearFilter")}</Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        )}
        {/* "Update" when re-editing an already-active field (the panel is seeded
            from it), "Apply" when adding a fresh filter. */}
        <Button size="xs" onClick={apply} disabled={!canApply} className="astw:flex-1">
          {filter ? t("updateFilter") : t("applyFilter")}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// BetweenInputGroup — shared UI for "between" filter inputs
// =============================================================================

function BetweenInputGroup({
  labels,
  values,
  onChangeMin,
  onChangeMax,
  onSubmit,
  inputProps,
  error,
}: {
  labels: [string, string];
  values: [string, string];
  onChangeMin: (value: string) => void;
  onChangeMax: (value: string) => void;
  onSubmit: () => void;
  inputProps?: React.ComponentProps<typeof Input>;
  /** Validation message shown below the inputs (e.g. a reversed range). */
  error?: string;
}) {
  const rowBase =
    "astw:flex astw:items-center astw:h-8 astw:rounded-md astw:border astw:shadow-xs astw:has-focus-visible:ring-[3px]";
  const rowOk =
    "astw:border-input astw:has-focus-visible:border-ring astw:has-focus-visible:ring-ring/50";
  const rowError = "astw:border-destructive astw:has-focus-visible:ring-destructive/30";
  const labelCell =
    "astw:text-secondary-foreground astw:text-xs astw:px-2.5 astw:border-r astw:border-input astw:bg-muted astw:rounded-l-md astw:h-full astw:flex astw:items-center astw:justify-center astw:shrink-0 astw:min-w-14";
  const inputCell =
    "astw:h-full astw:text-sm astw:border-0 astw:shadow-none astw:focus-visible:ring-0";
  return (
    <div className="astw:flex astw:flex-col astw:gap-1.5">
      <div className={cn(rowBase, rowOk)}>
        <span className={labelCell}>{labels[0]}</span>
        <Input
          {...inputProps}
          aria-label={labels[0]}
          value={values[0]}
          onChange={(e) => onChangeMin(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") onSubmit();
          }}
          className={inputCell}
        />
      </div>
      <div className={cn(rowBase, error ? rowError : rowOk)}>
        <span className={labelCell}>{labels[1]}</span>
        <Input
          {...inputProps}
          aria-label={labels[1]}
          aria-invalid={error ? true : undefined}
          value={values[1]}
          onChange={(e) => onChangeMax(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") onSubmit();
          }}
          className={inputCell}
        />
      </div>
      {error && <p className="astw:text-destructive astw:text-xs">{error}</p>}
    </div>
  );
}

/**
 * Validation message for a "between" range when the bounds are reversed
 * (max < min). Returns undefined until both bounds are present and individually
 * valid, so it only appears once there's a genuine ordering problem.
 */
function betweenOrderError(
  type: FilterConfig["type"],
  min: string,
  max: string,
  minLabel: string,
  maxLabel: string,
  t: ReturnType<typeof useDataTableT>,
): string | undefined {
  if (min.trim() === "" || max.trim() === "") return undefined;
  let bothValid = true;
  if (type === "number") {
    bothValid = !Number.isNaN(Number(min)) && !Number.isNaN(Number(max));
  } else if (isTemporalFilterType(type)) {
    bothValid = isTemporalFilterValueValid(type, min) && isTemporalFilterValueValid(type, max);
  }
  if (!bothValid) return undefined;
  if (isRangeOrdered(type, min, max)) return undefined;
  return t("filterBetweenOrderError", { min: minLabel, max: maxLabel });
}

/**
 * Date filter input backed by the app-shell `DatePicker`. Bridges the filter's
 * string value (`"YYYY-MM-DD"`) and the `CalendarDate` the picker works with.
 */
function DateFilterPicker({
  ariaLabel,
  value,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const calValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseDate(value) : null;
  return (
    <DatePicker
      aria-label={ariaLabel}
      value={calValue}
      onChange={(v) => onChange(v ? v.toString() : "")}
      className="astw:w-full"
    />
  );
}

/**
 * Datetime filter input: the app-shell date `DatePicker` (calendar) paired with a
 * native time box, bridging an ISO `"YYYY-MM-DDTHH:mm:ss"` string. Entering a full
 * datetime by hand is awkward, so the date and time are picked separately and
 * combined. This is a stopgap — it's replaced 1:1 once a dedicated DateTime picker
 * component lands.
 */
function DateTimeFilterInput({
  ariaLabel,
  value,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  // Split "YYYY-MM-DDTHH:mm[:ss][Z]" into its date and "HH:mm" parts.
  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/);
  const datePart = match?.[1] ?? "";
  const timePart = match?.[2] ?? "";
  const calValue = /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? parseDate(datePart) : null;

  // Emit a combined value only once a date is chosen; time defaults to midnight.
  const emit = (nextDate: string, nextTime: string) => {
    onChange(nextDate ? `${nextDate}T${nextTime || "00:00"}:00` : "");
  };

  return (
    <div className="astw:flex astw:items-center astw:gap-2">
      <DatePicker
        aria-label={`${ariaLabel} (date)`}
        value={calValue}
        onChange={(v) => emit(v ? v.toString() : "", timePart)}
        className="astw:min-w-0 astw:flex-1"
      />
      <Input
        type="time"
        aria-label={`${ariaLabel} (time)`}
        value={timePart}
        onChange={(e) => emit(datePart, e.target.value)}
        className="astw:h-8 astw:w-28 astw:shrink-0 astw:text-sm"
      />
    </div>
  );
}

// =============================================================================
// FilterChip — per-filter popover-based editor
// =============================================================================

function FilterChip({
  column,
  filter,
  control,
}: {
  column: Column<Record<string, unknown>> & { filter: FilterConfig };
  filter: Filter;
  control: CollectionControl;
}) {
  const t = useDataTableT();
  const { locale } = useResolvedLocale();
  const config = column.filter;
  const label = column.label ?? config.field;

  const [opOpen, setOpOpen] = useState(false);
  const [valOpen, setValOpen] = useState(false);

  const handleRemove = useCallback(() => {
    control.removeFilter(config.field);
  }, [control, config.field]);

  // Switching operator re-commits the filter, seeding a valid value when the
  // arity changes (single ↔ between) so the intermediate filter is never
  // malformed. Fine-tuning the value happens in the value segment.
  const handleOperatorSelect = useCallback(
    (nextOp: FilterOperator) => {
      // Coerce to a finite number, falling back to 0 for malformed values (e.g.
      // a non-numeric value from persisted/URL state) so we never seed NaN.
      const toNum = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      const arity = (op: FilterOperator) => (op === "between" ? 2 : 1);
      if (arity(nextOp) === arity(filter.operator)) {
        control.addFilter(
          config.field,
          nextOp,
          filter.value,
          config.type === "string" && filter.caseSensitive ? { caseSensitive: true } : undefined,
        );
      } else if (nextOp === "between") {
        const v = filter.value;
        if (config.type === "number") {
          const n = toNum(v);
          control.addFilter(config.field, nextOp, { min: n, max: n });
        } else {
          const s = v == null ? "" : String(v);
          control.addFilter(config.field, nextOp, { min: s, max: s });
        }
      } else {
        const range = (filter.value ?? {}) as { min?: unknown; max?: unknown };
        const lower = range.min ?? range.max ?? "";
        control.addFilter(
          config.field,
          nextOp,
          config.type === "number" ? toNum(lower) : String(lower),
        );
      }
      setOpOpen(false);
    },
    [control, config.field, config.type, filter.operator, filter.value, filter.caseSensitive],
  );

  const operators = getAddFilterOperators(config.type);
  const operatorLabel = getOperatorLabel(filter.operator, t, config.type);
  const valueLabel = formatFilterValue(filter, config, t, locale, label);

  const segment =
    "astw:flex astw:items-center astw:h-6 astw:px-2 astw:text-xs astw:whitespace-nowrap astw:outline-hidden";
  const interactiveSegment = cn(
    segment,
    "astw:cursor-pointer astw:hover:bg-accent astw:focus-visible:bg-accent astw:data-popup-open:bg-accent",
  );

  return (
    <div
      data-slot="data-table-filter-chip"
      // Same surface tokens as the outline "Add filter" Button. The bloom/cream
      // themes force this slot transparent (see their transparent-chrome rules)
      // so the chip stays visually identical to the outline button per theme.
      className="astw:inline-flex astw:items-center astw:divide-x astw:divide-border astw:overflow-hidden astw:rounded-md astw:border astw:border-border astw:bg-background astw:shadow-xs astw:dark:border-input astw:dark:bg-input/30"
    >
      {/* Field segment (icon arrives in Stage 2) */}
      <span className={cn(segment, "astw:font-medium astw:text-foreground")}>{label}</span>

      {/* Operator segment — searchable dropdown when more than one operator */}
      {operators.length > 1 ? (
        <Popover.Root open={opOpen} onOpenChange={setOpOpen}>
          <Popover.Trigger
            render={
              <button
                type="button"
                className={cn(interactiveSegment, "astw:text-muted-foreground")}
              >
                {operatorLabel}
              </button>
            }
          />
          <Popover.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
            <Popover.Positioner sideOffset={4} side="bottom" align="start">
              <Popover.Popup
                data-slot="data-table-filter-operator-popup"
                className={cn(
                  "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:w-56 astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:border-border astw:shadow-md",
                  "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
                )}
              >
                <OperatorList
                  operators={operators}
                  current={filter.operator}
                  type={config.type}
                  onSelect={handleOperatorSelect}
                />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ) : (
        <span className={cn(segment, "astw:text-muted-foreground")}>{operatorLabel}</span>
      )}

      {/* Value segment — opens the value editor (operator hidden; it lives above) */}
      <Popover.Root open={valOpen} onOpenChange={setValOpen}>
        <Popover.Trigger
          render={
            <button
              type="button"
              className={cn(interactiveSegment, "astw:gap-1 astw:font-medium astw:text-foreground")}
            >
              {valueLabel ? (
                // Cap long values (e.g. a uuid or a long "contains" string) so the
                // chip stays a reasonable width instead of stretching the toolbar.
                <span className="astw:max-w-[12rem] astw:truncate">{valueLabel}</span>
              ) : (
                <span className="astw:text-muted-foreground">…</span>
              )}
              <ChevronDown className="astw:size-3 astw:text-muted-foreground" />
            </button>
          }
        />
        {/* Stacking context on the portal so the popup clears the sticky table header. */}
        <Popover.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
          <Popover.Positioner sideOffset={4} side="bottom" align="start">
            <Popover.Popup
              data-slot="data-table-filter-popup"
              className={cn(
                "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:min-w-45 astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:border-border astw:shadow-md",
                "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
              )}
            >
              <FilterPopoverContent
                column={column}
                filter={filter}
                control={control}
                onClose={() => setValOpen(false)}
                hideOperator
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>

      {/* Remove segment */}
      <button
        type="button"
        className={cn(
          interactiveSegment,
          "astw:px-1.5 astw:text-muted-foreground astw:hover:text-foreground",
        )}
        onClick={handleRemove}
        aria-label={t("removeFilter")}
      >
        <X className="astw:size-3" />
      </button>
    </div>
  );
}

// =============================================================================
// OperatorList — searchable operator picker shown in the chip's operator segment
// =============================================================================

function OperatorList({
  operators,
  current,
  type,
  onSelect,
}: {
  operators: FilterOperator[];
  current: FilterOperator;
  type: FilterConfig["type"];
  onSelect: (op: FilterOperator) => void;
}) {
  const t = useDataTableT();
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => ref.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const q = query.trim().toLowerCase();
  const items = operators
    .map((op) => ({ op, label: getOperatorLabel(op, t, type) }))
    .filter(({ label }) => label.toLowerCase().includes(q));

  return (
    <div className="astw:flex astw:flex-col">
      <div className="astw:flex astw:items-center astw:gap-2 astw:border-b astw:border-border astw:px-2.5">
        <Search className="astw:size-3.5 astw:text-muted-foreground" />
        <input
          ref={ref}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("filterOperatorSearchPlaceholder")}
          className="astw:h-9 astw:w-full astw:bg-transparent astw:text-sm astw:outline-hidden astw:placeholder:text-muted-foreground"
        />
      </div>
      <div className="astw:p-1">
        {items.map(({ op, label }) => (
          <button
            key={op}
            type="button"
            onClick={() => onSelect(op)}
            className={cn(
              "astw:flex astw:w-full astw:items-center astw:justify-between astw:gap-2 astw:rounded-sm astw:px-2 astw:py-1.5 astw:text-left astw:text-sm astw:outline-hidden",
              "astw:hover:bg-accent astw:hover:text-accent-foreground astw:focus-visible:bg-accent",
              op === current && "astw:bg-accent/60",
            )}
          >
            {label}
            {op === current && <Check className="astw:size-3.5" />}
          </button>
        ))}
        {items.length === 0 && (
          <output className="astw:block astw:px-2 astw:py-1.5 astw:text-sm astw:text-muted-foreground">
            {t("filterOperatorNoResults")}
          </output>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// FilterPopoverContent — dispatches to the right editor per filter type
// =============================================================================

function FilterPopoverContent({
  column,
  filter,
  control,
  onClose,
  hideOperator = false,
}: {
  column: Column<Record<string, unknown>> & { filter: FilterConfig };
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
  /**
   * Hide the in-editor operator selector. Used by the segmented FilterChip,
   * where the operator lives in its own chip segment; the editor commits with
   * the filter's current operator.
   */
  hideOperator?: boolean;
}) {
  const config = column.filter;
  const label = column.label ?? config.field;

  switch (config.type) {
    case "enum":
      return <EnumFilterEditor config={config} filter={filter} control={control} />;
    case "boolean":
      return (
        <BooleanFilterEditor
          config={config}
          filter={filter}
          control={control}
          onClose={onClose}
          hideOperator={hideOperator}
        />
      );
    case "string":
      return (
        <StringFilterEditor
          config={config}
          filter={filter}
          control={control}
          onClose={onClose}
          hideOperator={hideOperator}
        />
      );
    case "uuid":
      return (
        <UuidFilterEditor config={config} filter={filter} control={control} onClose={onClose} />
      );
    case "number":
      return (
        <NumericFilterEditor
          config={config}
          filter={filter}
          control={control}
          onClose={onClose}
          hideOperator={hideOperator}
        />
      );
    case "datetime":
    case "date":
    case "time":
      return (
        <TemporalFilterEditor
          config={config}
          label={label}
          filter={filter}
          control={control}
          onClose={onClose}
          hideOperator={hideOperator}
        />
      );
  }
}

// =============================================================================
// Shared filter checkbox controls — one blue (primary) checkbox style reused
// everywhere in the filter UI (enum lists in both the add-filter panel and the
// chip value editor, plus the case-sensitive toggle) so they stay consistent.
// =============================================================================

/** The single checkbox visual used across all filter surfaces. */
function FilterCheckbox({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "astw:flex astw:size-4 astw:shrink-0 astw:items-center astw:justify-center astw:rounded-sm astw:border astw:border-input",
        "astw:data-checked:border-primary astw:data-checked:bg-primary astw:data-checked:text-primary-foreground",
        className,
      )}
    >
      <Checkbox.Indicator className="astw:flex astw:data-unchecked:hidden">
        <Check className="astw:size-3" />
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}

/**
 * Multi-select option list for enum filters. Rendered identically in the
 * add-filter panel and the chip's value editor so the checkbox style is
 * consistent in both places.
 */
function EnumOptionList({
  options,
  selected,
  onToggle,
}: {
  options: readonly SelectOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div data-slot="data-table-filter-enum" className="astw:p-1">
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "astw:flex astw:cursor-pointer astw:select-none astw:items-center astw:gap-2 astw:rounded-sm astw:px-2 astw:py-1.5 astw:text-sm",
            "astw:hover:bg-accent astw:hover:text-accent-foreground",
          )}
        >
          <FilterCheckbox
            checked={selected.includes(option.value)}
            onCheckedChange={() => onToggle(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

// =============================================================================
// Enum filter — checkbox list (matching the screenshot)
// =============================================================================

function EnumFilterEditor({
  config,
  filter,
  control,
}: {
  config: Extract<FilterConfig, { type: "enum" }>;
  filter: Filter;
  control: CollectionControl;
}) {
  const selectedValues = useMemo(
    () => (Array.isArray(filter.value) ? (filter.value as string[]) : []),
    [filter.value],
  );

  const handleToggle = useCallback(
    (optionValue: string) => {
      const current = new Set(selectedValues);
      if (current.has(optionValue)) {
        current.delete(optionValue);
      } else {
        current.add(optionValue);
      }
      const next = [...current];
      if (next.length === 0) {
        control.removeFilter(config.field);
      } else {
        control.addFilter(config.field, "in", next);
      }
    },
    [selectedValues, control, config.field],
  );

  return (
    <EnumOptionList options={config.options} selected={selectedValues} onToggle={handleToggle} />
  );
}

// =============================================================================
// Boolean filter — operator selector + True/False select
// =============================================================================

type BooleanOperator = "eq" | "ne";
const BOOLEAN_OPERATORS = ["eq", "ne"] as const;

function BooleanFilterEditor({
  config,
  filter,
  control,
  onClose,
  hideOperator = false,
}: {
  config: Extract<FilterConfig, { type: "boolean" }>;
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
  hideOperator?: boolean;
}) {
  const t = useDataTableT();
  const [localOp, setLocalOp] = useState<BooleanOperator>(
    BOOLEAN_OPERATORS.includes(filter.operator as BooleanOperator)
      ? (filter.operator as BooleanOperator)
      : "eq",
  );
  const [localValue, setLocalValue] = useState(
    typeof filter.value === "boolean" ? String(filter.value) : "true",
  );

  const handleCommit = useCallback(() => {
    control.addFilter(config.field, localOp, localValue === "true");
    onClose();
  }, [localValue, localOp, control, config.field, onClose]);

  return (
    <div
      data-slot="data-table-filter-boolean"
      className="astw:flex astw:flex-col astw:gap-2 astw:p-2"
    >
      {!hideOperator && (
        <Select
          items={[...BOOLEAN_OPERATORS]}
          value={localOp}
          onValueChange={(v) => {
            if (v) setLocalOp(v as BooleanOperator);
          }}
          mapItem={(op) => ({ value: op, label: getOperatorLabel(op, t) })}
          className="astw:h-8 astw:text-sm"
        />
      )}
      <Select
        items={["true", "false"]}
        value={localValue}
        onValueChange={(v) => {
          if (v) setLocalValue(v);
        }}
        mapItem={(v) => ({
          value: v,
          label: v === "true" ? t("filterBooleanTrue") : t("filterBooleanFalse"),
        })}
        className="astw:h-8 astw:text-sm"
      />
      <Button size="xs" onClick={handleCommit} className="astw:self-end">
        {t("applyFilter")}
      </Button>
    </div>
  );
}

// =============================================================================
// String filter — operator selector + text input
// =============================================================================

function StringFilterEditor({
  config,
  filter,
  control,
  onClose,
  hideOperator = false,
}: {
  config: Extract<FilterConfig, { type: "string" }>;
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
  hideOperator?: boolean;
}) {
  const t = useDataTableT();
  const [localOp, setLocalOp] = useState<StringOperator>(
    STRING_OPERATORS.includes(filter.operator as StringOperator)
      ? (filter.operator as StringOperator)
      : "contains",
  );
  const [localValue, setLocalValue] = useState(String(filter.value ?? ""));
  const [localCaseSensitive, setLocalCaseSensitive] = useState(filter.caseSensitive ?? false);

  const handleCommit = useCallback(() => {
    if (localValue.trim() === "") {
      control.removeFilter(config.field);
    } else {
      control.addFilter(config.field, localOp, localValue, {
        caseSensitive: localCaseSensitive,
      });
    }
    onClose();
  }, [localValue, localOp, localCaseSensitive, control, config.field, onClose]);

  return (
    <div
      data-slot="data-table-filter-string"
      className="astw:flex astw:flex-col astw:gap-2 astw:p-2"
    >
      {!hideOperator && (
        <Select
          items={[...STRING_OPERATORS]}
          value={localOp}
          onValueChange={(v) => {
            if (v) setLocalOp(v);
          }}
          mapItem={(op) => ({ value: op, label: t(`filterOperator_${op}`) })}
          className="astw:h-8 astw:text-sm"
        />
      )}
      <Input
        value={localValue}
        placeholder={t("filterValuePlaceholder", { field: config.field })}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") handleCommit();
        }}
        className="astw:h-8 astw:text-sm"
      />
      <label className="astw:flex astw:items-center astw:gap-1.5 astw:text-sm">
        <FilterCheckbox checked={localCaseSensitive} onCheckedChange={setLocalCaseSensitive} />
        {t("filterCaseSensitive")}
      </label>
      <Button size="xs" onClick={handleCommit} className="astw:self-end">
        {t("applyFilter")}
      </Button>
    </div>
  );
}

// =============================================================================
// UUID filter — text input (eq only)
// =============================================================================

function UuidFilterEditor({
  config,
  filter,
  control,
  onClose,
}: {
  config: Extract<FilterConfig, { type: "uuid" }>;
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
}) {
  const t = useDataTableT();
  const [localValue, setLocalValue] = useState(String(filter.value ?? ""));

  const handleCommit = useCallback(() => {
    if (localValue.trim() === "") {
      control.removeFilter(config.field);
    } else {
      control.addFilter(config.field, "eq", localValue);
    }
    onClose();
  }, [localValue, control, config.field, onClose]);

  return (
    <div data-slot="data-table-filter-uuid" className="astw:flex astw:flex-col astw:gap-2 astw:p-2">
      <Input
        value={localValue}
        placeholder={t("filterValuePlaceholder", { field: config.field })}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") handleCommit();
        }}
        className="astw:h-8 astw:text-sm"
      />
      <Button size="xs" onClick={handleCommit} className="astw:self-end">
        {t("applyFilter")}
      </Button>
    </div>
  );
}

// =============================================================================
// Number filter — operator selector + number input
// =============================================================================

function NumericFilterEditor({
  config,
  filter,
  control,
  onClose,
  hideOperator = false,
}: {
  config: Extract<FilterConfig, { type: "number" }>;
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
  hideOperator?: boolean;
}) {
  const t = useDataTableT();
  const { items: operatorItems, initial: initialOp } = resolveTemporalOperator(
    temporalOperatorsFor(config.type),
    filter.operator,
  );
  const [localOp, setLocalOp] = useState<NumericTemporalOperator>(initialOp);
  const [localValue, setLocalValue] = useState(() => {
    if (filter.operator === "between" && typeof filter.value === "object" && filter.value != null) {
      const range = filter.value as { min?: unknown; max?: unknown };
      return String(range.min ?? "");
    }
    return String(filter.value ?? "");
  });
  const [localValueMax, setLocalValueMax] = useState(() => {
    if (filter.operator === "between" && typeof filter.value === "object" && filter.value != null) {
      const range = filter.value as { min?: unknown; max?: unknown };
      return String(range.max ?? "");
    }
    return "";
  });

  const canCommit = (() => {
    if (localOp === "between") {
      const minEmpty = localValue.trim() === "";
      const maxEmpty = localValueMax.trim() === "";
      if (minEmpty && maxEmpty) return true; // will removeFilter
      if (minEmpty || maxEmpty) return false; // both required
      return (
        !Number.isNaN(Number(localValue)) &&
        !Number.isNaN(Number(localValueMax)) &&
        isRangeOrdered("number", localValue, localValueMax)
      );
    }
    return localValue.trim() === "" || !Number.isNaN(Number(localValue));
  })();

  const handleCommit = useCallback(() => {
    if (localOp === "between") {
      const minEmpty = localValue.trim() === "";
      const maxEmpty = localValueMax.trim() === "";
      if (minEmpty && maxEmpty) {
        control.removeFilter(config.field);
      } else if (!minEmpty && !maxEmpty) {
        const min = Number(localValue);
        const max = Number(localValueMax);
        if (!Number.isNaN(min) && !Number.isNaN(max) && min <= max) {
          control.addFilter(config.field, localOp, { min, max });
        } else {
          return;
        }
      } else {
        return;
      }
    } else {
      const num = Number(localValue);
      if (localValue.trim() === "" || Number.isNaN(num)) {
        control.removeFilter(config.field);
      } else {
        control.addFilter(config.field, localOp, num);
      }
    }
    onClose();
  }, [localValue, localValueMax, localOp, control, config.field, onClose]);

  return (
    <div
      data-slot="data-table-filter-number"
      className="astw:flex astw:flex-col astw:gap-2 astw:p-2"
    >
      {!hideOperator && (
        <Select
          items={[...operatorItems]}
          value={localOp}
          onValueChange={(v) => {
            if (v) setLocalOp(v);
          }}
          mapItem={(op) => ({ value: op, label: getOperatorLabel(op, t, config.type) })}
          className="astw:h-8 astw:text-sm"
        />
      )}
      {localOp === "between" ? (
        <BetweenInputGroup
          labels={[t("filterBetweenMin"), t("filterBetweenMax")]}
          values={[localValue, localValueMax]}
          onChangeMin={setLocalValue}
          onChangeMax={setLocalValueMax}
          onSubmit={handleCommit}
          inputProps={{ type: "number" }}
          error={betweenOrderError(
            "number",
            localValue,
            localValueMax,
            t("filterBetweenMin"),
            t("filterBetweenMax"),
            t,
          )}
        />
      ) : (
        <Input
          type="number"
          value={localValue}
          placeholder={t("filterValuePlaceholder", { field: config.field })}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") handleCommit();
          }}
          className="astw:h-8 astw:text-sm"
        />
      )}
      <Button size="xs" onClick={handleCommit} disabled={!canCommit} className="astw:self-end">
        {t("applyFilter")}
      </Button>
    </div>
  );
}

// =============================================================================
// Temporal filter — operator selector + type-specific input
// =============================================================================

function TemporalFilterEditor({
  config,
  label,
  filter,
  control,
  onClose,
  hideOperator = false,
}: {
  config: Extract<FilterConfig, { type: "datetime" | "date" | "time" }>;
  /** The column's visible label — used for the date picker's accessible name. */
  label: string;
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
  hideOperator?: boolean;
}) {
  const t = useDataTableT();
  const { items: operatorItems, initial: initialOp } = resolveTemporalOperator(
    temporalOperatorsFor(config.type),
    filter.operator,
  );
  const [localOp, setLocalOp] = useState<NumericTemporalOperator>(initialOp);
  const [localValue, setLocalValue] = useState(() => {
    if (filter.operator === "between" && typeof filter.value === "object" && filter.value != null) {
      const range = filter.value as { min?: unknown; max?: unknown };
      return String(range.min ?? "");
    }
    return String(filter.value ?? "");
  });
  const [localValueMax, setLocalValueMax] = useState(() => {
    if (filter.operator === "between" && typeof filter.value === "object" && filter.value != null) {
      const range = filter.value as { min?: unknown; max?: unknown };
      return String(range.max ?? "");
    }
    return "";
  });

  const canCommit = (() => {
    if (localOp === "between") {
      const minEmpty = localValue.trim() === "";
      const maxEmpty = localValueMax.trim() === "";
      if (minEmpty && maxEmpty) return true; // will removeFilter
      if (minEmpty || maxEmpty) return false; // both required
      return (
        isTemporalFilterValueValid(config.type, localValue) &&
        isTemporalFilterValueValid(config.type, localValueMax) &&
        isRangeOrdered(config.type, localValue, localValueMax)
      );
    }
    return localValue.trim() === "" || isTemporalFilterValueValid(config.type, localValue);
  })();

  const handleCommit = useCallback(() => {
    if (localOp === "between") {
      const minEmpty = localValue.trim() === "";
      const maxEmpty = localValueMax.trim() === "";
      if (minEmpty && maxEmpty) {
        control.removeFilter(config.field);
      } else if (!minEmpty && !maxEmpty) {
        const minValid = isTemporalFilterValueValid(config.type, localValue);
        const maxValid = isTemporalFilterValueValid(config.type, localValueMax);
        if (!minValid || !maxValid) return;
        if (!isRangeOrdered(config.type, localValue, localValueMax)) return;
        control.addFilter(config.field, localOp, {
          min: localValue,
          max: localValueMax,
        });
      } else {
        return;
      }
    } else {
      if (localValue.trim() === "") {
        control.removeFilter(config.field);
      } else if (isTemporalFilterValueValid(config.type, localValue)) {
        control.addFilter(config.field, localOp, localValue);
      } else {
        return;
      }
    }
    onClose();
  }, [localValue, localValueMax, localOp, control, config.field, config.type, onClose]);

  const isDate = config.type === "date";
  const isDateTime = config.type === "datetime";
  // date + datetime pickers share the same { ariaLabel, value, onChange } shape.
  const Picker = isDateTime ? DateTimeFilterInput : DateFilterPicker;
  const betweenError =
    localOp === "between"
      ? betweenOrderError(
          config.type,
          localValue,
          localValueMax,
          t("filterBetweenFrom"),
          t("filterBetweenTo"),
          t,
        )
      : undefined;
  let valueInput: ReactNode;
  if (localOp === "between") {
    valueInput =
      isDate || isDateTime ? (
        <div className="astw:flex astw:flex-col astw:gap-1.5">
          <Picker
            ariaLabel={`${label} — ${t("filterBetweenFrom")}`}
            value={localValue}
            onChange={setLocalValue}
          />
          <Picker
            ariaLabel={`${label} — ${t("filterBetweenTo")}`}
            value={localValueMax}
            onChange={setLocalValueMax}
          />
          {betweenError && <p className="astw:text-destructive astw:text-xs">{betweenError}</p>}
        </div>
      ) : (
        <BetweenInputGroup
          labels={[t("filterBetweenFrom"), t("filterBetweenTo")]}
          values={[localValue, localValueMax]}
          onChangeMin={setLocalValue}
          onChangeMax={setLocalValueMax}
          onSubmit={handleCommit}
          inputProps={getTemporalInputProps(config.type)}
          error={betweenError}
        />
      );
  } else {
    valueInput =
      isDate || isDateTime ? (
        <Picker ariaLabel={label} value={localValue} onChange={setLocalValue} />
      ) : (
        <Input
          {...getTemporalInputProps(config.type)}
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              handleCommit();
            }
          }}
          className="astw:h-8 astw:text-sm"
        />
      );
  }

  return (
    <div
      data-slot={`data-table-filter-${config.type}`}
      className="astw:flex astw:flex-col astw:gap-2 astw:p-2"
    >
      {!hideOperator && (
        <Select
          items={[...operatorItems]}
          value={localOp}
          onValueChange={(v) => {
            if (v) setLocalOp(v);
          }}
          mapItem={(op) => ({ value: op, label: getOperatorLabel(op, t, config.type) })}
          className="astw:h-8 astw:text-sm"
        />
      )}
      {valueInput}
      <Button size="xs" onClick={handleCommit} disabled={!canCommit} className="astw:self-end">
        {t("applyFilter")}
      </Button>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getAddFilterOperators(type: FilterConfig["type"]): FilterOperator[] {
  switch (type) {
    case "string":
      return [...STRING_OPERATORS];
    case "date":
      return [...DATE_OPERATORS];
    case "number":
    case "datetime":
    case "time":
      return [...NUMERIC_TEMPORAL_OPERATORS];
    case "enum":
      return ["in"];
    case "boolean":
      return [...BOOLEAN_OPERATORS];
    case "uuid":
      return ["eq"];
  }
}

function isAddFilterDraftValueValid(
  type: FilterConfig["type"],
  operator: FilterOperator,
  value: AddFilterDraftValue,
): boolean {
  if (type === "enum") {
    return Array.isArray(value) && value.length > 0;
  }
  if (type === "boolean") {
    return value === "true" || value === "false";
  }

  if (operator === "between") {
    if (!Array.isArray(value)) return false;
    const [min, max] = value;
    const minEmpty = !min || min.trim() === "";
    const maxEmpty = !max || max.trim() === "";
    if (minEmpty || maxEmpty) return false; // both required
    if (type === "number") {
      return !Number.isNaN(Number(min)) && !Number.isNaN(Number(max));
    }
    if (isTemporalFilterType(type)) {
      return isTemporalFilterValueValid(type, min) && isTemporalFilterValueValid(type, max);
    }
    return true;
  }

  if (typeof value !== "string") return false;
  if (type === "number") {
    if (value.trim() === "") return false;
    return !Number.isNaN(Number(value));
  }
  if (isTemporalFilterType(type)) {
    return isTemporalFilterValueValid(type, value);
  }
  return value.trim() !== "";
}

function toAddFilterSubmittedValue(
  type: FilterConfig["type"],
  operator: FilterOperator,
  value: AddFilterDraftValue,
): unknown {
  if (type === "enum") {
    return Array.isArray(value) ? (value as string[]) : [];
  }
  if (type === "boolean") {
    return value === "true";
  }

  if (operator === "between" && Array.isArray(value)) {
    const [min, max] = value;
    const trimmedMin = typeof min === "string" ? min.trim() : "";
    const trimmedMax = typeof max === "string" ? max.trim() : "";

    if (type === "number") {
      if (trimmedMin === "" || trimmedMax === "") return undefined;

      const parsedMin = Number(trimmedMin);
      const parsedMax = Number(trimmedMax);
      if (Number.isNaN(parsedMin) || Number.isNaN(parsedMax)) return undefined;

      return { min: parsedMin, max: parsedMax };
    }

    if (trimmedMin === "" || trimmedMax === "") return undefined;

    // temporal types
    return { min: trimmedMin, max: trimmedMax };
  }

  if (type === "number") {
    return Number(value);
  }
  return String(value).trim();
}

function isTemporalFilterType(type: FilterConfig["type"]): type is "datetime" | "date" | "time" {
  return type === "datetime" || type === "date" || type === "time";
}

/**
 * Whether a "between" range's bounds are correctly ordered (min ≤ max). Numbers
 * compare numerically; temporal ISO strings compare lexicographically (which
 * matches chronological order for our `YYYY-MM-DD`, `HH:MM`, and RFC datetime
 * formats). `min === max` is allowed — a valid single-point inclusive range.
 * Assumes both bounds are already individually valid and non-empty.
 */
function isRangeOrdered(type: FilterConfig["type"], min: string, max: string): boolean {
  if (type === "number") return Number(min) <= Number(max);
  if (isTemporalFilterType(type)) return min <= max;
  return true;
}

function isTemporalFilterValueValid(type: "datetime" | "date" | "time", value: string): boolean {
  const trimmedValue = value.trim();
  if (trimmedValue === "") return false;

  switch (type) {
    case "datetime":
      // The datetime editor emits a local "YYYY-MM-DDTHH:mm:ss" (no zone); a
      // trailing Z or ±hh:mm offset is still accepted for externally-set values.
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
        trimmedValue,
      );
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue);
    case "time":
      return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(trimmedValue);
  }
}

function getTemporalInputProps(type: "datetime" | "date" | "time") {
  switch (type) {
    case "datetime":
      return {
        type: "text" as const,
        placeholder: "2026-04-27T12:34:56Z",
      };
    case "date":
      return {
        type: "date" as const,
      };
    case "time":
      return {
        type: "time" as const,
        step: 60,
      };
  }
}

function getOperatorLabel(
  operator: FilterOperator,
  t: ReturnType<typeof useDataTableT>,
  type?: FilterConfig["type"],
): string {
  // Date columns relabel the comparison operators (exact date / after / before).
  if (type === "date") {
    if (operator === "eq") return t("filterDateOperator_eq");
    if (operator === "gte") return t("filterDateOperator_gte");
    if (operator === "lte") return t("filterDateOperator_lte");
  }
  switch (operator) {
    case "eq":
      return t("filterOperator_eq");
    case "ne":
      return t("filterOperator_ne");
    case "gt":
      return t("filterOperator_gt");
    case "gte":
      return t("filterOperator_gte");
    case "lt":
      return t("filterOperator_lt");
    case "lte":
      return t("filterOperator_lte");
    case "contains":
      return t("filterOperator_contains");
    case "notContains":
      return t("filterOperator_notContains");
    case "hasPrefix":
      return t("filterOperator_hasPrefix");
    case "hasSuffix":
      return t("filterOperator_hasSuffix");
    case "notHasPrefix":
      return t("filterOperator_notHasPrefix");
    case "notHasSuffix":
      return t("filterOperator_notHasSuffix");
    case "between":
      return t("filterOperator_between");
    case "in":
      return t("filterOperator_in");
    case "nin":
      return t("filterOperator_nin");
    default:
      return operator;
  }
}

/** Format an ISO "YYYY-MM-DD" value as a locale-appropriate medium date. */
function formatDateValue(iso: string, locale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  try {
    // Format in UTC against a UTC-anchored instant so the calendar date never
    // shifts across timezones.
    return new DateFormatter(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(parseDate(iso).toDate("UTC"));
  } catch {
    return iso;
  }
}

/**
 * Date range for chip display: "15 Jul 2026 – 17 Jul 2026". Each bound is
 * formatted with the same locale-aware medium date used elsewhere, joined with
 * an en dash. (A tighter same-month collapse was avoided — partial Intl date
 * parts render inconsistently across locales.)
 */
function formatDateRange(minIso: string, maxIso: string, locale: string): string {
  return [minIso && formatDateValue(minIso, locale), maxIso && formatDateValue(maxIso, locale)]
    .filter(Boolean)
    .join(" – ");
}

/** Format a local "YYYY-MM-DDTHH:mm[:ss]" as a locale medium date + short time. */
function formatDateTimeValue(iso: string, locale: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso;
  const [, y, mo, d, h, min] = m;
  try {
    return new DateFormatter(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(min)));
  } catch {
    return iso;
  }
}

function formatFilterValue(
  filter: Filter,
  config: FilterConfig,
  t: ReturnType<typeof useDataTableT>,
  locale: string,
  /** Column label — used to summarize multi-select enums as "N labels". */
  label?: string,
): string {
  if (config.type === "enum" && Array.isArray(filter.value)) {
    const labels = filter.value
      .map((v) => config.options.find((option) => option.value === v)?.label ?? String(v))
      .filter((v) => v !== "");
    // Summarize multiple selections as "2 statuses" rather than listing them.
    if (labels.length > 1 && label) {
      return t("filterEnumCount", { count: labels.length, noun: label });
    }
    return labels.join(", ");
  }

  if (config.type === "boolean") {
    return filter.value === true ? t("filterBooleanTrue") : t("filterBooleanFalse");
  }

  if (config.type === "number" && filter.operator === "between") {
    const range = filter.value as { min?: unknown; max?: unknown } | null;
    if (!range || typeof range !== "object") return "";
    const min = range.min != null ? String(range.min) : "";
    const max = range.max != null ? String(range.max) : "";
    return [min, max].filter(Boolean).join(" - ");
  }

  if (config.type === "date") {
    if (filter.operator === "between") {
      const range = filter.value as { min?: unknown; max?: unknown } | null;
      if (!range || typeof range !== "object") return "";
      const minIso = range.min != null ? String(range.min) : "";
      const maxIso = range.max != null ? String(range.max) : "";
      return formatDateRange(minIso, maxIso, locale);
    }
    if (filter.value == null || filter.value === "") return "";
    return formatDateValue(String(filter.value), locale);
  }

  if (config.type === "datetime") {
    if (filter.operator === "between") {
      const range = filter.value as { min?: unknown; max?: unknown } | null;
      if (!range || typeof range !== "object") return "";
      const min = range.min != null ? formatDateTimeValue(String(range.min), locale) : "";
      const max = range.max != null ? formatDateTimeValue(String(range.max), locale) : "";
      return [min, max].filter(Boolean).join(" – ");
    }
    if (filter.value == null || filter.value === "") return "";
    return formatDateTimeValue(String(filter.value), locale);
  }

  if (isTemporalFilterType(config.type) && filter.operator === "between") {
    const range = filter.value as { min?: unknown; max?: unknown } | null;
    if (!range || typeof range !== "object") return "";
    const min = range.min != null ? String(range.min) : "";
    const max = range.max != null ? String(range.max) : "";
    return [min, max].filter(Boolean).join(" - ");
  }

  if (Array.isArray(filter.value)) {
    return filter.value.map((v) => String(v)).join(", ");
  }

  if (filter.value == null || filter.value === "") return "";
  return String(filter.value);
}

export { DataTableToolbar, DataTableFilters };
