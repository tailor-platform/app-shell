import { useMemo, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { GripVertical, RotateCcw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Select } from "../select";
import { orderSections, sectionFields } from "./apply-layout";
import { sectionName, useFilterRailContext } from "./filter-rail-context";
import { useFilterRailT } from "./i18n";
import type { UserOptionSort } from "./types";

const POPUP_CLASS = cn(
  "astw:bg-popover astw:text-popover-foreground astw:z-(--z-popup) astw:origin-(--transform-origin) astw:w-[24rem] astw:max-w-[calc(100vw-2rem)] astw:overflow-hidden astw:rounded-md astw:border astw:border-border astw:shadow-md",
  "astw:animate-in astw:fade-in-0 astw:zoom-in-95 astw:data-ending-style:animate-out astw:data-ending-style:fade-out-0 astw:data-ending-style:zoom-out-95",
);

const USER_SORTS: readonly UserOptionSort[] = ["given", "label", "baselineCount"];

type SettingsProps = { className?: string };

/**
 * Show / hide, reorder and sort the sections. Renders nothing unless
 * `FilterRail.Root` has a `layout` binding.
 *
 * Hiding a section that carries a filter also clears that filter — hiding must
 * never strand an active filter somewhere the user cannot see it.
 */
function Settings({ className }: SettingsProps) {
  const t = useFilterRailT();
  const { sections, layout, filteredSections, clearFields } = useFilterRailContext("Settings");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  /** A gap index in `0..rows.length`, not a row index. */
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const sortLabel: Record<UserOptionSort, string> = {
    given: t("sortGiven"),
    label: t("sortLabel"),
    baselineCount: t("sortBaselineCount"),
  };
  const sortItems = USER_SORTS.map((value) => ({ value, label: sortLabel[value] }));

  const value = layout?.value;
  const hidden = useMemo(() => new Set(value?.hidden ?? []), [value?.hidden]);
  // Hidden sections included — this is the only place to switch them back on.
  const rows = useMemo(() => orderSections(sections, value?.order ?? []), [sections, value?.order]);

  if (!layout || !value) return null;

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= rows.length) return;
    const ids = rows.map((section) => section.id);
    const [moved] = ids.splice(from, 1);
    if (moved === undefined) return;
    ids.splice(to, 0, moved);
    layout.onChange({ ...value, order: ids });
  };

  // `move` splices the row out first, so a downward gap index shifts by one.
  const commitDrop = () => {
    if (dragIndex !== null && dropIndex !== null) {
      move(dragIndex, dropIndex > dragIndex ? dropIndex - 1 : dropIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  const toggleHidden = (id: string) => {
    const next = new Set(hidden);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      const section = sections.find((candidate) => candidate.id === id);
      if (section && filteredSections.has(id)) clearFields(sectionFields(section));
    }
    layout.onChange({ ...value, hidden: [...next] });
  };

  const customised =
    value.order.length > 0 || value.hidden.length > 0 || Object.keys(value.sort).length > 0;

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button
            variant="ghost"
            size="xs"
            aria-label={t("settings")}
            title={t("settings")}
            className={cn("astw:size-7 astw:px-0", className)}
          >
            <SlidersHorizontal className="astw:size-3.5" aria-hidden />
          </Button>
        }
      />
      <Popover.Portal style={{ position: "relative", zIndex: "var(--z-popup)" }}>
        <Popover.Positioner sideOffset={4} side="bottom" align="start">
          <Popover.Popup data-slot="filter-rail-settings" className={POPUP_CLASS}>
            <div className="astw:border-b astw:border-border astw:px-3 astw:py-2">
              <Popover.Title className="astw:text-sm astw:font-semibold">
                {t("settings")}
              </Popover.Title>
              <Popover.Description className="astw:mt-0.5 astw:text-xs astw:text-muted-foreground">
                {t("settingsDescription")}
              </Popover.Description>
            </div>

            <ul
              className="astw:m-0 astw:max-h-[22rem] astw:list-none astw:overflow-y-auto astw:p-1.5"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                commitDrop();
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropIndex(null);
              }}
            >
              {rows.map((section, index) => {
                const name = sectionName(section);
                const isHidden = hidden.has(section.id);
                const clearsFilter = filteredSections.has(section.id) && !isHidden;
                // Fall back to what the author declared, not to "Default".
                const authored =
                  section.control === "checkbox" &&
                  typeof section.sort === "string" &&
                  (USER_SORTS as readonly string[]).includes(section.sort)
                    ? (section.sort as UserOptionSort)
                    : "given";
                const current = value.sort[section.id] ?? authored;
                let visibilityLabel = t("hideSection", { section: name });
                if (isHidden) visibilityLabel = t("showSection", { section: name });
                if (clearsFilter) visibilityLabel = t("hideSectionClears", { section: name });
                return (
                  <li
                    key={section.id}
                    data-slot="filter-rail-settings-row"
                    draggable
                    onDragStart={(event) => {
                      setDragIndex(index);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      const rect = event.currentTarget.getBoundingClientRect();
                      setDropIndex(event.clientY > rect.top + rect.height / 2 ? index + 1 : index);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      commitDrop();
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDropIndex(null);
                    }}
                    className={cn(
                      "astw:relative astw:flex astw:h-9 astw:items-center astw:gap-1.5 astw:rounded-md astw:px-1.5 astw:hover:bg-accent",
                      dragIndex === index && "astw:opacity-40",
                    )}
                  >
                    {dragIndex !== null && dropIndex === index && (
                      <span
                        aria-hidden
                        className="astw:pointer-events-none astw:absolute astw:inset-x-1 astw:-top-px astw:z-10 astw:h-0.5 astw:rounded-full astw:bg-primary"
                      />
                    )}
                    {dragIndex !== null &&
                      dropIndex === rows.length &&
                      index === rows.length - 1 && (
                        <span
                          aria-hidden
                          className="astw:pointer-events-none astw:absolute astw:inset-x-1 astw:-bottom-px astw:z-10 astw:h-0.5 astw:rounded-full astw:bg-primary"
                        />
                      )}

                    <Checkbox
                      checked={!isHidden}
                      aria-label={visibilityLabel}
                      onCheckedChange={() => toggleHidden(section.id)}
                    />

                    {/* Keyboard reorder — drag alone is mouse-only. */}
                    <button
                      type="button"
                      aria-label={t("reorderSection", { section: name })}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowUp") {
                          event.preventDefault();
                          move(index, index - 1);
                        }
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          move(index, index + 1);
                        }
                      }}
                      className="astw:shrink-0 astw:cursor-grab astw:rounded astw:text-muted-foreground astw:hover:text-foreground astw:active:cursor-grabbing astw:focus-visible:outline-2 astw:focus-visible:outline-ring"
                    >
                      <GripVertical className="astw:size-3.5" aria-hidden />
                    </button>

                    <span
                      className={cn(
                        "astw:min-w-0 astw:flex-1 astw:truncate astw:text-sm",
                        isHidden && "astw:text-muted-foreground",
                      )}
                      title={clearsFilter ? t("hideSectionClearsHint") : undefined}
                    >
                      {section.label}
                      {clearsFilter && (
                        <span
                          aria-hidden
                          className="astw:ml-1.5 astw:inline-block astw:size-1.5 astw:rounded-full astw:bg-primary astw:align-middle"
                        />
                      )}
                    </span>

                    {section.control === "checkbox" ? (
                      <Select
                        items={sortItems}
                        mapItem={(item) => ({ value: item.value, label: item.label })}
                        value={sortItems.find((item) => item.value === current) ?? null}
                        onValueChange={(next) => {
                          if (next && !Array.isArray(next)) {
                            layout.onChange({
                              ...value,
                              sort: { ...value.sort, [section.id]: next.value },
                            });
                          }
                        }}
                        aria-label={t("sortOptions", { section: name })}
                        className="astw:w-[8.5rem] astw:shrink-0 astw:[&_[data-slot=select-trigger]]:h-7 astw:[&_[data-slot=select-trigger]]:text-xs"
                      />
                    ) : (
                      // Nothing to sort: a text box has no options, and a
                      // radio's states are a curated vocabulary.
                      <span
                        aria-hidden
                        className="astw:w-[8.5rem] astw:shrink-0 astw:text-right astw:text-xs astw:text-muted-foreground"
                      >
                        —
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            {layout.onReset && (
              <div className="astw:border-t astw:border-border astw:p-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="astw:w-full"
                  disabled={!customised}
                  onClick={() => layout.onReset?.()}
                >
                  <RotateCcw className="astw:size-3.5" aria-hidden />
                  {t("resetLayout")}
                </Button>
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
Settings.displayName = "FilterRail.Settings";

export { Settings };
export type { SettingsProps };
