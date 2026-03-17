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
import { defaultMapItem, isGroupedItems } from "./dropdown-items";
import type { MappedItem, ItemGroup, ExtractItem } from "./dropdown-items";
import type { AsyncFetcher } from "@/hooks/use-async-items";

/** Fetcher type for `Autocomplete.Async`. */
export type AutocompleteAsyncFetcher<T> = AsyncFetcher<T>;

// --- Shared types (used by both Autocomplete and Autocomplete.Async) ---

/**
 * Common props shared between Autocomplete and Autocomplete.Async.
 *
 * Unlike Select and Combobox, Autocomplete always operates in single-value
 * mode — its value is the raw input string, not a discrete item selection.
 */
interface AutocompletePropsBase<T> {
  /** Placeholder text for the input */
  placeholder?: string;
  /** Text shown when no items match */
  emptyText?: string;
  /** Map each item to its label, key, and optional custom render. */
  mapItem?: (item: T) => MappedItem;
  /** Additional className for the root container */
  className?: string;
  /** Whether the autocomplete is disabled */
  disabled?: boolean;
  /** Current value (controlled) */
  value?: string;
  /** Default value (uncontrolled) */
  defaultValue?: string;
  /** Called when the value changes */
  onValueChange?: (value: string) => void;
}

// --- Autocomplete (static) ---

interface AutocompleteStandaloneProps<I> extends AutocompletePropsBase<ExtractItem<I>> {
  /** Items to show as suggestions */
  items: I[];
}

function AutocompleteStandalone<I>(props: AutocompleteStandaloneProps<I>) {
  type T = ExtractItem<I>;

  const {
    items,
    placeholder,
    emptyText = "No suggestions.",
    mapItem: mapItemProp,
    className,
    disabled,
    value,
    defaultValue,
    onValueChange,
  } = props;

  const mapItem = (mapItemProp ?? defaultMapItem) as (item: T) => MappedItem;

  const listChildren = isGroupedItems(items)
    ? (group: any) => {
        const g = group as ItemGroup<T>;
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
        disabled={disabled}
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

interface AutocompleteAsyncStandaloneProps<T> extends AutocompletePropsBase<T> {
  /** Fetcher for async item loading. Pass a function for default debounce, or `{ fn, debounceMs }` to customize. */
  fetcher: AutocompleteAsyncFetcher<T>;
  /** Text shown while loading. @default "Loading..." */
  loadingText?: string;
}

function AutocompleteAsyncStandalone<T>(props: AutocompleteAsyncStandaloneProps<T>) {
  const {
    fetcher,
    placeholder,
    emptyText = "No results.",
    loadingText = "Loading...",
    mapItem: mapItemProp,
    className,
    disabled,
    value: controlledValue,
    defaultValue,
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
        // Use strict undefined check so that value="" is treated as controlled
        value={controlledValue !== undefined ? controlledValue : async.value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        filter={null}
        disabled={disabled}
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
