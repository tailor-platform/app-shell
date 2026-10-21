import * as React from "react";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/input";
import { cn } from "@/lib/utils";

import { TreePickerRow } from "./TreePickerRow";
import { flattenVisible, leafIds } from "./tree-utils";
import type { TreePickerNode, TreeSelectProps } from "./types";
import { useTreePickerT } from "./i18n";
import { useTreeFocus } from "./use-tree-focus";
import { useTreeSelection } from "./use-tree-selection";

/**
 * A searchable, multi-select tree for picking many items out of a hierarchical
 * catalog — products with variants, accounts with sub-accounts, warehouses with
 * bins. Selection is leaf-only: ticking a parent selects every leaf beneath it,
 * and a parent's checkbox shows checked or indeterminate from its leaves.
 *
 * It renders inline, so it can sit on a page, in a side panel, or in a popover.
 * For the common "pick, then add" flow in a dialog, use {@link TreePicker},
 * which wraps this with a title, Cancel, and an "Add N items" button.
 *
 * The list scrolls inside the component, so give it a height (or a sized
 * container) for long trees.
 *
 * @example
 * ```tsx
 * const [selected, setSelected] = useState<string[]>([]);
 *
 * <TreeSelect<Warehouse>
 *   aria-label="Warehouses"
 *   className="astw:h-96"
 *   items={warehouseTree}
 *   renderRow={({ node }) => node.data.name}
 *   matchesSearch={({ node, query }) =>
 *     node.data.name.toLowerCase().includes(query.toLowerCase())
 *   }
 *   value={selected}
 *   onValueChange={(ids) => setSelected(ids)}
 * />
 * ```
 */
export function TreeSelect<T>({
  items,
  renderRow,
  renderMetric,
  rowLabel,
  metricLabel,
  matchesSearch,
  filterSlot,
  emptyText,
  searchPlaceholder,
  value,
  defaultValue,
  onValueChange,
  onSubmit,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className,
}: TreeSelectProps<T>) {
  const t = useTreePickerT();

  const {
    query,
    setQuery,
    kept,
    isExpanded,
    toggleExpand,
    setExpanded,
    selectedLeaves,
    toggleNode,
  } = useTreeSelection({ items, value, defaultValue, onValueChange, matchesSearch });

  const hasBranches = items.some((node) => (node.children?.length ?? 0) > 0);

  const isChecked = React.useCallback(
    (node: TreePickerNode<T>) => {
      const ids = leafIds(node);
      return ids.length > 0 && ids.every((id) => selectedLeaves.has(id));
    },
    [selectedLeaves],
  );

  // Rendering is recursive but keyboard navigation needs the flat, visible
  // order — both derive from the same `isExpanded` predicate, so they agree.
  const visibleRows = React.useMemo(() => flattenVisible(kept, isExpanded), [kept, isExpanded]);

  const { activeRowId, registerRow, onRowFocus, handleKeyDown } = useTreeFocus({
    rows: visibleRows,
    setExpanded,
    toggleNode,
    isChecked,
    onSubmit,
  });

  return (
    <div data-slot="tree-select" className={cn("astw:flex astw:min-h-0 astw:flex-col", className)}>
      <div
        data-slot="tree-select-search"
        className="astw:flex astw:items-center astw:gap-2 astw:px-6 astw:pt-4 astw:pb-3"
      >
        <div className="astw:bg-muted/40 astw:flex astw:flex-1 astw:items-center astw:gap-2 astw:rounded-md astw:px-3">
          <SearchIcon className="astw:text-muted-foreground astw:size-4 astw:shrink-0" />
          <Input
            // `search` gives the browser's clear (✕) button, as in DataTable's
            // field search.
            type="search"
            value={query}
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
        data-slot="tree-select-column-header"
        aria-hidden
        className="astw:bg-muted/40 astw:text-muted-foreground astw:border-border astw:flex astw:items-center astw:gap-3 astw:border-y astw:px-4 astw:py-2 astw:text-xs astw:font-medium astw:tracking-wide astw:uppercase"
      >
        {/* Mirrors the row's checkbox + caret so the labels line up. */}
        <span className="astw:size-4 astw:shrink-0" />
        <span className="astw:size-5 astw:shrink-0" />
        <div className="astw:min-w-0 astw:flex-1">{rowLabel ?? t("rowLabel")}</div>
        {metricLabel ? <div className="astw:shrink-0 astw:text-right">{metricLabel}</div> : null}
      </div>

      {visibleRows.length === 0 ? (
        <div
          data-slot="tree-select-empty"
          className="astw:text-muted-foreground astw:flex-1 astw:px-6 astw:py-8 astw:text-center astw:text-sm"
        >
          {emptyText ?? t("emptyText")}
        </div>
      ) : (
        <div
          role="tree"
          aria-multiselectable="true"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          data-slot="tree-select-list"
          // Keys are handled on the tree itself, so the search box and anything
          // in `filterSlot` keep their own keys (Enter never submits from them).
          onKeyDown={handleKeyDown}
          // Focus lives on the rows (roving tabindex); -1 keeps the tree itself
          // programmatically focusable without adding a second tab stop.
          tabIndex={-1}
          className="astw:min-h-0 astw:flex-1 astw:overflow-y-auto astw:outline-none"
        >
          {kept.map((node) => (
            <TreePickerRow
              key={node.id}
              node={node}
              depth={0}
              hasBranches={hasBranches}
              isExpanded={isExpanded}
              onToggleExpand={toggleExpand}
              selectedLeaves={selectedLeaves}
              onToggleNode={toggleNode}
              renderRow={renderRow}
              renderMetric={renderMetric}
              activeRowId={activeRowId}
              registerRow={registerRow}
              onRowFocus={onRowFocus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
TreeSelect.displayName = "TreeSelect";
