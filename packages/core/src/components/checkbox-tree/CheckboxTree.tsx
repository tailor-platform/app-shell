import * as React from "react";
import { SearchIcon } from "lucide-react";
import { useFieldRootContext } from "@base-ui/react/internals/field-root-context";

import { Input } from "@/components/input";
import { cn } from "@/lib/utils";

import { CheckboxTreeRow, columnCellProps } from "./CheckboxTreeRow";
import { useCheckboxTreeT } from "./i18n";
import { checkState, flattenVisible, type TreeNode } from "./tree-model";
import type {
  CheckboxTreeChangeDetails,
  CheckboxTreeProps,
  CheckboxTreeSelectedItem,
  CheckboxTreeSelection,
  CheckboxTreeValueProps,
} from "./types";
import { useCheckboxTreeField } from "./use-checkbox-tree-field";
import { useTreeFocus } from "./use-tree-focus";
import { useTreeSelection } from "./use-tree-selection";

/**
 * A searchable, multi-select checkbox tree for picking many items out of a
 * hierarchical catalog — products with variants, accounts with sub-accounts,
 * warehouses with bins. Selection is leaf-only: ticking a parent selects every
 * enabled leaf beneath it, and a parent's checkbox shows checked or
 * indeterminate from its leaves.
 *
 * Pass your own items with `mapItem` (as with `Select` / `Combobox`). A key only
 * has to be unique among its siblings. The selection is either a list of leaf
 * keys (`valueShape: "keys"`, the default) or an exact nested selection
 * (`valueShape: "exact"`) when the same key means different things under
 * different parents.
 *
 * It renders inline and works as a form control: `name` submits one hidden
 * input per selected leaf, and inside a `Field.Root` it picks up the label,
 * description, error, `required` and invalid state. For the common "pick, then
 * add" flow in a dialog, use {@link CheckboxTreePicker}.
 *
 * The list scrolls inside the component, so give it a height (or a sized
 * container) for long trees.
 *
 * @example
 * ```tsx
 * const [bins, setBins] = useState<CheckboxTreeSelection>({});
 *
 * <Field.Root name="bins">
 *   <Field.Label>Bins to count</Field.Label>
 *   <CheckboxTree<Warehouse | Bin>
 *     className="astw:h-96"
 *     items={warehouses}
 *     mapItem={(item) =>
 *       "bins" in item
 *         ? { key: item.id, label: item.name, children: item.bins }
 *         : { key: item.code, label: item.code }
 *     }
 *     valueShape="exact"
 *     value={bins}
 *     onValueChange={setBins}
 *   />
 * </Field.Root>
 * ```
 */
