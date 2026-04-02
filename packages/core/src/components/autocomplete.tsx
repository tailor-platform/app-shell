import * as React from "react";
import { Autocomplete as BaseAutocomplete } from "@base-ui/react/autocomplete";
import type { AutocompleteRootProps } from "@base-ui/react/autocomplete";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAsyncItems } from "@/hooks/use-async-items";
import type { UseAsyncItemsOptions } from "@/hooks/use-async-items";

// Only the props relevant to the Autocomplete abstraction are picked from BaseAutocomplete.Root.
// Base UI-internal props are intentionally excluded so that
// upstream changes don't leak as breaking changes to consumers.
type AutocompletePickedRootProps<Value> = Pick<
  AutocompleteRootProps<Value>,
  "value" | "defaultValue" | "onValueChange" | "filter" | "disabled" | "children"
> & {
  items?: readonly Value[];
};

function AutocompleteRoot<Value>(props: AutocompletePickedRootProps<Value>) {
  return (
    <BaseAutocomplete.Root
      data-slot="autocomplete"
      {...(props as AutocompletePickedRootProps<unknown>)}
    />
  );
}
AutocompleteRoot.displayName = "Autocomplete.Root";

function AutocompleteValue({ ...props }: React.ComponentProps<typeof BaseAutocomplete.Value>) {
  return <BaseAutocomplete.Value data-slot="autocomplete-value" {...props} />;
}
AutocompleteValue.displayName = "Autocomplete.Value";

