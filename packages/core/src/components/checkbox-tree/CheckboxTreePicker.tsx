import * as React from "react";

import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { cn } from "@/lib/utils";

import { CheckboxTree } from "./CheckboxTree";
import { useCheckboxTreeT } from "./i18n";
import type {
  CheckboxTreeContentProps,
  CheckboxTreePickerProps,
  CheckboxTreeSelectedItem,
} from "./types";

/**
 * A {@link CheckboxTree} in a dialog, for picking many items out of a
 * hierarchical catalog and committing them in one go — products with variants,
 * accounts with sub-accounts, warehouses with bins. It wraps `CheckboxTree` the
 * way `DatePicker` wraps `DateField`.
 *
 * The picker owns the dialog chrome, the search box, expand/collapse, and the
 * selection while it is open; each open starts empty. The consumer owns how
 * items are read (`mapItem`), how rows look (`renderItem`, `leadingColumn`,
 * `trailingColumn`) and what happens on commit (`onCommit`).
 *
 * Selection is **leaf-only**: ticking a parent selects every enabled leaf
 * beneath it, so `onCommit` always receives leaves, in tree order, with their
 * paths and parents. Enter on a row or the "Add N items" button commits, then
 * the picker closes itself.
 *
 * The dialog has a fixed height and the list scrolls inside it, so opening or
 * closing a group never shifts what is on screen.
 *
 * @example
 * ### Bulk-adding catalog items
 * ```tsx
 * <CheckboxTreePicker<Category | Product>
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Add items"
 *   itemHeader="Product"
 *   items={catalog}
 *   mapItem={(item) =>
 *     "products" in item
 *       ? { key: item.id, label: item.name, children: item.products }
 *       : { key: item.sku, label: item.name }
 *   }
 *   trailingColumn={{
 *     header: "Unit price",
 *     render: ({ item, isLeaf }) => (isLeaf ? money((item as Product).price) : null),
 *   }}
 *   onCommit={(picked) => addToOrder(picked.map((entry) => entry.item as Product))}
 * />
 * ```
 */
// Exported inline: a separate `export { CheckboxTreePicker }` makes the
// declaration bundler emit the displayName namespace twice (exported and
// local), which breaks consumers compiling with skipLibCheck: false.
export function CheckboxTreePicker<T>({
  open,
  onOpenChange,
  title,
  valueShape,
  onCommit,
  ctaLabel,
  className,
  ...treeProps
}: CheckboxTreePickerProps<T>) {
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
        data-slot="checkbox-tree-picker"
        className={cn(
          // A fixed height: the list scrolls inside, so opening or closing a
          // group never resizes the dialog or shifts what is on screen.
          "astw:flex astw:h-[min(80vh,40rem)] astw:w-full astw:max-w-2xl astw:flex-col astw:gap-0 astw:overflow-hidden astw:p-0 astw:sm:max-w-2xl",
          className,
        )}
      >
        <CheckboxTreePickerBody
          key={session}
          title={title}
          valueShape={valueShape}
          onOpenChange={onOpenChange}
          onCommit={onCommit}
          ctaLabel={ctaLabel}
          treeProps={treeProps}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
CheckboxTreePicker.displayName = "CheckboxTreePicker";

/** One open of the picker: the title, the tree, and the commit footer. */
function CheckboxTreePickerBody<T>({
  title,
  valueShape,
  onOpenChange,
  onCommit,
  ctaLabel,
  treeProps,
}: Pick<
  CheckboxTreePickerProps<T>,
  "title" | "valueShape" | "onOpenChange" | "onCommit" | "ctaLabel"
> & {
  treeProps: CheckboxTreeContentProps<T>;
}) {
  const titleId = React.useId();
  const t = useCheckboxTreeT();
  const [selected, setSelected] = React.useState<CheckboxTreeSelectedItem<T>[]>([]);
  const count = selected.length;
  const defaultCta = count > 0 ? t("addCount", { count }) : t("addItems");

  const commit = () => {
    if (selected.length === 0) return;
    onCommit(selected);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog.Header
        data-slot="checkbox-tree-picker-header"
        className="astw:px-6 astw:pt-6 astw:pr-12"
      >
        <Dialog.Title id={titleId}>{title ?? t("title")}</Dialog.Title>
      </Dialog.Header>

      {valueShape === "exact" ? (
        <CheckboxTree<T>
          {...treeProps}
          aria-labelledby={titleId}
          className="astw:flex-1"
          valueShape="exact"
          onValueChange={(_, details) => setSelected(details.selected)}
          onAction={commit}
        />
      ) : (
        <CheckboxTree<T>
          {...treeProps}
          aria-labelledby={titleId}
          className="astw:flex-1"
          onValueChange={(_, details) => setSelected(details.selected)}
          onAction={commit}
        />
      )}

      <Dialog.Footer
        data-slot="checkbox-tree-picker-footer"
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
