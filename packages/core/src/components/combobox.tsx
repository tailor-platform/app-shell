import * as React from "react";
import { useState, useMemo, useCallback, useRef } from "react";
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAsyncItems } from "@/hooks/use-async-items";
import type { UseAsyncItemsOptions, UseAsyncItemsReturn } from "@/hooks/use-async-items";

// Only the props relevant to the Combobox abstraction are picked from BaseCombobox.Root.
// Base UI-internal props are intentionally excluded so that
// upstream changes don't leak as breaking changes to consumers.
type ComboboxRootProps<Value, Multiple extends boolean | undefined = false> = Pick<
  React.ComponentProps<typeof BaseCombobox.Root<Value, Multiple>>,
  | "items"
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "multiple"
  | "filter"
  | "inputValue"
  | "onInputValueChange"
  | "onOpenChange"
  | "itemToStringLabel"
  | "itemToStringValue"
  | "disabled"
  | "children"
>;

function ComboboxRoot<Value, Multiple extends boolean | undefined = false>(
  props: ComboboxRootProps<Value, Multiple>,
) {
  return <BaseCombobox.Root data-slot="combobox" {...props} />;
}
ComboboxRoot.displayName = "Combobox.Root";

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
ComboboxInput.displayName = "Combobox.Input";

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
ComboboxTrigger.displayName = "Combobox.Trigger";

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
ComboboxInputGroup.displayName = "Combobox.InputGroup";

function ComboboxContent({
  className,
  container,
  ...props
}: React.ComponentProps<typeof BaseCombobox.Popup> & {
  container?: React.ComponentProps<typeof BaseCombobox.Portal>["container"];
}) {
  return (
    <BaseCombobox.Portal
      container={container}
      style={{ position: "relative", zIndex: "var(--z-popup)" }}
    >
      <BaseCombobox.Positioner>
        <BaseCombobox.Popup
          data-slot="combobox-content"
          className={cn(
            "astw:bg-popover astw:text-popover-foreground astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:data-ending-style:zoom-out-95 astw:data-open:zoom-in-95 astw:z-(--z-popup) astw:w-[var(--anchor-width)] astw:min-w-32 astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:shadow-md",
            className,
          )}
          {...props}
        />
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  );
}
ComboboxContent.displayName = "Combobox.Content";

function ComboboxList({ className, ...props }: React.ComponentProps<typeof BaseCombobox.List>) {
  return (
    <BaseCombobox.List
      data-slot="combobox-list"
      className={cn("astw:max-h-60 astw:overflow-y-auto astw:p-1", className)}
      {...props}
    />
  );
}
ComboboxList.displayName = "Combobox.List";

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
ComboboxItem.displayName = "Combobox.Item";

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
ComboboxEmpty.displayName = "Combobox.Empty";

function ComboboxGroup({ ...props }: React.ComponentProps<typeof BaseCombobox.Group>) {
  return <BaseCombobox.Group data-slot="combobox-group" {...props} />;
}
ComboboxGroup.displayName = "Combobox.Group";

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
ComboboxGroupLabel.displayName = "Combobox.GroupLabel";

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
ComboboxClear.displayName = "Combobox.Clear";

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
ComboboxChips.displayName = "Combobox.Chips";

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
ComboboxChip.displayName = "Combobox.Chip";

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
ComboboxChipRemove.displayName = "Combobox.ChipRemove";

function ComboboxValue({ ...props }: React.ComponentProps<typeof BaseCombobox.Value>) {
  return <BaseCombobox.Value data-slot="combobox-value" {...props} />;
}
ComboboxValue.displayName = "Combobox.Value";

function ComboboxStatus({ className, ...props }: React.ComponentProps<typeof BaseCombobox.Status>) {
  return (
    <BaseCombobox.Status
      data-slot="combobox-status"
      className={cn("astw:sr-only", className)}
      {...props}
    />
  );
}
ComboboxStatus.displayName = "Combobox.Status";

function ComboboxCollection({ ...props }: React.ComponentProps<typeof BaseCombobox.Collection>) {
  return <BaseCombobox.Collection data-slot="combobox-collection" {...props} />;
}
ComboboxCollection.displayName = "Combobox.Collection";

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
   * Return values control what happens next:
   * - `void` / `undefined` — accept the item produced by `createItem` as-is
   * - `T` — accept, but use the returned item instead (e.g. item with server-assigned ID)
   * - `false` — cancel the creation (item is NOT selected)
   *
   * May return a `Promise` for async workflows (API calls, confirmation dialogs, etc.).
   * A rejected promise also cancels the creation.
   *
   * If not provided, created items are added to the selection immediately.
   *
   * @example
   * ```tsx
   * // Sync
   * onItemCreated: (item) => {
   *   setItems(prev => [...prev, item]);
   * }
   *
   * // Async — return server-assigned item
   * onItemCreated: async (item) => {
   *   const saved = await api.create(item);
   *   setItems(prev => [...prev, saved]);
   *   return saved;
   * }
   *
   * // Cancel
   * onItemCreated: async (item) => {
   *   const ok = await confirm("Create?");
   *   if (!ok) return false;
   *   setItems(prev => [...prev, item]);
   * }
   * ```
   */
  onItemCreated?: (item: T) => void | false | T | Promise<void | false | T>;
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

