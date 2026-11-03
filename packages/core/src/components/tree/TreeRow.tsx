import * as React from "react";
import { Check, ChevronRightIcon, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { checkboxBoxClasses } from "@/components/checkbox/checkbox";

import { useTreeT } from "./i18n";
import type { TreeNode } from "./tree-model";
import type { TreeContentProps, TreeRowState, TreeSelectionMode } from "./types";

/**
 * @internal
 * One `treeitem` row plus — recursively — its visible descendants. Rows are
 * emitted as flat DOM siblings inside the `role="tree"` container and convey
 * their nesting through `aria-level`, which is the flattened form of the ARIA
 * tree pattern.
 *
 * The checkbox comes from `getCheckState`: with `"full"` propagation a parent's
 * state is derived from its leaves, otherwise each row shows its own.
 */

type TreeRowProps<T> = Pick<TreeContentProps<T>, "renderItem"> & {
  node: TreeNode<T>;
  depth: number;
  selectionMode: TreeSelectionMode;
  isExpanded(id: string): boolean;
  onToggleExpand(id: string): void;
  getCheckState(node: TreeNode<T>): { checked: boolean; indeterminate: boolean };
  /** Ticks or clears the row (its checkbox was clicked). */
  onToggleRow(node: TreeNode<T>): void;
  /** Whether the row is locked, which depends on the mode and propagation. */
  isNodeDisabled(node: TreeNode<T>): boolean;
  /** The selected row's key in `"single"` mode. */
  selectedKey: string | null;
  /** A click anywhere on the row except its own controls; the tree decides what it does. */
  onRowClick(node: TreeNode<T>): void;
  activeRowId: string | null;
  registerRow(id: string, element: HTMLElement | null): void;
  onRowFocus(id: string): void;
  /**
   * Whether any top-level node has children. A top-level leaf then keeps the
   * caret's space so its label lines up with its expandable siblings.
   */
  hasBranches: boolean;
  /** The whole tree is disabled. */
  treeDisabled: boolean;
};

function TreeRow<T>(props: TreeRowProps<T>) {
  const {
    node,
    depth,
    selectionMode,
    isExpanded,
    onToggleExpand,
    hasBranches,
    getCheckState,
    onToggleRow,
    isNodeDisabled,
    selectedKey,
    onRowClick,
    renderItem,
    activeRowId,
    registerRow,
    onRowFocus,
    treeDisabled,
  } = props;
  const t = useTreeT();
  const leaf = node.isLeaf;
  const expanded = !leaf && isExpanded(node.id);
  const disabled = treeDisabled || isNodeDisabled(node);
  const withCheckbox = selectionMode === "checkbox";
  const { checked, indeterminate } = withCheckbox
    ? getCheckState(node)
    : { checked: false, indeterminate: false };
  const selected = selectionMode === "single" && selectedKey === node.key;
  let ariaChecked: boolean | "mixed" | undefined;
  if (withCheckbox) ariaChecked = indeterminate ? "mixed" : checked;
  // A leaf keeps the caret's space so its label lines up with its siblings'.
  // Beside a checkbox, nested leaves don't need it: the indent already aligns
  // them, so the label sits right beside the checkbox.
  const keepsCaretSpace = depth === 0 ? hasBranches : !withCheckbox;

  const row: TreeRowState<T> = {
    item: node.item,
    key: node.key,
    parents: node.parents,
    depth,
    isLeaf: leaf,
    checked,
    indeterminate,
    selected,
    expanded,
    disabled,
  };

  return (
    <React.Fragment>
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- Space toggles the focused row via the tree's keydown handler (useTreeFocus) */}
      <div
        ref={(element) => {
          registerRow(node.id, element);
        }}
        role="treeitem"
        aria-level={depth + 1}
        aria-expanded={leaf ? undefined : expanded}
        aria-checked={ariaChecked}
        aria-selected={selectionMode === "single" ? selected : undefined}
        aria-disabled={disabled || undefined}
        tabIndex={!treeDisabled && activeRowId === node.id ? 0 : -1}
        onFocus={() => onRowFocus(node.id)}
        // The whole row is a hit target, and the tree decides what a click
        // does. Clicks on the checkbox and caret are theirs already, and
        // anything interactive the consumer renders in the row keeps its own
        // behaviour.
        onClick={(event) => {
          if (treeDisabled) return;
          const target = event.target as HTMLElement;
          if (target.closest("button, a, input, label, [data-slot=tree-checkbox]")) return;
          onRowClick(node);
        }}
        data-slot="tree-row"
        data-node-id={node.id}
        data-depth={depth}
        data-disabled={disabled || undefined}
        data-selected={selected || undefined}
        className={cn(
          "astw:border-border/60 astw:flex astw:items-center astw:gap-3 astw:border-b astw:px-4 astw:py-2.5 astw:text-body-md astw:select-none",
          treeDisabled ? "astw:cursor-not-allowed" : "astw:cursor-pointer astw:hover:bg-muted/50",
          disabled && "astw:text-muted-foreground",
          "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-2 astw:focus-visible:outline-none astw:focus-visible:ring-inset",
          // Revealed children ease in as their group opens.
          depth > 0 &&
            "astw:bg-muted/30 astw:animate-in astw:fade-in-0 astw:slide-in-from-top-1 astw:duration-200 astw:motion-reduce:animate-none",
          "astw:data-selected:bg-muted",
        )}
      >
        {/* Indentation as real spacers — keeps every style in a Tailwind class.
            Each step is one caret wide, so a child's checkbox (or caret) sits
            under its parent's caret. */}
        {Array.from({ length: depth }, (_, level) => (
          <span key={level} className="astw:w-5 astw:shrink-0" aria-hidden />
        ))}

        {/* Mouse affordance only: the treeitem row already exposes checked
            state and handles the keys, so this box is visual — a real Checkbox
            here would also register itself with a surrounding Field and submit
            its own value. It reuses Checkbox's styles so it looks the same. */}
        {withCheckbox ? (
          <span
            aria-hidden
            data-slot="tree-checkbox"
            data-checked={(checked && !indeterminate) || undefined}
            data-indeterminate={indeterminate || undefined}
            data-disabled={disabled || undefined}
            onClick={() => {
              if (!disabled) onToggleRow(node);
            }}
            className={cn(checkboxBoxClasses, "astw:data-disabled:opacity-50")}
          >
            {indeterminate && <Minus className="astw:size-3" />}
            {checked && !indeterminate && <Check className="astw:size-3" />}
          </span>
        ) : null}

        {leaf ? (
          keepsCaretSpace && <span className="astw:size-5 astw:shrink-0" aria-hidden />
        ) : (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            disabled={treeDisabled}
            title={expanded ? t("collapse") : t("expand")}
            onClick={() => onToggleExpand(node.id)}
            className="astw:text-muted-foreground astw:hover:bg-muted astw:flex astw:size-5 astw:shrink-0 astw:items-center astw:justify-center astw:rounded astw:disabled:pointer-events-none"
          >
            {/* One chevron that turns, so opening and closing read as motion. */}
            <ChevronRightIcon
              className={cn(
                "astw:size-4 astw:transition-transform astw:duration-200 astw:ease-out astw:motion-reduce:transition-none",
                expanded && "astw:rotate-90",
              )}
            />
          </button>
        )}

        <div className="astw:flex astw:min-w-0 astw:flex-1 astw:items-center">
          {renderItem ? renderItem(row) : node.label}
        </div>
      </div>

      {expanded
        ? node.children.map((child) => (
            <TreeRow key={child.id} {...props} node={child} depth={depth + 1} />
          ))
        : null}
    </React.Fragment>
  );
}
TreeRow.displayName = "Tree.Row";

export { TreeRow };
