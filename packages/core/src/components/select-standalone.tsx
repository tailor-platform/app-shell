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

// --- Types ---

/** Shape returned by `mapItem` to describe how an item appears in the dropdown. */
interface MappedItem {
  /** Display text — used for filtering, a11y, and fallback display. */
  label: string;
  /** React key for list reconciliation. Defaults to `label`. */
  key?: string;
  /** Custom JSX to render in the dropdown. Defaults to `label`. */
  render?: React.ReactNode;
}

const defaultMapItem = (item: unknown): MappedItem => ({ label: String(item) });

interface SelectItemGroup<T> {
  label: string;
  items: T[];
}

type ExtractItem<I> = I extends SelectItemGroup<infer T> ? T : I;

interface SelectStandalonePropsBase<I> {
  placeholder?: string;
  /** Map each item to its label, key, and optional custom render. */
  mapItem?: (item: ExtractItem<I>) => MappedItem;
  className?: string;
  disabled?: boolean;
}

interface SelectStandalonePropsSingle<I> extends SelectStandalonePropsBase<I> {
  multiple?: false | undefined;
  value?: ExtractItem<I> | null;
  defaultValue?: ExtractItem<I> | null;
  onValueChange?: (value: ExtractItem<I> | null) => void;
  renderValue?: (value: ExtractItem<I> | null) => React.ReactNode;
}

interface SelectStandalonePropsMultiple<I> extends SelectStandalonePropsBase<I> {
  multiple: true;
  value?: ExtractItem<I>[];
  defaultValue?: ExtractItem<I>[];
  onValueChange?: (value: ExtractItem<I>[]) => void;
  renderValue?: (value: ExtractItem<I>[]) => React.ReactNode;
}

type SelectStandaloneProps<I> =
  | ({ items: I[] } & SelectStandalonePropsSingle<I>)
  | ({ items: I[] } & SelectStandalonePropsMultiple<I>);

// --- Helpers ---

function isGroupedItems<I>(items: I[]): items is (I & SelectItemGroup<unknown>)[] {
  return (
    items.length > 0 &&
    typeof items[0] === "object" &&
    items[0] !== null &&
    "label" in items[0] &&
    "items" in items[0]
  );
}

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
    ? (items as SelectItemGroup<T>[]).map((group) => (
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

export { Select, type MappedItem };
