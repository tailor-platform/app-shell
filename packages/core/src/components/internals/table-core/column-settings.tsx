import {
  type ReactNode,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Popover } from "@base-ui/react/popover";
import { GripVertical, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Input } from "@/components/input";
import { Tooltip } from "@/components/tooltip";
import type { ColumnMeta, ColumnPinOverride } from "./column-state";
import { resolvePin } from "./pin-layout";
import { useColumnSettingsT } from "./column-settings-labels";

export type ColumnSettingsProps = {
  columns: readonly ColumnMeta[];
  columnOrder: readonly string[];
  pinnedColumns: Readonly<Record<string, ColumnPinOverride>>;
  setColumnOrder: (ids: readonly string[]) => void;
  setPin: (id: string, pin: ColumnPinOverride | null) => void;
  visibility?: {
    isColumnVisible: (id: string) => boolean;
    toggleColumn: (id: string) => void;
    showAllColumns: () => void;
    hideAllColumns: () => void;
  };
  className?: string;
  popupSlot?: string;
};

// Shared popup styling, matching DataTable's filter popover. The width cap lives
// on the popup itself (not the inner fieldset) so base-ui measures the real width
// and anchors it flush under the trigger.
const POPUP_CLASS = cn(
  "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:origin-(--transform-origin) astw:max-w-[360px] astw:overflow-hidden astw:rounded-md astw:border astw:border-border astw:shadow-md",
  "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
);

type Section = "left" | "scrollable" | "right";

// Which pin value a section maps to. "none" explicitly unpins (overriding a
// column's default `pin`) so dragging a pinned-by-default column into
// "Scrollable" sticks.
const SECTION_PIN: Record<Section, "left" | "right" | "none"> = {
  left: "left",
  scrollable: "none",
  right: "right",
};

/** Resolve a column's effective pin (override wins; "none" is explicit unpin). */
function effectiveSection(
  stored: "left" | "right" | "none" | undefined,
  defaultPin: "left" | "right" | undefined,
): Section {
  return resolvePin(stored, defaultPin) ?? "scrollable";
}

