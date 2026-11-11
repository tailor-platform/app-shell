import * as React from "react";
import { useFieldRootContext } from "@base-ui/react/internals/field-root-context";

import { cn } from "@/lib/utils";

import { TreeRow } from "./tree-row";
import { useTreeT } from "./i18n";
import { flattenVisible, pathId, type TreeNode } from "@/lib/tree/model";
import type { TreeChangeDetails, TreeProps, TreeSelectedItem } from "./types";
import { useTreeField } from "./use-tree-field";
import { useTreeFocus } from "./use-tree-focus";
import { useTreeSelection } from "./use-tree-selection";

type SubmittedEntry = { id: string; value: string };

/**
 * A tree of your own items, for browsing hierarchies (accounts, locations,
 * categories), picking one node, or ticking many. It follows the ARIA tree
 * pattern: one tab stop, arrows to move and open, Space to select or tick, and
 * Enter for `onAction`.
 *
 * Pass your own items with `mapItem` (as with `Select` / `Combobox`). A key is
 * the item's identity across the whole tree: the same key in two places is one
 * item. When codes repeat with different meanings, compose a unique key from
 * the `parents` that `mapItem` receives.
 *
 * `selectionMode` sets what a row does:
 *
 * - `"none"` (default): browsing. Clicking a leaf runs `onAction`.
 * - `"single"`: one selected row (`selectedKey`), for master–detail views.
 * - `"checkbox"`: a multi-select form control (`value`). By default parents are
 *   containers: ticking one ticks every enabled leaf beneath it, and the value
 *   lists leaves. `selectionStrategy` changes that. `name`
 *   submits one hidden input per value key, and inside a `Field.Root` it picks
 *   up the label, description, error, `required` and invalid state.
 *
 * `filter` narrows the tree to matches and their ancestors. The tree has no
 * search box of its own; for the "search, pick, then add" flow in a dialog, use
 * {@link TreePicker}.
 *
 * The list scrolls inside the component, so give it a height (or a sized
 * container) for long trees.
 *
 * @example
 * ```tsx
 * // warehouses: (Warehouse | Bin)[], so `mapItem` can return either level.
 * const isWarehouse = (node: Warehouse | Bin): node is Warehouse => "bins" in node;
 * const [bins, setBins] = useState<string[]>([]);
 *
 * <Field.Root name="bins">
 *   <Field.Label>Bins to count</Field.Label>
 *   <Tree
 *     className="astw:h-96"
 *     items={warehouses}
 *     mapItem={(item, { parents }) =>
 *       isWarehouse(item)
 *         ? { key: item.id, label: item.name, children: item.bins }
 *         : // `parents` is the union too. A guard, unlike a cast, has TypeScript
 *           // check there's a warehouse above (hence `?.`).
 *           { key: `${parents.find(isWarehouse)?.id}/${item.code}`, label: item.code }
 *     }
 *     selectionMode="checkbox"
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
    disabled,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    className,
  } = props;
  const t = useTreeT();
  const selectionMode = props.selectionMode ?? "none";
  const checkbox = props.selectionMode === "checkbox" ? props : null;
  const single = props.selectionMode === "single" ? props : null;
  const itemToStringValue = checkbox?.itemToStringValue;
  const form = checkbox?.form;
  const required = checkbox?.required;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const fieldRoot = useFieldRootContext();
  const treeDisabled = !!disabled || (!!checkbox && !!fieldRoot.disabled);

  /**
   * What the form submits for a selection: one entry per value item, plus the
   * kept values that aren't in the tree. `id` (the key) keys the hidden inputs,
   * since two items can serialize to the same string.
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
  const consumerOnValueChange = checkbox?.onValueChange;

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
    toggleRow,
    selected,
    unknown,
    parentsAreContainers,
  } = useTreeSelection({
    items,
    mapItem,
    filter,
    disabled: treeDisabled,
    // A `value` prop that is present but `undefined` (e.g. a form reset) is
    // still controlled: it means "nothing selected".
    controlled: !!checkbox && "value" in checkbox,
    selectionStrategy: checkbox?.selectionStrategy,
    value: checkbox?.value,
    defaultValue: checkbox?.defaultValue,
    onValueChange: handleValueChange,
  });

  // `"single"`: one selected key, controlled or not.
  const [selectedKeyState, setSelectedKeyState] = React.useState<string | null>(
    () => single?.defaultSelectedKey ?? null,
  );
  const selectedKey =
    single && "selectedKey" in single ? (single.selectedKey ?? null) : selectedKeyState;
  const onSelectedKeyChange = single?.onSelectedKeyChange;

  /**
   * Whether a row is locked. An item's own or inherited `disabled` always
   * counts. Where parents are containers, one with no enabled leaves is locked
   * too; elsewhere a parent is an item in its own right and stays usable.
   */
  const lockEmptyParents = !!checkbox && parentsAreContainers;
  const isNodeDisabled = React.useCallback(
    (node: TreeNode<T>) => node.disabled || (lockEmptyParents && node.noEnabledLeaves),
    [lockEmptyParents],
  );

  const selectNode = React.useCallback(
    (node: TreeNode<T>) => {
      if (treeDisabled || isNodeDisabled(node) || node.key === selectedKey) return;
      setSelectedKeyState(node.key);
      onSelectedKeyChange?.(node.key, node.item);
    },
    [treeDisabled, isNodeDisabled, selectedKey, onSelectedKeyChange],
  );

  // `"single"`: the selected key's first row, and its ancestors' row ids.
  const selectedRow = React.useMemo(() => {
    if (!single || selectedKey === null) return null;
    const find = (list: ReadonlyArray<TreeNode<T>>): TreeNode<T> | null => {
      for (const node of list) {
        if (node.key === selectedKey) return node;
        const found = find(node.children);
        if (found) return found;
      }
      return null;
    };
    const node = find(tree);
    if (!node) return null;
    const ancestorIds = node.path.slice(0, -1).map((_, i) => pathId(node.path.slice(0, i + 1)));
    return { id: node.id, ancestorIds };
  }, [single, selectedKey, tree]);

  // Opens the selected row's ancestors when the selection starts out hidden or
  // is changed from outside (a click only ever selects a visible row). Keyed
  // on the row, so a group the user closes later stays closed.
  const revealSelected = single?.revealSelected ?? true;
  const selectedRowId = selectedRow?.id;
  // Read through a ref so the effect re-runs only when the selected row
  // changes; re-running on every new `setExpanded` would reopen groups the user
  // closed.
  const revealRef = React.useRef({ selectedRow, setExpanded });
  revealRef.current = { selectedRow, setExpanded };
  React.useEffect(() => {
    const { selectedRow: row, setExpanded: expand } = revealRef.current;
    if (!revealSelected || !row || row.id !== selectedRowId) return;
    for (const id of row.ancestorIds) expand(id, true);
  }, [revealSelected, selectedRowId]);

  const entries = React.useMemo(
    () => (checkbox ? submittedEntries(selected, unknown) : []),
    [checkbox, submittedEntries, selected, unknown],
  );
  const values = React.useMemo(() => entries.map((entry) => entry.value), [entries]);

  const field = useTreeField({
    enabled: !!checkbox,
    id: checkbox?.id,
    name: checkbox?.name,
    disabled,
    values,
    ariaLabelledBy,
    onBlur: checkbox?.onBlur,
    rootRef,
    inputRef: checkbox?.inputRef,
  });
  fieldChangeRef.current = field.handleChange;

  const hasBranches = tree.some((node) => !node.isLeaf);

  // Enter on a row. In `"checkbox"` mode with no `onAction`, it submits the
  // owning form — as Enter in a text input does.
  const runAction = React.useCallback(
    (node: TreeNode<T>) => {
      if (treeDisabled || isNodeDisabled(node)) return;
      if (onAction) {
        onAction(node.item, node.key);
        return;
      }
      if (!checkbox) return;
      const owner = form ? document.getElementById(form) : rootRef.current?.closest("form");
      if (owner instanceof HTMLFormElement) owner.requestSubmit();
    },
    [treeDisabled, isNodeDisabled, checkbox, form, onAction],
  );

  /** Space: selects in `"single"`, ticks in `"checkbox"`, and does nothing in `"none"`. */
  const pressNode = React.useCallback(
    (node: TreeNode<T>) => {
      if (selectionMode === "single") selectNode(node);
      else if (selectionMode === "checkbox") toggleRow(node);
    },
    [selectionMode, selectNode, toggleRow],
  );

  /**
   * A click anywhere on a row. `"checkbox"`: a leaf ticks, a parent opens or
   * closes (its checkbox still ticks it). `"single"`: the row is selected, and a
   * closed parent opens (its caret closes it). `"none"`: a leaf runs
   * `onAction`, a parent opens or closes.
   */
  const clickNode = React.useCallback(
    (node: TreeNode<T>) => {
      if (selectionMode === "single") {
        selectNode(node);
        if (!node.isLeaf && !isExpanded(node.id)) setExpanded(node.id, true);
      } else if (!node.isLeaf) {
        toggleExpand(node.id);
      } else if (selectionMode === "checkbox") {
        toggleRow(node);
      } else if (!isNodeDisabled(node)) {
        onAction?.(node.item, node.key);
      }
    },
    [
      selectionMode,
      selectNode,
      isExpanded,
      setExpanded,
      toggleExpand,
      toggleRow,
      isNodeDisabled,
      onAction,
    ],
  );

  // Rendering is recursive but keyboard navigation needs the flat, visible
  // order — both derive from the same `isExpanded` predicate, so they agree.
  const visibleRows = React.useMemo(() => flattenVisible(kept, isExpanded), [kept, isExpanded]);

  // The tab stop starts on the selected row, or on its nearest visible
  // ancestor while that's closed.
  const preferredRowId = React.useMemo(() => {
    if (!selectedRow) return null;
    const visible = new Set(visibleRows.map((row) => row.node.id));
    if (visible.has(selectedRow.id)) return selectedRow.id;
    return selectedRow.ancestorIds.findLast((id) => visible.has(id)) ?? null;
  }, [selectedRow, visibleRows]);

  const { activeRowId, registerRow, onRowFocus, handleKeyDown } = useTreeFocus({
    rows: visibleRows,
    preferredRowId,
    setExpanded,
    onSpace: pressNode,
    onAction: runAction,
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
      data-selection-mode={selectionMode}
      data-disabled={treeDisabled || undefined}
      data-invalid={field.isInvalid || undefined}
      onFocus={field.handleFocus}
      onBlur={field.handleBlur}
      className={cn(
        "astw:relative astw:flex astw:min-h-0 astw:flex-col astw:data-invalid:border-danger-solid",
        className,
      )}
    >
      {checkbox ? (
        <>
          {/* Proxy for Field / Form: carries `required` and validity; nameless,
              so it is never submitted itself. */}
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
                <input
                  key={entry.id}
                  type="hidden"
                  name={field.name}
                  form={form}
                  value={entry.value}
                />
              ))
            : null}
        </>
      ) : null}

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
          aria-multiselectable={checkbox ? true : undefined}
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
              selectionMode={selectionMode}
              hasBranches={hasBranches}
              isExpanded={isExpanded}
              onToggleExpand={toggleExpand}
              getCheckState={getCheckState}
              onToggleRow={toggleRow}
              isNodeDisabled={isNodeDisabled}
              selectedKey={selectedKey}
              onRowClick={clickNode}
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
