import * as React from "react";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/checkbox";

import { useTreePickerT } from "./i18n";
import { isLeaf, leafIds } from "./tree-utils";
import type { TreePickerNode, TreePickerProps } from "./types";

/**
 * @internal
 * One `treeitem` row plus — recursively — its visible descendants. Rows are
 * emitted as flat DOM siblings inside the `role="tree"` container and convey
 * their nesting through `aria-level`, which is the flattened form of the ARIA
 * tree pattern.
 *
 * Parent state (`checked` / `indeterminate`) is always **derived** from the
 * leaf-only selection set; nothing about a parent is ever stored.
 */

type TreePickerRowProps<T> = {
  node: TreePickerNode<T>;
  depth: number;
  isExpanded(id: string): boolean;
  onToggleExpand(id: string): void;
  selectedLeaves: ReadonlySet<string>;
  onToggleNode(node: TreePickerNode<T>, next: boolean): void;
  renderRow: TreePickerProps<T>["renderRow"];
  renderMetric: TreePickerProps<T>["renderMetric"];
  activeRowId: string | null;
  registerRow(id: string, element: HTMLElement | null): void;
  onRowFocus(id: string): void;
  /**
   * Whether any top-level node has children. A top-level leaf then keeps the
   * caret's space so its label lines up with its expandable siblings.
   */
  hasBranches: boolean;
};

function TreePickerRow<T>({
  node,
  depth,
  isExpanded,
  onToggleExpand,
  hasBranches,
  selectedLeaves,
  onToggleNode,
  renderRow,
  renderMetric,
  activeRowId,
  registerRow,
  onRowFocus,
}: TreePickerRowProps<T>) {
  const t = useTreePickerT();
  const leaf = isLeaf(node);
  const expanded = !leaf && isExpanded(node.id);

  const descendantLeaves = React.useMemo(() => leafIds(node), [node]);
  const checkedCount = descendantLeaves.reduce(
    (total, id) => total + (selectedLeaves.has(id) ? 1 : 0),
    0,
  );
  const checked = leaf
    ? selectedLeaves.has(node.id)
    : descendantLeaves.length > 0 && checkedCount === descendantLeaves.length;
  const indeterminate = !leaf && checkedCount > 0 && !checked;
  const keepsCaretSpace = depth === 0 && hasBranches;

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
        aria-checked={indeterminate ? "mixed" : checked}
        tabIndex={activeRowId === node.id ? 0 : -1}
        onFocus={() => onRowFocus(node.id)}
        // The whole row is a hit target: a group row opens or closes (its
        // checkbox still selects everything inside), an item row ticks. Clicks
        // on the checkbox and caret are theirs already, and anything
        // interactive the consumer renders in the row keeps its own behaviour.
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button, a, input, label, [data-slot=checkbox]")) return;
          if (leaf) onToggleNode(node, !checked);
          else onToggleExpand(node.id);
        }}
        data-slot="tree-picker-row"
        data-node-id={node.id}
        data-depth={depth}
        className={cn(
          "astw:border-border/60 astw:flex astw:cursor-pointer astw:items-center astw:gap-3 astw:border-b astw:px-4 astw:py-2.5 astw:text-sm astw:select-none astw:hover:bg-muted/50",
          "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-2 astw:focus-visible:outline-none astw:focus-visible:ring-inset",
          // Revealed children ease in while the dialog grows to fit them.
          depth > 0 &&
            "astw:bg-muted/30 astw:animate-in astw:fade-in-0 astw:slide-in-from-top-1 astw:duration-200 astw:motion-reduce:animate-none",
        )}
      >
        {/* Indentation as real spacers — keeps every style in a Tailwind class.
            Each step is one caret wide, so a child's checkbox sits under its
            parent's caret and the labels line up. */}
        {Array.from({ length: depth }, (_, level) => (
          <span key={level} className="astw:w-5 astw:shrink-0" aria-hidden />
        ))}

        {/* Mouse affordances only: the treeitem row already exposes checked and
            expanded state and handles the keys, so hiding these keeps the row's
            accessible name to its own content instead of "Select Expand …". */}
        <Checkbox
          aria-hidden
          checked={checked}
          indeterminate={indeterminate}
          // The `treeitem` row owns the tab stop (roving tabindex); the box is
          // reachable with the mouse and via Space on the row.
          tabIndex={-1}
          onCheckedChange={(next) => onToggleNode(node, next)}
        />

        {leaf ? (
          // Nested leaves need no caret space (the indent already aligns them),
          // so the label sits right beside the checkbox.
          keepsCaretSpace && <span className="astw:size-5 astw:shrink-0" aria-hidden />
        ) : (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            title={expanded ? t("collapse") : t("expand")}
            onClick={() => onToggleExpand(node.id)}
            className="astw:text-muted-foreground astw:hover:bg-muted astw:flex astw:size-5 astw:shrink-0 astw:items-center astw:justify-center astw:rounded"
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
          {renderRow(node, depth)}
        </div>

        {renderMetric ? (
          <div className="astw:text-muted-foreground astw:shrink-0 astw:tabular-nums">
            {renderMetric(node, depth)}
          </div>
        ) : null}
      </div>

      {expanded
        ? (node.children ?? []).map((child) => (
            <TreePickerRow
              key={child.id}
              node={child}
              depth={depth + 1}
              hasBranches={hasBranches}
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
              selectedLeaves={selectedLeaves}
              onToggleNode={onToggleNode}
              renderRow={renderRow}
              renderMetric={renderMetric}
              activeRowId={activeRowId}
              registerRow={registerRow}
              onRowFocus={onRowFocus}
            />
          ))
        : null}
    </React.Fragment>
  );
}
TreePickerRow.displayName = "TreePicker.Row";

export { TreePickerRow };
