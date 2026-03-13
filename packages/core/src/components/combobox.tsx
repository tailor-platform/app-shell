import * as React from "react";
import { useState, useMemo, useCallback, useRef } from "react";
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAsyncItems } from "@/hooks/use-async-items";
import type { UseAsyncItemsOptions, UseAsyncItemsReturn } from "@/hooks/use-async-items";

function ComboboxRoot<Value, Multiple extends boolean | undefined = false>({
  ...props
}: React.ComponentProps<typeof BaseCombobox.Root<Value, Multiple>>) {
  return <BaseCombobox.Root data-slot="combobox" {...props} />;
}

function ComboboxInput({ className, ...props }: React.ComponentProps<typeof BaseCombobox.Input>) {
  return (
    <BaseCombobox.Input
      data-slot="combobox-input"
      className={cn(
        "astw:border-input astw:bg-background astw:text-foreground astw:placeholder:text-muted-foreground astw:flex astw:h-9 astw:w-full astw:rounded-md astw:border astw:px-3 astw:py-1 astw:text-sm astw:shadow-xs astw:outline-none astw:transition-colors",
        "astw:focus-visible:border-ring astw:focus-visible:ring-ring/50 astw:focus-visible:ring-[3px]",
        "astw:disabled:cursor-not-allowed astw:disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseCombobox.Trigger>) {
  return (
    <BaseCombobox.Trigger
      data-slot="combobox-trigger"
      className={cn(
        "astw:absolute astw:inset-y-0 astw:right-0 astw:flex astw:items-center astw:px-2 astw:text-muted-foreground astw:outline-none",
        "astw:hover:text-foreground",
        "astw:disabled:pointer-events-none astw:disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children ?? (
        <BaseCombobox.Icon>
          <ChevronDownIcon className="astw:size-4" />
        </BaseCombobox.Icon>
      )}
    </BaseCombobox.Trigger>
  );
}

function ComboboxInputGroup({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseCombobox.InputGroup>) {
  return (
    <BaseCombobox.InputGroup
      data-slot="combobox-input-group"
      className={cn("astw:relative astw:flex astw:items-center", className)}
      {...props}
    >
      {children ?? (
        <>
          <ComboboxInput />
          <ComboboxClear />
          <ComboboxTrigger />
        </>
      )}
    </BaseCombobox.InputGroup>
  );
}

function ComboboxContent({ className, ...props }: React.ComponentProps<typeof BaseCombobox.Popup>) {
  return (
    <BaseCombobox.Portal>
      <BaseCombobox.Positioner>
        <BaseCombobox.Popup
          data-slot="combobox-content"
          className={cn(
            "astw:bg-popover astw:text-popover-foreground astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:data-ending-style:zoom-out-95 astw:data-open:zoom-in-95 astw:z-50 astw:w-[var(--anchor-width)] astw:min-w-32 astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:shadow-md",
            className,
          )}
          {...props}
        />
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  );
}

function ComboboxList({ className, ...props }: React.ComponentProps<typeof BaseCombobox.List>) {
  return (
    <BaseCombobox.List
      data-slot="combobox-list"
      className={cn("astw:max-h-60 astw:overflow-y-auto astw:p-1", className)}
      {...props}
    />
  );
}

function ComboboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseCombobox.Item>) {
  return (
    <BaseCombobox.Item
      data-slot="combobox-item"
      className={cn(
        "astw:relative astw:flex astw:w-full astw:cursor-default astw:items-center astw:gap-2 astw:rounded-sm astw:py-1.5 astw:pr-8 astw:pl-2 astw:text-sm astw:outline-hidden astw:select-none",
        "astw:data-highlighted:bg-accent astw:data-highlighted:text-accent-foreground",
        "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="astw:absolute astw:right-2 astw:flex astw:size-3.5 astw:items-center astw:justify-center">
        <BaseCombobox.ItemIndicator>
          <CheckIcon className="astw:size-4" />
        </BaseCombobox.ItemIndicator>
      </span>
      {children}
    </BaseCombobox.Item>
  );
}

function ComboboxEmpty({ className, ...props }: React.ComponentProps<typeof BaseCombobox.Empty>) {
  return (
    <BaseCombobox.Empty
      data-slot="combobox-empty"
      className={cn(
        "astw:px-4 astw:pt-2 astw:pb-4 astw:text-center astw:text-sm astw:text-muted-foreground astw:empty:hidden",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxGroup({ ...props }: React.ComponentProps<typeof BaseCombobox.Group>) {
  return <BaseCombobox.Group data-slot="combobox-group" {...props} />;
}

function ComboboxGroupLabel({
  className,
  ...props
}: React.ComponentProps<typeof BaseCombobox.GroupLabel>) {
  return (
    <BaseCombobox.GroupLabel
      data-slot="combobox-group-label"
      className={cn(
        "astw:text-muted-foreground astw:px-2 astw:py-1.5 astw:text-xs astw:font-medium",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxClear({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseCombobox.Clear>) {
  return (
    <BaseCombobox.Clear
      data-slot="combobox-clear"
      className={cn(
        "astw:absolute astw:inset-y-0 astw:right-6 astw:flex astw:items-center astw:px-1 astw:text-muted-foreground astw:outline-none",
        "astw:hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children ?? <XIcon className="astw:size-3.5" />}
    </BaseCombobox.Clear>
  );
}

function ComboboxChips({ className, ...props }: React.ComponentProps<typeof BaseCombobox.Chips>) {
  return (
    <BaseCombobox.Chips
      data-slot="combobox-chips"
      className={cn(
        "astw:border-input astw:bg-background astw:flex astw:min-h-9 astw:w-full astw:flex-wrap astw:items-center astw:gap-1 astw:rounded-md astw:border astw:px-1.5 astw:py-1 astw:text-sm astw:shadow-xs",
        "astw:focus-within:border-ring astw:focus-within:ring-ring/50 astw:focus-within:ring-[3px]",
        // Strip standalone styles from nested Input
        "astw:[&_[data-slot=combobox-input]]:border-0 astw:[&_[data-slot=combobox-input]]:bg-transparent astw:[&_[data-slot=combobox-input]]:shadow-none astw:[&_[data-slot=combobox-input]]:ring-0",
        "astw:[&_[data-slot=combobox-input]]:h-auto astw:[&_[data-slot=combobox-input]]:min-w-20 astw:[&_[data-slot=combobox-input]]:flex-1 astw:[&_[data-slot=combobox-input]]:px-1.5 astw:[&_[data-slot=combobox-input]]:py-0",
        "astw:[&_[data-slot=combobox-input]]:focus-visible:border-transparent astw:[&_[data-slot=combobox-input]]:focus-visible:ring-0",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChip({ className, ...props }: React.ComponentProps<typeof BaseCombobox.Chip>) {
  return (
    <BaseCombobox.Chip
      data-slot="combobox-chip"
      className={cn(
        "astw:bg-secondary astw:text-secondary-foreground astw:flex astw:cursor-default astw:items-center astw:gap-1 astw:rounded-md astw:px-1.5 astw:py-0.5 astw:text-sm astw:outline-none",
        "astw:data-highlighted:bg-primary astw:data-highlighted:text-primary-foreground",
        "astw:focus-within:bg-primary astw:focus-within:text-primary-foreground",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChipRemove({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseCombobox.ChipRemove>) {
  return (
    <BaseCombobox.ChipRemove
      data-slot="combobox-chip-remove"
      className={cn(
        "astw:rounded-sm astw:p-0.5 astw:text-inherit astw:outline-none",
        "astw:hover:bg-secondary-foreground/20",
        className,
      )}
      {...props}
    >
      {children ?? <XIcon className="astw:size-3" />}
    </BaseCombobox.ChipRemove>
  );
}

function ComboboxValue({ ...props }: React.ComponentProps<typeof BaseCombobox.Value>) {
  return <BaseCombobox.Value data-slot="combobox-value" {...props} />;
}

function ComboboxStatus({ className, ...props }: React.ComponentProps<typeof BaseCombobox.Status>) {
  return (
    <BaseCombobox.Status
      data-slot="combobox-status"
      className={cn("astw:sr-only", className)}
      {...props}
    />
  );
}

function ComboboxCollection({ ...props }: React.ComponentProps<typeof BaseCombobox.Collection>) {
  return <BaseCombobox.Collection data-slot="combobox-collection" {...props} />;
}

// ============================================================================
// useCreatable hook
// ============================================================================

const defaultFormatCreateLabel = (value: string) => `Create "${value}"`;

interface UseCreatableOptionsBase<T extends object> {
  /** Current items list (managed externally since items may come from API) */
  items: T[];
  /** Extract display label from an item */
  getLabel: (item: T) => string;
  /** Factory to create a new item from user input string */
  createItem: (value: string) => T;
  /**
   * Called when a new item is created via the "create" option.
   *
   * Two patterns are supported:
   *
   * **Resolve callback** — receives a `resolve` callback for sync or deferred flows:
   * - Call `resolve()` or `resolve(true)` to accept the item into the selection
   * - Call `resolve(false)` to cancel (item is NOT selected)
   *
   * **Promise** — return a `Promise` for async workflows (API calls, etc.):
   * - Promise fulfillment accepts the item (unless resolved value is `false`)
   * - Promise rejection cancels the creation
   *
   * If not provided, created items are added to the selection immediately.
   */
  onItemCreated?:
    | ((item: T, resolve: (accept?: boolean) => void) => void)
    | ((item: T) => Promise<void | boolean>);
  /**
   * Format the label for the "create" option in the dropdown.
   * Useful for i18n (e.g. Japanese: `(v) => \`「${v}」を作成\``).
   * @default (value) => \`Create "${value}"\`
   */
  formatCreateLabel?: (value: string) => string;
}

interface UseCreatableOptionsMultiple<T extends object> extends UseCreatableOptionsBase<T> {
  multiple: true;
  defaultValue?: T[];
  /** Called when selection changes (sentinel items are already excluded) */
  onValueChange?: (value: T[]) => void;
}

interface UseCreatableOptionsSingle<T extends object> extends UseCreatableOptionsBase<T> {
  multiple?: false | undefined;
  defaultValue?: T | null;
  /** Called when selection changes */
  onValueChange?: (value: T | null) => void;
}

interface UseCreatableReturnBase<T> {
  /** Items list with "create" sentinel appended when query has no exact match */
  items: T[];
  /** Current input query — pass to `Combobox.Root inputValue` */
  inputValue: string;
  /** Input change handler — pass to `Combobox.Root onInputValueChange` */
  onInputValueChange: (value: string) => void;
  /** Converts item to display label — pass to `Combobox.Root itemToStringLabel` */
  itemToStringLabel: (item: T) => string;
  /** Converts item to form value — pass to `Combobox.Root itemToStringValue` */
  itemToStringValue: (item: T) => string;
  /** Check if an item is the "create" sentinel */
  isCreateItem: (item: T) => boolean;
  /** Get the original input value from a sentinel item */
  getCreateLabel: (item: T) => string | undefined;
  /** The active formatCreateLabel function */
  formatCreateLabel: (value: string) => string;
}

interface UseCreatableReturnMultiple<T> extends UseCreatableReturnBase<T> {
  /** Current selected values */
  value: T[];
  /** Value change handler — pass to `Combobox.Root onValueChange` */
  onValueChange: (value: T[]) => void;
  multiple: true;
}

interface UseCreatableReturnSingle<T> extends UseCreatableReturnBase<T> {
  /** Current selected value */
  value: T | null;
  /** Value change handler — pass to `Combobox.Root onValueChange` */
  onValueChange: (value: T | null) => void;
  multiple: false;
}

/**
 * Hook that encapsulates the "creatable" combobox pattern — allowing users
 * to create new items on-the-fly from the dropdown.
 *
 * Manages selected value, input query, and sentinel item injection internally.
 * Supports both single and multiple select.
 *
 * `onItemCreated` supports two patterns — a `resolve` callback for sync or
 * deferred flows, and a `Promise` return for async workflows:
 *
 * @example
 * ```tsx
 * // Sync — call resolve() immediately
 * onItemCreated: (item, resolve) => {
 *   setItems((prev) => [...prev, item]);
 *   resolve();
 * }
 *
 * // Async API call — return a Promise (no resolve arg)
 * onItemCreated: async (item) => {
 *   await api.create(item);
 *   setItems((prev) => [...prev, item]);
 *   // auto-accept on fulfillment, auto-cancel on rejection
 * }
 *
 * // Confirmation dialog — defer resolve() to user action
 * onItemCreated: (item, resolve) => {
 *   setDialogState({
 *     item,
 *     onConfirm: () => { setItems(p => [...p, item]); resolve(); },
 *     onCancel: () => resolve(false),
 *   });
 * }
 * ```
 */
function useCreatable<T extends object>(
  options: UseCreatableOptionsMultiple<T>,
): UseCreatableReturnMultiple<T>;
function useCreatable<T extends object>(
  options: UseCreatableOptionsSingle<T>,
): UseCreatableReturnSingle<T>;
function useCreatable<T extends object>(
  options: UseCreatableOptionsMultiple<T> | UseCreatableOptionsSingle<T>,
): UseCreatableReturnMultiple<T> | UseCreatableReturnSingle<T> {
  const {
    items,
    getLabel,
    createItem,
    onItemCreated,
    formatCreateLabel: userFormatLabel = defaultFormatCreateLabel,
  } = options;

  const isMultiple = "multiple" in options && options.multiple === true;

  // --- Managed state ---
  const [multiValue, setMultiValue] = useState<T[]>(
    () =>
      (isMultiple ? ((options as UseCreatableOptionsMultiple<T>).defaultValue ?? []) : []) as T[],
  );
  const [singleValue, setSingleValue] = useState<T | null>(() =>
    !isMultiple ? ((options as UseCreatableOptionsSingle<T>).defaultValue ?? null) : null,
  );
  const [query, setQuery] = useState("");

  // Tracks the label being created during an async onItemCreated flow.
  // While set, onInputValueChange ignores base-ui's close-handler clearing
  // the input so the user sees the typed value instead of a brief empty flash.
  const pendingCreateLabelRef = useRef<string | null>(null);

  const onValueChange = options.onValueChange;

  const trimmed = query.trim();
  const lowered = trimmed.toLocaleLowerCase();
  const exactExists =
    trimmed !== "" && items.some((item) => getLabel(item).trim().toLocaleLowerCase() === lowered);

  // --- Sentinel: the "Create X" option appended to the items list ---
  const sentinel = useMemo<{ item: T; label: string } | null>(() => {
    if (trimmed === "" || exactExists) return null;
    return { item: createItem(trimmed), label: trimmed };
  }, [trimmed, exactExists, createItem]);

  const augmentedItems = useMemo(() => {
    if (!sentinel) return items;
    return [...items, sentinel.item];
  }, [items, sentinel]);

  const isCreateItem = useCallback(
    (item: T): boolean => sentinel !== null && item === sentinel.item,
    [sentinel],
  );

  const getCreateLabelFn = useCallback(
    (item: T): string | undefined =>
      sentinel !== null && item === sentinel.item ? sentinel.label : undefined,
    [sentinel],
  );

  const itemToStringLabelFn = useCallback(
    (item: T): string => {
      if (sentinel !== null && item === sentinel.item) {
        return userFormatLabel(sentinel.label);
      }
      return getLabel(item);
    },
    [sentinel, getLabel, userFormatLabel],
  );

  const itemToStringValueFn = useCallback(
    (item: T): string => {
      if (sentinel !== null && item === sentinel.item) {
        return "";
      }
      return getLabel(item);
    },
    [sentinel, getLabel],
  );

  // --- Create logic (supports sync and deferred resolution via callback) ---
  const performCreate = useCallback(
    (value: string, baseMultiValue?: T[]) => {
      const newItem = createItem(value);

      const applySelection = () => {
        if (isMultiple) {
          const base = baseMultiValue ?? [];
          const next = [...base, newItem];
          setMultiValue(next);
          (onValueChange as UseCreatableOptionsMultiple<T>["onValueChange"] | undefined)?.(next);
        } else {
          setSingleValue(newItem);
          (onValueChange as UseCreatableOptionsSingle<T>["onValueChange"] | undefined)?.(newItem);
        }
        setQuery(isMultiple ? "" : getLabel(newItem));
      };

      if (!onItemCreated) {
        applySelection();
        return;
      }

      // Keep the typed value visible in the input while the async create is in flight
      if (!isMultiple) {
        pendingCreateLabelRef.current = value;
        setQuery(value);
      }

      let resolved = false;
      const resolve = (accept?: boolean) => {
        if (resolved) return;
        resolved = true;
        pendingCreateLabelRef.current = null;
        if (accept !== false) applySelection();
        else setQuery("");
      };

      // Detect pattern: Promise-returning (1 arg) vs resolve callback (2 args)
      const result =
        onItemCreated.length >= 2
          ? (onItemCreated as (item: T, resolve: (accept?: boolean) => void) => void)(
              newItem,
              resolve,
            )
          : (onItemCreated as (item: T) => Promise<void | boolean>)(newItem);

      // If callback returned a Promise, auto-resolve on settle
      if (result != null && typeof (result as Promise<unknown>).then === "function") {
        (result as Promise<void | boolean>).then(
          (resolvedValue) => {
            if (!resolved) resolve(resolvedValue !== false);
          },
          () => {
            if (!resolved) resolve(false);
          },
        );
      }
    },
    [isMultiple, createItem, onItemCreated, onValueChange, getLabel],
  );

  // --- Value change handlers ---
  const handleMultipleValueChange = useCallback(
    (next: T[]) => {
      const creatableItem = next.find((item) => sentinel !== null && item === sentinel.item);
      if (creatableItem && sentinel) {
        const label = sentinel.label;
        const cleaned = next.filter((item) => !(sentinel !== null && item === sentinel.item));
        performCreate(label, cleaned);
        return;
      }
      setMultiValue(next);
      (onValueChange as UseCreatableOptionsMultiple<T>["onValueChange"] | undefined)?.(next);
      setQuery("");
    },
    [performCreate, onValueChange, sentinel],
  );

  const handleSingleValueChange = useCallback(
    (next: T | null) => {
      if (next && sentinel !== null && next === sentinel.item) {
        const label = sentinel.label;
        performCreate(label);
        return;
      }
      setSingleValue(next);
      (onValueChange as UseCreatableOptionsSingle<T>["onValueChange"] | undefined)?.(next);
      setQuery("");
    },
    [performCreate, onValueChange, sentinel],
  );

  // --- Return ---
  const base: UseCreatableReturnBase<T> = {
    items: augmentedItems,
    inputValue: query,
    onInputValueChange: useCallback((v: string) => {
      // While an async create is pending, ignore base-ui's close-handler
      // trying to clear the input so the typed value stays visible.
      if (pendingCreateLabelRef.current !== null && v === "") return;
      setQuery(v);
    }, []),
    itemToStringLabel: itemToStringLabelFn,
    itemToStringValue: itemToStringValueFn,
    isCreateItem,
    getCreateLabel: getCreateLabelFn,
    formatCreateLabel: userFormatLabel,
  };

  if (isMultiple) {
    return {
      ...base,
      value: multiValue,
      onValueChange: handleMultipleValueChange,
      multiple: true as const,
    };
  }

  return {
    ...base,
    value: singleValue,
    onValueChange: handleSingleValueChange,
    multiple: false as const,
  };
}

// ============================================================================
// useAsync hook
// ============================================================================

/**
 * Hook that encapsulates the async combobox pattern — debounced fetching,
 * request cancellation via `AbortController`, and loading state.
 *
 * Pass `filter={null}` to `<Combobox.Root>` to disable internal filtering
 * since items are already filtered by the remote source.
 *
 * @example
 * ```tsx
 * const countries = Combobox.useAsync({
 *   fetcher: async (query, { signal }) => {
 *     const res = await fetch(
 *       `https://restcountries.com/v3.1/name/${query}`,
 *       { signal },
 *     );
 *     if (!res.ok) return [];
 *     return res.json();
 *   },
 *   debounceMs: 300,
 * });
 *
 * <Combobox.Root
 *   items={countries.items}
 *   filter={null}
 *   onInputValueChange={countries.onInputValueChange}
 * >
 *   ...
 *   <Combobox.Empty>
 *     {countries.loading ? "Loading..." : "No results."}
 *   </Combobox.Empty>
 * </Combobox.Root>
 * ```
 */
function useAsync<T>(options: UseAsyncItemsOptions<T>): UseAsyncItemsReturn<T> {
  return useAsyncItems(options);
}

// ============================================================================
// Export
// ============================================================================

const ComboboxParts = {
  Root: ComboboxRoot,
  InputGroup: ComboboxInputGroup,
  Input: ComboboxInput,
  Trigger: ComboboxTrigger,
  Content: ComboboxContent,
  List: ComboboxList,
  Item: ComboboxItem,
  Empty: ComboboxEmpty,
  Group: ComboboxGroup,
  GroupLabel: ComboboxGroupLabel,
  Clear: ComboboxClear,
  Chips: ComboboxChips,
  Chip: ComboboxChip,
  ChipRemove: ComboboxChipRemove,
  Value: ComboboxValue,
  Collection: ComboboxCollection,
  Status: ComboboxStatus,
  useFilter: BaseCombobox.useFilter,
  useCreatable,
  useAsync,
};

type ComboboxParts = typeof ComboboxParts;

export {
  ComboboxRoot,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxClear,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxValue,
  ComboboxCollection,
  ComboboxStatus,
  ComboboxParts,
  useCreatable,
  useAsync,
};

export type { UseCreatableOptionsBase };
