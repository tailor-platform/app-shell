import * as React from "react";
import { ChevronDownIcon, ChevronRightIcon, SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Dialog } from "./dialog";
import { Input } from "./input";

/* ======================================================================== */
/* Types                                                                     */
/* ======================================================================== */

export type BulkItemPickerNode<T = unknown> = {
  id: string;
  data: T;
  children?: BulkItemPickerNode<T>[];
};

export type BulkItemPickerProps<T> = {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Dialog title. Default: "Select items". */
  title?: React.ReactNode;
  /** Hierarchical items. Selection is leaf-only (a node with no `children`). */
  items: ReadonlyArray<BulkItemPickerNode<T>>;
  /** Render the row body — checkbox + metric column are drawn by the picker. */
  renderRow(node: BulkItemPickerNode<T>, depth: number): React.ReactNode;
  /** Optional right-aligned metric (e.g. "Total available"). */
  renderMetric?(node: BulkItemPickerNode<T>, depth: number): React.ReactNode;
  /** Header label above `renderRow` output. Default: "Item". */
  rowLabel?: React.ReactNode;
  /** Header label above `renderMetric` output. */
  metricLabel?: React.ReactNode;
  /**
   * Substring search predicate. Default: case-insensitive match against
   * `String(node.data)` — fine when `data` is a primitive, but consumers
   * should override for object payloads.
   */
  matchesSearch?(node: BulkItemPickerNode<T>, query: string): boolean;
  /** Optional render slot to the right of the search input (e.g. a filter button). */
  filterSlot?: React.ReactNode;
  /** Commit handler — receives the selected LEAF nodes in tree order. */
  onCommit(selected: BulkItemPickerNode<T>[]): void;
  /** Customise the primary CTA label. Default: count > 0 ? `Add ${count} items` : `Add items`. */
  ctaLabel?(count: number): string;
  emptyText?: React.ReactNode;
  searchPlaceholder?: string;
};

/* ======================================================================== */
/* Internal helpers                                                          */
/* ======================================================================== */

const isLeaf = <T,>(n: BulkItemPickerNode<T>): boolean => !n.children || n.children.length === 0;

/** Walk the subtree rooted at `n` and yield every leaf id. */
function leafIds<T>(n: BulkItemPickerNode<T>, into: string[] = []): string[] {
  if (isLeaf(n)) {
    into.push(n.id);
    return into;
  }
  for (const c of n.children!) leafIds(c, into);
  return into;
}

/** Walk every leaf in the input forest in DFS order. */
function allLeaves<T>(
  nodes: ReadonlyArray<BulkItemPickerNode<T>>,
  into: BulkItemPickerNode<T>[] = [],
): BulkItemPickerNode<T>[] {
  for (const n of nodes) {
    if (isLeaf(n)) into.push(n);
    else allLeaves(n.children!, into);
  }
  return into;
}

/**
 * Filter the forest by `matches`. A node survives if it matches OR any of its
 * descendants does. Returns the filtered forest plus the set of node ids that
 * should auto-expand (any ancestor whose descendant matched).
 */
function filterTree<T>(
  nodes: ReadonlyArray<BulkItemPickerNode<T>>,
  matches: (n: BulkItemPickerNode<T>) => boolean,
): { kept: BulkItemPickerNode<T>[]; autoExpand: Set<string> } {
  const autoExpand = new Set<string>();
  const walk = (list: ReadonlyArray<BulkItemPickerNode<T>>): BulkItemPickerNode<T>[] => {
    const out: BulkItemPickerNode<T>[] = [];
    for (const n of list) {
      if (isLeaf(n)) {
        if (matches(n)) out.push(n);
        continue;
      }
      const childKept = walk(n.children!);
      if (childKept.length || matches(n)) {
        if (childKept.length) autoExpand.add(n.id);
        out.push({ ...n, children: childKept.length ? childKept : n.children });
      }
    }
    return out;
  };
  return { kept: walk(nodes), autoExpand };
}

const defaultMatcher = <T,>(n: BulkItemPickerNode<T>, q: string): boolean =>
  String(n.data ?? "")
    .toLowerCase()
    .includes(q.toLowerCase());

