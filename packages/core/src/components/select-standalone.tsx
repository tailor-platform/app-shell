import * as React from "react";
import { useState, useRef, useEffect } from "react";
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

/**
 * Fetcher type for `Select.Async`.
 *
 * Unlike `ComboboxAsyncFetcher` and `AutocompleteAsyncFetcher`, this fetcher
 * does **not** receive a `query` string — Select has no search input.
 * It is called each time the dropdown is opened (not per-keystroke).
 *
 * Receives an `AbortSignal` so in-flight requests are cancelled
 * when the component unmounts or the dropdown is re-opened before
 * the previous request completes.
 *
 * Note: `Select.Async` does not support `ItemGroup<T>[]` — the fetcher
 * must return a flat array.
 *
 * If caching or deduplication is needed, implement it in the fetcher
 * (e.g. via a query library or a simple cache layer).
 *
 * **Error handling:** Errors should be handled inside the fetcher.
 * If the fetcher throws, the component silently falls back to an empty
 * item list — there is no `onError` callback. Catch errors in the
 * fetcher to show toasts, log to error tracking, or return fallback data.
 */
export type SelectAsyncFetcher<T> = (options: { signal: AbortSignal }) => Promise<T[]>;

// --- Shared types (used by both Select and Select.Async) ---

interface SelectPropsBase<T> {
  /** Placeholder text shown when no value is selected */
  placeholder?: string;
  /** Map each item to its label, key, and optional custom render. */
  mapItem?: (item: T) => MappedItem;
  /** Additional className for the root container */
  className?: string;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** A parent element to render the portal into (e.g. a modal/drawer ref). */
  container?: React.ComponentProps<typeof SelectContent>["container"];
}

interface SelectPropsSingle<T> extends SelectPropsBase<T> {
  multiple?: false | undefined;
  /** Current value (controlled) */
  value?: T | null;
  /** Default value (uncontrolled) */
  defaultValue?: T | null;
  /** Called when the selected value changes */
  onValueChange?: (value: T | null) => void;
  /** Custom render function for the selected value display */
  renderValue?: (value: T | null) => React.ReactNode;
}

interface SelectPropsMultiple<T> extends SelectPropsBase<T> {
  multiple: true;
  /** Current value (controlled) */
  value?: T[];
  /** Default value (uncontrolled) */
  defaultValue?: T[];
  /** Called when the selected values change */
  onValueChange?: (value: T[]) => void;
  /** Custom render function for the selected values display */
  renderValue?: (value: T[]) => React.ReactNode;
}

// --- Select (static) ---

/**
 * @property items - Items to display. May be a flat array of `T` or an array of
 * `ItemGroup<T>`. Items are identified as groups by the presence of
 * `label: string` and `items: T[]` fields — avoid item types whose
 * shape coincidentally matches this structure.
 */
type SelectStandaloneProps<I> =
  | ({ items: I[] } & SelectPropsSingle<ExtractItem<I>>)
  | ({ items: I[] } & SelectPropsMultiple<ExtractItem<I>>);

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

  const {
    items,
    placeholder,
    mapItem: mapItemProp,
    className,
    disabled,
    container,
    ...rest
  } = props;

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
    const { value, defaultValue, onValueChange, renderValue } = rest as SelectPropsMultiple<
      ExtractItem<I>
    >;

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
          <SelectContent container={container}>{content}</SelectContent>
        </SelectRoot>
      </div>
    );
  }

  const { value, defaultValue, onValueChange, renderValue } = rest as SelectPropsSingle<
    ExtractItem<I>
  >;

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
        <SelectContent container={container}>{content}</SelectContent>
      </SelectRoot>
    </div>
  );
}

// ============================================================================
// Select.useAsync
// ============================================================================

interface UseSelectAsyncOptions<T> {
  /** Fetcher for async item loading. Called each time the dropdown is opened. */
  fetcher: SelectAsyncFetcher<T>;
}

interface UseSelectAsyncReturn<T> {
  /** Fetched items — pass to the Root `items` prop or render manually */
  items: T[];
  /** Whether a fetch is currently in-flight */
  loading: boolean;
  /** The error thrown by the last fetch, if any */
  error: unknown;
  /** Open change handler — pass to the Root `onOpenChange` prop */
  onOpenChange: (open: boolean) => void;
}

