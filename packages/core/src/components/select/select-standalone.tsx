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
import { defaultMapItem, isGroupedItems } from "../dropdown-items";
import type { MappedItem, ItemGroup, ExtractItem } from "../dropdown-items";
import { AsyncErrorState, resolveAsyncContent } from "../internals/async-error-state";

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
 * **Error handling:** If the fetcher throws or rejects, the component renders
 * a built-in inline error state (with a Retry affordance) in place of the
 * empty item list — the failure is no longer silently swallowed. To run a side
 * effect on failure (logging, error tracking, a toast), pass `onFetchError`.
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
  /**
   * Accessible name for the trigger. Use when there is no visible label
   * (e.g. a table toolbar or list filter). Forwarded to the combobox trigger
   * so screen readers announce something other than the selected value.
   */
  "aria-label"?: string;
  /**
   * ID of the element(s) that label the trigger. Forwarded to the combobox
   * trigger — use this to point at a visible `<label>`/heading.
   */
  "aria-labelledby"?: string;
  /** ID applied to the combobox trigger element. */
  id?: string;
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
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    id,
    ...rest
  } = props;

  const triggerProps = {
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    id,
  };

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
          <SelectTrigger {...triggerProps}>
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
        <SelectTrigger {...triggerProps}>
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
  /**
   * Called when a fetch fails. Fires once per outage (not on every re-open
   * while broken) and re-arms after the next success. Use for logging or error
   * tracking; the inline error state is shown regardless.
   */
  onFetchError?: (error: unknown) => void;
}

interface UseSelectAsyncReturn<T> {
  /** Fetched items — pass to the Root `items` prop or render manually */
  items: T[];
  /** Whether a fetch is currently in-flight */
  loading: boolean;
  /** The error thrown by the last fetch, if any */
  error: unknown;
  /** Re-runs the fetch immediately. Use for a Retry affordance. */
  retry: () => void;
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
function useAsync<T>({ fetcher, onFetchError }: UseSelectAsyncOptions<T>): UseSelectAsyncReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const onFetchErrorRef = useRef(onFetchError);
  onFetchErrorRef.current = onFetchError;

  const abortControllerRef = useRef<AbortController | null>(null);
  // Whether we are currently in an error state, so onFetchError fires once per
  // outage (on the transition into the error state) rather than on every re-open.
  const inErrorStateRef = useRef(false);

  const runFetch = React.useCallback(() => {
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
          inErrorStateRef.current = false;
        }
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setItems([]);
          setError(e);
          // Announce the outage only on the transition into the error state.
          if (!inErrorStateRef.current) {
            inErrorStateRef.current = true;
            onFetchErrorRef.current?.(e);
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
  }, []);

  const onOpenChange = React.useCallback(
    (open: boolean) => {
      if (open) {
        runFetch();
      } else {
        // Abort in-flight fetch on close to prevent content changes during
        // the close animation, which can break Base UI's transition tracking.
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
      }
    },
    [runFetch],
  );

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  return { items, loading, error, retry: runFetch, onOpenChange };
}

// ============================================================================
// Select.Async
// ============================================================================

interface SelectAsyncOwnProps<T> {
  /** Fetcher for async item loading. Called each time the dropdown is opened. */
  fetcher: SelectAsyncFetcher<T>;
  /** Text shown while loading. @default "Loading..." */
  loadingText?: string;
  /**
   * Message shown in the dropdown when the fetcher fails, alongside a Retry
   * affordance. Replaces the misleading empty state.
   * @default "Couldn't load results."
   */
  errorText?: string;
  /** Label for the retry button in the error state. @default "Retry" */
  retryText?: string;
  /**
   * Called when a fetch fails. Fires once per outage (not on every re-open
   * while broken) and re-arms after the next success. Use for logging or error
   * tracking — the inline error state is shown regardless.
   */
  onFetchError?: (error: unknown) => void;
  /**
   * Whether the select behaves as a modal (traps focus).
   * Set to `true` when rendering inside a Dialog or Sheet to preserve focus-trap.
   * @default false
   */
  modal?: boolean;
  /**
   * Whether to align the selected item with the trigger when the dropdown opens.
   * @default false
   */
  alignItemWithTrigger?: boolean;
}

type SelectAsyncProps<T> =
  | (SelectAsyncOwnProps<T> & SelectPropsSingle<T>)
  | (SelectAsyncOwnProps<T> & SelectPropsMultiple<T>);

