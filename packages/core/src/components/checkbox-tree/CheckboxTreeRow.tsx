import * as React from "react";
import { Check, ChevronRightIcon, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import { checkboxBoxClasses } from "@/components/checkbox/checkbox";

import { useCheckboxTreeT } from "./i18n";
import { checkState, type TreeNode } from "./tree-model";
import type { CheckboxTreeColumn, CheckboxTreeContentProps, CheckboxTreeRowState } from "./types";

/**
 * @internal
 * One `treeitem` row plus — recursively — its visible descendants. Rows are
 * emitted as flat DOM siblings inside the `role="tree"` container and convey
 * their nesting through `aria-level`, which is the flattened form of the ARIA
 * tree pattern.
 *
 * Parent state (`checked` / `indeterminate`) is always **derived** from the
 * leaf-only selection; nothing about a parent is ever stored.
 */

type CheckboxTreeRowProps<T> = Pick<
  CheckboxTreeContentProps<T>,
  "renderItem" | "leadingColumn" | "trailingColumn"
> & {
  node: TreeNode<T>;
  depth: number;
  isExpanded(id: string): boolean;
  onToggleExpand(id: string): void;
  isSelected(leaf: TreeNode<T>): boolean;
  onToggleNode(node: TreeNode<T>, next: boolean): void;
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

const ALIGN_CLASSES = {
  start: "astw:justify-start astw:text-left",
  center: "astw:justify-center astw:text-center",
  end: "astw:justify-end astw:text-right",
} as const;

/** Classes and style for a leading/trailing column cell — shared by rows and the header. */
export function columnCellProps<T>(column: CheckboxTreeColumn<T>, side: "leading" | "trailing") {
  const align = column.align ?? (side === "leading" ? "start" : "end");
  return {
    className: cn("astw:flex astw:shrink-0 astw:items-center", ALIGN_CLASSES[align]),
    style: column.width === undefined ? undefined : { width: column.width },
  };
}

function CheckboxTreeRow<T>(props: CheckboxTreeRowProps<T>) {
  const {
    node,
    depth,
    isExpanded,
    onToggleExpand,
    hasBranches,
    isSelected,
    onToggleNode,
    renderItem,
    leadingColumn,
    trailingColumn,
    activeRowId,
    registerRow,
    onRowFocus,
    treeDisabled,
  } = props;
  const t = useCheckboxTreeT();
  const leaf = node.isLeaf;
  const expanded = !leaf && isExpanded(node.id);
  const disabled = treeDisabled || node.disabled;
  const { checked, indeterminate } = checkState(node, isSelected);
  const keepsCaretSpace = depth === 0 && hasBranches;

  const row: CheckboxTreeRowState<T> = {
    item: node.item,
    key: node.key,
    path: node.path,
    parents: node.parents,
    depth,
    isLeaf: leaf,
    checked,
    indeterminate,
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
        aria-checked={indeterminate ? "mixed" : checked}
        aria-disabled={disabled || undefined}
        tabIndex={!treeDisabled && activeRowId === node.id ? 0 : -1}
        onFocus={() => onRowFocus(node.id)}
        // The whole row is a hit target: a group row opens or closes (its
        // checkbox still selects everything inside), an item row ticks. Clicks
        // on the checkbox and caret are theirs already, and anything
        // interactive the consumer renders in the row keeps its own behaviour.
        onClick={(event) => {
          if (treeDisabled) return;
          const target = event.target as HTMLElement;
          if (target.closest("button, a, input, label, [data-slot=checkbox-tree-checkbox]")) return;
          if (leaf) onToggleNode(node, !checked);
          else onToggleExpand(node.id);
        }}
        data-slot="checkbox-tree-row"
        data-node-id={node.id}
        data-depth={depth}
        data-disabled={disabled || undefined}
        className={cn(
          "astw:border-border/60 astw:flex astw:items-center astw:gap-3 astw:border-b astw:px-4 astw:py-2.5 astw:text-body-md astw:select-none",
          treeDisabled ? "astw:cursor-not-allowed" : "astw:cursor-pointer astw:hover:bg-muted/50",
          disabled && "astw:text-muted-foreground",
          "astw:focus-visible:ring-ring/50 astw:focus-visible:ring-2 astw:focus-visible:outline-none astw:focus-visible:ring-inset",
          // Revealed children ease in as their group opens.
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

        {/* Mouse affordance only: the treeitem row already exposes checked
            state and handles the keys, so this box is visual — a real Checkbox
            here would also register itself with a surrounding Field and submit
            its own value. It reuses Checkbox's styles so it looks the same. */}
        <span
          aria-hidden
          data-slot="checkbox-tree-checkbox"
          data-checked={(checked && !indeterminate) || undefined}
          data-indeterminate={indeterminate || undefined}
          data-disabled={disabled || undefined}
          onClick={() => {
            if (!disabled) onToggleNode(node, !checked);
          }}
          className={cn(checkboxBoxClasses, "astw:data-disabled:opacity-50")}
        >
          {indeterminate && <Minus className="astw:size-3" />}
          {checked && !indeterminate && <Check className="astw:size-3" />}
        </span>

        {leaf ? (
          // Nested leaves need no caret space (the indent already aligns them),
          // so the label sits right beside the checkbox.
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

        {leadingColumn ? (
          <div data-slot="checkbox-tree-leading" {...columnCellProps(leadingColumn, "leading")}>
            {leadingColumn.render(row)}
          </div>
        ) : null}

        <div className="astw:flex astw:min-w-0 astw:flex-1 astw:items-center">
          {renderItem ? renderItem(row) : node.label}
        </div>

        {trailingColumn ? (
          <div
            data-slot="checkbox-tree-trailing"
            {...columnCellProps(trailingColumn, "trailing")}
            className={cn(
              columnCellProps(trailingColumn, "trailing").className,
              "astw:text-muted-foreground astw:tabular-nums",
            )}
          >
            {trailingColumn.render(row)}
          </div>
        ) : null}
      </div>

      {expanded
        ? node.children.map((child) => (
            <CheckboxTreeRow key={child.id} {...props} node={child} depth={depth + 1} />
          ))
        : null}
    </React.Fragment>
  );
}
CheckboxTreeRow.displayName = "CheckboxTree.Row";

export { CheckboxTreeRow };