/** The existing DataTable three-zone popup, with optional visibility controls. */
export function ColumnSettings({
  columns,
  columnOrder,
  pinnedColumns,
  setPin,
  setColumnOrder,
  visibility,
  className,
  popupSlot = "table-column-settings-popup",
}: ColumnSettingsProps) {
  const t = useColumnSettingsT();
  const keysHintId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef(false);
  useLayoutEffect(() => {
    if (!restoreFocus.current) return;
    restoreFocus.current = false;
    searchRef.current?.focus({ preventScroll: true });
  }, [columnOrder, pinnedColumns]);

  const meta = useMemo(() => {
    const label = new Map<string, string>();
    const defaultPin = new Map<string, "left" | "right" | undefined>();
    columns.forEach((col) => {
      const key = col.id;
      label.set(key, col.label ?? key);
      defaultPin.set(key, col.pin);
    });
    return { label, defaultPin };
  }, [columns]);

  const sectionOf = useCallback(
    (key: string): Section => effectiveSection(pinnedColumns[key], meta.defaultPin.get(key)),
    [pinnedColumns, meta],
  );

  // A single toggle drives the footer button: when every column is visible it
  // offers "Hide all", otherwise "Show all" (so a partially-hidden table gets
  // everything back in one click).
  const allVisible = useMemo(
    () => columnOrder.every((key) => visibility?.isColumnVisible(key) ?? true),
    [columnOrder, visibility],
  );

  // Group the ordered columns into their sections (order preserved per section).
  const buckets = useMemo(() => {
    const grouped: Record<Section, string[]> = { left: [], scrollable: [], right: [] };
    for (const key of columnOrder) grouped[sectionOf(key)].push(key);
    return grouped;
  }, [columnOrder, sectionOf]);

  // Free-text filter over column labels. Only the Scrollable list narrows to
  // matches (the pinned zones always show in full); drag-and-drop stays enabled
  // because drop positions are keyed to each row's full-order index (renderRow).
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;
  const matchKeys = useCallback(
    (keys: string[]) =>
      isSearching ? keys.filter((k) => (meta.label.get(k) ?? "").toLowerCase().includes(q)) : keys,
    [isSearching, q, meta],
  );

  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ section: Section; index: number } | null>(null);

  const resetDrag = () => {
    setDragKey(null);
    setDropTarget(null);
  };

  const changePin = (key: string, side: ColumnPinOverride | null) => {
    // Section changes unmount the row; restore focus after that DOM update.
    restoreFocus.current = true;
    setPin(key, side);
  };

  const handleDrop = () => {
    if (dragKey && dropTarget) {
      const { section, index } = dropTarget;
      // Rebuild the buckets without the dragged key, then insert it at the drop
      // position, and flatten back to a single order. Setting the order to the
      // grouped layout keeps it consistent with how the table renders.
      const next: Record<Section, string[]> = {
        left: buckets.left.filter((k) => k !== dragKey),
        scrollable: buckets.scrollable.filter((k) => k !== dragKey),
        right: buckets.right.filter((k) => k !== dragKey),
      };
      const target = next[section];
      // `index` was measured against the section's rows *including* dragKey. For
      // a same-zone move, filtering dragKey out above shifts every slot at/after
      // its original position down by one, so decrement to land where the
      // indicator promised. Cross-zone drops (fromIdx === -1) are unaffected.
      const fromIdx = buckets[section].indexOf(dragKey);
      const insertAt = fromIdx > -1 && fromIdx < index ? index - 1 : index;
      target.splice(Math.max(0, Math.min(insertAt, target.length)), 0, dragKey);
      setColumnOrder([...next.left, ...next.scrollable, ...next.right]);
      changePin(dragKey, SECTION_PIN[section]);
    }
    resetDrag();
  };

  const moveWithinSection = (key: string, section: Section, delta: number) => {
    const keys = buckets[section];
    const neighbor = keys[keys.indexOf(key) + delta];
    if (!neighbor) return;
    const order = [...columnOrder];
    const from = order.indexOf(key);
    const to = order.indexOf(neighbor);
    order.splice(from, 1);
    order.splice(to, 0, key);
    restoreFocus.current = true;
    setColumnOrder(order);
  };

  const renderRow = (key: string, section: Section, isLast: boolean) => {
    // Drop positions are keyed to the FULL bucket index (not the rendered
    // position), so drag-and-drop stays correct even while the Scrollable list
    // is filtered by search — a hovered row maps to its real slot in the order.
    const fullIndex = buckets[section].indexOf(key);
    // Insertion indicator: an absolutely-positioned line that sits in the gap
    // between rows (straddling the shared border). Being absolute, it never
    // shifts the rows under the cursor — a flow element there made the drop
    // target recompute on every reflow and the line "jump".
    const showBefore =
      dragKey != null && dropTarget?.section === section && dropTarget.index === fullIndex;
    const showAfter =
      dragKey != null &&
      dropTarget?.section === section &&
      isLast &&
      dropTarget.index === fullIndex + 1;
    return (
      <div
        key={key}
        draggable
        onDragStart={() => setDragKey(key)}
        onDragEnd={resetDrag}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const after = e.clientY > rect.top + rect.height / 2;
          setDropTarget({ section, index: after ? fullIndex + 1 : fullIndex });
        }}
        className={cn(
          "astw:relative astw:flex astw:items-center astw:gap-2 astw:rounded-sm astw:py-1 astw:pr-2 astw:pl-1.5 astw:hover:bg-accent",
          dragKey === key && "astw:opacity-40",
        )}
      >
        {showBefore && (
          <span className="astw:pointer-events-none astw:absolute astw:inset-x-1 astw:-top-px astw:z-10 astw:h-0.5 astw:rounded-full astw:bg-primary" />
        )}
        {showAfter && (
          <span className="astw:pointer-events-none astw:absolute astw:inset-x-1 astw:-bottom-px astw:z-10 astw:h-0.5 astw:rounded-full astw:bg-primary" />
        )}
        <button
          type="button"
          aria-label={t("reorderColumn", { label: meta.label.get(key) ?? key })}
          aria-describedby={keysHintId}
          title={t("dragToReorder")}
          className="astw:cursor-grab astw:text-muted-foreground"
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              moveWithinSection(key, section, event.key === "ArrowUp" ? -1 : 1);
            } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              const sections: Section[] = ["left", "scrollable", "right"];
              const next =
                sections[sections.indexOf(section) + (event.key === "ArrowLeft" ? -1 : 1)];
              if (next) changePin(key, SECTION_PIN[next]);
            }
          }}
        >
          <GripVertical className="astw:size-4" />
        </button>
        {visibility ? (
          <button
            type="button"
            onClick={() => visibility.toggleColumn(key)}
            title={meta.label.get(key) ?? key}
            className="astw:min-w-0 astw:flex-1 astw:cursor-pointer astw:truncate astw:text-left astw:text-body-md"
          >
            {meta.label.get(key) ?? key}
          </button>
        ) : (
          <span
            className="astw:min-w-0 astw:flex-1 astw:truncate astw:text-body-md"
            title={meta.label.get(key) ?? key}
          >
            {meta.label.get(key) ?? key}
          </span>
        )}
        {visibility && (
          <Tooltip.Root>
            {/* The checkbox itself is the trigger (props, incl. ref in React 19,
              forward to Checkbox.Root) so hover AND keyboard focus open the
              tooltip and its text is wired to the control via aria-describedby. */}
            <Tooltip.Trigger
              render={
                <Checkbox
                  checked={visibility.isColumnVisible(key)}
                  onCheckedChange={() => visibility.toggleColumn(key)}
                  aria-label={meta.label.get(key)}
                />
              }
            />
            <Tooltip.Content>
              {t(visibility.isColumnVisible(key) ? "hideColumn" : "showColumn")}
            </Tooltip.Content>
          </Tooltip.Root>
        )}
      </div>
    );
  };

  const renderSection = (
    section: Section,
    title: string,
    opts?: { scroll?: boolean; filter?: boolean },
  ) => {
    // Search only narrows the section that opts in (the Scrollable list); the
    // pinned zones always show their full contents.
    const filtered = !!opts?.filter && isSearching;
    const keys = filtered ? matchKeys(buckets[section]) : buckets[section];
    const active = dragKey != null && dropTarget?.section === section;
    let rows: ReactNode;
    if (keys.length === 0) {
      rows = filtered ? (
        // Filtered to nothing — show a search empty state, not the drop zone.
        <div className="astw:px-1.5 astw:py-3 astw:text-center astw:text-body-sm astw:text-muted-foreground">
          {t("noColumnsMatch")}
        </div>
      ) : (
        <div
          className={cn(
            "astw:mx-1 astw:rounded-sm astw:border astw:border-dashed astw:border-border astw:px-1.5 astw:py-2 astw:text-body-sm astw:text-muted-foreground astw:italic",
            active && "astw:border-primary astw:text-primary",
          )}
        >
          {t("dropColumnsHere")}
        </div>
      );
    } else {
      rows = keys.map((key, i) => renderRow(key, section, i === keys.length - 1));
    }
    return (
      <div
        data-section={section}
        onDragOver={(e) => {
          e.preventDefault();
          // Only fires for the header / padding / empty area (rows stop
          // propagation) → drop at the end of the section. Use the full bucket
          // length (not the filtered count) so a drop lands at the true end.
          setDropTarget({ section, index: buckets[section].length });
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleDrop();
        }}
        className={cn(
          // No gap between rows: a gap would be "section area" that re-triggers
          // the end-of-section handler as the cursor passes between rows.
          "astw:flex astw:flex-col astw:rounded-md astw:py-1.5",
          active && "astw:bg-accent/40",
        )}
      >
        <div className="astw:px-1.5 astw:pb-1 astw:text-label-sm astw:text-muted-foreground">
          {title}
        </div>
        {/* Only the Scrollable section gets an internal scroll cap; the pinned
            zones stay fully visible. */}
        {opts?.scroll ? (
          <div className="astw:flex astw:max-h-[min(50vh,20rem)] astw:flex-col astw:overflow-y-auto">
            {rows}
          </div>
        ) : (
          rows
        )}
      </div>
    );
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button variant="outline" size="xs" className={className}>
            <SlidersHorizontal className="astw:size-3" />
            {t("columns")}
          </Button>
        }
      />
      {/* Stacking context on the portal container so the popup renders above the
          DataTable's sticky header row (z-index: 10). */}
      <Popover.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
        <Popover.Positioner sideOffset={4} side="bottom" align="end">
          <Popover.Popup data-slot={popupSlot} className={POPUP_CLASS}>
            <fieldset
              aria-label={t("columnSettings")}
              className="astw:m-0 astw:flex astw:min-w-72 astw:flex-col astw:border-0 astw:p-2"
            >
              {/* Search sits above the pinned-left section; it filters only the
                  Scrollable list — the Fixed left / right zones always show in
                  full. */}
              <div className="astw:relative astw:mb-1 astw:px-1">
                <Search className="astw:pointer-events-none astw:absolute astw:top-1/2 astw:left-3.5 astw:size-3.5 astw:-translate-y-1/2 astw:text-muted-foreground" />
                <Input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchColumns")}
                  aria-label={t("searchColumns")}
                  className="astw:h-8 astw:pl-8 astw:text-body-md"
                />
              </div>
              <span id={keysHintId} className="astw:sr-only">
                {t("reorderKeys")}
              </span>
              {renderSection("left", t("sectionPinnedLeft"))}
              <div className="astw:mx-1 astw:border-t astw:border-border" />
              {renderSection("scrollable", t("sectionScrollable"), { scroll: true, filter: true })}
              <div className="astw:mx-1 astw:border-t astw:border-border" />
              {renderSection("right", t("sectionPinnedRight"))}
              {visibility && (
                <>
                  <div className="astw:mx-1 astw:mt-1 astw:border-t astw:border-border" />
                  <div className="astw:mt-1.5 astw:flex astw:justify-end">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={allVisible ? visibility.hideAllColumns : visibility.showAllColumns}
                    >
                      {t(allVisible ? "hideAllColumns" : "showAllColumns")}
                    </Button>
                  </div>
                </>
              )}
            </fieldset>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
ColumnSettings.displayName = "TableCore.ColumnSettings";
