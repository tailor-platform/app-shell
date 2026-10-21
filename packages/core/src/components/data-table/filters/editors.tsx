import { parseDate } from "@internationalized/date";
import { DatePicker } from "@/components/date-field";
import { useTimeZone } from "@/contexts/appshell-context";
import {
  localDateTimeParts,
  normalizeTemporalFilterValue,
  isTemporalFilterValueValid,
} from "@/lib/temporal-filter-values";
import { Input } from "@/components/input";
import type { Column, DataTableFilterConfig } from "../types";
import type { Filter, CollectionControl } from "@/types/collection";
import { useMemo, useCallback, useState } from "react";
import { useDataTableT } from "../i18n";
import { Select } from "@/components/select";
import { Button } from "@/components/button";
import { isComposing } from "@/lib/is-composing";
import { Checkbox } from "@/components/checkbox";
import {
  isDecimalFilterValueValid,
  isAddFilterDraftValueValid,
  isRangeOrdered,
  toAddFilterSubmittedValue,
  betweenOrderError,
} from "./values";
import type { ReactNode } from "react";
import { Text } from "../../text";
import { EnumOptionList, BetweenInputGroup, getTemporalInputProps } from "./inputs";
import {
  getVisibleFilterOperators,
  BOOLEAN_OPERATORS,
  getOperatorLabel,
  STRING_OPERATORS,
  DEFAULT_OPERATOR,
  resolveTemporalOperator,
  temporalOperatorsFor,
} from "./operators";
import type { BooleanOperator, StringOperator, NumericTemporalOperator } from "./operators";
import type { AddFilterDraftValue } from "./values";

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
 * native time box, bridging an RFC 3339 instant. Entering a full datetime by hand
 * is awkward, so the date and time are picked separately and combined. This is a
 * stopgap — it's replaced 1:1 once a dedicated DateTime picker component lands.
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
  const shellTz = useTimeZone();
  const { date: datePart, time: timePart } = localDateTimeParts(value, shellTz.value);
  const calValue = datePart ? parseDate(datePart) : null;

  // Emit an RFC 3339 instant only once a date is chosen; time defaults to midnight.
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
        className="astw:h-8 astw:w-28 astw:shrink-0 astw:text-body-md"
      />
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
  column: Column<Record<string, unknown>> & { filter: DataTableFilterConfig };
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
    case "decimal":
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
// Enum filter — checkbox list (matching the screenshot)
// =============================================================================

function EnumFilterEditor({
  config,
  filter,
  control,
}: {
  config: Extract<DataTableFilterConfig, { type: "enum" }>;
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

function BooleanFilterEditor({
  config,
  filter,
  control,
  onClose,
  hideOperator = false,
}: {
  config: Extract<DataTableFilterConfig, { type: "boolean" }>;
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
  hideOperator?: boolean;
}) {
  const t = useDataTableT();
  const operatorItems = getVisibleFilterOperators(config, filter.operator).filter(
    (operator): operator is BooleanOperator =>
      BOOLEAN_OPERATORS.includes(operator as BooleanOperator),
  );
  const [localOp, setLocalOp] = useState<BooleanOperator>(
    operatorItems.includes(filter.operator as BooleanOperator)
      ? (filter.operator as BooleanOperator)
      : (operatorItems[0] ?? "eq"),
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
          items={[...operatorItems]}
          value={localOp}
          onValueChange={(v) => {
            if (v) setLocalOp(v as BooleanOperator);
          }}
          mapItem={(op) => ({ value: op, label: getOperatorLabel(op, t) })}
          className="astw:h-8 astw:text-body-md"
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
        className="astw:h-8 astw:text-body-md"
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
  config: Extract<DataTableFilterConfig, { type: "string" }>;
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
  hideOperator?: boolean;
}) {
  const t = useDataTableT();
  const operatorItems = getVisibleFilterOperators(config, filter.operator).filter(
    (operator): operator is StringOperator => STRING_OPERATORS.includes(operator as StringOperator),
  );
  const [localOp, setLocalOp] = useState<StringOperator>(
    operatorItems.includes(filter.operator as StringOperator)
      ? (filter.operator as StringOperator)
      : (DEFAULT_OPERATOR.string as StringOperator),
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
          items={[...operatorItems]}
          value={localOp}
          onValueChange={(v) => {
            if (v) setLocalOp(v as StringOperator);
          }}
          mapItem={(op) => ({ value: op, label: t(`filterOperator_${op}`) })}
          className="astw:h-8 astw:text-body-md"
        />
      )}
      <Input
        value={localValue}
        placeholder={t("filterValuePlaceholder", { field: config.field })}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" && !isComposing(e.nativeEvent)) handleCommit();
        }}
        className="astw:h-8 astw:text-body-md"
      />
      <Checkbox
        label={t("filterCaseSensitive")}
        checked={localCaseSensitive}
        onCheckedChange={setLocalCaseSensitive}
        className="astw:gap-1.5"
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
  config: Extract<DataTableFilterConfig, { type: "uuid" }>;
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
          if (e.key === "Enter" && !isComposing(e.nativeEvent)) handleCommit();
        }}
        className="astw:h-8 astw:text-body-md"
      />
      <Button size="xs" onClick={handleCommit} className="astw:self-end">
        {t("applyFilter")}
      </Button>
    </div>
  );
}

// =============================================================================
// Numeric filter — operator selector + number/decimal input
// =============================================================================

