import { useMemo, useRef, useState } from "react";
import { Autocomplete as BaseAutocomplete } from "@base-ui/react/autocomplete";
import { Popover } from "@base-ui/react/popover";
import { ArrowUpDown, GripVertical, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Select } from "@/components/select";
import { useDataTableContext } from "./context";
import { useDataTableT } from "./i18n";

// Same popup shell as DataTable.ColumnSettings so the two toolbar popovers read
// as a pair.
const POPUP_CLASS = cn(
  "astw:bg-popover astw:text-popover-foreground astw:z-(--z-portal) astw:origin-(--transform-origin) astw:w-[320px] astw:max-w-[calc(100vw-2rem)] astw:overflow-hidden astw:rounded-md astw:border astw:border-border astw:shadow-md",
  "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
);

// =============================================================================
// DataTable.SortSettings — a "Sort" toolbar popover, separate from Columns.
// Lists the active sort keys in priority order (drag to reorder, flip
// direction, remove) and adds new keys from a menu of sortable columns.
// =============================================================================

/**
 * A "Sort" toolbar popover that manages the table's sort keys. Each active key
 * is a row with an Ascending / Descending dropdown and a remove button; with
 * `sort: { multiple: true }` keys can be stacked and dragged to change their
 * priority. The trigger shows how many keys are active.
 *
 * Place inside any toolbar or other action layout within `DataTable.Root`.
 * Renders nothing when sorting is disabled.
 */
