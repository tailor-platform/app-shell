import * as React from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

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
        data-slot="tree-picker-row"
        data-node-id={node.id}
        data-depth={depth}
        className={cn(
          "astw:border-border/60 astw:flex astw:items-center astw:gap-3 astw:border-b astw:px-4 astw:py-2.5 astw:text-sm",
          "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-2 astw:focus-visible:outline-none astw:focus-visible:ring-inset",
          depth > 0 && "astw:bg-muted/30",
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
            {expanded ? (
              <ChevronDownIcon className="astw:size-4" />
            ) : (
              <ChevronRightIcon className="astw:size-4" />
            )}
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
