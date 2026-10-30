import { cn } from "@/lib/utils";
import type { CollectionControl, FilterOperator, Filter } from "@/types/collection";
import { useDataTableT } from "../i18n";
import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Button } from "@/components/button";
import { Filter as FilterIcon, Search, Check, X } from "lucide-react";
import { Input } from "@/components/input";
import { parseDate } from "@internationalized/date";
import { Calendar } from "@/components/calendar";
import { useTimeZone, useResolvedLocale } from "@/contexts/appshell-context";
import {
  localDateTimeParts,
  normalizeTemporalFilterValue,
  isTemporalFilterType,
} from "@/lib/temporal-filter-values";
import { Text } from "../../text";
import type { ReactNode } from "react";
import { isComposing } from "@/lib/is-composing";
import { Tooltip } from "@/components/tooltip";
import type { FilterableColumn } from "./types";
import { getVisibleFilterOperators, getDefaultFilterOperator, getOperatorLabel } from "./operators";
import { formatDateTimeValue, formatDateValue } from "./formatting";
import {
  betweenOrderError,
  isAddFilterDraftValueValid,
  isRangeOrdered,
  toAddFilterSubmittedValue,
} from "./values";
import type { AddFilterDraftValue } from "./values";
import { EnumOptionList, BetweenInputGroup, getTemporalInputProps } from "./inputs";

// =============================================================================
// AddFilterPanel — the add-filter surface: one popover with three columns
// (field ▸ condition ▸ value). The condition column appears for fields with
// more than one operator. Values are drafted and committed with an Apply button
// (the panel stays open so several filters can be added in a row).
// =============================================================================

const PANEL_COLUMN_ROW = cn(
  "astw:flex astw:w-full astw:items-center astw:gap-2 astw:rounded-sm astw:px-2 astw:py-1.5",
  "astw:text-left astw:text-body-md astw:outline-hidden astw:cursor-default astw:transition-colors",
);

// Distinct row states: hover is a subtle muted tint; selection is the solid accent
// (+ bold). Applied exclusively — hover is only added when the row isn't selected —
// so hovering the selected row doesn't repaint it and the two never look alike.
const PANEL_ROW_HOVER = "astw:hover:bg-muted astw:focus-visible:bg-muted";

const PANEL_ROW_SELECTED = "astw:bg-accent astw:font-semibold astw:text-accent-foreground";

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
  const operators = getVisibleFilterOperators(col.filter, active?.operator);
  if (active && operators.includes(active.operator)) return active.operator;
  return getDefaultFilterOperator(col.filter);
}

