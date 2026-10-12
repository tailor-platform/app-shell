import * as React from "react";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { Input } from "@/components/input";
import { cn } from "@/lib/utils";

import { BulkItemPickerRow } from "./BulkItemPickerRow";
import { flattenVisible, leafIds } from "./tree-utils";
import type { BulkItemPickerNode, BulkItemPickerProps } from "./types";
import { useBulkItemPickerT } from "./i18n";
import { useTreeFocus } from "./use-tree-focus";
import { useTreeSelection } from "./use-tree-selection";

/**
 * A generic tree-select dialog for picking many items out of a hierarchical
 * catalog and committing them in one go — products with variants, accounts with
 * sub-accounts, categories with tags.
 *
 * The picker owns the dialog chrome, the search box, expand/collapse, and the
 * selection model. The consumer owns the row visuals (`renderRow` /
 * `renderMetric`) and what happens on commit (`onCommit`).
 *
 * ### Selection model
 * Selection is **leaf-only**: internally a `Set` of leaf ids, never parent ids.
 * A parent's `checked` / `indeterminate` state is derived from its descendants
 * on every render, and ticking a parent adds or removes all of its descendant
 * leaves at once. `onCommit` therefore always receives leaf nodes, in DFS tree
 * order, and the picker closes itself afterwards.
 *
 * ### Search
 * A node survives the query if it matches or any descendant matches; every
 * parent with a surviving descendant auto-expands so matches are reachable
 * without clicking carets. Manual expand state is tracked separately, so it
 * survives the query being cleared. The default matcher is a case-insensitive
 * substring test on `String(node.data)` — **override `matchesSearch` whenever
 * `data` is an object**, or the query will never match.
 *
 * ### Accessibility
 * The list is a `role="tree"` with `aria-multiselectable`; each row is a
 * `treeitem` with `aria-level` and `aria-checked` (`"mixed"` when partially
 * selected), following the ARIA checkbox-tree pattern. Exactly one visible row
 * is in the tab order; `ArrowUp`/`ArrowDown` move between visible rows,
 * `ArrowRight`/`ArrowLeft` expand/collapse and step in/out, `Home`/`End` jump to
 * the ends, `Space` toggles the focused row, and `Enter` commits (except while
 * typing in the search box).
 *
 * @example
 * ### Bulk-adding document lines
 * The picker stays decoupled from any line-items model — the consumer's own
 * glue maps the picked leaves into whatever their document needs:
 * ```tsx
 * type Variant = { name: string; sku: string; unitPrice: number; available: number };
 *
 * <BulkItemPicker<Variant>
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Add items"
 *   rowLabel="Product name"
 *   metricLabel="Total available"
 *   items={catalog}
 *   renderRow={(node) => <span className="astw:font-medium">{node.data.name}</span>}
 *   renderMetric={(node) => node.data.available}
 *   matchesSearch={(node, query) =>
 *     node.data.name.toLowerCase().includes(query.toLowerCase())
 *   }
 *   onCommit={(picks) => lineItems.addLines(picks.map(toLine))}
 * />
 * ```
 *
 * @example
 * ### Catalog fetched from a server
 * There is deliberately no async variant: auto-expand needs the whole tree up
 * front. Fetch once before (or while) opening and gate `emptyText` on your own
 * loading flag:
 * ```tsx
 * const { data, isLoading } = useCatalog();
 *
 * <BulkItemPicker
 *   open={open}
 *   onOpenChange={setOpen}
 *   items={data ?? []}
 *   emptyText={isLoading ? "Loading…" : "No matching items."}
 *   renderRow={(node) => node.data.name}
 *   onCommit={handleCommit}
 * />
 * ```
 */
function BulkItemPicker<T>({
  open,
  onOpenChange,
  title,
  items,
  renderRow,
  renderMetric,
  rowLabel,
  metricLabel,
  matchesSearch,
  filterSlot,
  onCommit,
  ctaLabel,
  emptyText,
  searchPlaceholder,
  className,
}: BulkItemPickerProps<T>) {
  const titleId = React.useId();
  const t = useBulkItemPickerT();

  const {
    query,
    setQuery,
    kept,
    isExpanded,
    toggleExpand,
    setExpanded,
    selectedLeaves,
    toggleNode,
    selectedNodes,
  } = useTreeSelection({ open, items, matchesSearch });

  const count = selectedNodes.length;

  const commit = React.useCallback(() => {
    if (selectedNodes.length === 0) return;
    onCommit(selectedNodes);
    onOpenChange(false);
  }, [selectedNodes, onCommit, onOpenChange]);

  const isChecked = React.useCallback(
    (node: BulkItemPickerNode<T>) => {
      const ids = leafIds(node);
      return ids.length > 0 && ids.every((id) => selectedLeaves.has(id));
    },
    [selectedLeaves],
  );

  // Rendering is recursive but keyboard navigation needs the flat, visible
  // order — both derive from the same `isExpanded` predicate, so they agree.
  const visibleRows = React.useMemo(() => flattenVisible(kept, isExpanded), [kept, isExpanded]);

  const { activeRowId, registerRow, onRowFocus, handleKeyDown } = useTreeFocus({
    open,
    rows: visibleRows,
    setExpanded,
    toggleNode,
    isChecked,
    commit,
  });

  const defaultCta = count > 0 ? t("addCount", { count }) : t("addItems");
  const cta = ctaLabel ? ctaLabel(count) : defaultCta;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        data-slot="bulk-item-picker"
        className={cn(
          "astw:flex astw:max-h-[80vh] astw:w-full astw:max-w-2xl astw:flex-col astw:gap-0 astw:overflow-hidden astw:p-0 astw:sm:max-w-2xl",
          className,
        )}
        onKeyDown={handleKeyDown}
      >
        <Dialog.Header
          data-slot="bulk-item-picker-header"
          className="astw:px-6 astw:pt-6 astw:pr-12"
        >
          <Dialog.Title id={titleId}>{title ?? t("title")}</Dialog.Title>
        </Dialog.Header>

        <div
          data-slot="bulk-item-picker-search"
          className="astw:flex astw:items-center astw:gap-2 astw:px-6 astw:pt-4 astw:pb-3"
        >
          <div className="astw:bg-muted/40 astw:flex astw:flex-1 astw:items-center astw:gap-2 astw:rounded-md astw:px-3">
            <SearchIcon className="astw:text-muted-foreground astw:size-4 astw:shrink-0" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
          data-slot="bulk-item-picker-column-header"
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
            data-slot="bulk-item-picker-empty"
            className="astw:text-muted-foreground astw:px-6 astw:py-8 astw:text-center astw:text-sm"
          >
            {emptyText ?? t("emptyText")}
          </div>
        ) : (
          <div
            role="tree"
            aria-multiselectable="true"
            aria-labelledby={titleId}
            data-slot="bulk-item-picker-list"
            className="astw:flex-1 astw:overflow-y-auto"
          >
            {kept.map((node) => (
              <BulkItemPickerRow
                key={node.id}
                node={node}
                depth={0}
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

        <Dialog.Footer
          data-slot="bulk-item-picker-footer"
          className="astw:border-border astw:border-t astw:px-6 astw:py-4"
        >
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={commit} disabled={count === 0}>
            {cta}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
BulkItemPicker.displayName = "BulkItemPicker";

export { BulkItemPicker };
