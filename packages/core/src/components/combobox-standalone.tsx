import * as React from "react";
import {
  ComboboxRoot,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxClear,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxValue,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxCollection,
  ComboboxParts,
  useCreatable,
  useAsync,
} from "./combobox";

import { defaultMapItem, isGroupedItems } from "./dropdown-items";
import type { MappedItem, ItemGroup, ExtractItem } from "./dropdown-items";
import type { AsyncFetcher } from "@/hooks/use-async-items";

/** Fetcher type for `Combobox.Async`. */
export type ComboboxAsyncFetcher<T> = AsyncFetcher<T>;

// --- Shared types ---

interface ComboboxPropsBase<T> {
  /** Placeholder text for the input */
  placeholder?: string;
  /** Text shown when no items match. @default "No results." */
  emptyText?: string;
  /** Map each item to its label, key, and optional custom render. */
  mapItem?: (item: T) => MappedItem;
  /** Additional className for the root container */
  className?: string;
  /** Whether the combobox is disabled */
  disabled?: boolean;
}

interface ComboboxPropsSingle<T> extends ComboboxPropsBase<T> {
  multiple?: false | undefined;
  /** Current value (controlled) */
  value?: T | null;
  /** Default value (uncontrolled) */
  defaultValue?: T | null;
  /** Called when the selected value changes */
  onValueChange?: (value: T | null) => void;
}

interface ComboboxPropsMultiple<T> extends ComboboxPropsBase<T> {
  multiple: true;
  /** Current value (controlled) */
  value?: T[];
  /** Default value (uncontrolled) */
  defaultValue?: T[];
  /** Called when the selected values change */
  onValueChange?: (value: T[]) => void;
}

/**
 * Creatable opt-in props. When `onCreateItem` is provided, the combobox allows
 * users to create new items on-the-fly.
 *
 * `T` must be an object type because the creatable mechanism uses a sentinel
 * object for identity comparison — primitive types (string, number) would
 * collide with real items.
 */
interface CreatableProps<T extends object> {
  /**
   * Called when the user selects the "create" option.
   *
   * Return values control what happens next:
   * - `T` — accept the item and add it to the selection
   * - `false` — cancel the creation (item is NOT selected)
   *
   * May return a `Promise` for async workflows.
   * A rejected promise also cancels the creation.
   */
  onCreateItem: (value: string) => T | false | Promise<T | false>;
  /** Map each item to its label, key, and optional custom render. Required when creatable. */
  mapItem: (item: T) => MappedItem;
  /** Format the label for the "create" option. @default (v) => `Create "${v}"` */
  formatCreateLabel?: (value: string) => string;
}

interface CreatableInternalProps<T extends object> {
  items: T[];
  placeholder?: string;
  emptyText?: string;
  mapItem: (item: T) => MappedItem;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
  value?: T | T[] | null;
  defaultValue?: T | T[] | null;
  onValueChange?: ((value: T | null) => void) | ((value: T[]) => void);
  onCreateItem: (value: string) => T | false | Promise<T | false>;
  formatCreateLabel?: (value: string) => string;
}

// ============================================================================
// Combobox (static items)
// ============================================================================

// -- Non-creatable --

/**
 * @property items - Items to display. May be a flat array of `T` or an array of
 * `ItemGroup<T>`. Items are identified as groups by the presence of
 * `label: string` and `items: T[]` fields — avoid item types whose
 * shape coincidentally matches this structure.
 */
type ComboboxStaticPlainProps<I> =
  | ({ items: I[] } & ComboboxPropsSingle<ExtractItem<I>>)
  | ({ items: I[] } & ComboboxPropsMultiple<ExtractItem<I>>);

// -- Creatable --

type ComboboxStaticCreatableProps<T extends object> =
  | ({ items: T[] } & CreatableProps<T> & Omit<ComboboxPropsSingle<T>, "mapItem">)
  | ({ items: T[] } & CreatableProps<T> & Omit<ComboboxPropsMultiple<T>, "mapItem">);

// ============================================================================
// Shared internal layout — single place for single vs multiple rendering
// ============================================================================