function DataTableSortSettings({ className }: { className?: string }) {
  const t = useDataTableT();
  const {
    columns,
    sortStates,
    sortMultiple = false,
    onSort,
    onSortStatesChange,
  } = useDataTableContext();

  // Sortable fields and their column labels, in column order (first label wins
  // when two columns share a sort field).
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of columns) {
      const field = col.sort?.field;
      if (field && !map.has(field)) map.set(field, col.label ?? field);
    }
    return map;
  }, [columns]);

  const groupRef = useRef<HTMLFieldSetElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dragField, setDragField] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  if (!onSort || (labels.size === 0 && sortStates.length === 0)) return null;

  const directionItems: { value: "Asc" | "Desc"; label: string }[] = [
    { value: "Asc", label: t("sortColumnAsc") },
    { value: "Desc", label: t("sortColumnDesc") },
  ];

  const activeFields = new Set(sortStates.map((s) => s.field));
  const available = [...labels].filter(([field]) => !activeFields.has(field));
  // Single-sort tables hold at most one key: once set, the menu is hidden and
  // the row's own controls change or clear it.
  const canAdd = available.length > 0 && (sortMultiple || sortStates.length === 0);

  const moveSort = (from: number, to: number) => {
    if (!onSortStatesChange || from < 0 || to < 0 || to >= sortStates.length || from === to) return;
    const next = [...sortStates];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onSortStatesChange(next);
  };

  const setDirection = (field: string, direction: "Asc" | "Desc") => {
    if (onSortStatesChange) {
      onSortStatesChange(sortStates.map((s) => (s.field === field ? { ...s, direction } : s)));
    } else if (sortStates.length === 1) {
      onSort(field, direction);
    }
  };

  // Move focus before the active control unmounts. If the trigger also goes
  // away, return focus to the table instead of leaving it on <body>.
  const focusAfterRemoval = (clearsAll: boolean) => {
    if (clearsAll && labels.size === 0) {
      triggerRef.current?.closest<HTMLElement>('[data-slot="data-table"]')?.focus();
    } else {
      groupRef.current?.focus();
    }
  };

  const removeSort = (field: string) => {
    focusAfterRemoval(sortStates.every((sort) => sort.field === field));
    onSort(field);
  };

  const addSort = (field: string) => {
    groupRef.current?.focus();
    onSort(field, "Asc");
  };

  const clearAll = () => {
    focusAfterRemoval(true);
    if (onSortStatesChange) onSortStatesChange([]);
    else if (sortStates.length === 1) onSort(sortStates[0].field);
  };

  const resetDrag = () => {
    setDragField(null);
    setDropIndex(null);
  };

  const handleDrop = () => {
    if (dragField !== null && dropIndex !== null) {
      const from = sortStates.findIndex((s) => s.field === dragField);
      moveSort(from, dropIndex > from ? dropIndex - 1 : dropIndex);
    }
    resetDrag();
  };

  const canReorder = sortMultiple && sortStates.length > 1 && !!onSortStatesChange;

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button
            ref={triggerRef}
            variant="outline"
            size="xs"
            className={className}
            aria-label={
              sortStates.length > 0
                ? t("activeSortCount", { label: t("sort"), count: sortStates.length })
                : undefined
            }
          >
            <ArrowUpDown className="astw:size-3" aria-hidden />
            {t("sort")}
            {sortStates.length > 0 && (
              <span
                aria-hidden
                className="astw:ml-0.5 astw:rounded-full astw:bg-primary astw:px-1.5 astw:text-label-sm astw:text-primary-foreground astw:tabular-nums"
              >
                {sortStates.length}
              </span>
            )}
          </Button>
        }
      />
      <Popover.Portal style={{ position: "relative", zIndex: "var(--z-portal)" }}>
        <Popover.Positioner sideOffset={4} side="bottom" align="end">
          <Popover.Popup data-slot="data-table-sort-settings-popup" className={POPUP_CLASS}>
            <fieldset
              ref={groupRef}
              tabIndex={-1}
              aria-label={t("sortSettings")}
              // min-w-0: a fieldset's default min-inline-size is min-content,
              // which stops long labels from truncating and overflows the popup.
              className="astw:m-0 astw:flex astw:min-w-0 astw:flex-col astw:border-0 astw:p-2 astw:outline-none"
            >
              <div className="astw:flex astw:items-center astw:justify-between astw:px-1.5 astw:pt-0.5 astw:pb-1.5">
                <span className="astw:text-label-sm astw:text-muted-foreground">{t("sortBy")}</span>
                {sortStates.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={!onSortStatesChange && sortStates.length > 1}
                    className="astw:cursor-pointer astw:text-label-sm astw:text-muted-foreground astw:hover:text-foreground astw:disabled:cursor-not-allowed astw:disabled:opacity-50"
                  >
                    {t("clearSort")}
                  </button>
                )}
              </div>

              {/* 🔽 Active sort keys, in priority order */}
              {sortStates.length === 0 ? (
                <div className="astw:mx-1 astw:rounded-sm astw:border astw:border-dashed astw:border-border astw:px-2 astw:py-3 astw:text-center astw:text-body-sm astw:text-muted-foreground">
                  {t("noSortApplied")}
                </div>
              ) : (
                <ol
                  className="astw:m-0 astw:flex astw:max-h-[min(50vh,20rem)] astw:list-none astw:flex-col astw:overflow-y-auto astw:p-0"
                  onDragOver={(e) => {
                    if (!dragField) return;
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop();
                  }}
                >
                  {sortStates.map((sort, index) => {
                    const label = labels.get(sort.field) ?? sort.field;
                    const showBefore = dragField !== null && dropIndex === index;
                    const showAfter =
                      dragField !== null &&
                      index === sortStates.length - 1 &&
                      dropIndex === index + 1;
                    return (
                      <li
                        key={sort.field}
                        draggable={canReorder}
                        onDragStart={(e) => {
                          setDragField(sort.field);
                          e.dataTransfer?.setData("text/plain", sort.field);
                        }}
                        onDragEnd={resetDrag}
                        onDragOver={(e) => {
                          if (!dragField) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setDropIndex(index + (e.clientY > rect.top + rect.height / 2 ? 1 : 0));
                        }}
                        className={cn(
                          "astw:relative astw:flex astw:h-9 astw:shrink-0 astw:items-center astw:gap-2 astw:rounded-sm astw:pr-1 astw:pl-1.5 astw:hover:bg-accent",
                          dragField === sort.field && "astw:opacity-40",
                        )}
                      >
                        {(showBefore || showAfter) && (
                          <span
                            className={cn(
                              "astw:pointer-events-none astw:absolute astw:inset-x-1 astw:z-10 astw:h-0.5 astw:rounded-full astw:bg-primary",
                              showBefore ? "astw:-top-px" : "astw:-bottom-px",
                            )}
                          />
                        )}
                        {canReorder && (
                          // Drag handle that is also the keyboard route:
                          // focus it and press Arrow Up / Arrow Down.
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="astw:h-5 astw:w-4 astw:cursor-grab astw:p-0 astw:text-muted-foreground"
                            aria-label={t("reorderSortFor", {
                              column: label,
                              index: index + 1,
                              count: sortStates.length,
                            })}
                            aria-keyshortcuts="ArrowUp ArrowDown"
                            onKeyDown={(e) => {
                              if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                              e.preventDefault();
                              moveSort(index, index + (e.key === "ArrowUp" ? -1 : 1));
                            }}
                          >
                            <GripVertical className="astw:size-4" aria-hidden />
                          </Button>
                        )}
                        {sortMultiple && (
                          <span className="astw:w-3 astw:shrink-0 astw:text-center astw:text-label-sm astw:text-muted-foreground astw:tabular-nums">
                            {index + 1}
                          </span>
                        )}
                        <span
                          className="astw:min-w-0 astw:flex-1 astw:truncate astw:text-body-md"
                          title={label}
                        >
                          {label}
                        </span>
                        <Select
                          items={directionItems}
                          mapItem={(item) => ({ value: item.value, label: item.label })}
                          value={
                            directionItems.find((item) => item.value === sort.direction) ?? null
                          }
                          onValueChange={(next) => {
                            if (!next || Array.isArray(next)) return;
                            setDirection(sort.field, next.value);
                          }}
                          disabled={!onSortStatesChange && sortStates.length > 1}
                          aria-label={t("sortDirectionFor", { column: label })}
                          className="astw:w-[7.5rem] astw:shrink-0 astw:[&_[data-slot=select-trigger]]:h-7 astw:[&_[data-slot=select-trigger]]:text-body-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="astw:size-6 astw:text-muted-foreground"
                          aria-label={t("removeSortFor", { column: label })}
                          title={t("removeSortFor", { column: label })}
                          onClick={() => removeSort(sort.field)}
                        >
                          <X className="astw:size-3.5" aria-hidden />
                        </Button>
                      </li>
                    );
                  })}
                </ol>
              )}

              {/* 🔽 Add a sort key */}
              {canAdd && (
                <AddSortPopover
                  label={t(sortStates.length === 0 ? "addSort" : "addAnotherSort")}
                  candidates={available}
                  onAdd={addSort}
                />
              )}
            </fieldset>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
