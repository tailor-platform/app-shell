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
  useFilter,
} from "./autocomplete";
import { defaultMapItem, isGroupedItems } from "../dropdown-items";
import type { MappedItem, ItemGroup, ExtractItem } from "../dropdown-items";
import { AsyncErrorState, resolveAsyncContent } from "../internals/async-error-state";
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
  /** A parent element to render the portal into (e.g. a modal/drawer ref). */
  container?: React.ComponentProps<typeof AutocompleteContent>["container"];
  /** Current value (controlled) */
  value?: string;
  /** Default value (uncontrolled) */
  defaultValue?: string;
  /** Called when the value changes */
  onValueChange?: (value: string) => void;
  /**
   * Accessible name for the input. Use when there is no visible label
   * (e.g. a table toolbar or list filter) so screen readers announce something
   * other than the current value.
   */
  "aria-label"?: string;
  /**
   * ID of the element(s) that label the input. Forwarded to the input — use
   * this to point at a visible `<label>`/heading.
   */
  "aria-labelledby"?: string;
  /** ID applied to the combobox input element. */
  id?: string;
  /**
   * Identifies the field when a form is submitted, so the current text is
   * picked up by native form submission — including `Form`'s `onFormSubmit`.
   *
   * Autocomplete's value is the raw input string, so no value-serialisation
   * hook is needed (unlike `Select` and `Combobox`).
   */
  name?: string;
  /**
   * `id` of the form that owns the input. Use when the autocomplete is
   * rendered outside the `<form>` element it belongs to.
   */
  form?: string;
  /** Whether a value must be entered before the owning form can be submitted. */
  required?: boolean;
  /** Ref to the underlying input element. */
  inputRef?: React.Ref<HTMLInputElement>;
}

// --- Autocomplete (static) ---

interface AutocompleteStandaloneProps<I> extends AutocompletePropsBase<ExtractItem<I>> {
  /**
   * Items to show as suggestions. May be a flat array of `T` or an array of
   * `ItemGroup<T>`. Items are identified as groups by the presence of
   * `label: string` and `items: T[]` fields — avoid item types whose
   * shape coincidentally matches this structure.
   */
  items: I[];
}

function AutocompleteStandalone<I>(props: AutocompleteStandaloneProps<I>) {
  type T = ExtractItem<I>;

  const {
    items,
    placeholder,
    emptyText = "No results.",
    mapItem: mapItemProp,
    className,
    disabled,
    container,
    value,
    defaultValue,
    onValueChange,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    id,
    name,
    form,
    required,
    inputRef,
  } = props;

  const mapItem = (mapItemProp ?? defaultMapItem) as (item: T) => MappedItem;

  const listChildren = isGroupedItems(items)
    ? (group: ItemGroup<T>) => {
        return (
          <AutocompleteGroup key={group.label} items={group.items}>
            <AutocompleteGroupLabel>{group.label}</AutocompleteGroupLabel>
            <AutocompleteCollection>
              {(item: T) => {
                const mapped = mapItem(item);
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
    : (item: T) => {
        const mapped = mapItem(item);
        return (
          <AutocompleteItem key={mapped.key ?? mapped.label} value={mapped.label}>
            {mapped.render ?? mapped.label}
          </AutocompleteItem>
        );
      };

  return (
    <div className={className}>
      <AutocompleteRoot
        items={items}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
        form={form}
        required={required}
        inputRef={inputRef}
      >
        <AutocompleteInputGroup>
          <AutocompleteInput
            placeholder={placeholder}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            id={id}
          />
          <AutocompleteClear />
          <AutocompleteTrigger />
        </AutocompleteInputGroup>
        <AutocompleteContent container={container}>
          <AutocompleteEmpty>{emptyText}</AutocompleteEmpty>
          <AutocompleteList>{listChildren}</AutocompleteList>
        </AutocompleteContent>
      </AutocompleteRoot>
    </div>
  );
}
AutocompleteStandalone.displayName = "Autocomplete";

// --- Autocomplete.Async ---

interface AutocompleteAsyncStandaloneProps<T> extends AutocompletePropsBase<T> {
  /** Fetcher for async item loading. Pass a function for default debounce, or `{ fn, debounceMs }` to customize. */
  fetcher: AutocompleteAsyncFetcher<T>;
  /** Text shown while loading. @default "Loading..." */
  loadingText?: string;
  /**
   * Message shown in the popover when the fetcher fails, alongside a Retry
   * affordance. Replaces the misleading empty state.
   * @default "Couldn't load results."
   */
  errorText?: string;
  /** Label for the retry button in the error state. @default "Retry" */
  retryText?: string;
  /**
   * Called when a fetch fails. Fires once per outage (not per failed keystroke)
   * and re-arms after the next success. Use for logging or error tracking — the
   * inline error state is shown regardless.
   */
  onFetchError?: (error: unknown) => void;
}

function AutocompleteAsyncStandalone<T>(props: AutocompleteAsyncStandaloneProps<T>) {
  const {
    fetcher,
    placeholder,
    emptyText = "No results.",
    loadingText = "Loading...",
    errorText = "Couldn't load results.",
    retryText = "Retry",
    onFetchError,
    mapItem: mapItemProp,
    className,
    disabled,
    container,
    value: controlledValue,
    defaultValue,
    onValueChange: onValueChangeProp,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    id,
    name,
    form,
    required,
    inputRef,
  } = props;

  const async = useAsync({ fetcher, onFetchError });
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
        name={name}
        form={form}
        required={required}
        inputRef={inputRef}
      >
        <AutocompleteInputGroup>
          <AutocompleteInput
            placeholder={placeholder}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            id={id}
          />
          <AutocompleteClear />
          <AutocompleteTrigger />
        </AutocompleteInputGroup>
        <AutocompleteContent container={container}>
          <AutocompleteEmpty>
            {resolveAsyncContent<React.ReactNode>({
              loading: async.loading,
              error: async.error,
              loadingContent: loadingText,
              errorContent: (
                <AsyncErrorState
                  slot="autocomplete-error"
                  message={errorText}
                  retryText={retryText}
                  onRetry={async.retry}
                />
              ),
              defaultContent: emptyText,
            })}
          </AutocompleteEmpty>
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
AutocompleteAsyncStandalone.displayName = "Autocomplete.Async";

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
 * - preserves consumer-side callback inference for `Autocomplete` and `Autocomplete.Async`
 */
type AutocompleteComponent = typeof AutocompleteStandalone & {
  Async: typeof AutocompleteAsyncStandalone;
  Parts: typeof AutocompleteParts;
  useAsync: typeof useAsync;
  useFilter: typeof useFilter;
};

const Autocomplete: AutocompleteComponent = Object.assign(AutocompleteStandalone, {
  Async: AutocompleteAsyncStandalone,
  Parts: AutocompleteParts,
  useAsync,
  useFilter,
});

export { Autocomplete };