function NumericFilterEditor({
  config,
  filter,
  control,
  onClose,
  hideOperator = false,
}: {
  config: Extract<DataTableFilterConfig, { type: "number" | "decimal" }>;
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
  hideOperator?: boolean;
}) {
  const t = useDataTableT();
  const { items: operatorItems, initial: initialOp } = resolveTemporalOperator(
    getVisibleFilterOperators(config, filter.operator).filter(
      (operator): operator is NumericTemporalOperator =>
        temporalOperatorsFor(config.type).includes(operator as NumericTemporalOperator),
    ),
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
        isAddFilterDraftValueValid(config.type, "between", [localValue, localValueMax]) &&
        isRangeOrdered(config.type, localValue, localValueMax)
      );
    }
    return localValue.trim() === "" || isAddFilterDraftValueValid(config.type, localOp, localValue);
  })();

  const handleCommit = useCallback(() => {
    if (localOp === "between") {
      const minEmpty = localValue.trim() === "";
      const maxEmpty = localValueMax.trim() === "";
      if (minEmpty && maxEmpty) {
        control.removeFilter(config.field);
      } else if (!minEmpty && !maxEmpty) {
        const draft: AddFilterDraftValue = [localValue, localValueMax];
        if (
          isAddFilterDraftValueValid(config.type, localOp, draft) &&
          isRangeOrdered(config.type, localValue, localValueMax)
        ) {
          control.addFilter(
            config.field,
            localOp,
            toAddFilterSubmittedValue(config.type, localOp, draft),
          );
        } else {
          return;
        }
      } else {
        return;
      }
    } else if (config.type === "decimal") {
      if (localValue.trim() === "") {
        control.removeFilter(config.field);
      } else if (isDecimalFilterValueValid(localValue)) {
        control.addFilter(config.field, localOp, localValue.trim());
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
  }, [localValue, localValueMax, localOp, control, config.field, config.type, onClose]);

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
          className="astw:h-8 astw:text-body-md"
        />
      )}
      {localOp === "between" ? (
        <BetweenInputGroup
          labels={[t("filterBetweenMin"), t("filterBetweenMax")]}
          values={[localValue, localValueMax]}
          onChangeMin={setLocalValue}
          onChangeMax={setLocalValueMax}
          onSubmit={handleCommit}
          inputProps={
            config.type === "decimal" ? { type: "text", inputMode: "decimal" } : { type: "number" }
          }
          error={betweenOrderError(
            config.type,
            localValue,
            localValueMax,
            t("filterBetweenMin"),
            t("filterBetweenMax"),
            t,
          )}
        />
      ) : (
        <Input
          type={config.type === "decimal" ? "text" : "number"}
          inputMode={config.type === "decimal" ? "decimal" : undefined}
          value={localValue}
          placeholder={t("filterValuePlaceholder", { field: config.field })}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && !isComposing(e.nativeEvent)) handleCommit();
          }}
          className="astw:h-8 astw:text-body-md"
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
  config: Extract<DataTableFilterConfig, { type: "datetime" | "date" | "time" }>;
  /** The column's visible label — used for the date picker's accessible name. */
  label: string;
  filter: Filter;
  control: CollectionControl;
  onClose: () => void;
  hideOperator?: boolean;
}) {
  const t = useDataTableT();
  const shellTz = useTimeZone();
  const { items: operatorItems, initial: initialOp } = resolveTemporalOperator(
    getVisibleFilterOperators(config, filter.operator).filter(
      (operator): operator is NumericTemporalOperator =>
        temporalOperatorsFor(config.type).includes(operator as NumericTemporalOperator),
    ),
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
        isTemporalFilterValueValid(config.type, localValue, shellTz.value) &&
        isTemporalFilterValueValid(config.type, localValueMax, shellTz.value) &&
        isRangeOrdered(config.type, localValue, localValueMax)
      );
    }
    return (
      localValue.trim() === "" || isTemporalFilterValueValid(config.type, localValue, shellTz.value)
    );
  })();

  const handleCommit = useCallback(() => {
    if (localOp === "between") {
      const minEmpty = localValue.trim() === "";
      const maxEmpty = localValueMax.trim() === "";
      if (minEmpty && maxEmpty) {
        control.removeFilter(config.field);
      } else if (!minEmpty && !maxEmpty) {
        const minValid = isTemporalFilterValueValid(config.type, localValue, shellTz.value);
        const maxValid = isTemporalFilterValueValid(config.type, localValueMax, shellTz.value);
        if (!minValid || !maxValid) return;
        if (!isRangeOrdered(config.type, localValue, localValueMax)) return;
        if (config.type === "datetime") {
          const min = normalizeTemporalFilterValue("datetime", localValue, shellTz.value);
          const max = normalizeTemporalFilterValue("datetime", localValueMax, shellTz.value);
          if (!min || !max) return;
          control.addFilter(config.field, localOp, { min, max });
          onClose();
          return;
        }
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
      } else if (isTemporalFilterValueValid(config.type, localValue, shellTz.value)) {
        if (config.type === "datetime") {
          const value = normalizeTemporalFilterValue("datetime", localValue, shellTz.value);
          if (!value) return;
          control.addFilter(config.field, localOp, value);
          onClose();
          return;
        }
        control.addFilter(config.field, localOp, localValue);
      } else {
        return;
      }
    }
    onClose();
  }, [
    localValue,
    localValueMax,
    localOp,
    control,
    config.field,
    config.type,
    onClose,
    shellTz.value,
  ]);

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
          {betweenError && (
            <Text variant="body-sm" className="astw:text-danger-text">
              {betweenError}
            </Text>
          )}
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
            if (e.key === "Enter" && !isComposing(e.nativeEvent)) {
              handleCommit();
            }
          }}
          className="astw:h-8 astw:text-body-md"
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
          className="astw:h-8 astw:text-body-md"
        />
      )}
      {valueInput}
      <Button size="xs" onClick={handleCommit} disabled={!canCommit} className="astw:self-end">
        {t("applyFilter")}
      </Button>
    </div>
  );
}

export { FilterPopoverContent };
