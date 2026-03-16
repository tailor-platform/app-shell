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

const defaultGetLabel = String;

// --- Types ---

interface AutocompleteItemGroup<T> {
  label: string;
  items: T[];
}

type ExtractItem<I> = I extends AutocompleteItemGroup<infer T> ? T : I;

function isGroupedItems<I>(
  items: I[],
): items is (I & AutocompleteItemGroup<unknown>)[] {
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
  /** Extract display label from an item. Defaults to `String` for string items. */
  getLabel?: (item: ExtractItem<I>) => string;
  /** Extract a unique key for each item. Defaults to `getLabel`. */
  getKey?: (item: ExtractItem<I>) => string;
  /** Custom render function for each item in the dropdown */
  renderItem?: (item: ExtractItem<I>) => React.ReactNode;
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
    getLabel: getLabelProp,
    getKey: getKeyProp,
    renderItem,
    className,
    value,
    defaultValue,
    onValueChange,
  } = props;

  const getLabel = (getLabelProp ?? defaultGetLabel) as (item: T) => string;
  const getKey = (getKeyProp ?? getLabel) as (item: T) => string;

  const listChildren = isGroupedItems(items)
    ? (group: any) => {
        const g = group as AutocompleteItemGroup<T>;
        return (
          <AutocompleteGroup key={g.label} items={g.items}>
            <AutocompleteGroupLabel>{g.label}</AutocompleteGroupLabel>
            <AutocompleteCollection>
              {(item: any) => (
                <AutocompleteItem
                  key={getKey(item as T)}
                  value={getLabel(item as T)}
                >
                  {renderItem ? renderItem(item as T) : getLabel(item as T)}
                </AutocompleteItem>
              )}
            </AutocompleteCollection>
          </AutocompleteGroup>
        );
      }
    : (item: any) => (
        <AutocompleteItem key={getKey(item as T)} value={getLabel(item as T)}>
          {renderItem ? renderItem(item as T) : getLabel(item as T)}
        </AutocompleteItem>
      );

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
  /** Fetch items for the given query string */
  fetcher: (query: string, options: { signal: AbortSignal }) => Promise<T[]>;
  /** Debounce delay in milliseconds. @default 300 */
  debounceMs?: number;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Text shown when no items match. @default "No results." */
  emptyText?: string;
  /** Text shown while loading. @default "Loading..." */
  loadingText?: string;
  /** Extract display label from an item. Defaults to `String` for string items. */
  getLabel?: (item: T) => string;
  /** Extract a unique key for each item. Defaults to `getLabel`. */
  getKey?: (item: T) => string;
  /** Custom render function for each item in the dropdown */
  renderItem?: (item: T) => React.ReactNode;
  /** Additional className for the root container */
  className?: string;
  /** Called when the value changes */
  onValueChange?: (value: string) => void;
}

function AutocompleteAsyncStandalone<T>(
  props: AutocompleteAsyncStandaloneProps<T>,
) {
  const {
    fetcher,
    debounceMs,
    placeholder,
    emptyText = "No results.",
    loadingText = "Loading...",
    getLabel: getLabelProp,
    getKey: getKeyProp,
    renderItem,
    className,
    onValueChange: onValueChangeProp,
  } = props;

  const async = useAsync({ fetcher, debounceMs });
  const getLabel = getLabelProp ?? (defaultGetLabel as (item: T) => string);
  const getKey = getKeyProp ?? getLabel;

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
          <AutocompleteEmpty>
            {async.loading ? loadingText : emptyText}
          </AutocompleteEmpty>
          <AutocompleteList>
            {(item: T) => (
              <AutocompleteItem key={getKey(item)} value={getLabel(item)}>
                {renderItem ? renderItem(item) : getLabel(item)}
              </AutocompleteItem>
            )}
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
