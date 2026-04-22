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

/** @internal Use `DataTable.Toolbar` instead. */
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
  date: "eq",
  uuid: "eq",
};

/** Number/date operators available in the operator selector. */
const NUMERIC_DATE_OPERATORS = ["eq", "ne", "gt", "gte", "lt", "lte"] as const;
type NumericDateOperator = (typeof NUMERIC_DATE_OPERATORS)[number];

/** String operators available in the operator selector. */
const STRING_OPERATORS = ["eq", "ne", "contains", "notContains", "hasPrefix", "hasSuffix"] as const;
type StringOperator = (typeof STRING_OPERATORS)[number];
type FilterableColumn = Column<Record<string, unknown>> & {
  filter: FilterConfig;
};
type AddFilterDraftValue = string | string[] | boolean[];

/** @internal Use `DataTable.Filters` instead. */
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
    selectedColumn != null && isAddFilterDraftValueValid(selectedColumn.filter.type, value);

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
    if (!isAddFilterDraftValueValid(selectedColumn.filter.type, value)) return;

    control.addFilter(
      selectedColumn.filter.field,
      operator,
      toAddFilterSubmittedValue(selectedColumn.filter.type, value),
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
                    "astw:data-[checked]:bg-primary astw:data-[checked]:border-primary astw:data-[checked]:text-primary-foreground",
                  )}
                >
                  <Checkbox.Indicator className="astw:flex astw:data-[unchecked]:hidden">
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
      const selectedValues = Array.isArray(value) ? (value as boolean[]) : [];
      const options = [
        { value: true, label: t("filterBooleanTrue") },
        { value: false, label: t("filterBooleanFalse") },
      ] as const;

      return (
        <div className="astw:rounded-md astw:border astw:py-1">
          {options.map((option) => {
            const isChecked = selectedValues.includes(option.value);
            return (
              <label
                key={String(option.value)}
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
                    "astw:data-[checked]:bg-primary astw:data-[checked]:border-primary astw:data-[checked]:text-primary-foreground",
                  )}
                >
                  <Checkbox.Indicator className="astw:flex astw:data-[unchecked]:hidden">
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

    if (config.type === "date") {
      return (
        <Input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => setValue(e.target.value)}
          className="astw:h-8 astw:text-sm"
        />
      );
    }

    if (config.type === "number") {
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
              "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:w-72 astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:shadow-md",
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
                    if (nextOp) setOperator(nextOp);
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
                "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:min-w-[180px] astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:shadow-md",
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
      return <BooleanFilterEditor config={config} filter={filter} control={control} />;
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
    case "date":
      return (
        <DateFilterEditor config={config} filter={filter} control={control} onClose={onClose} />
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
                "astw:data-[checked]:bg-primary astw:data-[checked]:border-primary astw:data-[checked]:text-primary-foreground",
              )}
            >
              <Checkbox.Indicator className="astw:flex astw:data-[unchecked]:hidden">
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
// Boolean filter — True/False checkboxes
// =============================================================================

function BooleanFilterEditor({
  config,
  filter,
  control,
}: {
  config: Extract<FilterConfig, { type: "boolean" }>;
  filter: Filter;
  control: CollectionControl;
}) {
  const t = useDataTableT();
  const selectedValues = useMemo(
    () => (Array.isArray(filter.value) ? (filter.value as boolean[]) : []),
    [filter.value],
  );

  const handleToggle = useCallback(
    (boolValue: boolean) => {
      const current = new Set(selectedValues);
      if (current.has(boolValue)) {
        current.delete(boolValue);
      } else {
        current.add(boolValue);
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

  const options = [
    { value: true, label: t("filterBooleanTrue") },
    { value: false, label: t("filterBooleanFalse") },
  ] as const;

  return (
    <div data-slot="data-table-filter-boolean" className="astw:py-1">
      {options.map((option) => {
        const isChecked = selectedValues.includes(option.value);
        return (
          <label
            key={String(option.value)}
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
                "astw:data-[checked]:bg-primary astw:data-[checked]:border-primary astw:data-[checked]:text-primary-foreground",
              )}
            >
              <Checkbox.Indicator className="astw:flex astw:data-[unchecked]:hidden">
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

  const handleCommit = useCallback(() => {
    if (localValue.trim() === "") {
      control.removeFilter(config.field);
    } else {
      control.addFilter(config.field, localOp, localValue);
    }
    onClose();
  }, [localValue, localOp, control, config.field, onClose]);

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
  const [localOp, setLocalOp] = useState<NumericDateOperator>(
    NUMERIC_DATE_OPERATORS.includes(filter.operator as NumericDateOperator)
      ? (filter.operator as NumericDateOperator)
      : "eq",
  );
  const [localValue, setLocalValue] = useState(String(filter.value ?? ""));

  const handleCommit = useCallback(() => {
    const num = Number(localValue);
    if (localValue.trim() === "" || Number.isNaN(num)) {
      control.removeFilter(config.field);
    } else {
      control.addFilter(config.field, localOp, num);
    }
    onClose();
  }, [localValue, localOp, control, config.field, onClose]);

  return (
    <div
      data-slot="data-table-filter-number"
      className="astw:flex astw:flex-col astw:gap-2 astw:p-2"
    >
      <Select
        items={[...NUMERIC_DATE_OPERATORS]}
        value={localOp}
        onValueChange={(v) => {
          if (v) setLocalOp(v);
        }}
        mapItem={(op) => ({ value: op, label: t(`filterOperator_${op}`) })}
        className="astw:h-8 astw:text-sm"
      />
      <Input
        type="number"
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
// Date filter — operator selector + date input
// =============================================================================

function DateFilterEditor({
  config,
  filter,
  control,
  onClose,
}: {
  config: Extract<FilterConfig, { type: "date" }>;
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
}) {
  const t = useDataTableT();
  const [localOp, setLocalOp] = useState<NumericDateOperator>(
    NUMERIC_DATE_OPERATORS.includes(filter.operator as NumericDateOperator)
      ? (filter.operator as NumericDateOperator)
      : "eq",
  );
  const [localValue, setLocalValue] = useState(String(filter.value ?? ""));

  const handleCommit = useCallback(() => {
    if (localValue.trim() === "") {
      control.removeFilter(config.field);
    } else {
      control.addFilter(config.field, localOp, localValue);
    }
    onClose();
  }, [localValue, localOp, control, config.field, onClose]);

  return (
    <div data-slot="data-table-filter-date" className="astw:flex astw:flex-col astw:gap-2 astw:p-2">
      <Select
        items={[...NUMERIC_DATE_OPERATORS]}
        value={localOp}
        onValueChange={(v) => {
          if (v) setLocalOp(v);
        }}
        mapItem={(op) => ({ value: op, label: t(`filterOperator_${op}`) })}
        className="astw:h-8 astw:text-sm"
      />
      <Input
        type="date"
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
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
// Helpers
// =============================================================================

function getAddFilterOperators(type: FilterConfig["type"]): FilterOperator[] {
  switch (type) {
    case "string":
      return [...STRING_OPERATORS];
    case "number":
    case "date":
      return [...NUMERIC_DATE_OPERATORS];
    case "enum":
    case "boolean":
      return ["in"];
    case "uuid":
      return ["eq"];
  }
}

function getInitialAddFilterDraftValue(type: FilterConfig["type"]): AddFilterDraftValue {
  if (type === "enum" || type === "boolean") return [];
  return "";
}

function isAddFilterDraftValueValid(
  type: FilterConfig["type"],
  value: AddFilterDraftValue,
): boolean {
  if (type === "enum" || type === "boolean") {
    return Array.isArray(value) && value.length > 0;
  }

  if (typeof value !== "string") return false;
  if (type === "number") {
    if (value.trim() === "") return false;
    return !Number.isNaN(Number(value));
  }
  return value.trim() !== "";
}

function toAddFilterSubmittedValue(
  type: FilterConfig["type"],
  value: AddFilterDraftValue,
): unknown {
  if (type === "enum") {
    return Array.isArray(value) ? (value as string[]) : [];
  }
  if (type === "boolean") {
    return Array.isArray(value) ? (value as boolean[]) : [];
  }
  if (type === "number") {
    return Number(value);
  }
  return String(value).trim();
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

  if (config.type === "boolean" && Array.isArray(filter.value)) {
    const labels = (filter.value as boolean[]).map((v) =>
      v ? t("filterBooleanTrue") : t("filterBooleanFalse"),
    );
    return labels.join(", ");
  }

  if (config.type === "number" && filter.operator === "between") {
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

  if (config.type === "enum" || config.type === "boolean") {
    return t("filterChipLabelEnum", {
      column: columnLabel,
      operator: operatorLabel,
      value: valueLabel,
    });
  }

  return t("filterChipLabel", {
    column: columnLabel,
    operator: operatorLabel,
    value: valueLabel,
  });
}

export { DataTableToolbar, DataTableFilters };
