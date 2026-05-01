import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { Checkbox } from "@base-ui/react/checkbox";
import { ChevronDown, Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCollectionControlOptional } from "@/contexts/collection-control-context";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Select } from "@/components/select-standalone";
import { useDataTableContext } from "./data-table-context";
import { useDataTableT } from "./i18n";
import type { CollectionControl, Filter, FilterConfig, FilterOperator } from "@/types/collection";
import type { Column } from "./types";

// =============================================================================
// DataTable.Toolbar
// =============================================================================

/** Use `DataTable.Toolbar` instead of calling this directly. */
function DataTableToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-slot="data-table-toolbar"
      className={cn("astw:flex astw:flex-col astw:gap-2 astw:border-b astw:p-2", className)}
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

/** String operators available in the operator selector. */
const STRING_OPERATORS = ["eq", "ne", "contains", "notContains", "hasPrefix", "hasSuffix"] as const;
type StringOperator = (typeof STRING_OPERATORS)[number];
type FilterableColumn = Column<Record<string, unknown>> & {
  filter: FilterConfig;
};
type AddFilterDraftValue = string | string[];

/** Use `DataTable.Filters` instead of calling this directly. */
function DataTableFilters({ className }: { className?: string }) {
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

  // Fields that currently have an active filter
  const activeFields = useMemo(
    () => new Set(control.filters.map((f) => f.field)),
    [control.filters],
  );

  // Fields available for the "Add filter" menu
  const availableColumns = useMemo(
    () => filterableColumns.filter((col) => !activeFields.has(col.filter.field)),
    [filterableColumns, activeFields],
  );

  if (filterableColumns.length === 0) return null;

  return (
    <div
      data-slot="data-table-filters"
      className={cn("astw:flex astw:flex-wrap astw:items-center astw:gap-2", className)}
    >
      {/* Active filter chips */}
      {filterableColumns.map((col) => {
        const active = control.filters.find((f) => f.field === col.filter.field);
        if (!active) return null;
        return <FilterChip key={col.filter.field} column={col} filter={active} control={control} />;
      })}

      {/* Add filter button */}
      {availableColumns.length > 0 && (
        <AddFilterPopover availableColumns={availableColumns} control={control} />
      )}
    </div>
  );
}
DataTableFilters.displayName = "DataTable.Filters";

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
}: {
  labels: [string, string];
  values: [string, string];
  onChangeMin: (value: string) => void;
  onChangeMax: (value: string) => void;
  onSubmit: () => void;
  inputProps?: React.ComponentProps<typeof Input>;
}) {
  return (
    <div className="astw:flex astw:flex-col astw:gap-1.5">
      <div className="astw:flex astw:items-center astw:h-8 astw:rounded-md astw:border astw:border-input astw:shadow-xs astw:has-focus-visible:border-ring astw:has-focus-visible:ring-ring/50 astw:has-focus-visible:ring-[3px]">
        <span className="astw:text-secondary-foreground astw:text-xs astw:px-2.5 astw:border-r astw:border-input astw:bg-background astw:rounded-l-md astw:h-full astw:flex astw:items-center astw:justify-center astw:shrink-0 astw:min-w-14">
          {labels[0]}
        </span>
        <Input
          {...inputProps}
          aria-label={labels[0]}
          value={values[0]}
          onChange={(e) => onChangeMin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          className="astw:h-full astw:text-sm astw:border-0 astw:shadow-none astw:focus-visible:ring-0"
        />
      </div>
      <div className="astw:flex astw:items-center astw:h-8 astw:rounded-md astw:border astw:border-input astw:shadow-xs astw:has-focus-visible:border-ring astw:has-focus-visible:ring-ring/50 astw:has-focus-visible:ring-[3px]">
        <span className="astw:text-secondary-foreground astw:text-xs astw:px-2.5 astw:border-r astw:border-input astw:bg-background astw:rounded-l-md astw:h-full astw:flex astw:items-center astw:justify-center astw:shrink-0 astw:min-w-14">
          {labels[1]}
        </span>
        <Input
          {...inputProps}
          aria-label={labels[1]}
          value={values[1]}
          onChange={(e) => onChangeMax(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          className="astw:h-full astw:text-sm astw:border-0 astw:shadow-none astw:focus-visible:ring-0"
        />
      </div>
    </div>
  );
}

function AddFilterPopover({
  availableColumns,
  control,
}: {
  availableColumns: FilterableColumn[];
  control: CollectionControl;
}) {
  const t = useDataTableT();
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<string | null>(null);
  const [operator, setOperator] = useState<FilterOperator>("eq");
  const [value, setValue] = useState<AddFilterDraftValue>("");

  const fieldLabelMap = useMemo(
    () => new Map(availableColumns.map((col) => [col.filter.field, col.label ?? col.filter.field])),
    [availableColumns],
  );

  const selectedColumn = useMemo(
    () => availableColumns.find((col) => col.filter.field === field) ?? availableColumns[0] ?? null,
    [availableColumns, field],
  );

  const operatorItems = useMemo(
    () =>
      selectedColumn ? getAddFilterOperators(selectedColumn.filter.type) : ([] as FilterOperator[]),
    [selectedColumn],
  );

  const canSubmit =
    selectedColumn != null &&
    isAddFilterDraftValueValid(selectedColumn.filter.type, operator, value);

  const initDraft = useCallback((column: FilterableColumn | null) => {
    if (!column) {
      setField(null);
      setOperator("eq");
      setValue("");
      return;
    }

    setField(column.filter.field);
    setOperator(DEFAULT_OPERATOR[column.filter.type]);
    setValue(getInitialAddFilterDraftValue(column.filter.type));
  }, []);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);

      if (isOpen) {
        initDraft(availableColumns[0] ?? null);
      }
    },
    [availableColumns, initDraft],
  );

  const handleFieldChange = useCallback(
    (nextField: string | null) => {
      if (!nextField) return;

      const nextColumn = availableColumns.find((col) => col.filter.field === nextField) ?? null;
      if (!nextColumn) return;

      setField(nextField);
      setOperator(DEFAULT_OPERATOR[nextColumn.filter.type]);
      setValue(getInitialAddFilterDraftValue(nextColumn.filter.type));
    },
    [availableColumns],
  );

  const handleSubmit = useCallback(() => {
    if (!selectedColumn) return;
    if (!isAddFilterDraftValueValid(selectedColumn.filter.type, operator, value)) return;

    control.addFilter(
      selectedColumn.filter.field,
      operator,
      toAddFilterSubmittedValue(selectedColumn.filter.type, operator, value),
    );
    setOpen(false);
  }, [selectedColumn, value, operator, control]);

  const renderValueEditor = () => {
    if (!selectedColumn) return null;

    const config = selectedColumn.filter;

    if (config.type === "enum") {
      const selectedValues = Array.isArray(value) ? (value as string[]) : [];

      return (
        <div className="astw:max-h-44 astw:overflow-auto astw:rounded-md astw:border astw:py-1">
          {config.options.map((option) => {
            const isChecked = selectedValues.includes(option.value);
            return (
              <label
                key={option.value}
                className={cn(
                  "astw:flex astw:cursor-pointer astw:select-none astw:items-center astw:gap-2 astw:px-3 astw:py-1.5 astw:text-sm",
                  "astw:hover:bg-accent astw:hover:text-accent-foreground",
                )}
              >
                <Checkbox.Root
                  checked={isChecked}
                  onCheckedChange={() => {
                    const current = new Set(selectedValues);
                    if (current.has(option.value)) {
                      current.delete(option.value);
                    } else {
                      current.add(option.value);
                    }
                    setValue([...current]);
                  }}
                  className={cn(
                    "astw:flex astw:size-4 astw:items-center astw:justify-center astw:rounded-xs astw:border astw:border-input",
                    "astw:data-checked:bg-primary astw:data-checked:border-primary astw:data-checked:text-primary-foreground",
                  )}
                >
                  <Checkbox.Indicator className="astw:flex astw:data-unchecked:hidden">
                    <Check className="astw:size-3" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                {option.label}
              </label>
            );
          })}
        </div>
      );
    }

    if (config.type === "boolean") {
      return (
        <Select
          items={["true", "false"]}
          value={typeof value === "string" ? value : ""}
          onValueChange={(v) => {
            if (v) setValue(v);
          }}
          mapItem={(v) => ({
            value: v,
            label: v === "true" ? t("filterBooleanTrue") : t("filterBooleanFalse"),
          })}
          className="astw:h-8 astw:text-sm"
        />
      );
    }

    if (isTemporalFilterType(config.type)) {
      if (operator === "between") {
        const [min, max] = Array.isArray(value) ? value : ["", ""];
        return (
          <BetweenInputGroup
            labels={[t("filterBetweenFrom"), t("filterBetweenTo")]}
            values={[min, max]}
            onChangeMin={(v) => setValue([v, max])}
            onChangeMax={(v) => setValue([min, v])}
            onSubmit={handleSubmit}
            inputProps={getTemporalInputProps(config.type)}
          />
        );
      }
      return (
        <Input
          {...getTemporalInputProps(config.type)}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
          className="astw:h-8 astw:text-sm"
        />
      );
    }

    if (config.type === "number") {
      if (operator === "between") {
        const [min, max] = Array.isArray(value) ? value : ["", ""];
        return (
          <BetweenInputGroup
            labels={[t("filterBetweenMin"), t("filterBetweenMax")]}
            values={[min, max]}
            onChangeMin={(v) => setValue([v, max])}
            onChangeMax={(v) => setValue([min, v])}
            onSubmit={handleSubmit}
            inputProps={{ type: "number" }}
          />
        );
      }
      return (
        <Input
          type="number"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSubmit();
            }
          }}
          className="astw:h-8 astw:text-sm"
        />
      );
    }

    return (
      <Input
        value={typeof value === "string" ? value : ""}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSubmit();
          }
        }}
        className="astw:h-8 astw:text-sm"
      />
    );
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        render={
          <Button variant="outline" size="xs">
            <Plus className="astw:size-3" />
            {t("addFilter")}
          </Button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={4} side="bottom" align="start">
          <Popover.Popup
            data-slot="data-table-filter-add-popup"
            className={cn(
              "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:w-80 astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:shadow-md",
              "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
            )}
          >
            <div className="astw:flex astw:flex-col astw:gap-2 astw:p-3">
              <Select
                items={availableColumns.map((col) => col.filter.field)}
                value={selectedColumn?.filter.field ?? null}
                onValueChange={handleFieldChange}
                mapItem={(item) => ({
                  value: item,
                  label: fieldLabelMap.get(item) ?? item,
                })}
                className="astw:h-8 astw:text-sm"
              />
              {operatorItems.length > 1 ? (
                <Select
                  items={operatorItems}
                  value={operator}
                  onValueChange={(nextOp) => {
                    if (!nextOp) return;
                    const wasBetween = operator === "between";
                    const isBetween = nextOp === "between";
                    setOperator(nextOp);
                    if (wasBetween !== isBetween) {
                      setValue(isBetween ? ["", ""] : "");
                    }
                  }}
                  mapItem={(op) => ({
                    value: op,
                    label: getOperatorLabel(op, t),
                  })}
                  className="astw:h-8 astw:text-sm"
                />
              ) : null}
              {renderValueEditor()}
              <Button
                size="xs"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="astw:self-end"
              >
                {t("addFilter")}
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
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
  const config = column.filter;
  const label = column.label ?? config.field;

  const [open, setOpen] = useState(false);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleRemove = useCallback(() => {
    control.removeFilter(config.field);
  }, [control, config.field]);

  const chipLabel = getChipDisplayLabel(label, filter, config, t);

  return (
    <div data-slot="data-table-filter-chip" className="astw:flex astw:items-center astw:gap-0">
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger
          render={
            <Button
              variant="outline"
              size="xs"
              className="astw:rounded-r-none astw:border-r-0 astw:pr-1.5"
            >
              {chipLabel}
              <ChevronDown className="astw:size-3 astw:text-muted-foreground" />
            </Button>
          }
        />
        <Popover.Portal>
          <Popover.Positioner sideOffset={4} side="bottom" align="start">
            <Popover.Popup
              data-slot="data-table-filter-popup"
              className={cn(
                "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:min-w-45 astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:shadow-md",
                "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
              )}
            >
              <FilterPopoverContent
                column={column}
                filter={filter}
                control={control}
                onClose={handleClose}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <Button
        variant="outline"
        size="xs"
        className="astw:rounded-l-none astw:px-1"
        onClick={handleRemove}
        aria-label={t("removeFilter")}
      >
        <X className="astw:size-3" />
      </Button>
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
}: {
  column: Column<Record<string, unknown>> & { filter: FilterConfig };
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
}) {
  const config = column.filter;

  switch (config.type) {
    case "enum":
      return <EnumFilterEditor config={config} filter={filter} control={control} />;
    case "boolean":
      return (
        <BooleanFilterEditor config={config} filter={filter} control={control} onClose={onClose} />
      );
    case "string":
      return (
        <StringFilterEditor config={config} filter={filter} control={control} onClose={onClose} />
      );
    case "uuid":
      return (
        <UuidFilterEditor config={config} filter={filter} control={control} onClose={onClose} />
      );
    case "number":
      return (
        <NumericFilterEditor config={config} filter={filter} control={control} onClose={onClose} />
      );
    case "datetime":
    case "date":
    case "time":
      return (
        <TemporalFilterEditor config={config} filter={filter} control={control} onClose={onClose} />
      );
  }
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
    <div data-slot="data-table-filter-enum" className="astw:py-1">
      {config.options.map((option) => {
        const isChecked = selectedValues.includes(option.value);
        return (
          <label
            key={option.value}
            className={cn(
              "astw:flex astw:cursor-pointer astw:select-none astw:items-center astw:gap-2 astw:px-3 astw:py-1.5 astw:text-sm",
              "astw:hover:bg-accent astw:hover:text-accent-foreground",
            )}
          >
            <Checkbox.Root
              checked={isChecked}
              onCheckedChange={() => handleToggle(option.value)}
              className={cn(
                "astw:flex astw:size-4 astw:items-center astw:justify-center astw:rounded-xs astw:border astw:border-input",
                "astw:data-checked:bg-primary astw:data-checked:border-primary astw:data-checked:text-primary-foreground",
              )}
            >
              <Checkbox.Indicator className="astw:flex astw:data-unchecked:hidden">
                <Check className="astw:size-3" />
              </Checkbox.Indicator>
            </Checkbox.Root>
            {option.label}
          </label>
        );
      })}
    </div>
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
}: {
  config: Extract<FilterConfig, { type: "boolean" }>;
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
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
      <Select
        items={[...BOOLEAN_OPERATORS]}
        value={localOp}
        onValueChange={(v) => {
          if (v) setLocalOp(v as BooleanOperator);
        }}
        mapItem={(op) => ({ value: op, label: getOperatorLabel(op, t) })}
        className="astw:h-8 astw:text-sm"
      />
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
}: {
  config: Extract<FilterConfig, { type: "string" }>;
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
}) {
  const t = useDataTableT();
  const [localOp, setLocalOp] = useState<StringOperator>(
    STRING_OPERATORS.includes(filter.operator as StringOperator)
      ? (filter.operator as StringOperator)
      : "contains",
  );
  const [localValue, setLocalValue] = useState(String(filter.value ?? ""));
  const [localCaseInsensitive, setLocalCaseInsensitive] = useState(filter.caseInsensitive ?? false);

  const handleCommit = useCallback(() => {
    if (localValue.trim() === "") {
      control.removeFilter(config.field);
    } else {
      control.addFilter(config.field, localOp, localValue, {
        caseInsensitive: localCaseInsensitive,
      });
    }
    onClose();
  }, [localValue, localOp, localCaseInsensitive, control, config.field, onClose]);

  return (
    <div
      data-slot="data-table-filter-string"
      className="astw:flex astw:flex-col astw:gap-2 astw:p-2"
    >
      <Select
        items={[...STRING_OPERATORS]}
        value={localOp}
        onValueChange={(v) => {
          if (v) setLocalOp(v);
        }}
        mapItem={(op) => ({ value: op, label: t(`filterOperator_${op}`) })}
        className="astw:h-8 astw:text-sm"
      />
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCommit();
        }}
        className="astw:h-8 astw:text-sm"
      />
      <label className="astw:flex astw:items-center astw:gap-1.5 astw:text-sm">
        <Checkbox.Root
          checked={localCaseInsensitive}
          onCheckedChange={setLocalCaseInsensitive}
          className="astw:flex astw:size-4 astw:items-center astw:justify-center astw:rounded-sm astw:border astw:border-input data-[checked]:astw:border-primary data-[checked]:astw:bg-primary data-[checked]:astw:text-primary-foreground"
        >
          <Checkbox.Indicator className="astw:flex astw:items-center astw:justify-center">
            <Check className="astw:size-3" />
          </Checkbox.Indicator>
        </Checkbox.Root>
        {t("filterCaseInsensitive")}
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
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={(e) => {
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
}: {
  config: Extract<FilterConfig, { type: "number" }>;
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
}) {
  const t = useDataTableT();
  const [localOp, setLocalOp] = useState<NumericTemporalOperator>(
    NUMERIC_TEMPORAL_OPERATORS.includes(filter.operator as NumericTemporalOperator)
      ? (filter.operator as NumericTemporalOperator)
      : "eq",
  );
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
      return !Number.isNaN(Number(localValue)) && !Number.isNaN(Number(localValueMax));
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
        if (!Number.isNaN(min) && !Number.isNaN(max)) {
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
      <Select
        items={[...NUMERIC_TEMPORAL_OPERATORS]}
        value={localOp}
        onValueChange={(v) => {
          if (v) setLocalOp(v);
        }}
        mapItem={(op) => ({ value: op, label: t(`filterOperator_${op}`) })}
        className="astw:h-8 astw:text-sm"
      />
      {localOp === "between" ? (
        <BetweenInputGroup
          labels={[t("filterBetweenMin"), t("filterBetweenMax")]}
          values={[localValue, localValueMax]}
          onChangeMin={setLocalValue}
          onChangeMax={setLocalValueMax}
          onSubmit={handleCommit}
          inputProps={{ type: "number" }}
        />
      ) : (
        <Input
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={(e) => {
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
  filter,
  control,
  onClose,
}: {
  config: Extract<FilterConfig, { type: "datetime" | "date" | "time" }>;
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
}) {
  const t = useDataTableT();
  const [localOp, setLocalOp] = useState<NumericTemporalOperator>(
    NUMERIC_TEMPORAL_OPERATORS.includes(filter.operator as NumericTemporalOperator)
      ? (filter.operator as NumericTemporalOperator)
      : "eq",
  );
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
        isTemporalFilterValueValid(config.type, localValueMax)
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
        control.addFilter(config.field, localOp, { min: localValue, max: localValueMax });
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

  return (
    <div
      data-slot={`data-table-filter-${config.type}`}
      className="astw:flex astw:flex-col astw:gap-2 astw:p-2"
    >
      <Select
        items={[...NUMERIC_TEMPORAL_OPERATORS]}
        value={localOp}
        onValueChange={(v) => {
          if (v) setLocalOp(v);
        }}
        mapItem={(op) => ({ value: op, label: t(`filterOperator_${op}`) })}
        className="astw:h-8 astw:text-sm"
      />
      {localOp === "between" ? (
        <BetweenInputGroup
          labels={[t("filterBetweenFrom"), t("filterBetweenTo")]}
          values={[localValue, localValueMax]}
          onChangeMin={setLocalValue}
          onChangeMax={setLocalValueMax}
          onSubmit={handleCommit}
          inputProps={getTemporalInputProps(config.type)}
        />
      ) : (
        <Input
          {...getTemporalInputProps(config.type)}
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCommit();
            }
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
// Helpers
// =============================================================================

function getAddFilterOperators(type: FilterConfig["type"]): FilterOperator[] {
  switch (type) {
    case "string":
      return [...STRING_OPERATORS];
    case "number":
    case "datetime":
    case "date":
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

function getInitialAddFilterDraftValue(type: FilterConfig["type"]): AddFilterDraftValue {
  if (type === "enum") return [];
  if (type === "boolean") return "true";
  return "";
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

function isTemporalFilterValueValid(type: "datetime" | "date" | "time", value: string): boolean {
  const trimmedValue = value.trim();
  if (trimmedValue === "") return false;

  switch (type) {
    case "datetime":
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
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

function getOperatorLabel(operator: FilterOperator, t: ReturnType<typeof useDataTableT>): string {
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

function formatFilterValue(
  filter: Filter,
  config: FilterConfig,
  t: ReturnType<typeof useDataTableT>,
): string {
  if (config.type === "enum" && Array.isArray(filter.value)) {
    const labels = filter.value
      .map((v) => config.options.find((option) => option.value === v)?.label ?? String(v))
      .filter((v) => v !== "");
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

function getChipDisplayLabel(
  columnLabel: string,
  filter: Filter,
  config: FilterConfig,
  t: ReturnType<typeof useDataTableT>,
): string {
  const valueLabel = formatFilterValue(filter, config, t);
  if (!valueLabel) return columnLabel;

  const operatorLabel = getOperatorLabel(filter.operator, t);
  const ciSuffix = filter.caseInsensitive ? " (Aa)" : "";

  if (config.type === "enum") {
    return t("filterChipLabelEnum", {
      column: columnLabel,
      operator: operatorLabel,
      value: valueLabel,
    });
  }

  return (
    t("filterChipLabel", {
      column: columnLabel,
      operator: operatorLabel,
      value: valueLabel,
    }) + ciSuffix
  );
}

export { DataTableToolbar, DataTableFilters };