function SelectAsyncStandalone<T>(props: SelectAsyncProps<T>) {
  const {
    fetcher,
    placeholder,
    loadingText = "Loading...",
    errorText = "Couldn't load results.",
    retryText = "Retry",
    onFetchError,
    // Base UI's modal + anchored alignment path can leave async selects
    // scroll-locked or invisible after reopening once items have loaded.
    modal = false,
    // Base UI also enables anchored popup scroll lock when item/trigger
    // alignment is on, so async selects opt out of that path too.
    alignItemWithTrigger = false,
    mapItem: mapItemProp,
    className,
    disabled,
    container,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    id,
    ...rest
  } = props;

  const triggerProps = {
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    id,
  };

  const {
    items,
    loading,
    error,
    retry,
    onOpenChange: handleOpenChange,
  } = useAsync({
    fetcher,
    onFetchError,
  });

  const mapItem = (mapItemProp ?? defaultMapItem) as (item: T) => MappedItem;
  const getLabel = (item: T) => mapItem(item).label;

  const content = resolveAsyncContent<React.ReactNode>({
    loading,
    error,
    loadingContent: (
      <div className="astw:px-4 astw:pt-2 astw:pb-4 astw:text-center astw:text-sm astw:text-muted-foreground">
        {loadingText}
      </div>
    ),
    errorContent: (
      <AsyncErrorState
        slot="select-error"
        className="astw:px-4 astw:pt-2 astw:pb-4 astw:text-center astw:text-sm astw:text-muted-foreground"
        message={errorText}
        retryText={retryText}
        onRetry={retry}
      />
    ),
    defaultContent: renderFlatItems(items, mapItem),
  });

  if (rest.multiple) {
    const { value, defaultValue, onValueChange, renderValue } = rest as SelectPropsMultiple<T>;

    return (
      <div className={className}>
        <SelectRoot<T, true>
          multiple
          modal={modal}
          value={value as T[] | undefined}
          defaultValue={defaultValue as T[] | undefined}
          onValueChange={onValueChange && ((v: T[]) => (onValueChange as (v: T[]) => void)(v))}
          onOpenChange={handleOpenChange}
          itemToStringLabel={getLabel}
          disabled={disabled}
        >
          <SelectTrigger {...triggerProps}>
            {renderValue ? (
              <SelectValue placeholder={placeholder}>
                {(selected: T[]) => (renderValue as (v: T[]) => React.ReactNode)(selected)}
              </SelectValue>
            ) : (
              <SelectValue placeholder={placeholder} />
            )}
          </SelectTrigger>
          <SelectContent container={container} alignItemWithTrigger={alignItemWithTrigger}>
            {content}
          </SelectContent>
        </SelectRoot>
      </div>
    );
  }

  const { value, defaultValue, onValueChange, renderValue } = rest as SelectPropsSingle<T>;

  return (
    <div className={className}>
      <SelectRoot<T>
        modal={modal}
        value={value as T | null | undefined}
        defaultValue={defaultValue as T | null | undefined}
        onValueChange={
          onValueChange && ((v: T | null) => (onValueChange as (v: T | null) => void)(v))
        }
        onOpenChange={handleOpenChange}
        itemToStringLabel={getLabel}
        disabled={disabled}
      >
        <SelectTrigger {...triggerProps}>
          {renderValue ? (
            <SelectValue placeholder={placeholder}>
              {(selected: T) => (renderValue as (v: T) => React.ReactNode)(selected)}
            </SelectValue>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent container={container} alignItemWithTrigger={alignItemWithTrigger}>
          {content}
        </SelectContent>
      </SelectRoot>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

/**
 * Keep the exported static API type explicit instead of relying on
 * `Object.assign(...)` inference.
 *
 * Why:
 * - makes declaration rollup more stable (avoids TS2742/non-portable inferred names)
 * - keeps public `.d.ts` output resilient to resolver/config changes
 * - preserves consumer-side callback inference for `Select` and `Select.Async`
 */
type SelectComponent = typeof SelectStandalone & {
  Async: typeof SelectAsyncStandalone;
  Parts: typeof SelectParts;
  useAsync: typeof useAsync;
};

const Select: SelectComponent = Object.assign(SelectStandalone, {
  /**
   * Async select that fetches items when the dropdown opens.
   *
   * **Limitation:** This component defaults to `modal={false}` and
   * `alignItemWithTrigger={false}` to work around Base UI scroll-lock bugs
   * with dynamically loaded items. As a result, it may not function correctly
   * inside focus-trapping containers such as `Dialog` or `Sheet` — the
   * focus trap can block interaction with the dropdown, or the portal may
   * render outside the modal's visible area.
   *
   * If you need an async dropdown inside a `Dialog` or `Sheet`, prefer
   * `Combobox.Async` which uses Popover-based positioning and does not
   * suffer from these constraints.
   */
  Async: SelectAsyncStandalone,
  Parts: SelectParts,
  useAsync,
});

export { Select, useAsync };