/**
 * Hook that encapsulates the async select pattern — fetching on open,
 * request cancellation via `AbortController`, and loading/error state.
 *
 * Unlike `Combobox.useAsync`, this does **not** involve a search query
 * or debouncing — Select has no text input. The fetcher is called each
 * time the dropdown opens.
 *
 * @example
 * ```tsx
 * const countries = Select.useAsync({
 *   fetcher: async ({ signal }) => {
 *     const res = await fetch("/api/countries", { signal });
 *     return res.json();
 *   },
 * });
 *
 * <Select.Parts.Root
 *   onOpenChange={countries.onOpenChange}
 * >
 *   <Select.Parts.Trigger>
 *     <Select.Parts.Value placeholder="Select a country" />
 *   </Select.Parts.Trigger>
 *   <Select.Parts.Content>
 *     {countries.loading
 *       ? "Loading..."
 *       : countries.items.map((c) => (
 *           <Select.Parts.Item key={c.id} value={c}>{c.name}</Select.Parts.Item>
 *         ))}
 *   </Select.Parts.Content>
 * </Select.Parts.Root>
 * ```
 */
function useAsync<T>({ fetcher }: UseSelectAsyncOptions<T>): UseSelectAsyncReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const abortControllerRef = useRef<AbortController | null>(null);

  const onOpenChange = React.useCallback((open: boolean) => {
    if (open) {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setLoading(true);

      fetcherRef
        .current({ signal: controller.signal })
        .then((result) => {
          if (!controller.signal.aborted) {
            setItems(result);
            setError(undefined);
          }
        })
        .catch((e) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          if (!controller.signal.aborted) {
            setItems([]);
            setError(e);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }
  }, []);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  return { items, loading, error, onOpenChange };
}

// ============================================================================
// Select.Async
// ============================================================================

interface SelectAsyncOwnProps<T> {
  /** Fetcher for async item loading. Called each time the dropdown is opened. */
  fetcher: SelectAsyncFetcher<T>;
  /** Text shown while loading. @default "Loading..." */
  loadingText?: string;
}

type SelectAsyncProps<T> =
  | (SelectAsyncOwnProps<T> & SelectPropsSingle<T>)
  | (SelectAsyncOwnProps<T> & SelectPropsMultiple<T>);

function SelectAsyncStandalone<T>(props: SelectAsyncProps<T>) {
  const {
    fetcher,
    placeholder,
    loadingText = "Loading...",
    mapItem: mapItemProp,
    className,
    disabled,
    container,
    ...rest
  } = props;

  const { items, loading, onOpenChange: handleOpenChange } = useAsync({ fetcher });

  const mapItem = (mapItemProp ?? defaultMapItem) as (item: T) => MappedItem;
  const getLabel = (item: T) => mapItem(item).label;

  const content = loading ? (
    <div className="astw:px-4 astw:pt-2 astw:pb-4 astw:text-center astw:text-sm astw:text-muted-foreground">
      {loadingText}
    </div>
  ) : (
    renderFlatItems(items, mapItem)
  );

  if (rest.multiple) {
    const { value, defaultValue, onValueChange, renderValue } = rest as SelectPropsMultiple<T>;

    return (
      <div className={className}>
        <SelectRoot<T, true>
          multiple
          value={value as T[] | undefined}
          defaultValue={defaultValue as T[] | undefined}
          onValueChange={onValueChange && ((v: T[]) => (onValueChange as (v: T[]) => void)(v))}
          onOpenChange={handleOpenChange}
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
          <SelectContent container={container}>{content}</SelectContent>
        </SelectRoot>
      </div>
    );
  }

  const { value, defaultValue, onValueChange, renderValue } = rest as SelectPropsSingle<T>;

  return (
    <div className={className}>
      <SelectRoot<T>
        value={value as T | null | undefined}
        defaultValue={defaultValue as T | null | undefined}
        onValueChange={
          onValueChange && ((v: T | null) => (onValueChange as (v: T | null) => void)(v))
        }
        onOpenChange={handleOpenChange}
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
        <SelectContent container={container}>{content}</SelectContent>
      </SelectRoot>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

const Select = Object.assign(SelectStandalone, {
  Async: SelectAsyncStandalone,
  Parts: SelectParts,
  useAsync,
});

export { Select, useAsync };