function AddFilterPanel({
  columns,
  control,
  iconOnly = false,
}: {
  columns: FilterableColumn[];
  control: CollectionControl;
  /** Render the trigger as an icon-only button (label kept as `aria-label`). */
  iconOnly?: boolean;
}) {
  const t = useDataTableT();
  const [open, setOpen] = useState(false);
  const [fieldName, setFieldName] = useState<string>(columns[0]?.filter.field ?? "");
  // Field search: enterprise tables can have many filterable fields, so the
  // panel always offers a search box over the field list.
  const [fieldQuery, setFieldQuery] = useState("");
  const fq = fieldQuery.trim().toLowerCase();
  const visibleFieldColumns = fq
    ? columns.filter((c) => (c.label ?? c.filter.field).toLowerCase().includes(fq))
    : columns;

  const selectedColumn = columns.find((c) => c.filter.field === fieldName) ?? columns[0];
  const config = selectedColumn?.filter;
  const activeFilter = control.filters.find((f) => f.field === fieldName);
  const operators = config ? getVisibleFilterOperators(config, activeFilter?.operator) : [];
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

  const handleFieldQueryChange = (value: string) => {
    setFieldQuery(value);

    const nextQuery = value.trim().toLowerCase();
    if (!nextQuery) return;

    const nextVisible = columns.filter((c) =>
      (c.label ?? c.filter.field).toLowerCase().includes(nextQuery),
    );
    if (nextVisible.length === 0) return;
    if (nextVisible.some((c) => c.filter.field === fieldName)) return;

    const first = nextVisible[0];
    setFieldName(first.filter.field);
    setOperator(seedPanelOperator(control, first));
  };

  // Always reopen on the first field rather than wherever the user last was.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setFieldQuery("");
      selectField(columns[0]?.filter.field ?? "");
    }
  };

  const activeFields = new Set(control.filters.map((f) => f.field));
  let effectiveOperator: FilterOperator | undefined;
  if (config) {
    effectiveOperator = showConditions ? operator : getDefaultFilterOperator(config);
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        render={
          <Button variant="outline" size="xs" aria-label={iconOnly ? t("addFilter") : undefined}>
            {/* Icon-only reads better a touch larger (matching icon-button convention);
                inline-with-label stays smaller so it sits neatly beside the text. */}
            <FilterIcon className={iconOnly ? "astw:size-3.5" : "astw:size-3"} />
            {!iconOnly && t("addFilter")}
          </Button>
        }
      />
      <Popover.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
        {/* align="start" anchors the panel's left edge to the (left-aligned) trigger
            so it grows/shrinks toward the right as columns appear/disappear. We keep
            anchor tracking on (no disableAnchorTracking) so the positioner re-aligns
            the left edge when the width changes; the trigger itself no longer moves
            when chips are added (they live in a separate flex-1 container), so there's
            nothing to jump away from. base-ui still shifts the panel to stay on-screen. */}
        <Popover.Positioner sideOffset={4} side="bottom" align="start">
          <Popover.Popup
            data-slot="data-table-filter-panel"
            className={cn(
              // The panel hugs its columns (no fixed width): column 1 hugs the field
              // names (up to a cap), column 2 (conditions) is fixed, and column 3 (the
              // value editor) is a fixed 260px. So a wider field column grows the panel
              // rightward (it's anchored left) instead of squeezing the value editor.
              // Fixed height fits the tallest editor (datetime range: From/To tabs +
              // calendar + "Choose time").
              "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:flex astw:h-[28rem] astw:items-stretch astw:overflow-hidden astw:rounded-md astw:border astw:border-border astw:shadow-md",
              "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
            )}
          >
            {/* Column 1 — fields (scrolls), with a search header and a sticky
                "Clear all" footer. Hugs the field-name width up to a cap so long
                names aren't needlessly truncated. */}
            <div className="astw:flex astw:min-w-44 astw:max-w-[22.5rem] astw:flex-col astw:p-1">
              {/* Field search — spacing/style mirrors the ColumnSettings search. */}
              <div className="astw:relative astw:mb-1">
                <Search className="astw:pointer-events-none astw:absolute astw:top-1/2 astw:left-2.5 astw:size-3.5 astw:-translate-y-1/2 astw:text-muted-foreground" />
                <Input
                  type="search"
                  value={fieldQuery}
                  onChange={(e) => handleFieldQueryChange(e.target.value)}
                  placeholder={t("searchFields")}
                  aria-label={t("searchFields")}
                  className="astw:h-8 astw:pl-8 astw:text-body-md"
                />
              </div>
              <div className="astw:flex-1 astw:overflow-y-auto">
                {visibleFieldColumns.length === 0 ? (
                  <div className="astw:px-2 astw:py-3 astw:text-center astw:text-body-sm astw:text-muted-foreground">
                    {t("noFieldsMatch")}
                  </div>
                ) : (
                  visibleFieldColumns.map((col) => {
                    const isSelected = col.filter.field === fieldName;
                    return (
                      <button
                        key={col.filter.field}
                        type="button"
                        onClick={() => selectField(col.filter.field)}
                        title={col.label ?? col.filter.field}
                        className={cn(
                          PANEL_COLUMN_ROW,
                          isSelected ? PANEL_ROW_SELECTED : PANEL_ROW_HOVER,
                        )}
                      >
                        <span className="astw:min-w-0 astw:flex-1 astw:truncate">
                          {col.label ?? col.filter.field}
                        </span>
                        {activeFields.has(col.filter.field) && (
                          <span className="astw:ml-auto astw:size-1.5 astw:shrink-0 astw:rounded-full astw:bg-primary" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
              {control.filters.length > 0 && (
                <div className="astw:mt-1 astw:border-t astw:border-border astw:pt-1">
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

            {/* Column 3 — value editor; fixed width so it never shrinks when column 1
                (fields) grows wider. */}
            <div className="astw:flex astw:w-[260px] astw:min-w-0 astw:flex-col astw:border-l astw:border-border">
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

// -----------------------------------------------------------------------------
// TODO(app-shell): replace the temporal filter editors below with dedicated
// pickers once app-shell ships them:
//   - `time`     → a proper TimePicker (currently a native <input type="time">).
//   - `datetime` → a DateTimePicker (currently a date `DatePicker` + a native
//                  time box, combined into an ISO string — see PanelDateTimeInput
//                  and DateTimeFilterInput).
//   - `datetime`/`date` "between" → a DateRangePicker / DateTimeRangePicker
//                  (currently one inline calendar with From/To tabs, see
//                  PanelDateRangeInput; the chip editor uses two From/To fields).
// These stopgaps intentionally emit the same ISO value shapes, so each swap is
// UI-only — no change to the committed filter values.
// -----------------------------------------------------------------------------

/**
 * Single-datetime editor for the panel: the inline `Calendar` up front with a
 * labelled time picker beneath it, bridging an RFC 3339 instant. (The chip and
 * the "between" range keep the compact date-picker + time box to stay short.)
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
  const shellTz = useTimeZone();
  const { date: datePart, time: timePart } = localDateTimeParts(value, shellTz.value);
  const calValue = datePart ? parseDate(datePart) : null;
  const emit = (nextDate: string, nextTime: string) => {
    onChange(
      nextDate
        ? (normalizeTemporalFilterValue(
            "datetime",
            `${nextDate}T${nextTime || "00:00"}:00`,
            shellTz.value,
          ) ?? "")
        : "",
    );
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
        <Text variant="body-sm" className="astw:text-muted-foreground" render={<span />}>
          {t("chooseTime")}
        </Text>
        <Input
          type="time"
          aria-label={`${ariaLabel} (${t("chooseTime")})`}
          value={timePart}
          onChange={(e) => emit(datePart, e.target.value)}
          className="astw:h-8 astw:text-body-md"
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
  const shellTz = useTimeZone();
  const [active, setActive] = useState<"from" | "to">("from");

  const fmt = (v: string) => {
    if (!v) return "—";
    return withTime ? formatDateTimeValue(v, locale, shellTz.value) : formatDateValue(v, locale);
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
    shellTz.value,
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
            <span className="astw:text-body-sm astw:text-muted-foreground">{b.label}</span>
            <span
              className={cn(
                "astw:w-full astw:truncate astw:text-body-md",
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

      {error && (
        <Text variant="body-sm" className="astw:text-danger-text">
          {error}
        </Text>
      )}
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
  const shellTz = useTimeZone();
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
      if (!isAddFilterDraftValueValid(type, "between", draft, shellTz.value)) return;
      if (!isRangeOrdered(type, min, max)) return;
      control.addFilter(
        field,
        "between",
        toAddFilterSubmittedValue(type, "between", draft, shellTz.value),
      );
      return;
    }
    if (text.trim() === "") {
      control.removeFilter(field);
      return;
    }
    if (!isAddFilterDraftValueValid(type, operator, text, shellTz.value)) return;
    control.addFilter(
      field,
      operator,
      toAddFilterSubmittedValue(type, operator, text, shellTz.value),
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
    const numeric = type === "number" || type === "decimal";
    const numericInputProps =
      type === "decimal" ? { type: "text", inputMode: "decimal" as const } : { type: "number" };
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
            numeric ? numericInputProps : getTemporalInputProps(type as "datetime" | "time")
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
            if (e.key === "Enter" && !isComposing(e.nativeEvent)) apply();
          }}
          className="astw:h-8 astw:text-body-md"
        />
      </div>
    );
  } else {
    editor = (
      <div className="astw:p-2">
        <Input
          type={type === "number" ? "number" : "text"}
          inputMode={type === "decimal" ? "decimal" : undefined}
          value={text}
          placeholder={t("filterValuePlaceholder", { field: label })}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isComposing(e.nativeEvent)) apply();
          }}
          className="astw:h-8 astw:text-body-md"
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

export { AddFilterPanel };
