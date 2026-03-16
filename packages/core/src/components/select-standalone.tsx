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

const defaultGetLabel = String;

// --- Types ---

interface SelectItemGroup<T> {
  label: string;
  items: T[];
}

type ExtractItem<I> = I extends SelectItemGroup<infer T> ? T : I;

interface SelectStandalonePropsBase<I> {
  placeholder?: string;
  getLabel?: (item: ExtractItem<I>) => string;
  getKey?: (item: ExtractItem<I>) => string;
  renderItem?: (item: ExtractItem<I>) => React.ReactNode;
  className?: string;
  disabled?: boolean;
  renderValue?: (
    value: ExtractItem<I> | ExtractItem<I>[] | null,
  ) => React.ReactNode;
}

interface SelectStandalonePropsSingle<I> extends SelectStandalonePropsBase<I> {
  multiple?: false | undefined;
  value?: ExtractItem<I> | null;
  defaultValue?: ExtractItem<I> | null;
  onValueChange?: (value: ExtractItem<I> | null) => void;
}

interface SelectStandalonePropsMultiple<
  I,
> extends SelectStandalonePropsBase<I> {
  multiple: true;
  value?: ExtractItem<I>[];
  defaultValue?: ExtractItem<I>[];
  onValueChange?: (value: ExtractItem<I>[]) => void;
}

type SelectStandaloneProps<I> =
  | ({ items: I[] } & SelectStandalonePropsSingle<I>)
  | ({ items: I[] } & SelectStandalonePropsMultiple<I>);

// --- Helpers ---

function isGroupedItems<I>(
  items: I[],
): items is (I & SelectItemGroup<unknown>)[] {
  return (
    items.length > 0 &&
    typeof items[0] === "object" &&
    items[0] !== null &&
    "label" in items[0] &&
    "items" in items[0]
  );
}

function renderFlatItems<T>(
  items: T[],
  getKey: (item: T) => string,
  getLabel: (item: T) => string,
  renderItem?: (item: T) => React.ReactNode,
) {
  return items.map((item) => (
    <SelectItem key={getKey(item)} value={item}>
      {renderItem ? renderItem(item) : getLabel(item)}
    </SelectItem>
  ));
}

// --- Component ---

function SelectStandalone<I>(props: SelectStandaloneProps<I>) {
  type T = ExtractItem<I>;

  const {
    items,
    placeholder,
    getLabel: getLabelProp,
    getKey: getKeyProp,
    renderItem,
    renderValue,
    className,
    disabled,
    ...rest
  } = props;

  const getLabel = (getLabelProp ?? defaultGetLabel) as (item: T) => string;
  const getKey = (getKeyProp ?? getLabel) as (item: T) => string;

  const content = isGroupedItems(items)
    ? (items as SelectItemGroup<T>[]).map((group) => (
        <SelectGroup key={group.label}>
          <SelectGroupLabel>{group.label}</SelectGroupLabel>
          {renderFlatItems(
            group.items,
            getKey,
            getLabel,
            renderItem as ((item: T) => React.ReactNode) | undefined,
          )}
        </SelectGroup>
      ))
    : renderFlatItems(
        items as T[],
        getKey,
        getLabel,
        renderItem as ((item: T) => React.ReactNode) | undefined,
      );

  if (rest.multiple) {
    const { value, defaultValue, onValueChange } =
      rest as SelectStandalonePropsMultiple<I>;

    return (
      <div className={className}>
        <SelectRoot<T, true>
          multiple
          value={value as T[] | undefined}
          defaultValue={defaultValue as T[] | undefined}
          onValueChange={
            onValueChange &&
            ((v: T[]) => (onValueChange as (v: T[]) => void)(v))
          }
          itemToStringLabel={getLabel}
          disabled={disabled}
        >
          <SelectTrigger>
            {renderValue ? (
              <SelectValue placeholder={placeholder}>
                {(selected: T[]) =>
                  (renderValue as (v: T[]) => React.ReactNode)(selected)
                }
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

  const { value, defaultValue, onValueChange } =
    rest as SelectStandalonePropsSingle<I>;

  return (
    <div className={className}>
      <SelectRoot<T>
        value={value as T | null | undefined}
        defaultValue={defaultValue as T | null | undefined}
        onValueChange={
          onValueChange &&
          ((v: T | null) => (onValueChange as (v: T | null) => void)(v))
        }
        itemToStringLabel={getLabel}
        disabled={disabled}
      >
        <SelectTrigger>
          {renderValue ? (
            <SelectValue placeholder={placeholder}>
              {(selected: T) =>
                (renderValue as (v: T) => React.ReactNode)(selected)
              }
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