/**
 * Combined options type for callers that don't know single vs multiple at compile time.
 * Accepts the union of both value shapes.
 */
interface UseCreatableOptionsCombined<T extends object> extends UseCreatableOptionsBase<T> {
  multiple?: boolean;
  defaultValue?: T[] | T | null;
  onValueChange?: ((value: T[]) => void) | ((value: T | null) => void);
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
  /** `true` while an async `onItemCreated` callback is in-flight */
  creating: boolean;
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
 * @example
 * ```tsx
 * // Sync
 * onItemCreated: (item) => {
 *   setItems((prev) => [...prev, item]);
 * }
 *
 * // Async — return server-assigned item to use as selected value
 * onItemCreated: async (item) => {
 *   const saved = await api.create(item);
 *   setItems((prev) => [...prev, saved]);
 *   return saved;
 * }
 *
 * // Cancel via return false
 * onItemCreated: async (item) => {
 *   const ok = await confirm("Create?");
 *   if (!ok) return false;
 *   setItems((prev) => [...prev, item]);
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
  options: UseCreatableOptionsCombined<T>,
): UseCreatableReturnMultiple<T> | UseCreatableReturnSingle<T>;
function useCreatable<T extends object>(
  options:
    | UseCreatableOptionsMultiple<T>
    | UseCreatableOptionsSingle<T>
    | UseCreatableOptionsCombined<T>,
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
  // Use a single discriminated state to avoid impossible combinations
  // (e.g. multiValue set while in single mode).
  const [selection, setSelection] = useState<T[] | T | null>(() =>
    isMultiple
      ? ((options as UseCreatableOptionsMultiple<T>).defaultValue ?? [])
      : ((options as UseCreatableOptionsSingle<T>).defaultValue ?? null),
  );
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  // Type-safe accessors
  const multiValue = selection as T[];
  const singleValue = selection as T | null;
  const setMultiValue = setSelection as React.Dispatch<React.SetStateAction<T[]>>;
  const setSingleValue = setSelection as React.Dispatch<React.SetStateAction<T | null>>;

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
  // Hide the sentinel while an async create is in-flight to prevent double-clicks.
  const sentinel = useMemo<{ item: T; label: string } | null>(() => {
    if (creating || trimmed === "" || exactExists) return null;
    return { item: createItem(trimmed), label: trimmed };
  }, [creating, trimmed, exactExists, createItem]);

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

  // --- Create logic (Promise-based) ---
  const performCreate = useCallback(
    (value: string, baseMultiValue?: T[]) => {
      // Prevent re-entrant calls while an async create is in-flight
      if (creating) return;

      const newItem = createItem(value);

      const applySelection = (itemToSelect?: T) => {
        const selected = itemToSelect ?? newItem;
        if (isMultiple) {
          const base = baseMultiValue ?? [];
          const next = [...base, selected];
          setMultiValue(next);
          (onValueChange as UseCreatableOptionsMultiple<T>["onValueChange"] | undefined)?.(next);
        } else {
          setSingleValue(selected);
          (onValueChange as UseCreatableOptionsSingle<T>["onValueChange"] | undefined)?.(selected);
        }
        setQuery(isMultiple ? "" : getLabel(selected));
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

      const handleResult = (result: void | false | T) => {
        pendingCreateLabelRef.current = null;
        setCreating(false);
        if (result === false) {
          setQuery("");
          return;
        }
        // If result is an object (T), use it as the selected value
        applySelection(result != null && typeof result === "object" ? result : undefined);
      };

      const handleError = () => {
        pendingCreateLabelRef.current = null;
        setCreating(false);
        setQuery("");
      };

      try {
        const result = onItemCreated(newItem);

        // If callback returned a Promise, handle async
        if (result != null && typeof (result as Promise<unknown>).then === "function") {
          setCreating(true);
          (result as Promise<void | false | T>).then(handleResult, handleError);
        } else {
          handleResult(result as void | false | T);
        }
      } catch {
        handleError();
      }
    },
    [
      creating,
      isMultiple,
      createItem,
      onItemCreated,
      onValueChange,
      getLabel,
      setSingleValue,
      setMultiValue,
    ],
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
    [performCreate, onValueChange, sentinel, setMultiValue],
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
    [performCreate, onValueChange, sentinel, setSingleValue],
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
    creating,
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
 * });
 *
 * // Or with custom debounce:
 * const countries = Combobox.useAsync({
 *   fetcher: {
 *     fn: async (query, { signal }) => { ... },
 *     debounceMs: 500,
 *   },
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

/**
 * Hook for robust string matching using `Intl.Collator`.
 *
 * Returns an object with `contains`, `startsWith`, and `endsWith` methods
 * that can be passed to the `filter` prop of `<Combobox.Parts.Root>`
 * to customize how items are filtered against the input value.
 *
 * Accepts `Intl.CollatorOptions` (e.g. `sensitivity`, `usage`) plus
 * an optional `locale` for locale-aware matching.
 *
 * @example
 * ```tsx
 * const filter = Combobox.useFilter({ sensitivity: "base" });
 *
 * <Combobox.Parts.Root filter={filter.contains}>
 *   ...
 * </Combobox.Parts.Root>
 * ```
 */
const useFilter = BaseCombobox.useFilter;

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
  useFilter,
};