function ComboboxShell({
  className,
  placeholder,
  disabled,
  emptyContent,
  mapItem,
  listChildren,
  multiple,
  rootProps,
}: {
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  emptyContent: React.ReactNode;
  mapItem: (item: any) => MappedItem;
  listChildren: any;
  multiple?: boolean;
  rootProps: Record<string, any>;
}) {
  if (multiple) {
    return (
      <div className={className}>
        <ComboboxRoot multiple {...rootProps} disabled={disabled}>
          <ComboboxInputGroup>
            <ComboboxChips>
              <ComboboxValue>
                {(selected: any[]) => (
                  <>
                    {selected.map((item) => {
                      const mapped = mapItem(item);
                      return (
                        <ComboboxChip key={mapped.key ?? mapped.label} aria-label={mapped.label}>
                          {mapped.label}
                          <ComboboxChipRemove />
                        </ComboboxChip>
                      );
                    })}
                    <ComboboxInput placeholder={selected.length > 0 ? "" : placeholder} />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
          </ComboboxInputGroup>
          <ComboboxContent>
            <ComboboxEmpty>{emptyContent}</ComboboxEmpty>
            <ComboboxList>{listChildren}</ComboboxList>
          </ComboboxContent>
        </ComboboxRoot>
      </div>
    );
  }

  return (
    <div className={className}>
      <ComboboxRoot {...rootProps} disabled={disabled}>
        <ComboboxInputGroup>
          <ComboboxInput placeholder={placeholder} />
          <ComboboxClear />
          <ComboboxTrigger />
        </ComboboxInputGroup>
        <ComboboxContent>
          <ComboboxEmpty>{emptyContent}</ComboboxEmpty>
          <ComboboxList>{listChildren}</ComboboxList>
        </ComboboxContent>
      </ComboboxRoot>
    </div>
  );
}

// ============================================================================
// Shared item renderers
// ============================================================================

function flatItemRenderer<T>(mapItem: (item: T) => MappedItem) {
  return (item: T) => {
    const mapped = mapItem(item);
    return (
      <ComboboxItem key={mapped.key ?? mapped.label} value={item}>
        {mapped.render ?? mapped.label}
      </ComboboxItem>
    );
  };
}

function creatableItemRenderer<T>(
  mapItem: (item: T) => MappedItem,
  creatable: {
    isCreateItem: (item: T) => boolean;
    formatCreateLabel: (v: string) => string;
    getCreateLabel: (item: T) => string | undefined;
  },
) {
  return (item: T) => {
    if (creatable.isCreateItem(item)) {
      return (
        <ComboboxItem key="__create__" value={item}>
          {creatable.formatCreateLabel(creatable.getCreateLabel(item) ?? "")}
        </ComboboxItem>
      );
    }
    const mapped = mapItem(item);
    return (
      <ComboboxItem key={mapped.key ?? mapped.label} value={item}>
        {mapped.render ?? mapped.label}
      </ComboboxItem>
    );
  };
}

// ============================================================================
// Combobox — static base (no creatable)
// ============================================================================

function ComboboxStaticBase<I>(props: ComboboxStaticPlainProps<I>) {
  type T = ExtractItem<I>;

  const {
    items,
    placeholder,
    emptyText = "No results.",
    mapItem: mapItemProp,
    className,
    disabled,
    multiple,
    ...valueProps
  } = props;

  const mapItem = (mapItemProp ?? defaultMapItem) as (item: T) => MappedItem;
  const getLabel = (item: T) => mapItem(item).label;

  const listChildren = isGroupedItems(items)
    ? (group: any) => {
        const g = group as ItemGroup<T>;
        return (
          <ComboboxGroup key={g.label} items={g.items}>
            <ComboboxGroupLabel>{g.label}</ComboboxGroupLabel>
            <ComboboxCollection>{flatItemRenderer(mapItem)}</ComboboxCollection>
          </ComboboxGroup>
        );
      }
    : flatItemRenderer(mapItem);

  return (
    <ComboboxShell
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      emptyContent={emptyText}
      mapItem={mapItem}
      listChildren={listChildren}
      multiple={multiple}
      rootProps={{
        items,
        ...valueProps,
        itemToStringLabel: getLabel,
      }}
    />
  );
}

// ============================================================================
// Combobox — static with creatable
// ============================================================================

function ComboboxStaticCreatable<T extends object>(props: ComboboxStaticCreatableProps<T>) {
  const {
    items,
    placeholder,
    emptyText = "No results.",
    mapItem,
    onCreateItem,
    formatCreateLabel: formatCreateLabelProp,
    className,
    disabled,
    multiple,
    value,
    defaultValue,
    onValueChange,
  } = props as CreatableInternalProps<T>;

  const getLabel = (item: T) => mapItem(item).label;

  // Bridge onCreateItem → useCreatable's createItem + onItemCreated
  const createItem = (v: string) => ({ __pending: true, __value: v }) as unknown as T;

  const onItemCreated = (item: T) => {
    const pending = item as unknown as {
      __pending: boolean;
      __value: string;
    };
    return onCreateItem(pending.__value);
  };

  const creatableOptions = {
    items,
    multiple,
    getLabel,
    createItem,
    onItemCreated,
    formatCreateLabel: formatCreateLabelProp,
    defaultValue,
    onValueChange,
  };

  const creatable = useCreatable(creatableOptions);

  return (
    <ComboboxShell
      className={className}
      placeholder={placeholder}
      disabled={disabled || creatable.creating}
      emptyContent={emptyText}
      mapItem={mapItem}
      listChildren={creatableItemRenderer(mapItem, creatable)}
      multiple={multiple}
      rootProps={{
        items: creatable.items,
        value: value ?? creatable.value,
        onValueChange: creatable.onValueChange,
        inputValue: creatable.inputValue,
        onInputValueChange: creatable.onInputValueChange,
        itemToStringLabel: creatable.itemToStringLabel,
        itemToStringValue: creatable.itemToStringValue,
      }}
    />
  );
}

// -- Dispatcher --

function ComboboxStandalone<T extends object>(
  props: ComboboxStaticCreatableProps<T>,
): React.JSX.Element;
function ComboboxStandalone<I>(props: ComboboxStaticPlainProps<I>): React.JSX.Element;
function ComboboxStandalone(props: any) {
  if ("onCreateItem" in props) {
    return <ComboboxStaticCreatable {...props} />;
  }
  return <ComboboxStaticBase {...props} />;
}

// ============================================================================
// Combobox.Async
// ============================================================================

interface ComboboxAsyncOwnProps<T> {
  /** Fetcher for async item loading. Pass a function for default debounce, or `{ fn, debounceMs }` to customize. */
  fetcher: ComboboxAsyncFetcher<T>;
  /** Text shown while loading. @default "Loading..." */
  loadingText?: string;
}

// -- Non-creatable --

type ComboboxAsyncPlainProps<T> =
  | (ComboboxAsyncOwnProps<T> & ComboboxPropsSingle<T>)
  | (ComboboxAsyncOwnProps<T> & ComboboxPropsMultiple<T>);

// -- Creatable --

type ComboboxAsyncCreatableProps<T extends object> =
  | (ComboboxAsyncOwnProps<T> & CreatableProps<T> & Omit<ComboboxPropsSingle<T>, "mapItem">)
  | (ComboboxAsyncOwnProps<T> & CreatableProps<T> & Omit<ComboboxPropsMultiple<T>, "mapItem">);

// ============================================================================
// Combobox.Async — base (no creatable)
// ============================================================================

function ComboboxAsyncBase<T>(props: ComboboxAsyncPlainProps<T>) {
  const {
    fetcher,
    placeholder,
    emptyText = "No results.",
    loadingText = "Loading...",
    mapItem: mapItemProp,
    className,
    disabled,
    multiple,
    ...valueProps
  } = props;

  const async = useAsync({ fetcher });
  const mapItem = (mapItemProp ?? defaultMapItem) as (item: T) => MappedItem;
  const getLabel = (item: T) => mapItem(item).label;

  return (
    <ComboboxShell
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      emptyContent={async.loading ? loadingText : emptyText}
      mapItem={mapItem}
      listChildren={flatItemRenderer(mapItem)}
      multiple={multiple}
      rootProps={{
        items: async.items,
        filter: null,
        onInputValueChange: async.onInputValueChange,
        onOpenChange: async.onOpenChange,
        ...valueProps,
        itemToStringLabel: getLabel,
      }}
    />
  );
}

// ============================================================================
// Combobox.Async — with creatable
// ============================================================================

function ComboboxAsyncCreatable<T extends object>(props: ComboboxAsyncCreatableProps<T>) {
  const {
    fetcher,
    placeholder,
    emptyText = "No results.",
    loadingText = "Loading...",
    mapItem,
    onCreateItem,
    formatCreateLabel: formatCreateLabelProp,
    className,
    disabled,
    multiple,
    value,
    defaultValue,
    onValueChange,
  } = props as ComboboxAsyncOwnProps<T> & CreatableInternalProps<T>;

  const async = useAsync({ fetcher });
  const getLabel = (item: T) => mapItem(item).label;

  // Bridge onCreateItem → useCreatable's createItem + onItemCreated
  const createItem = (v: string) => ({ __pending: true, __value: v }) as unknown as T;

  const onItemCreated = (item: T) => {
    const pending = item as unknown as {
      __pending: boolean;
      __value: string;
    };
    return onCreateItem(pending.__value);
  };

  const creatableOptions = {
    items: async.items,
    multiple,
    getLabel,
    createItem,
    onItemCreated,
    formatCreateLabel: formatCreateLabelProp,
    defaultValue,
    onValueChange,
  };

  const creatable = useCreatable(creatableOptions);

  return (
    <ComboboxShell
      className={className}
      placeholder={placeholder}
      disabled={disabled || creatable.creating}
      emptyContent={async.loading ? loadingText : emptyText}
      mapItem={mapItem}
      listChildren={creatableItemRenderer(mapItem, creatable)}
      multiple={multiple}
      rootProps={{
        items: creatable.items,
        filter: null,
        value: value ?? creatable.value,
        onValueChange: creatable.onValueChange,
        inputValue: creatable.inputValue,
        onInputValueChange: (v: string) => {
          creatable.onInputValueChange(v);
          async.onInputValueChange(v);
        },
        onOpenChange: async.onOpenChange,
        itemToStringLabel: creatable.itemToStringLabel,
        itemToStringValue: creatable.itemToStringValue,
      }}
    />
  );
}

// -- Dispatcher --

function ComboboxAsyncStandalone<T extends object>(
  props: ComboboxAsyncCreatableProps<T>,
): React.JSX.Element;
function ComboboxAsyncStandalone<T>(props: ComboboxAsyncPlainProps<T>): React.JSX.Element;
function ComboboxAsyncStandalone(props: any) {
  if ("onCreateItem" in props) {
    return <ComboboxAsyncCreatable {...props} />;
  }
  return <ComboboxAsyncBase {...props} />;
}

// ============================================================================
// Export
// ============================================================================

const Combobox = Object.assign(ComboboxStandalone, {
  Async: ComboboxAsyncStandalone,
  Parts: ComboboxParts,
});

export { Combobox };