function AutocompleteInput({
  className,
  ...props
}: React.ComponentProps<typeof BaseAutocomplete.Input>) {
  return (
    <BaseAutocomplete.Input
      data-slot="autocomplete-input"
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
AutocompleteInput.displayName = "Autocomplete.Input";

function AutocompleteTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseAutocomplete.Trigger>) {
  return (
    <BaseAutocomplete.Trigger
      data-slot="autocomplete-trigger"
      className={cn(
        "astw:absolute astw:inset-y-0 astw:right-0 astw:flex astw:items-center astw:px-2 astw:text-muted-foreground astw:outline-none",
        "astw:hover:text-foreground",
        "astw:disabled:pointer-events-none astw:disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children ?? (
        <BaseAutocomplete.Icon>
          <ChevronDownIcon className="astw:size-4" />
        </BaseAutocomplete.Icon>
      )}
    </BaseAutocomplete.Trigger>
  );
}
AutocompleteTrigger.displayName = "Autocomplete.Trigger";

function AutocompleteInputGroup({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="autocomplete-input-group"
      className={cn("astw:relative astw:flex astw:items-center", className)}
      {...props}
    >
      {children ?? (
        <>
          <AutocompleteInput />
          <AutocompleteClear />
          <AutocompleteTrigger />
        </>
      )}
    </div>
  );
}
AutocompleteInputGroup.displayName = "Autocomplete.InputGroup";

function AutocompleteContent({
  className,
  ...props
}: React.ComponentProps<typeof BaseAutocomplete.Popup>) {
  return (
    <BaseAutocomplete.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
      <BaseAutocomplete.Positioner>
        <BaseAutocomplete.Popup
          data-slot="autocomplete-content"
          className={cn(
            "astw:bg-popover astw:text-popover-foreground astw:data-open:animate-in astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-open:fade-in-0 astw:data-ending-style:zoom-out-95 astw:data-open:zoom-in-95 astw:z-(--z-popup) astw:w-[var(--anchor-width)] astw:min-w-32 astw:origin-(--transform-origin) astw:overflow-hidden astw:rounded-md astw:border astw:shadow-md",
            className,
          )}
          {...props}
        />
      </BaseAutocomplete.Positioner>
    </BaseAutocomplete.Portal>
  );
}
AutocompleteContent.displayName = "Autocomplete.Content";

function AutocompleteList({
  className,
  ...props
}: React.ComponentProps<typeof BaseAutocomplete.List>) {
  return (
    <BaseAutocomplete.List
      data-slot="autocomplete-list"
      className={cn("astw:max-h-60 astw:overflow-y-auto astw:p-1", className)}
      {...props}
    />
  );
}
AutocompleteList.displayName = "Autocomplete.List";

function AutocompleteItem({
  className,
  ...props
}: React.ComponentProps<typeof BaseAutocomplete.Item>) {
  return (
    <BaseAutocomplete.Item
      data-slot="autocomplete-item"
      className={cn(
        "astw:relative astw:flex astw:w-full astw:cursor-default astw:items-center astw:gap-2 astw:rounded-sm astw:py-1.5 astw:px-2 astw:text-sm astw:outline-hidden astw:select-none",
        "astw:data-highlighted:bg-accent astw:data-highlighted:text-accent-foreground",
        "astw:data-disabled:pointer-events-none astw:data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
AutocompleteItem.displayName = "Autocomplete.Item";

function AutocompleteEmpty({
  className,
  ...props
}: React.ComponentProps<typeof BaseAutocomplete.Empty>) {
  return (
    <BaseAutocomplete.Empty
      data-slot="autocomplete-empty"
      className={cn(
        "astw:px-4 astw:pt-2 astw:pb-4 astw:text-center astw:text-sm astw:text-muted-foreground astw:empty:hidden",
        className,
      )}
      {...props}
    />
  );
}
AutocompleteEmpty.displayName = "Autocomplete.Empty";

function AutocompleteClear({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseAutocomplete.Clear>) {
  return (
    <BaseAutocomplete.Clear
      data-slot="autocomplete-clear"
      className={cn(
        "astw:absolute astw:inset-y-0 astw:right-6 astw:flex astw:items-center astw:px-1 astw:text-muted-foreground astw:outline-none",
        "astw:hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children ?? <XIcon className="astw:size-3.5" />}
    </BaseAutocomplete.Clear>
  );
}
AutocompleteClear.displayName = "Autocomplete.Clear";

function AutocompleteGroup({ ...props }: React.ComponentProps<typeof BaseAutocomplete.Group>) {
  return <BaseAutocomplete.Group data-slot="autocomplete-group" {...props} />;
}
AutocompleteGroup.displayName = "Autocomplete.Group";

function AutocompleteGroupLabel({
  className,
  ...props
}: React.ComponentProps<typeof BaseAutocomplete.GroupLabel>) {
  return (
    <BaseAutocomplete.GroupLabel
      data-slot="autocomplete-group-label"
      className={cn(
        "astw:text-muted-foreground astw:px-2 astw:py-1.5 astw:text-xs astw:font-medium",
        className,
      )}
      {...props}
    />
  );
}
AutocompleteGroupLabel.displayName = "Autocomplete.GroupLabel";

function AutocompleteCollection({
  ...props
}: React.ComponentProps<typeof BaseAutocomplete.Collection>) {
  return <BaseAutocomplete.Collection data-slot="autocomplete-collection" {...props} />;
}
AutocompleteCollection.displayName = "Autocomplete.Collection";

function AutocompleteStatus({
  className,
  ...props
}: React.ComponentProps<typeof BaseAutocomplete.Status>) {
  return (
    <BaseAutocomplete.Status
      data-slot="autocomplete-status"
      className={cn("astw:sr-only", className)}
      {...props}
    />
  );
}
AutocompleteStatus.displayName = "Autocomplete.Status";
// ============================================================================

/**
 * Return type of `Autocomplete.useAsync`.
 *
 * Unlike `Combobox.useAsync`, this does **not** include `onOpenChange`.
 * Autocomplete is driven by focus and typing — not by an explicit open/close
 * toggle — so `onOpenChange` is intentionally omitted.
 */
export interface AutocompleteUseAsyncReturn<T> {
  /** Fetched items — pass to the Root `items` prop */
  items: T[];
  /** Whether a fetch is currently in-flight */
  loading: boolean;
  /** Current input value — pass to the Root `value` prop */
  value: string;
  /** The error thrown by the last fetch, if any */
  error: unknown;
  /** Value change handler — pass to the Root `onValueChange` prop. */
  onValueChange: (value: string) => void;
}

/**
 * Hook that encapsulates the async autocomplete pattern — debounced fetching,
 * request cancellation via `AbortController`, and loading state.
 *
 * Pass `filter={null}` to `<Autocomplete.Root>` to disable internal filtering
 * since items are already filtered by the remote source.
 *
 * Unlike `Combobox.useAsync`, Autocomplete's value is always the input text
 * (there is no separate `inputValue` prop), so you must pass `value` and
 * `onValueChange` instead of `onInputValueChange`.
 *
 * @example
 * ```tsx
 * const movies = Autocomplete.useAsync({
 *   fetcher: async (query, { signal }) => {
 *     const res = await fetch(`/api/movies?q=${query ?? ""}`, { signal });
 *     if (!res.ok) return [];
 *     return res.json();
 *   },
 * });
 *
 * // Or with custom debounce:
 * const movies = Autocomplete.useAsync({
 *   fetcher: {
 *     fn: async (query, { signal }) => { ... },
 *     debounceMs: 500,
 *   },
 * });
 *
 * <Autocomplete.Root
 *   items={movies.items}
 *   value={movies.value}
 *   onValueChange={movies.onValueChange}
 *   filter={null}
 * >
 *   ...
 *   <Autocomplete.Empty>
 *     {movies.loading ? "Loading..." : "No results."}
 *   </Autocomplete.Empty>
 * </Autocomplete.Root>
 * ```
 */
function useAsync<T>(options: UseAsyncItemsOptions<T>): AutocompleteUseAsyncReturn<T> {
  const { items, loading, query, error, onInputValueChange } = useAsyncItems(options);

  return {
    items,
    loading,
    value: query,
    error,
    onValueChange: onInputValueChange,
  };
}

// ============================================================================
// Export
// ============================================================================

const AutocompleteParts = {
  Root: AutocompleteRoot,
  Value: AutocompleteValue,
  InputGroup: AutocompleteInputGroup,
  Input: AutocompleteInput,
  Trigger: AutocompleteTrigger,
  Content: AutocompleteContent,
  List: AutocompleteList,
  Item: AutocompleteItem,
  Empty: AutocompleteEmpty,
  Clear: AutocompleteClear,
  Group: AutocompleteGroup,
  GroupLabel: AutocompleteGroupLabel,
  Collection: AutocompleteCollection,
  Status: AutocompleteStatus,
  useFilter: BaseAutocomplete.useFilter,
  useAsync,
};

type AutocompleteParts = typeof AutocompleteParts;

export {
  AutocompleteRoot,
  AutocompleteValue,
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
  AutocompleteStatus,
  AutocompleteParts,
  useAsync,
};
