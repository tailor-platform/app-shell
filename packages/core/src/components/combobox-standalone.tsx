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
import type { UseCreatableOptionsBase } from "./combobox";
import type { AsyncFetcher } from "@/hooks/use-async-items";
import type { MappedItem } from "./select-standalone";

const defaultMapItem = (item: unknown): MappedItem => ({ label: String(item) });

// --- Types ---

interface ComboboxItemGroup<T> {
  label: string;
  items: T[];
}

type ExtractItem<I> = I extends ComboboxItemGroup<infer T> ? T : I;

function isGroupedItems<I>(items: I[]): items is (I & ComboboxItemGroup<unknown>)[] {
  return (
    items.length > 0 &&
    typeof items[0] === "object" &&
    items[0] !== null &&
    "label" in items[0] &&
    "items" in items[0]
  );
}

// --- Shared props ---

interface ComboboxStandalonePropsBase<T> {
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

interface ComboboxStandalonePropsSingle<T> extends ComboboxStandalonePropsBase<T> {
  multiple?: false | undefined;
  /** Current value (controlled) */
  value?: T | null;
  /** Default value (uncontrolled) */
  defaultValue?: T | null;
  /** Called when the selected value changes */
  onValueChange?: (value: T | null) => void;
}

interface ComboboxStandalonePropsMultiple<T> extends ComboboxStandalonePropsBase<T> {
  multiple: true;
  /** Current value (controlled) */
  value?: T[];
  /** Default value (uncontrolled) */
  defaultValue?: T[];
  /** Called when the selected values change */
  onValueChange?: (value: T[]) => void;
}

// --- Combobox (basic single / multiple) ---

type ComboboxStaticProps<I> =
  | ({ items: I[] } & ComboboxStandalonePropsSingle<ExtractItem<I>>)
  | ({ items: I[] } & ComboboxStandalonePropsMultiple<ExtractItem<I>>);

function ComboboxStandalone<I>(props: ComboboxStaticProps<I>) {
  type T = ExtractItem<I>;

  const {
    items,
    placeholder,
    emptyText = "No results.",
    mapItem: mapItemProp,
    className,
    disabled,
    ...rest
  } = props;

  const mapItem = (mapItemProp ?? defaultMapItem) as (item: T) => MappedItem;
  const getLabel = (item: T) => mapItem(item).label;

  const listChildren = isGroupedItems(items)
    ? (group: any) => {
        const g = group as ComboboxItemGroup<T>;
        return (
          <ComboboxGroup key={g.label} items={g.items}>
            <ComboboxGroupLabel>{g.label}</ComboboxGroupLabel>
            <ComboboxCollection>
              {(item: any) => {
                const mapped = mapItem(item as T);
                return (
                  <ComboboxItem key={mapped.key ?? mapped.label} value={item}>
                    {mapped.render ?? mapped.label}
                  </ComboboxItem>
                );
              }}
            </ComboboxCollection>
          </ComboboxGroup>
        );
      }
    : (item: any) => {
        const mapped = mapItem(item as T);
        return (
          <ComboboxItem key={mapped.key ?? mapped.label} value={item}>
            {mapped.render ?? mapped.label}
          </ComboboxItem>
        );
      };

  if (rest.multiple) {
    const { value, defaultValue, onValueChange } = rest as ComboboxStandalonePropsMultiple<T>;
    return (
      <div className={className}>
        <ComboboxRoot<T, true>
          multiple
          items={items as any}
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          itemToStringLabel={getLabel}
          disabled={disabled}
        >
          <ComboboxInputGroup>
            <ComboboxChips>
              <ComboboxValue>
                {(selected: T[]) => (
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
            <ComboboxEmpty>{emptyText}</ComboboxEmpty>
            <ComboboxList>{listChildren}</ComboboxList>
          </ComboboxContent>
        </ComboboxRoot>
      </div>
    );
  }

  const { value, defaultValue, onValueChange } = rest as ComboboxStandalonePropsSingle<T>;
  return (
    <div className={className}>
      <ComboboxRoot<T>
        items={items as any}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        itemToStringLabel={getLabel}
        disabled={disabled}
      >
        <ComboboxInputGroup>
          <ComboboxInput placeholder={placeholder} />
          <ComboboxClear />
          <ComboboxTrigger />
        </ComboboxInputGroup>
        <ComboboxContent>
          <ComboboxEmpty>{emptyText}</ComboboxEmpty>
          <ComboboxList>{listChildren}</ComboboxList>
        </ComboboxContent>
      </ComboboxRoot>
    </div>
  );
}

// --- Combobox.Async ---

interface ComboboxAsyncPropsBase<T> extends ComboboxStandalonePropsBase<T> {
  /** Fetcher for async item loading. Pass a function for default debounce, or `{ fn, debounceMs }` to customize. */
  fetcher: AsyncFetcher<T>;
  /** Text shown while loading. @default "Loading..." */
  loadingText?: string;
}

type ComboboxAsyncProps<T> =
  | (ComboboxAsyncPropsBase<T> & ComboboxStandalonePropsSingle<T>)
  | (ComboboxAsyncPropsBase<T> & ComboboxStandalonePropsMultiple<T>);

function ComboboxAsyncStandalone<T>(props: ComboboxAsyncProps<T>) {
  const {
    fetcher,
    placeholder,
    emptyText = "No results.",
    loadingText = "Loading...",
    mapItem: mapItemProp,
    className,
    disabled,
    ...rest
  } = props;

  const async = useAsync({ fetcher });
  const mapItem = (mapItemProp ?? defaultMapItem) as (item: T) => MappedItem;
  const getLabel = (item: T) => mapItem(item).label;

  if (rest.multiple) {
    const { value, defaultValue, onValueChange } = rest;
    return (
      <div className={className}>
        <ComboboxRoot<T, true>
          multiple
          items={async.items}
          filter={null}
          onInputValueChange={async.onInputValueChange}
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          itemToStringLabel={getLabel}
          disabled={disabled}
        >
          <ComboboxInputGroup>
            <ComboboxChips>
              <ComboboxValue>
                {(selected: T[]) => (
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
            <ComboboxEmpty>{async.loading ? loadingText : emptyText}</ComboboxEmpty>
            <ComboboxList>
              {(item: T) => {
                const mapped = mapItem(item);
                return (
                  <ComboboxItem key={mapped.key ?? mapped.label} value={item}>
                    {mapped.render ?? mapped.label}
                  </ComboboxItem>
                );
              }}
            </ComboboxList>
          </ComboboxContent>
        </ComboboxRoot>
      </div>
    );
  }

  const { value, defaultValue, onValueChange } = rest;
  return (
    <div className={className}>
      <ComboboxRoot
        items={async.items}
        filter={null}
        onInputValueChange={async.onInputValueChange}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        itemToStringLabel={getLabel}
        disabled={disabled}
      >
        <ComboboxInputGroup>
          <ComboboxInput placeholder={placeholder} />
          <ComboboxClear />
          <ComboboxTrigger />
        </ComboboxInputGroup>
        <ComboboxContent>
          <ComboboxEmpty>{async.loading ? loadingText : emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(item: T) => {
              const mapped = mapItem(item);
              return (
                <ComboboxItem key={mapped.key ?? mapped.label} value={item}>
                  {mapped.render ?? mapped.label}
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxContent>
      </ComboboxRoot>
    </div>
  );
}

// --- Combobox.Creatable ---

/**
 * `T` must be an object type because the creatable mechanism uses a sentinel
 * object for identity comparison — primitive types (string, number) would
 * collide with real items.
 */
interface ComboboxCreatablePropsBase<T extends object> extends ComboboxStandalonePropsBase<T> {
  /** Current items list */
  items: T[];
  /** Map each item to its label, key, and optional custom render. Required for creatable. */
  mapItem: (item: T) => MappedItem;
  /** Factory to create a new item from user input string */
  createItem: (value: string) => T;
  /** Called when a new item is created */
  onItemCreated?: UseCreatableOptionsBase<T>["onItemCreated"];
  /** Format the label for the "create" option. @default (v) => `Create "${v}"` */
  formatCreateLabel?: (value: string) => string;
}

interface ComboboxCreatablePropsSingle<T extends object> extends ComboboxCreatablePropsBase<T> {
  multiple?: false | undefined;
  value?: T | null;
  defaultValue?: T | null;
  onValueChange?: (value: T | null) => void;
}

interface ComboboxCreatablePropsMultiple<T extends object> extends ComboboxCreatablePropsBase<T> {
  multiple: true;
  value?: T[];
  defaultValue?: T[];
  onValueChange?: (value: T[]) => void;
}

type ComboboxCreatableProps<T extends object> =
  | ComboboxCreatablePropsSingle<T>
  | ComboboxCreatablePropsMultiple<T>;

function ComboboxCreatableStandalone<T extends object>(props: ComboboxCreatableProps<T>) {
  const {
    items,
    placeholder,
    emptyText = "No results.",
    mapItem,
    createItem,
    onItemCreated,
    formatCreateLabel: formatCreateLabelProp,
    className,
    disabled,
    ...rest
  } = props;

  const getLabel = (item: T) => mapItem(item).label;

  if (rest.multiple) {
    const { value, defaultValue, onValueChange } = rest;
    const creatable = useCreatable({
      items,
      multiple: true,
      getLabel,
      createItem,
      onItemCreated,
      formatCreateLabel: formatCreateLabelProp,
      defaultValue,
      onValueChange,
    });

    return (
      <div className={className}>
        <ComboboxRoot<T, true>
          multiple
          items={creatable.items}
          value={value ?? creatable.value}
          onValueChange={creatable.onValueChange}
          inputValue={creatable.inputValue}
          onInputValueChange={creatable.onInputValueChange}
          itemToStringLabel={creatable.itemToStringLabel}
          itemToStringValue={creatable.itemToStringValue}
          disabled={disabled}
        >
          <ComboboxInputGroup>
            <ComboboxChips>
              <ComboboxValue>
                {(selected: T[]) => (
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
            <ComboboxEmpty>{emptyText}</ComboboxEmpty>
            <ComboboxList>
              {(item: T) => {
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
              }}
            </ComboboxList>
          </ComboboxContent>
        </ComboboxRoot>
      </div>
    );
  }

  const { value, defaultValue, onValueChange } = rest;
  const creatable = useCreatable({
    items,
    getLabel,
    createItem,
    onItemCreated,
    formatCreateLabel: formatCreateLabelProp,
    defaultValue,
    onValueChange,
  });

  return (
    <div className={className}>
      <ComboboxRoot
        items={creatable.items}
        value={value ?? creatable.value}
        onValueChange={creatable.onValueChange}
        inputValue={creatable.inputValue}
        onInputValueChange={creatable.onInputValueChange}
        itemToStringLabel={creatable.itemToStringLabel}
        itemToStringValue={creatable.itemToStringValue}
        disabled={disabled}
      >
        <ComboboxInputGroup>
          <ComboboxInput placeholder={placeholder} />
          <ComboboxClear />
          <ComboboxTrigger />
        </ComboboxInputGroup>
        <ComboboxContent>
          <ComboboxEmpty>{emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(item: T) => {
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
            }}
          </ComboboxList>
        </ComboboxContent>
      </ComboboxRoot>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

const Combobox = Object.assign(ComboboxStandalone, {
  Async: ComboboxAsyncStandalone,
  Creatable: ComboboxCreatableStandalone,
  Parts: ComboboxParts,
});

export { Combobox, type AsyncFetcher };
