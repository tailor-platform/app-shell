import * as React from "react";

import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { cn } from "@/lib/utils";

import { TreeSelect } from "./TreeSelect";
import type { TreePickerNode, TreePickerProps } from "./types";
import { useTreePickerT } from "./i18n";

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
  onCommit,
  ctaLabel,
  className,
  ...treeProps
}: TreePickerProps<T>) {
  // Each open starts clean (no query, nothing expanded or ticked): the body is
  // keyed by an open counter, bumped while rendering so the fresh state is in
  // the very first frame rather than one effect later.
  const [session, setSession] = React.useState(0);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((n) => n + 1);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        data-slot="tree-picker"
        className={cn(
          // A fixed height: the list scrolls inside, so opening or closing a
          // group never resizes the dialog or shifts what is on screen.
          "astw:flex astw:h-[min(80vh,40rem)] astw:w-full astw:max-w-2xl astw:flex-col astw:gap-0 astw:overflow-hidden astw:p-0 astw:sm:max-w-2xl",
          className,
        )}
      >
        <TreePickerBody
          key={session}
          title={title}
          onOpenChange={onOpenChange}
          onCommit={onCommit}
          ctaLabel={ctaLabel}
          treeProps={treeProps}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
TreePicker.displayName = "TreePicker";

/** One open of the picker: the title, the tree, and the commit footer. */
function TreePickerBody<T>({
  title,
  onOpenChange,
  onCommit,
  ctaLabel,
  treeProps,
}: Pick<TreePickerProps<T>, "title" | "onOpenChange" | "onCommit" | "ctaLabel"> & {
  treeProps: Omit<
    TreePickerProps<T>,
    "open" | "onOpenChange" | "title" | "onCommit" | "ctaLabel" | "className"
  >;
}) {
  const titleId = React.useId();
  const t = useTreePickerT();
  const [selected, setSelected] = React.useState<TreePickerNode<T>[]>([]);
  const count = selected.length;
  const defaultCta = count > 0 ? t("addCount", { count }) : t("addItems");

  const commit = () => {
    if (selected.length === 0) return;
    onCommit(selected);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog.Header data-slot="tree-picker-header" className="astw:px-6 astw:pt-6 astw:pr-12">
        <Dialog.Title id={titleId}>{title ?? t("title")}</Dialog.Title>
      </Dialog.Header>

      <TreeSelect<T>
        {...treeProps}
        aria-labelledby={titleId}
        className="astw:flex-1"
        value={selected.map((node) => node.id)}
        onValueChange={(_, nodes) => setSelected(nodes)}
        onSubmit={commit}
      />

      <Dialog.Footer
        data-slot="tree-picker-footer"
        className="astw:border-border astw:border-t astw:px-6 astw:py-4"
      >
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {t("cancel")}
        </Button>
        <Button onClick={commit} disabled={count === 0}>
          {ctaLabel ? ctaLabel(count) : defaultCta}
        </Button>
      </Dialog.Footer>
    </>
  );
}