/* ======================================================================== */
/* Tri-state checkbox                                                        */
/* ======================================================================== */

function TriCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange(next: boolean): void;
  ariaLabel?: string;
}) {
  const ref = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="astw:size-4 astw:cursor-pointer astw:accent-foreground"
    />
  );
}

/* ======================================================================== */
/* Row                                                                       */
/* ======================================================================== */

function Row<T>({
  node,
  depth,
  expanded,
  onToggleExpand,
  selectedLeaves,
  onToggleNode,
  renderRow,
  renderMetric,
}: {
  node: BulkItemPickerNode<T>;
  depth: number;
  expanded: boolean;
  onToggleExpand(id: string): void;
  selectedLeaves: ReadonlySet<string>;
  onToggleNode(node: BulkItemPickerNode<T>, next: boolean): void;
  renderRow: BulkItemPickerProps<T>["renderRow"];
  renderMetric: BulkItemPickerProps<T>["renderMetric"];
}) {
  const leaf = isLeaf(node);
  const descendantLeaves = React.useMemo(() => leafIds(node), [node]);
  const checkedCount = descendantLeaves.reduce((n, id) => n + (selectedLeaves.has(id) ? 1 : 0), 0);
  const allChecked = descendantLeaves.length > 0 && checkedCount === descendantLeaves.length;
  const anyChecked = checkedCount > 0;

  return (
    <div
      data-slot="bulk-item-picker-row"
      data-depth={depth}
      className={cn(
        "astw:flex astw:items-center astw:gap-3 astw:border-b astw:border-border/60 astw:px-4 astw:py-2.5 astw:text-sm",
        // Subtle alternating tint via even-of-type would require a wrapping list;
        // keep the row plain and rely on parent / leaf indent for hierarchy.
        depth > 0 && "astw:bg-muted/30",
      )}
      style={{ paddingLeft: 16 + depth * 24 }}
    >
      <TriCheckbox
        checked={leaf ? selectedLeaves.has(node.id) : allChecked}
        indeterminate={!leaf && anyChecked && !allChecked}
        ariaLabel="Select"
        onChange={(next) => onToggleNode(node, next)}
      />

      {!leaf ? (
        <button
          type="button"
          aria-label={expanded ? "Collapse" : "Expand"}
          onClick={() => onToggleExpand(node.id)}
          className="astw:text-muted-foreground astw:flex astw:size-5 astw:items-center astw:justify-center astw:rounded astw:hover:bg-muted"
        >
          {expanded ? (
            <ChevronDownIcon className="astw:size-4" />
          ) : (
            <ChevronRightIcon className="astw:size-4" />
          )}
        </button>
      ) : (
        <span className="astw:size-5 astw:shrink-0" aria-hidden />
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
  );
}

/* ======================================================================== */
/* BulkItemPicker                                                            */
/* ======================================================================== */

export function BulkItemPicker<T>({
  open,
  onOpenChange,
  title = "Select items",
  items,
  renderRow,
  renderMetric,
  rowLabel = "Item",
  metricLabel,
  matchesSearch,
  filterSlot,
  onCommit,
  ctaLabel,
  emptyText = "No matching items.",
  searchPlaceholder = "Search",
}: BulkItemPickerProps<T>) {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());

  // Reset on close so the dialog opens empty next time.
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected(new Set());
      setExpanded(new Set());
    }
  }, [open]);

  const matcher = matchesSearch ?? defaultMatcher;
  const { kept, autoExpand } = React.useMemo(() => {
    if (!query.trim()) {
      return { kept: [...items], autoExpand: new Set<string>() };
    }
    return filterTree(items, (n) => matcher(n, query.trim()));
  }, [items, query, matcher]);

  const isExpanded = (id: string): boolean => autoExpand.has(id) || expanded.has(id);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onToggleNode = (node: BulkItemPickerNode<T>, nextChecked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const ids = leafIds(node);
      if (nextChecked) {
        for (const id of ids) next.add(id);
      } else {
        for (const id of ids) next.delete(id);
      }
      return next;
    });
  };

  const flatLeavesInOrder = React.useMemo(() => allLeaves(items), [items]);
  const selectedNodes = React.useMemo(
    () => flatLeavesInOrder.filter((n) => selected.has(n.id)),
    [flatLeavesInOrder, selected],
  );
  const count = selectedNodes.length;

  const handleCommit = () => {
    if (count === 0) return;
    onCommit(selectedNodes);
    onOpenChange(false);
  };

  const cta = ctaLabel
    ? ctaLabel(count)
    : count > 0
      ? `Add ${count} item${count === 1 ? "" : "s"}`
      : "Add items";

  /* ---- Render ----------------------------------------------------------- */

  const renderForest = (
    list: ReadonlyArray<BulkItemPickerNode<T>>,
    depth: number,
  ): React.ReactNode =>
    list.map((node) => {
      const leaf = isLeaf(node);
      const showChildren = !leaf && isExpanded(node.id);
      return (
        <React.Fragment key={node.id}>
          <Row
            node={node}
            depth={depth}
            expanded={isExpanded(node.id)}
            onToggleExpand={toggleExpand}
            selectedLeaves={selected}
            onToggleNode={onToggleNode}
            renderRow={renderRow}
            renderMetric={renderMetric}
          />
          {showChildren ? renderForest(node.children!, depth + 1) : null}
        </React.Fragment>
      );
    });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        data-slot="bulk-item-picker"
        className="astw:flex astw:max-h-[80vh] astw:w-full astw:max-w-2xl astw:flex-col astw:gap-0 astw:overflow-hidden astw:p-0 astw:sm:max-w-2xl"
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" && count > 0) {
            const tgt = e.target as HTMLElement;
            // Don't intercept Enter inside the search input — let it stay there
            // until the user explicitly hits the CTA. (Prevents accidental commits
            // while typing.)
            if (tgt.tagName === "INPUT" && tgt.getAttribute("type") !== "checkbox") return;
            e.preventDefault();
            handleCommit();
          }
        }}
      >
        <Dialog.Header className="astw:px-6 astw:pt-6">
          <Dialog.Title>{title}</Dialog.Title>
        </Dialog.Header>

        <div className="astw:flex astw:items-center astw:gap-2 astw:px-6 astw:pt-4 astw:pb-3">
          <div className="astw:bg-muted/40 astw:flex astw:flex-1 astw:items-center astw:gap-2 astw:rounded-md astw:px-3">
            <SearchIcon className="astw:text-muted-foreground astw:size-4" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="astw:border-0 astw:bg-transparent astw:px-0 astw:shadow-none astw:focus-visible:ring-0"
              aria-label="Search"
            />
          </div>
          {filterSlot}
        </div>

        <div className="astw:bg-muted/40 astw:text-muted-foreground astw:flex astw:items-center astw:border-y astw:border-border astw:px-4 astw:py-2 astw:text-xs astw:font-medium astw:uppercase astw:tracking-wide">
          {/* Spacer aligns "rowLabel" with the row content (checkbox + caret = 16 + 16 + 16 + 12 = 60 ish).
              Keep it pixel-cheap: 16px outer padding handled by px-4, then 36px gap before rowLabel. */}
          <span className="astw:w-9 astw:shrink-0" aria-hidden />
          <span className="astw:size-5 astw:shrink-0" aria-hidden />
          <div className="astw:flex-1 astw:pl-3">{rowLabel}</div>
          {metricLabel ? <div className="astw:text-right astw:shrink-0">{metricLabel}</div> : null}
        </div>

        <div data-slot="bulk-item-picker-list" className="astw:flex-1 astw:overflow-y-auto">
          {kept.length === 0 ? (
            <div className="astw:text-muted-foreground astw:px-6 astw:py-8 astw:text-center astw:text-sm">
              {emptyText}
            </div>
          ) : (
            renderForest(kept, 0)
          )}
        </div>

        <Dialog.Footer className="astw:border-t astw:border-border astw:px-6 astw:py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCommit} disabled={count === 0}>
            {cta}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}
BulkItemPicker.displayName = "BulkItemPicker";
