import * as React from "react";
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectGroupLabel,
  SelectParts,
} from "./select";
import { defaultMapItem, isGroupedItems } from "./dropdown-items";
import type { MappedItem, ItemGroup, ExtractItem } from "./dropdown-items";

// --- Types ---

interface SelectStandalonePropsBase<I> {
  /** Placeholder text shown when no value is selected */
  placeholder?: string;
  /** Map each item to its label, key, and optional custom render. */
  mapItem?: (item: ExtractItem<I>) => MappedItem;
  /** Additional className for the root container */
  className?: string;
  /** Whether the select is disabled */
  disabled?: boolean;
}

interface SelectStandalonePropsSingle<I> extends SelectStandalonePropsBase<I> {
  multiple?: false | undefined;
  /** Current value (controlled) */
  value?: ExtractItem<I> | null;
  /** Default value (uncontrolled) */
  defaultValue?: ExtractItem<I> | null;
  /** Called when the selected value changes */
  onValueChange?: (value: ExtractItem<I> | null) => void;
  /** Custom render function for the selected value display */
  renderValue?: (value: ExtractItem<I> | null) => React.ReactNode;
}

interface SelectStandalonePropsMultiple<I> extends SelectStandalonePropsBase<I> {
  multiple: true;
  /** Current value (controlled) */
  value?: ExtractItem<I>[];
  /** Default value (uncontrolled) */
  defaultValue?: ExtractItem<I>[];
  /** Called when the selected values change */
  onValueChange?: (value: ExtractItem<I>[]) => void;
  /** Custom render function for the selected values display */
  renderValue?: (value: ExtractItem<I>[]) => React.ReactNode;
}

type SelectStandaloneProps<I> =
  | ({ items: I[] } & SelectStandalonePropsSingle<I>)
  | ({ items: I[] } & SelectStandalonePropsMultiple<I>);

// --- Helpers ---

function renderFlatItems<T>(items: T[], mapItem: (item: T) => MappedItem) {
  return items.map((item) => {
    const mapped = mapItem(item);
    return (
      <SelectItem key={mapped.key ?? mapped.label} value={item}>
        {mapped.render ?? mapped.label}
      </SelectItem>
    );
  });
}

// --- Component ---

function SelectStandalone<I>(props: SelectStandaloneProps<I>) {
  type T = ExtractItem<I>;

  const { items, placeholder, mapItem: mapItemProp, className, disabled, ...rest } = props;

  const mapItem = (mapItemProp ?? defaultMapItem) as (item: T) => MappedItem;
  const getLabel = (item: T) => mapItem(item).label;

  const content = isGroupedItems(items)
    ? (items as ItemGroup<T>[]).map((group) => (
        <SelectGroup key={group.label}>
          <SelectGroupLabel>{group.label}</SelectGroupLabel>
          {renderFlatItems(group.items, mapItem)}
        </SelectGroup>
      ))
    : renderFlatItems(items as T[], mapItem);

  if (rest.multiple) {
    const { value, defaultValue, onValueChange, renderValue } =
      rest as SelectStandalonePropsMultiple<I>;

    return (
      <div className={className}>
        <SelectRoot<T, true>
          multiple
          value={value as T[] | undefined}
          defaultValue={defaultValue as T[] | undefined}
          onValueChange={onValueChange && ((v: T[]) => (onValueChange as (v: T[]) => void)(v))}
          itemToStringLabel={getLabel}
          disabled={disabled}
        >
          <SelectTrigger>
            {renderValue ? (
              <SelectValue placeholder={placeholder}>
                {(selected: T[]) => (renderValue as (v: T[]) => React.ReactNode)(selected)}
              </SelectValue>
            ) : (
              <SelectValue placeholder={placeholder} />
            )}
          </SelectTrigger>
          <SelectContent>{content}</SelectContent>
        </SelectRoot>
      </div>
    );
  }

  const { value, defaultValue, onValueChange, renderValue } =
    rest as SelectStandalonePropsSingle<I>;

  return (
    <div className={className}>
      <SelectRoot<T>
        value={value as T | null | undefined}
        defaultValue={defaultValue as T | null | undefined}
        onValueChange={
          onValueChange && ((v: T | null) => (onValueChange as (v: T | null) => void)(v))
        }
        itemToStringLabel={getLabel}
        disabled={disabled}
      >
        <SelectTrigger>
          {renderValue ? (
            <SelectValue placeholder={placeholder}>
              {(selected: T) => (renderValue as (v: T) => React.ReactNode)(selected)}
            </SelectValue>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>{content}</SelectContent>
      </SelectRoot>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

const Select = Object.assign(SelectStandalone, {
  Parts: SelectParts,
});

export { Select };
