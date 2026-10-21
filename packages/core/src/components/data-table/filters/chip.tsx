import type { Column, DataTableFilterConfig } from "../types";
import type { Filter, CollectionControl, FilterOperator, FilterConfig } from "@/types/collection";
import { useDataTableT } from "../i18n";
import { useResolvedLocale, useTimeZone } from "@/contexts/appshell-context";
import { useState, useCallback } from "react";
import { normalizeTemporalFilterValue } from "@/lib/temporal-filter-values";
import { cn } from "@/lib/utils";
import { Popover } from "@base-ui/react/popover";
import { ChevronDown, X, Search, Check } from "lucide-react";
import { getVisibleFilterOperators, getOperatorLabel } from "./operators";
import { formatFilterValue } from "./formatting";
import { FilterPopoverContent } from "./editors";

// =============================================================================
// FilterChip — per-filter popover-based editor
// =============================================================================

function FilterChip({
  column,
  filter,
  control,
}: {
  column: Column<Record<string, unknown>> & { filter: DataTableFilterConfig };
  filter: Filter;
  control: CollectionControl;
}) {
  const t = useDataTableT();
  const { locale } = useResolvedLocale();
  const shellTz = useTimeZone();
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
      const toDateTime = (v: unknown) => normalizeTemporalFilterValue("datetime", v, shellTz.value);
      const toDateTimeRange = (v: unknown) => {
        const range = (v ?? {}) as { min?: unknown; max?: unknown };
        const min = toDateTime(range.min);
        const max = toDateTime(range.max);
        return min && max ? { min, max } : null;
      };
      const arity = (op: FilterOperator) => (op === "between" ? 2 : 1);
      if (arity(nextOp) === arity(filter.operator)) {
        let value = filter.value;
        if (config.type === "datetime") {
          value =
            filter.operator === "between"
              ? toDateTimeRange(filter.value)
              : toDateTime(filter.value);
        }
        if (config.type === "datetime" && value == null) return;
        control.addFilter(
          config.field,
          nextOp,
          value,
          config.type === "string" && filter.caseSensitive ? { caseSensitive: true } : undefined,
        );
      } else if (nextOp === "between") {
        const v = filter.value;
        if (config.type === "number") {
          const n = toNum(v);
          control.addFilter(config.field, nextOp, { min: n, max: n });
        } else if (config.type === "datetime") {
          const s = toDateTime(v);
          if (!s) return;
          control.addFilter(config.field, nextOp, { min: s, max: s });
        } else {
          const s = v == null ? "" : String(v);
          control.addFilter(config.field, nextOp, { min: s, max: s });
        }
      } else {
        const range = (filter.value ?? {}) as { min?: unknown; max?: unknown };
        const lower = range.min ?? range.max ?? "";
        if (config.type === "datetime") {
          const normalized = toDateTime(lower);
          if (!normalized) return;
          control.addFilter(config.field, nextOp, normalized);
          setOpOpen(false);
          return;
        }
        control.addFilter(
          config.field,
          nextOp,
          config.type === "number" ? toNum(lower) : String(lower),
        );
      }
      setOpOpen(false);
    },
    [
      control,
      config.field,
      config.type,
      filter.operator,
      filter.value,
      filter.caseSensitive,
      shellTz.value,
    ],
  );

  const operators = getVisibleFilterOperators(config, filter.operator);
  const operatorLabel = getOperatorLabel(filter.operator, t, config.type);
  const valueLabel = formatFilterValue(filter, config, t, locale, shellTz.value, label);

  const segment =
    "astw:flex astw:items-center astw:h-6 astw:px-2 astw:text-body-sm astw:whitespace-nowrap astw:outline-hidden";
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
      <span className={cn(segment, "astw:text-label-sm astw:text-foreground")}>{label}</span>

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
              className={cn(
                interactiveSegment,
                "astw:gap-1 astw:text-label-sm astw:text-foreground",
              )}
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

  const q = query.trim().toLowerCase();
  const items = operators
    .map((op) => ({ op, label: getOperatorLabel(op, t, type) }))
    .filter(({ label }) => label.toLowerCase().includes(q));

  return (
    <div className="astw:flex astw:flex-col">
      <div className="astw:flex astw:items-center astw:gap-2 astw:border-b astw:border-border astw:px-2.5">
        <Search className="astw:size-3.5 astw:text-muted-foreground" />
        {/* Base UI's Popover.Popup moves initial focus to the first tabbable
            element by default, which is this input. On touch it focuses the
            popup instead so the virtual keyboard doesn't jump open. */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("filterOperatorSearchPlaceholder")}
          className="astw:h-9 astw:w-full astw:bg-transparent astw:text-body-md astw:outline-hidden astw:placeholder:text-muted-foreground"
        />
      </div>
      <div className="astw:p-1">
        {items.map(({ op, label }) => (
          <button
            key={op}
            type="button"
            onClick={() => onSelect(op)}
            className={cn(
              "astw:flex astw:w-full astw:items-center astw:justify-between astw:gap-2 astw:rounded-sm astw:px-2 astw:py-1.5 astw:text-left astw:text-body-md astw:outline-hidden",
              "astw:hover:bg-accent astw:hover:text-accent-foreground astw:focus-visible:bg-accent",
              op === current && "astw:bg-accent/60",
            )}
          >
            {label}
            {op === current && <Check className="astw:size-3.5" />}
          </button>
        ))}
        {items.length === 0 && (
          <output className="astw:block astw:px-2 astw:py-1.5 astw:text-body-md astw:text-muted-foreground">
            {t("filterOperatorNoResults")}
          </output>
        )}
      </div>
    </div>
  );
}

export { FilterChip };
