import * as React from "react";
import { useFieldRootContext } from "@base-ui/react/internals/field-root-context";

import { cn } from "@/lib/utils";

import { TreeRow } from "./TreeRow";
import { useTreeT } from "./i18n";
import { flattenVisible, type TreeNode } from "./tree-model";
import type { TreeChangeDetails, TreeProps, TreeSelectedItem } from "./types";
import { useTreeField } from "./use-tree-field";
import { useTreeFocus } from "./use-tree-focus";
import { useTreeSelection } from "./use-tree-selection";

type SubmittedEntry = { id: string; value: string };

/**
 * A multi-select checkbox tree for picking many items out of a
 * hierarchical catalog — products with variants, accounts with sub-accounts,
 * warehouses with bins. By default parents are containers: ticking one ticks
 * every enabled leaf beneath it, its checkbox shows checked or indeterminate from
 * its leaves, and the value lists leaves. `selectionPropagation` makes parents
 * items in their own right, and `valueStrategy` chooses what the value lists.
 *
 * Pass your own items with `mapItem` (as with `Select` / `Combobox`). The
 * selection is a list of keys, and the same key in two places is one item. When
 * codes repeat with different meanings, compose a unique key from the `parents`
 * that `mapItem` receives.
 *
 * It renders inline and works as a form control: `name` submits one hidden
 * input per selected leaf, and inside a `Field.Root` it picks up the label,
 * description, error, `required` and invalid state. For the common "pick, then
 * add" flow in a dialog, use {@link TreePicker}.
 *
 * The list scrolls inside the component, so give it a height (or a sized
 * container) for long trees.
 *
 * @example
 * ```tsx
 * const [bins, setBins] = useState<string[]>([]);
 *
 * <Field.Root name="bins">
 *   <Field.Label>Bins to count</Field.Label>
 *   <Tree<Warehouse | Bin>
 *     className="astw:h-96"
 *     items={warehouses}
 *     mapItem={(item, { parents }) =>
 *       "bins" in item
 *         ? { key: item.id, label: item.name, children: item.bins }
 *         : { key: `${(parents[0] as Warehouse).id}/${item.code}`, label: item.code }
 *     }
 *     value={bins}
 *     onValueChange={setBins}
 *   />
 * </Field.Root>
 * ```
 */
export function Tree<T>(props: TreeProps<T>) {
  const {
    items,
    mapItem,
    renderItem,
    filter,
    emptyText,
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
  const t = useTreeT();
  const selectionPropagation = props.selectionPropagation ?? "full";
  // Only "all" keeps a parent's own state, so it's the only strategy when
  // parents are items (the types already rule the others out).
  const valueStrategy = selectionPropagation === "full" ? (props.valueStrategy ?? "leaves") : "all";
  const rootRef = React.useRef<HTMLDivElement>(null);
  const fieldRoot = useFieldRootContext();
  const treeDisabled = !!disabled || !!fieldRoot.disabled;

  /**
   * What the form submits for a selection: one entry per selected leaf, plus
   * the kept values that aren't in the tree. `id` (the key) keys the hidden
   * inputs, since two leaves can serialize to the same string.
   */
  const submittedEntries = React.useCallback(
    (selected: TreeSelectedItem<T>[], unknown: readonly string[]): SubmittedEntry[] => [
      ...selected.map((entry) => ({
        id: entry.key,
        value: itemToStringValue?.(entry.item, { parents: entry.parents }) ?? entry.key,
      })),
      ...unknown.map((key) => ({ id: key, value: key })),
    ],
    [itemToStringValue],
  );

  // The field bridge is created after the selection hook (it needs the current
  // value), so the change handler reaches it through a ref.
  const fieldChangeRef = React.useRef<(values: readonly string[]) => void>(() => {});
  const consumerOnValueChange = props.onValueChange;

  const handleValueChange = React.useCallback(
    (value: string[], details: TreeChangeDetails<T>) => {
      consumerOnValueChange?.(value, details);
      const selectedKeys = new Set(details.selected.map((entry) => entry.key));
      const unknown = value.filter((key) => !selectedKeys.has(key));
      fieldChangeRef.current(
        submittedEntries(details.selected, unknown).map((entry) => entry.value),
      );
    },
    [consumerOnValueChange, submittedEntries],
  );

  const {
    tree,
    kept,
    isExpanded,
    toggleExpand,
    setExpanded,
    getCheckState,
    toggleNode,
    selected,
    unknown,
  } = useTreeSelection({
    items,
    mapItem,
    filter,
    disabled: treeDisabled,
    // A `value` prop that is present but `undefined` (e.g. a form reset) is
    // still controlled: it means "nothing selected".
    controlled: "value" in props,
    selectionPropagation,
    valueStrategy,
    value: props.value,
    defaultValue: props.defaultValue,
    onValueChange: handleValueChange,
  });

  const entries = React.useMemo(
    () => submittedEntries(selected, unknown),
    [submittedEntries, selected, unknown],
  );
  const values = React.useMemo(() => entries.map((entry) => entry.value), [entries]);

  const field = useTreeField({
    id,
    name,
    disabled,
    values,
    ariaLabelledBy,
    onBlur,
    rootRef,
    inputRef,
  });
  fieldChangeRef.current = field.handleChange;

  const hasBranches = tree.some((node) => !node.isLeaf);

  const isChecked = React.useCallback(
    (node: TreeNode<T>) => getCheckState(node).checked,
    [getCheckState],
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
      data-slot="tree"
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
        value={field.proxyValue}
        onChange={() => {}}
        onFocus={focusTree}
        className="astw:pointer-events-none astw:absolute astw:size-px astw:overflow-hidden astw:opacity-0"
      />
      {field.name && !field.isDisabled
        ? entries.map((entry) => (
            <input key={entry.id} type="hidden" name={field.name} form={form} value={entry.value} />
          ))
        : null}

      {visibleRows.length === 0 ? (
        <div
          data-slot="tree-empty"
          className="astw:text-muted-foreground astw:flex-1 astw:px-6 astw:py-8 astw:text-center astw:text-body-md"
        >
          {emptyText ?? (filter ? t("emptyText") : t("noItems"))}
        </div>
      ) : (
        <div
          role="tree"
          aria-multiselectable="true"
          aria-label={field.labelledBy ? undefined : ariaLabel}
          aria-labelledby={field.labelledBy}
          aria-describedby={field.describedBy}
          aria-required={required || undefined}
          aria-invalid={field.isInvalid || undefined}
          aria-disabled={treeDisabled || undefined}
          data-slot="tree-list"
          // Keys are handled on the tree itself, so controls around it keep their
          // own keys (Enter never fires from them).
          onKeyDown={handleKeyDown}
          // Focus lives on the rows (roving tabindex); -1 keeps the tree itself
          // programmatically focusable without adding a second tab stop.
          tabIndex={-1}
          className="astw:min-h-0 astw:flex-1 astw:overflow-y-auto astw:outline-none"
        >
          {kept.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              depth={0}
              hasBranches={hasBranches}
              isExpanded={isExpanded}
              onToggleExpand={toggleExpand}
              getCheckState={getCheckState}
              onToggleNode={toggleNode}
              renderItem={renderItem}
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
Tree.displayName = "Tree";
