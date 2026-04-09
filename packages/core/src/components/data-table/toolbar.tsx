import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Popover } from "@base-ui/react/popover";
import { Checkbox } from "@base-ui/react/checkbox";
import { ChevronDown, Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCollectionControl } from "@/contexts/collection-control-context";
import { Button } from "@/components/button";
import { Menu } from "@/components/menu";
import { Input } from "@/components/input";
import { Select } from "@/components/select-standalone";
import { useDataTableContext } from "./data-table-context";
import { useDataTableT } from "./i18n";
import type { Column, FilterConfig, Filter, FilterOperator } from "./types";

// =============================================================================
// DataTable.Toolbar
// =============================================================================

function DataTableToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="data-table-toolbar"
      className={cn(
        "astw:flex astw:flex-col astw:gap-2 astw:border-b astw:px-4 astw:py-3",
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
  boolean: "in",
  string: "contains",
  number: "eq",
  date: "eq",
  uuid: "eq",
};

/** Number/date operators available in the operator selector. */
const NUMERIC_DATE_OPERATORS = ["eq", "ne", "gt", "gte", "lt", "lte"] as const;
type NumericDateOperator = (typeof NUMERIC_DATE_OPERATORS)[number];

/** String operators available in the operator selector. */
const STRING_OPERATORS = [
  "eq",
  "ne",
  "contains",
  "notContains",
  "hasPrefix",
  "hasSuffix",
] as const;
type StringOperator = (typeof STRING_OPERATORS)[number];

function DataTableFilters({ className }: { className?: string }) {
  const ctx = useDataTableContext();
  const control = useCollectionControl();
  const t = useDataTableT();

  // Collect all columns that have a filter config
  const filterableColumns = useMemo(
    () =>
      ctx.columns.filter(
        (
          col,
        ): col is Column<Record<string, unknown>> & { filter: FilterConfig } =>
          !!col.filter,
      ),
    [ctx.columns],
  );

  // Fields that currently have an active filter
  const activeFields = useMemo(
    () => new Set(control.filters.map((f) => f.field)),
    [control.filters],
  );

  // Fields available for the "Add filter" menu
  const availableColumns = useMemo(
    () =>
      filterableColumns.filter((col) => !activeFields.has(col.filter.field)),
    [filterableColumns, activeFields],
  );

  // Track which field's popover was just added (auto-open)
  const [justAddedField, setJustAddedField] = useState<string | null>(null);

  const handleAddFilter = useCallback(
    (col: Column<Record<string, unknown>> & { filter: FilterConfig }) => {
      const config = col.filter;
      const op = DEFAULT_OPERATOR[config.type];
      // For enum/boolean, add with empty array — the user will select values via popover
      const initialValue =
        config.type === "enum" || config.type === "boolean" ? [] : "";
      control.addFilter(config.field, op, initialValue);
      setJustAddedField(config.field);
    },
    [control],
  );

  if (filterableColumns.length === 0) return null;

  return (
    <div
      data-slot="data-table-filters"
      className={cn(
        "astw:flex astw:flex-wrap astw:items-center astw:gap-2",
        className,
      )}
    >
      {/* Active filter chips */}
      {filterableColumns.map((col) => {
        const active = control.filters.find(
          (f) => f.field === col.filter.field,
        );
        if (!active) return null;
        return (
          <FilterChip
            key={col.filter.field}
            column={col}
            filter={active}
            control={control}
            autoOpen={justAddedField === col.filter.field}
            onAutoOpened={() => setJustAddedField(null)}
          />
        );
      })}

      {/* Add filter button */}
      {availableColumns.length > 0 && (
        <Menu.Root>
          <Menu.Trigger
            render={
              <Button variant="outline" size="xs">
                <Plus className="astw:size-3" />
                {t("addFilter")}
              </Button>
            }
          />
          <Menu.Content>
            {availableColumns.map((col) => (
              <Menu.Item
                key={col.filter.field}
                onClick={() => handleAddFilter(col)}
              >
                {col.label ?? col.filter.field}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Root>
      )}
    </div>
  );
}
DataTableFilters.displayName = "DataTable.Filters";

// =============================================================================
// FilterChip — per-filter popover-based editor
// =============================================================================

function FilterChip({
  column,
  filter,
  control,
  autoOpen,
  onAutoOpened,
}: {
  column: Column<Record<string, unknown>> & { filter: FilterConfig };
  filter: Filter;
  control: ReturnType<typeof useCollectionControl>;
  autoOpen: boolean;
  onAutoOpened: () => void;
}) {
  const t = useDataTableT();
  const config = column.filter;
  const label = column.label ?? config.field;

  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    if (autoOpen) {
      onAutoOpened();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run only on mount

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      // Remove filter when popover closes with an empty value
      if (!isOpen && isFilterValueEmpty(filter)) {
        control.removeFilter(config.field);
      }
    },
    [filter, control, config.field],
  );

  const handleRemove = useCallback(() => {
    control.removeFilter(config.field);
  }, [control, config.field]);

  const chipLabel = getChipDisplayLabel(label, filter, config, t);

  return (
    <div
      data-slot="data-table-filter-chip"
      className="astw:flex astw:items-center astw:gap-0"
    >
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
}: {
  column: Column<Record<string, unknown>> & { filter: FilterConfig };
  filter: Filter;
  control: ReturnType<typeof useCollectionControl>;
}) {
  const config = column.filter;

  switch (config.type) {
    case "enum":
      return (
        <EnumFilterEditor config={config} filter={filter} control={control} />
      );
    case "boolean":
      return (
        <BooleanFilterEditor
          config={config}
          filter={filter}
          control={control}
        />
      );
    case "string":
      return (
        <StringFilterEditor config={config} filter={filter} control={control} />
      );
    case "uuid":
      return (
        <UuidFilterEditor config={config} filter={filter} control={control} />
      );
    case "number":
      return (
        <NumericFilterEditor
          config={config}
          filter={filter}
          control={control}
        />
      );
    case "date":
      return (
        <DateFilterEditor config={config} filter={filter} control={control} />
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
  control: ReturnType<typeof useCollectionControl>;
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
  control: ReturnType<typeof useCollectionControl>;
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
}: {
  config: Extract<FilterConfig, { type: "string" }>;
  filter: Filter;
  control: ReturnType<typeof useCollectionControl>;
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
  }, [localValue, localOp, control, config.field]);

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
        onBlur={handleCommit}
        className="astw:h-8 astw:text-sm"
      />
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
}: {
  config: Extract<FilterConfig, { type: "uuid" }>;
  filter: Filter;
  control: ReturnType<typeof useCollectionControl>;
}) {
  const [localValue, setLocalValue] = useState(String(filter.value ?? ""));

  const handleCommit = useCallback(() => {
    if (localValue.trim() === "") {
      control.removeFilter(config.field);
    } else {
      control.addFilter(config.field, "eq", localValue);
    }
  }, [localValue, control, config.field]);

  return (
    <div data-slot="data-table-filter-uuid" className="astw:p-2">
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCommit();
        }}
        onBlur={handleCommit}
        className="astw:h-8 astw:text-sm"
      />
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
}: {
  config: Extract<FilterConfig, { type: "number" }>;
  filter: Filter;
  control: ReturnType<typeof useCollectionControl>;
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
  }, [localValue, localOp, control, config.field]);

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
        onBlur={handleCommit}
        className="astw:h-8 astw:text-sm"
      />
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
}: {
  config: Extract<FilterConfig, { type: "date" }>;
  filter: Filter;
  control: ReturnType<typeof useCollectionControl>;
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
  }, [localValue, localOp, control, config.field]);

  return (
    <div
      data-slot="data-table-filter-date"
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
        type="date"
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
        }}
        onBlur={handleCommit}
        className="astw:h-8 astw:text-sm"
      />
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function isFilterValueEmpty(filter: Filter): boolean {
  if (Array.isArray(filter.value)) return filter.value.length === 0;
  if (filter.value === "" || filter.value == null) return true;
  return false;
}

function getChipDisplayLabel(
  columnLabel: string,
  filter: Filter,
  config: FilterConfig,
  t: ReturnType<typeof useDataTableT>,
): string {
  if (config.type === "enum" && Array.isArray(filter.value)) {
    const count = (filter.value as string[]).length;
    if (count === 0) return columnLabel;
    return `${columnLabel} (${count})`;
  }
  if (config.type === "boolean" && Array.isArray(filter.value)) {
    const vals = filter.value as boolean[];
    if (vals.length === 0) return columnLabel;
    const labels = vals.map((v) =>
      v ? t("filterBooleanTrue") : t("filterBooleanFalse"),
    );
    return `${columnLabel}: ${labels.join(", ")}`;
  }
  if (filter.value !== "" && filter.value != null) {
    return `${columnLabel}: ${String(filter.value)}`;
  }
  return columnLabel;
}

export { DataTableToolbar, DataTableFilters };