DataTableSortSettings.displayName = "DataTable.SortSettings";

// The highlighted row is the one Enter adds. Base UI highlights on pointer
// hover too, so hover and keyboard share one visual state, as in Select and
// Combobox lists.
const CANDIDATE_ROW_CLASS =
  "astw:flex astw:w-full astw:cursor-pointer astw:items-center astw:rounded-sm astw:px-2 astw:py-1.5 astw:text-left astw:text-body-md astw:outline-none astw:data-highlighted:bg-accent astw:data-highlighted:text-accent-foreground";

type Candidate = { value: string; label: string };

/**
 * "Add sort" button with a searchable list of the sortable columns that aren't
 * sorted yet. Built on Base UI Autocomplete rendered inline: the first match is
 * always highlighted, Arrow Up / Arrow Down and pointer hover move the
 * highlight, and Enter or a click adds that column.
 *
 * @internal
 */
function AddSortPopover({
  label,
  candidates,
  onAdd,
}: {
  label: string;
  candidates: [field: string, label: string][];
  onAdd: (field: string) => void;
}) {
  const t = useDataTableT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo<Candidate[]>(
    () => candidates.map(([value, columnLabel]) => ({ value, label: columnLabel })),
    [candidates],
  );

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  };

  const add = (field: string) => {
    handleOpenChange(false);
    onAdd(field);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        render={
          <Button
            variant="ghost"
            size="xs"
            className="astw:mt-1 astw:self-start astw:text-muted-foreground"
          >
            <Plus className="astw:size-3.5" />
            {label}
          </Button>
        }
      />
      <Popover.Portal style={{ position: "relative", zIndex: "var(--z-portal)" }}>
        <Popover.Positioner sideOffset={4} side="bottom" align="start">
          <Popover.Popup
            initialFocus={inputRef}
            data-slot="data-table-sort-add-popup"
            className={cn(POPUP_CLASS, "astw:w-60 astw:p-1")}
          >
            <BaseAutocomplete.Root
              inline
              open
              items={items}
              autoHighlight="always"
              value={query}
              onValueChange={setQuery}
            >
              {/* Search — spacing/style mirrors the ColumnSettings search. */}
              <div className="astw:relative astw:mb-1">
                <Search className="astw:pointer-events-none astw:absolute astw:top-1/2 astw:left-2.5 astw:size-3.5 astw:-translate-y-1/2 astw:text-muted-foreground" />
                <BaseAutocomplete.Input
                  ref={inputRef}
                  render={<Input type="search" />}
                  placeholder={t("searchColumns")}
                  aria-label={t("searchColumns")}
                  className="astw:h-8 astw:pl-8 astw:text-body-md"
                />
              </div>
              <BaseAutocomplete.Empty className="astw:px-2 astw:py-3 astw:text-center astw:text-body-sm astw:text-muted-foreground astw:empty:hidden">
                {t("noColumnsMatch")}
              </BaseAutocomplete.Empty>
              <BaseAutocomplete.List
                aria-label={label}
                className="astw:flex astw:max-h-[min(40vh,16rem)] astw:flex-col astw:overflow-y-auto astw:empty:hidden"
              >
                {(item: Candidate) => (
                  <BaseAutocomplete.Item
                    key={item.value}
                    value={item}
                    title={item.label}
                    onClick={() => add(item.value)}
                    className={CANDIDATE_ROW_CLASS}
                  >
                    <span className="astw:min-w-0 astw:flex-1 astw:truncate">{item.label}</span>
                  </BaseAutocomplete.Item>
                )}
              </BaseAutocomplete.List>
            </BaseAutocomplete.Root>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export { DataTableSortSettings };
