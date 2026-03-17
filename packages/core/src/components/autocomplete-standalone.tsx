import * as React from "react";
import {
  AutocompleteRoot,
  AutocompleteInputGroup,
  AutocompleteInput,
  AutocompleteTrigger,
  AutocompleteContent,
  AutocompleteList,
  AutocompleteItem,
  AutocompleteEmpty,
  AutocompleteClear,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteCollection,
  AutocompleteParts,
  useAsync,
} from "./autocomplete";
import type { AsyncFetcher } from "@/hooks/use-async-items";
import type { MappedItem } from "./select-standalone";

const defaultMapItem = (item: unknown): MappedItem => ({ label: String(item) });

// --- Types ---

interface AutocompleteItemGroup<T> {
  label: string;
  items: T[];
}

type ExtractItem<I> = I extends AutocompleteItemGroup<infer T> ? T : I;

function isGroupedItems<I>(items: I[]): items is (I & AutocompleteItemGroup<unknown>)[] {
  return (
    items.length > 0 &&
    typeof items[0] === "object" &&
    items[0] !== null &&
    "label" in items[0] &&
    "items" in items[0]
  );
}

interface AutocompleteStandaloneProps<I> {
  /** Items to show as suggestions */
  items: I[];
  /** Placeholder text for the input */
  placeholder?: string;
  /** Text shown when no items match. @default "No suggestions." */
  emptyText?: string;
  /** Map each item to its label, key, and optional custom render. */
  mapItem?: (item: ExtractItem<I>) => MappedItem;
  /** Additional className for the root container */
  className?: string;
  /** Current value (controlled) */
  value?: string;
  /** Default value (uncontrolled) */
  defaultValue?: string;
  /** Called when the value changes */
  onValueChange?: (value: string) => void;
}

function AutocompleteStandalone<I>(props: AutocompleteStandaloneProps<I>) {
  type T = ExtractItem<I>;

  const {
    items,
    placeholder,
    emptyText = "No suggestions.",
    mapItem: mapItemProp,
    className,
    value,
    defaultValue,
    onValueChange,
  } = props;

  const mapItem = (mapItemProp ?? defaultMapItem) as (item: T) => MappedItem;

  const listChildren = isGroupedItems(items)
    ? (group: any) => {
        const g = group as AutocompleteItemGroup<T>;
        return (
          <AutocompleteGroup key={g.label} items={g.items}>
            <AutocompleteGroupLabel>{g.label}</AutocompleteGroupLabel>
            <AutocompleteCollection>
              {(item: any) => {
                const mapped = mapItem(item as T);
                return (
                  <AutocompleteItem key={mapped.key ?? mapped.label} value={mapped.label}>
                    {mapped.render ?? mapped.label}
                  </AutocompleteItem>
                );
              }}
            </AutocompleteCollection>
          </AutocompleteGroup>
        );
      }
    : (item: any) => {
        const mapped = mapItem(item as T);
        return (
          <AutocompleteItem key={mapped.key ?? mapped.label} value={mapped.label}>
            {mapped.render ?? mapped.label}
          </AutocompleteItem>
        );
      };

  return (
    <div className={className}>
      <AutocompleteRoot
        items={items as any}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
      >
        <AutocompleteInputGroup>
          <AutocompleteInput placeholder={placeholder} />
          <AutocompleteClear />
          <AutocompleteTrigger />
        </AutocompleteInputGroup>
        <AutocompleteContent>
          <AutocompleteEmpty>{emptyText}</AutocompleteEmpty>
          <AutocompleteList>{listChildren}</AutocompleteList>
        </AutocompleteContent>
      </AutocompleteRoot>
    </div>
  );
}

// --- Autocomplete.Async ---

interface AutocompleteAsyncStandaloneProps<T> {
  /** Fetcher for async item loading. Pass a function for default debounce, or `{ fn, debounceMs }` to customize. */
  fetcher: AsyncFetcher<T>;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Text shown when no items match. @default "No results." */
  emptyText?: string;
  /** Text shown while loading. @default "Loading..." */
  loadingText?: string;
  /** Map each item to its label, key, and optional custom render. */
  mapItem?: (item: T) => MappedItem;
  /** Additional className for the root container */
  className?: string;
  /** Called when the value changes */
  onValueChange?: (value: string) => void;
}

function AutocompleteAsyncStandalone<T>(props: AutocompleteAsyncStandaloneProps<T>) {
  const {
    fetcher,
    placeholder,
    emptyText = "No results.",
    loadingText = "Loading...",
    mapItem: mapItemProp,
    className,
    onValueChange: onValueChangeProp,
  } = props;

  const async = useAsync({ fetcher });
  const mapItem = (mapItemProp ?? defaultMapItem) as (item: T) => MappedItem;

  const handleValueChange = React.useCallback(
    (value: string) => {
      async.onValueChange(value);
      onValueChangeProp?.(value);
    },
    [async, onValueChangeProp],
  );

  return (
    <div className={className}>
      <AutocompleteRoot
        items={async.items}
        value={async.value}
        onValueChange={handleValueChange}
        filter={null}
      >
        <AutocompleteInputGroup>
          <AutocompleteInput placeholder={placeholder} />
          <AutocompleteClear />
          <AutocompleteTrigger />
        </AutocompleteInputGroup>
        <AutocompleteContent>
          <AutocompleteEmpty>{async.loading ? loadingText : emptyText}</AutocompleteEmpty>
          <AutocompleteList>
            {(item: T) => {
              const mapped = mapItem(item);
              return (
                <AutocompleteItem key={mapped.key ?? mapped.label} value={mapped.label}>
                  {mapped.render ?? mapped.label}
                </AutocompleteItem>
              );
            }}
          </AutocompleteList>
        </AutocompleteContent>
      </AutocompleteRoot>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

const Autocomplete = Object.assign(AutocompleteStandalone, {
  Async: AutocompleteAsyncStandalone,
  Parts: AutocompleteParts,
});

export { Autocomplete };