export function CheckboxTree<T>(props: CheckboxTreeProps<T>) {
  const {
    items,
    mapItem,
    renderItem,
    itemHeader,
    leadingColumn,
    trailingColumn,
    matchesSearch,
    filterSlot,
    emptyText,
    searchPlaceholder,
    onAction,
    name,
    form,
    itemToStringValue,
    required,
    disabled,
    id,
    inputRef,
    onBlur,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    className,
  } = props;
  const t = useCheckboxTreeT();
  const exact = props.valueShape === "exact";
  const rootRef = React.useRef<HTMLDivElement>(null);
  const fieldRoot = useFieldRootContext();
  const treeDisabled = !!disabled || !!fieldRoot.disabled;

  /** The strings submitted for a selection — one per selected leaf. */
  const submittedValues = React.useCallback(
    (selected: CheckboxTreeSelectedItem<T>[], keys: readonly string[]): string[] => {
      const toString = (entry: CheckboxTreeSelectedItem<T>) =>
        itemToStringValue?.(entry.item, { path: entry.path, parents: entry.parents }) ??
        (exact ? entry.path.join("/") : entry.key);
      if (exact) return selected.map(toString);
      // Keys mode keeps keys that aren't in the tree; submit those as they are.
      const byKey = new Map(selected.map((entry) => [entry.key, entry]));
      return keys.map((key) => {
        const entry = byKey.get(key);
        return entry ? toString(entry) : key;
      });
    },
    [exact, itemToStringValue],
  );

  // The field bridge is created after the selection hook (it needs the current
  // value), so the change handler reaches it through a ref.
  const fieldChangeRef = React.useRef<(value: string) => void>(() => {});
  const consumerOnValueChange = props.onValueChange as
    | ((value: string[] | CheckboxTreeSelection, details: CheckboxTreeChangeDetails<T>) => void)
    | undefined;

  const handleValueChange = React.useCallback(
    (value: string[] | CheckboxTreeSelection, details: CheckboxTreeChangeDetails<T>) => {
      consumerOnValueChange?.(value, details);
      const keys = Array.isArray(value) ? value : [];
      fieldChangeRef.current(submittedValues(details.selected, keys).join("\n"));
    },
    [consumerOnValueChange, submittedValues],
  );

  const valueProps = {
    valueShape: props.valueShape,
    value: props.value,
    defaultValue: props.defaultValue,
    onValueChange: handleValueChange,
  } as CheckboxTreeValueProps<T>;

  const {
    tree,
    query,
    setQuery,
    kept,
    isExpanded,
    toggleExpand,
    setExpanded,
    isSelected,
    toggleNode,
    selected,
    keys,
  } = useTreeSelection({ items, mapItem, matchesSearch, disabled: treeDisabled, ...valueProps });

  const values = React.useMemo(
    () => submittedValues(selected, keys),
    [submittedValues, selected, keys],
  );
  const inputValue = values.join("\n");

  const field = useCheckboxTreeField({
    id,
    name,
    disabled,
    inputValue,
    ariaLabelledBy,
    onBlur,
    rootRef,
    inputRef,
  });
  fieldChangeRef.current = field.handleChange;

  const hasBranches = tree.some((node) => !node.isLeaf);

  const isChecked = React.useCallback(
    (node: TreeNode<T>) => checkState(node, isSelected).checked,
    [isSelected],
  );

  // With no `onAction`, Enter on a row submits the owning form — as Enter in a
  // text input does.
  const resolvedOnAction = React.useCallback(() => {
    if (onAction) {
      onAction();
      return;
    }
    const owner = form ? document.getElementById(form) : rootRef.current?.closest("form");
    if (owner instanceof HTMLFormElement) owner.requestSubmit();
  }, [form, onAction]);

  // Rendering is recursive but keyboard navigation needs the flat, visible
  // order — both derive from the same `isExpanded` predicate, so they agree.
  const visibleRows = React.useMemo(() => flattenVisible(kept, isExpanded), [kept, isExpanded]);

  const { activeRowId, registerRow, onRowFocus, handleKeyDown } = useTreeFocus({
    rows: visibleRows,
    setExpanded,
    toggleNode,
    isChecked,
    onAction: resolvedOnAction,
  });

  /** Label clicks and form validation focus the proxy; hand focus to the tree's tab stop. */
  const focusTree = React.useCallback(() => {
    const target =
      rootRef.current?.querySelector<HTMLElement>('[role="treeitem"][tabindex="0"]') ??
      rootRef.current?.querySelector<HTMLElement>('[role="treeitem"]');
    target?.focus();
  }, []);

  return (
    <div
      ref={rootRef}
      data-slot="checkbox-tree"
      data-disabled={treeDisabled || undefined}
      data-invalid={field.isInvalid || undefined}
      onFocus={field.handleFocus}
      onBlur={field.handleBlur}
      className={cn(
        "astw:relative astw:flex astw:min-h-0 astw:flex-col astw:data-invalid:border-danger-solid",
        className,
      )}
    >
      {/* Proxy for Field / Form: carries `required` and validity; nameless, so
          it is never submitted itself. */}
      <input
        ref={field.proxyRef}
        id={field.controlId}
        form={form}
        tabIndex={-1}
        aria-hidden="true"
        disabled={field.isDisabled}
        required={required}
        value={inputValue}
        onChange={() => {}}
        onFocus={focusTree}
        className="astw:pointer-events-none astw:absolute astw:size-px astw:overflow-hidden astw:opacity-0"
      />
      {field.name && !field.isDisabled
        ? values.map((value) => (
            <input key={value} type="hidden" name={field.name} form={form} value={value} />
          ))
        : null}

      <div
        data-slot="checkbox-tree-search"
        className="astw:flex astw:items-center astw:gap-2 astw:px-6 astw:pt-4 astw:pb-3"
      >
        <div
          className={cn(
            "astw:bg-muted/40 astw:flex astw:flex-1 astw:items-center astw:gap-2 astw:rounded-md astw:px-3",
            // The input drops its own ring to sit flush in this wrapper, so the
            // wrapper shows focus instead.
            "astw:focus-within:ring-ring/50 astw:focus-within:ring-[3px]",
          )}
        >
          <SearchIcon className="astw:text-muted-foreground astw:size-4 astw:shrink-0" />
          <Input
            // `search` gives the browser's clear (✕) button, as in DataTable's
            // field search.
            type="search"
            value={query}
            disabled={treeDisabled}
            onChange={(event) => setQuery(event.target.value)}
            // Escape with text clears the search first; with an empty box it
            // falls through (e.g. to close a surrounding dialog).
            onKeyDown={(event) => {
              if (event.key !== "Escape" || query === "") return;
              event.preventDefault();
              event.stopPropagation();
              setQuery("");
            }}
            placeholder={searchPlaceholder ?? t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            // `dark:bg-transparent` is not redundant: Input ships `dark:bg-input/30`,
            // which tailwind-merge will not dedupe against a bare `bg-transparent`,
            // so in dark mode it paints a second fill over the wrapper's own.
            className="astw:focus-visible:ring-0 astw:border-0 astw:bg-transparent astw:dark:bg-transparent astw:px-0 astw:shadow-none"
          />
        </div>
        {filterSlot}
      </div>

      <div
        data-slot="checkbox-tree-column-header"
        aria-hidden
        className="astw:bg-muted/40 astw:text-muted-foreground astw:border-border astw:flex astw:items-center astw:gap-3 astw:border-y astw:px-4 astw:py-2 astw:text-label-sm astw:tracking-wide astw:uppercase"
      >
        {/* Mirrors the row's checkbox + caret so the labels line up. */}
        <span className="astw:size-4 astw:shrink-0" />
        <span className="astw:size-5 astw:shrink-0" />
        {leadingColumn ? (
          <div {...columnCellProps(leadingColumn, "leading")}>{leadingColumn.header}</div>
        ) : null}
        <div className="astw:min-w-0 astw:flex-1">{itemHeader ?? t("itemHeader")}</div>
        {trailingColumn ? (
          <div {...columnCellProps(trailingColumn, "trailing")}>{trailingColumn.header}</div>
        ) : null}
      </div>

      {visibleRows.length === 0 ? (
        <div
          data-slot="checkbox-tree-empty"
          className="astw:text-muted-foreground astw:flex-1 astw:px-6 astw:py-8 astw:text-center astw:text-body-md"
        >
          {emptyText ?? t("emptyText")}
        </div>
      ) : (
        <div
          role="tree"
          aria-multiselectable="true"
          aria-label={field.labelledBy ? undefined : ariaLabel}
          aria-labelledby={field.labelledBy}
          aria-describedby={field.describedBy}
          aria-required={required || undefined}
          aria-disabled={treeDisabled || undefined}
          data-slot="checkbox-tree-list"
          // Keys are handled on the tree itself, so the search box and anything
          // in `filterSlot` keep their own keys (Enter never fires from them).
          onKeyDown={handleKeyDown}
          // Focus lives on the rows (roving tabindex); -1 keeps the tree itself
          // programmatically focusable without adding a second tab stop.
          tabIndex={-1}
          className="astw:min-h-0 astw:flex-1 astw:overflow-y-auto astw:outline-none"
        >
          {kept.map((node) => (
            <CheckboxTreeRow
              key={node.id}
              node={node}
              depth={0}
              hasBranches={hasBranches}
              isExpanded={isExpanded}
              onToggleExpand={toggleExpand}
              isSelected={isSelected}
              onToggleNode={toggleNode}
              renderItem={renderItem}
              leadingColumn={leadingColumn}
              trailingColumn={trailingColumn}
              activeRowId={activeRowId}
              registerRow={registerRow}
              onRowFocus={onRowFocus}
              treeDisabled={treeDisabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
CheckboxTree.displayName = "CheckboxTree";
