import * as React from "react";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { Input } from "@/components/input";
import { cn } from "@/lib/utils";

import { TreePickerRow } from "./TreePickerRow";
import { flattenVisible, leafIds } from "./tree-utils";
import type { TreePickerNode, TreePickerProps } from "./types";
import { useTreePickerT } from "./i18n";
import { useAnimatedHeight } from "./use-animated-height";
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
 * ### Bulk-adding catalog items
 * The picker knows nothing about what the picks are for — the consumer's own
 * glue maps the picked leaves into whatever their screen needs:
 * ```tsx
 * type Variant = { name: string; sku: string; unitPrice: number; available: number };
 *
 * <TreePicker<Variant>
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Add items"
 *   rowLabel="Product name"
 *   metricLabel="Total available"
 *   items={catalog}
 *   renderRow={({ node }) => <span className="astw:font-medium">{node.data.name}</span>}
 *   renderMetric={({ node }) => node.data.available}
 *   matchesSearch={({ node, query }) =>
 *     node.data.name.toLowerCase().includes(query.toLowerCase())
 *   }
 *   onCommit={(picks) => addToOrder(picks.map((node) => node.data))}
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
 * <TreePicker
 *   open={open}
 *   onOpenChange={setOpen}
 *   items={data ?? []}
 *   emptyText={isLoading ? "Loading…" : "No matching items."}
 *   renderRow={({ node }) => node.data.name}
 *   onCommit={handleCommit}
 * />
 * ```
 */
// Exported inline: a separate `export { TreePicker }` makes the declaration
// bundler emit the displayName namespace twice (exported and local), which
// breaks consumers compiling with skipLibCheck: false.
export function TreePicker<T>({
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
}: TreePickerProps<T>) {
  const titleId = React.useId();
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
    selectedNodes,
  } = useTreeSelection({ open, items, matchesSearch });

  const count = selectedNodes.length;
  // Held in state, not refs, so the height animation attaches once the
  // dialog's portal has actually mounted the list.
  const [listEl, setListEl] = React.useState<HTMLDivElement | null>(null);
  const [rowsEl, setRowsEl] = React.useState<HTMLDivElement | null>(null);
  useAnimatedHeight(listEl, rowsEl);

  const hasBranches = items.some((node) => (node.children?.length ?? 0) > 0);

  const commit = React.useCallback(() => {
    if (selectedNodes.length === 0) return;
    onCommit(selectedNodes);
    onOpenChange(false);
  }, [selectedNodes, onCommit, onOpenChange]);

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
        data-slot="tree-picker"
        className={cn(
          "astw:flex astw:max-h-[80vh] astw:w-full astw:max-w-2xl astw:flex-col astw:gap-0 astw:overflow-hidden astw:p-0 astw:sm:max-w-2xl",
          className,
        )}
        onKeyDown={handleKeyDown}
      >
        <Dialog.Header data-slot="tree-picker-header" className="astw:px-6 astw:pt-6 astw:pr-12">
          <Dialog.Title id={titleId}>{title ?? t("title")}</Dialog.Title>
        </Dialog.Header>

        <div
          data-slot="tree-picker-search"
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
              // falls through and closes the dialog as usual.
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
          data-slot="tree-picker-column-header"
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
            data-slot="tree-picker-empty"
            className="astw:text-muted-foreground astw:px-6 astw:py-8 astw:text-center astw:text-sm"
          >
            {emptyText ?? t("emptyText")}
          </div>
        ) : (
          <div
            role="tree"
            aria-multiselectable="true"
            aria-labelledby={titleId}
            data-slot="tree-picker-list"
            ref={setListEl}
            className="astw:flex-1 astw:overflow-y-auto"
          >
            {/* Measured to ease the list's height as rows expand or collapse. */}
            <div ref={setRowsEl} role="none">
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
          </div>
        )}

        <Dialog.Footer
          data-slot="tree-picker-footer"
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
TreePicker.displayName = "TreePicker";
