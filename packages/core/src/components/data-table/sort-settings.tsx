import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, X } from "lucide-react";
import { Button } from "@/components/button";
import { useCollectionControlOptional } from "@/contexts/collection-control-context";
import { cn } from "@/lib/utils";
import type { SortState } from "@/types/collection";
import { useDataTableContext } from "./context";
import { useDataTableT } from "./i18n";
import {
  SETTINGS_SECTION_CLASS,
  SETTINGS_HEADING_CLASS,
  SETTINGS_ROW_CLASS,
  SETTINGS_LABEL_CLASS,
} from "./column-settings-styles";

/** @internal */
export function DataTableSortSettings({ query }: { query: string }) {
  const t = useDataTableT();
  const { columns, sortStates, sortMultiple, onSort } = useDataTableContext();
  const control = useCollectionControlOptional();
  const [dragField, setDragField] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<
    { section: "sorted"; index: number } | { section: "available" } | null
  >(null);
  const activeRef = useRef<HTMLFieldSetElement>(null);
  const availableRef = useRef<HTMLFieldSetElement>(null);
  const labels = new Map<string, string>();
  for (const column of columns) {
    const field = column.sort?.field;
    if (field && !labels.has(field)) labels.set(field, column.label ?? field);
  }
  const activeFields = new Set(sortStates.map((sort) => sort.field));
  const q = query.trim().toLowerCase();
  const candidates = [...labels].filter(
    ([field, label]) => !activeFields.has(field) && label.toLowerCase().includes(q),
  );

  const resetDrag = () => {
    setDragField(null);
    setDropTarget(null);
  };

  const addSort = (field: string, index?: number) => {
    if (!control || !onSort || !labels.has(field) || activeFields.has(field)) return;
    activeRef.current?.focus();
    if (sortMultiple && index !== undefined) {
      const next = [...sortStates];
      next.splice(index, 0, { field, direction: "Asc" });
      replaceSorts(next);
    } else {
      onSort(field, "Asc");
    }
    resetDrag();
  };

  const replaceSorts = (next: SortState[]) => {
    if (!control || !onSort) return;
    // setSort appends its field, so replay keys in the requested priority order.
    control.clearSort();
    for (const sort of next) control.setSort(sort.field, sort.direction);
  };

  const toggleDirection = (field: string) => {
    replaceSorts(
      sortStates.map((sort) => {
        if (sort.field !== field) return sort;
        return { ...sort, direction: sort.direction === "Asc" ? "Desc" : "Asc" };
      }),
    );
  };

  const moveSort = (field: string, index: number) => {
    const from = sortStates.findIndex((sort) => sort.field === field);
    if (from < 0 || from === index || index < 0 || index >= sortStates.length) return;
    const next = [...sortStates];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    replaceSorts(next);
  };

  const handleDrop = (section: "sorted" | "available") => {
    if (dragField) {
      const from = sortStates.findIndex((sort) => sort.field === dragField);
      if (section === "available") {
        if (from >= 0 && control && onSort) {
          availableRef.current?.focus();
          onSort(dragField);
        }
      } else {
        const target = dropTarget?.section === "sorted" ? dropTarget.index : sortStates.length;
        if (from >= 0) {
          moveSort(dragField, target > from ? target - 1 : target);
        } else {
          addSort(dragField, target);
        }
      }
    }
    resetDrag();
  };

  return (
    <>
      <fieldset
        ref={activeRef}
        aria-label={t("sortedColumns")}
        tabIndex={-1}
        onDragOver={(event) => {
          if (!dragField) return;
          event.preventDefault();
          setDropTarget({ section: "sorted", index: sortStates.length });
        }}
        onDrop={(event) => {
          event.preventDefault();
          handleDrop("sorted");
        }}
        className={cn(
          "astw:m-0 astw:min-w-0 astw:border-0 astw:p-0",
          SETTINGS_SECTION_CLASS,
          dropTarget?.section === "sorted" && "astw:bg-accent/40",
        )}
      >
        <div className={SETTINGS_HEADING_CLASS}>{t("sortedColumns")}</div>
        <div className="astw:max-h-[min(30vh,12rem)] astw:overflow-y-auto">
          {sortStates.length === 0 ? (
            <div className="astw:mx-1 astw:rounded-sm astw:border astw:border-dashed astw:border-border astw:px-1.5 astw:py-2 astw:text-body-sm astw:text-muted-foreground">
              {t("dropColumnsToSort")}
            </div>
          ) : (
            sortStates.map((sort, index) => {
              const label = labels.get(sort.field) ?? sort.field;
              const direction = t(sort.direction === "Asc" ? "sortColumnAsc" : "sortColumnDesc");
              const directionLabel = t("changeColumnSortDirection", { column: label, direction });
              const removeLabel = t("removeColumnSort", { column: label });
              const DirectionIcon = sort.direction === "Asc" ? ArrowUp : ArrowDown;
              const reorderLabel = t("reorderColumnSort", {
                column: label,
                index: index + 1,
                count: sortStates.length,
              });
              const showBefore = dropTarget?.section === "sorted" && dropTarget.index === index;
              const showAfter =
                dropTarget?.section === "sorted" &&
                index === sortStates.length - 1 &&
                dropTarget.index === index + 1;
              return (
                <div
                  key={sort.field}
                  draggable
                  onDragStart={(event) => {
                    setDragField(sort.field);
                    event.dataTransfer?.setData("text/plain", sort.field);
                  }}
                  onDragEnd={resetDrag}
                  onDragOver={(event) => {
                    if (!dragField) return;
                    event.preventDefault();
                    event.stopPropagation();
                    const rect = event.currentTarget.getBoundingClientRect();
                    setDropTarget({
                      section: "sorted",
                      index: index + (event.clientY > rect.top + rect.height / 2 ? 1 : 0),
                    });
                  }}
                  className={cn(SETTINGS_ROW_CLASS, dragField === sort.field && "astw:opacity-40")}
                >
                  {(showBefore || showAfter) && (
                    <span
                      className={cn(
                        "astw:pointer-events-none astw:absolute astw:inset-x-1 astw:z-10 astw:h-0.5 astw:rounded-full astw:bg-primary",
                        showBefore ? "astw:-top-px" : "astw:-bottom-px",
                      )}
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="astw:h-5 astw:w-4 astw:cursor-grab astw:p-0 astw:text-muted-foreground"
                    aria-label={reorderLabel}
                    aria-keyshortcuts="ArrowUp ArrowDown"
                    title={reorderLabel}
                    disabled={sortStates.length < 2}
                    onKeyDown={(event) => {
                      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                      event.preventDefault();
                      event.stopPropagation();
                      moveSort(sort.field, index + (event.key === "ArrowUp" ? -1 : 1));
                    }}
                  >
                    <GripVertical className="astw:size-4" aria-hidden />
                  </Button>
                  <span
                    className="astw:min-w-0 astw:flex-1 astw:truncate astw:text-body-md"
                    title={label}
                  >
                    {label}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="astw:size-5"
                    aria-label={directionLabel}
                    title={directionLabel}
                    onClick={() => toggleDirection(sort.field)}
                  >
                    <DirectionIcon className="astw:size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="astw:size-5"
                    aria-label={removeLabel}
                    title={removeLabel}
                    onClick={() => {
                      activeRef.current?.focus();
                      onSort?.(sort.field);
                    }}
                  >
                    <X className="astw:size-4" aria-hidden />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </fieldset>
      <div className="astw:mx-1 astw:border-t astw:border-border" />
      <fieldset
        ref={availableRef}
        tabIndex={-1}
        aria-label={t("availableSortColumns")}
        onDragOver={(event) => {
          if (!dragField || !activeFields.has(dragField)) return;
          event.preventDefault();
          setDropTarget({ section: "available" });
        }}
        onDrop={(event) => {
          event.preventDefault();
          handleDrop("available");
        }}
        className={cn(
          "astw:m-0 astw:min-w-0 astw:border-0 astw:p-0",
          SETTINGS_SECTION_CLASS,
          dropTarget?.section === "available" && "astw:bg-accent/40",
        )}
      >
        <div className={SETTINGS_HEADING_CLASS}>{t("availableSortColumns")}</div>
        <div className="astw:flex astw:max-h-[min(50vh,20rem)] astw:flex-col astw:overflow-y-auto">
          {candidates.length === 0 ? (
            <div className="astw:px-1.5 astw:py-3 astw:text-center astw:text-body-sm astw:text-muted-foreground">
              {t(q ? "noColumnsMatch" : "noSortColumns")}
            </div>
          ) : (
            candidates.map(([field, label]) => (
              <div
                key={field}
                draggable
                onDragStart={(event) => {
                  setDragField(field);
                  event.dataTransfer?.setData("text/plain", field);
                }}
                onDragEnd={resetDrag}
                className={cn(SETTINGS_ROW_CLASS, dragField === field && "astw:opacity-40")}
              >
                <GripVertical
                  className="astw:size-4 astw:shrink-0 astw:cursor-grab astw:text-muted-foreground"
                  aria-hidden
                />
                <button
                  type="button"
                  className={SETTINGS_LABEL_CLASS}
                  aria-label={t("addColumnSort", { column: label })}
                  title={label}
                  onClick={() => addSort(field)}
                >
                  {label}
                </button>
              </div>
            ))
          )}
        </div>
      </fieldset>
    </>
  );
}
