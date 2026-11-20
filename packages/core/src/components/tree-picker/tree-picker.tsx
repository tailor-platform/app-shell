import * as React from "react";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { StandaloneInput } from "@/components/input/standalone-input";
import { cn } from "@/lib/utils";

import {
  Tree,
  type TreeChangeDetails,
  type TreeContentProps,
  type TreeFilterContext,
  type TreeSelectedItem,
  type TreeSelectionBehaviorProps,
} from "@/components/tree";

import { useTreePickerT } from "./i18n";
import type { TreePickerProps } from "./types";

/**
 * A {@link Tree} in a dialog, for picking many items out of a
 * hierarchical catalog and committing them in one go — products with variants,
 * accounts with sub-accounts, warehouses with bins. It wraps `Tree` the
 * way `DatePicker` wraps `DateField`.
 *
 * The picker owns the dialog chrome, the search box, expand/collapse, and the
 * selection while it is open; each open starts empty. The consumer owns how
 * items are read (`mapItem`), how rows look (`renderItem`), how search matches
 * (`matchesSearch`) and what happens on commit (`onCommit`).
 *
 * By default parents are containers: ticking one ticks every enabled leaf
 * beneath it, and `onCommit` receives the ticked leaves in tree order with their
 * parents. `selectionStrategy` changes that, as on `Tree`.
 * Enter on a row or the "Add N items" button commits, then the picker closes
 * itself.
 *
 * The dialog has a fixed height and the list scrolls inside it, so opening or
 * closing a group never shifts what is on screen.
 *
 * @example
 * ### Bulk-adding catalog items
 * ```tsx
 * // catalog: (Category | Product)[], so `mapItem` can return either level.
 * const isProduct = (item: Category | Product): item is Product => "sku" in item;
 *
 * <TreePicker
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Add items"
 *   items={catalog}
 *   mapItem={(item) =>
 *     "products" in item
 *       ? { key: item.id, label: item.name, children: item.products }
 *       : { key: item.sku, label: item.name }
 *   }
 *   renderItem={({ item }) => (
 *     <span className="flex w-full justify-between gap-3">
 *       <span>{item.name}</span>
 *       {"price" in item ? <span>{money(item.price)}</span> : null}
 *     </span>
 *   )}
 *   // Items have the union type; a guard (not a cast) keeps categories out if
 *   // the selection strategy ever returns parents.
 *   onCommit={(picked) => addToOrder(picked.flatMap(({ item }) => (isProduct(item) ? [item] : [])))}
 * />
 * ```
 */
// Exported inline: a separate `export { TreePicker }` makes the
// declaration bundler emit the displayName namespace twice (exported and
// local), which breaks consumers compiling with skipLibCheck: false.
export function TreePicker<T>({
  open,
  onOpenChange,
  title,
  onCommit,
  ctaLabel,
  matchesSearch,
  filterSlot,
  searchPlaceholder,
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
          matchesSearch={matchesSearch}
          filterSlot={filterSlot}
          searchPlaceholder={searchPlaceholder}
          treeProps={treeProps}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
TreePicker.displayName = "TreePicker";

/** One open of the picker: the title, the search, the tree, and the commit footer. */
function TreePickerBody<T>({
  title,
  onOpenChange,
  onCommit,
  ctaLabel,
  matchesSearch,
  filterSlot,
  searchPlaceholder,
  treeProps,
}: Pick<
  TreePickerProps<T>,
  | "title"
  | "onOpenChange"
  | "onCommit"
  | "ctaLabel"
  | "matchesSearch"
  | "filterSlot"
  | "searchPlaceholder"
> & {
  treeProps: TreeContentProps<T> & TreeSelectionBehaviorProps;
}) {
  const titleId = React.useId();
  const t = useTreePickerT();
  const [query, setQuery] = React.useState("");

  // Memoized on the query, so the tree sees a new filter only when it changes.
  const filter = React.useMemo(() => {
    const trimmed = query.trim();
    if (trimmed === "") return undefined;
    const needle = trimmed.toLowerCase();
    return (item: T, context: TreeFilterContext<T>) =>
      matchesSearch
        ? matchesSearch(item, trimmed, context)
        : context.label.toLowerCase().includes(needle);
  }, [query, matchesSearch]);
  // The selection is held as keys, with each key's item remembered from when it
  // was ticked: `items` can change while the picker is open (a category toggle
  // in `filterSlot`, say), and a ticked item that's not in the current `items`
  // must still be counted and committed.
  const [value, setValue] = React.useState<string[]>([]);
  const [ticked, setTicked] = React.useState<ReadonlyMap<string, TreeSelectedItem<T>>>(
    () => new Map(),
  );
  const handleValueChange = (next: string[], details: TreeChangeDetails<T>) => {
    setValue(next);
    setTicked((prev) => {
      const map = new Map<string, TreeSelectedItem<T>>();
      for (const key of next) {
        const entry = prev.get(key);
        if (entry) map.set(key, entry);
      }
      for (const entry of details.selected) map.set(entry.key, entry);
      return map;
    });
  };
  const selected = value.flatMap((key) => {
    const entry = ticked.get(key);
    return entry ? [entry] : [];
  });
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

      <div
        data-slot="tree-picker-search"
        className="astw:flex astw:items-center astw:gap-2 astw:px-6 astw:pt-4 astw:pb-3"
      >
        <div
          className={cn(
            "astw:bg-muted/40 astw:flex astw:flex-1 astw:items-center astw:gap-2 astw:rounded-md astw:px-3",
            // The input drops its own ring to sit flush in this wrapper, so the
            // wrapper shows focus instead.
            "astw:focus-within:ring-ring/50 astw:focus-within:ring-[3px]",
          )}
        >
          <SearchIcon className="astw:text-muted-foreground astw:size-4 astw:shrink-0" />
          <StandaloneInput
            // `search` gives the browser's clear (✕) button, as in DataTable's
            // field search.
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            // Escape with text clears the search first; with an empty box it
            // falls through and closes the dialog.
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

      <Tree
        {...treeProps}
        selectionMode="checkbox"
        filter={filter}
        aria-labelledby={titleId}
        className="astw:border-border astw:flex-1 astw:border-t"
        value={value}
        onValueChange={handleValueChange}
        onAction={commit}
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
