// ✅ Reusable Component: the rail's settings popup — which facets show, in what
// order, and how each one's options are sorted.
//
// Modelled on `DataTable`'s own column settings, deliberately: the two do the
// same job on two halves of the same screen, and a user who has learned one
// should not have to learn the other. One difference, asked for explicitly —
// the checkbox is on the **left**, before the label, rather than at the far
// right edge.
//
// ─── Why this exists ─────────────────────────────────────────────────────────
//
// Design note: "the order of the filter section … and the sort order of the option
// values, truncate limit (top Nth values) must be important for users."
//
// Until now all three were constants baked in by whoever built the screen. This
// hands the first two to the user and persists them. Truncate is deliberately
// still the author's — see the note at the foot of this file.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button, Checkbox, Select } from "@tailor-platform/app-shell";
import { HOVER_SCROLLBAR } from "./internals";
import {
  USER_SORT_LABELS,
  type FilterRailSection,
  type RailLayoutBinding,
  type UserOptionSort,
} from "./types";

const SORT_VALUES = Object.keys(USER_SORT_LABELS) as UserOptionSort[];

type SortItem = { value: UserOptionSort; label: string };

const SORT_ITEMS: SortItem[] = SORT_VALUES.map((value) => ({
  value,
  label: USER_SORT_LABELS[value],
}));

export const RailSettings = ({
  sections,
  layout,
  filtered,
  onHideFiltered,
}: {
  /** The author's full list, including sections the user has hidden. */
  sections: readonly FilterRailSection[];
  layout: RailLayoutBinding;
  /** Section ids carrying an active filter. Hiding one clears it. */
  filtered: ReadonlySet<string>;
  /**
   * Called when a section carrying a filter is hidden, so the rail can drop
   * that filter.
   *
   * Hiding must not be able to strand a filter somewhere the user cannot see or
   * reach it — that is the hidden state the whole rail is built to avoid. The
   * first cut enforced that by refusing to hide a filtered section at all, which
   * turned out to be the wrong trade: the checkbox looked ordinary, did nothing
   * when clicked, and gave no reason. A control that silently ignores you is
   * worse than the problem it was avoiding. So the hide is allowed and the
   * filter goes with it — the table visibly widens, which is the feedback the
   * dead checkbox never gave.
   */
  onHideFiltered?: (sectionId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  /**
   * Where the row would land, as a gap index in `0..rows.length` — not a row
   * index. A line drawn *between* rows has one more possible position than
   * there are rows, and conflating the two is what makes a drop land one place
   * off when you aim at the last row.
   */
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);

  const hidden = useMemo(() => new Set(layout.value.hidden), [layout.value.hidden]);

  /** Every section, in the user's order — hidden ones included, since this is
   *  the only place they can be switched back on. */
  const rows = useMemo(() => {
    const rank = new Map(layout.value.order.map((id, index) => [id, index]));
    return [...sections]
      .map((section, index) => ({ section, index }))
      .sort((a, b) => {
        const ra = rank.get(a.section.id) ?? Number.POSITIVE_INFINITY;
        const rb = rank.get(b.section.id) ?? Number.POSITIVE_INFINITY;
        return ra === rb ? a.index - b.index : ra - rb;
      })
      .map(({ section }) => section);
  }, [sections, layout.value.order]);

  // Portaled and fixed-positioned: the rail sets `overflow-hidden` so its
  // rounded corners clip the first section's background, which would clip this
  // panel too. Anchoring to the trigger's rect sidesteps that without giving up
  // the corner clipping.
  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.bottom + 6, left: rect.left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= rows.length) return;
    const ids = rows.map((section) => section.id);
    const [moved] = ids.splice(from, 1);
    if (moved === undefined) return;
    ids.splice(to, 0, moved);
    layout.onChange({ ...layout.value, order: ids });
  };

  /**
   * Turn the gap index into an array index.
   *
   * `move` splices the row out before putting it back, so every gap after the
   * dragged row has shifted down by one by the time it is re-inserted. Without
   * this the row lands one position short whenever it moves downward.
   */
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
      // Order matters only in that both land in the same commit from the user's
      // point of view; the filter clear is a separate `setFilters` on the
      // collection, not part of the layout.
      if (filtered.has(id)) onHideFiltered?.(id);
    }
    layout.onChange({ ...layout.value, hidden: [...next] });
  };

  const setSort = (id: string, value: UserOptionSort) =>
    layout.onChange({ ...layout.value, sort: { ...layout.value.sort, [id]: value } });

  const dirty =
    layout.value.order.length > 0 ||
    layout.value.hidden.length > 0 ||
    Object.keys(layout.value.sort).length > 0;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Filter settings"
        title="Filter settings"
        onClick={() => setOpen((previous) => !previous)}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-[var(--accent)] hover:text-foreground"
      >
        <SlidersHorizontal className="size-3.5" aria-hidden />
      </button>

      {open &&
        anchor &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Filter settings"
            style={{ top: anchor.top, left: anchor.left }}
            className="fixed z-50 w-[24rem] rounded-md border border-border bg-card shadow-lg"
          >
            <div className="border-b border-border px-3 py-2">
              <p className="text-sm font-semibold">Filter settings</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Show, reorder and sort the filter sections.
              </p>
            </div>

            <ul
              className={`max-h-[22rem] overflow-y-auto p-1.5 ${HOVER_SCROLLBAR}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                commitDrop();
              }}
              onDragLeave={(event) => {
                // Only when the pointer has left the list itself, not when it
                // crosses between two rows inside it.
                if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropIndex(null);
              }}
            >
              {rows.map((section, index) => {
                const isHidden = hidden.has(section.id);
                /** Switching this off will also drop the filter it holds. */
                const clearsFilter = filtered.has(section.id) && !isHidden;
                const sortable = section.control === "checkbox";
                // Fall back to what the AUTHOR declared, not to "Default".
                // Category ships as `baselineCount`; showing "Default" until the
                // user touches the control would be the menu stating the
                // opposite of what the rail is doing. A sort the menu cannot
                // express — `liveCount`, or a comparator — reads as "Default",
                // which is the closest true thing it can say.
                const authored =
                  section.control === "checkbox" &&
                  typeof section.sort === "string" &&
                  (SORT_VALUES as string[]).includes(section.sort)
                    ? (section.sort as UserOptionSort)
                    : "given";
                const current = layout.value.sort[section.id] ?? authored;
                return (
                  <li
                    key={section.id}
                    draggable
                    onDragStart={(event) => {
                      setDragIndex(index);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      // Top half of the row means "above it", bottom half means
                      // "below it" — so the line always sits where the eye is
                      // already pointing.
                      const rect = event.currentTarget.getBoundingClientRect();
                      const below = event.clientY > rect.top + rect.height / 2;
                      setDropIndex(below ? index + 1 : index);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      commitDrop();
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDropIndex(null);
                    }}
                    // A fixed height on every row, not padding. `Select`'s
                    // trigger ships at `h-9`, so rows carrying one measured 44px
                    // against 28px for the two that do not — the list stepped in
                    // and out as the eye went down it. Height here plus a
                    // shortened trigger below makes every row identical whatever
                    // it contains.
                    className={`relative flex h-9 items-center gap-1.5 rounded-md px-1.5 hover:bg-[var(--accent)] ${
                      dragIndex === index ? "opacity-40" : ""
                    }`}
                  >
                    {/* The drop line. Absolutely positioned and
                        `pointer-events-none` so it neither shifts the rows by
                        its own 2px nor steals the dragover events that are
                        keeping it alive. Only the last row can also carry a
                        line below it — that is the final gap. */}
                    {dragIndex !== null && dropIndex === index && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-1 -top-px z-10 h-0.5 rounded-full bg-primary"
                      />
                    )}
                    {dragIndex !== null &&
                      dropIndex === rows.length &&
                      index === rows.length - 1 && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-x-1 -bottom-px z-10 h-0.5 rounded-full bg-primary"
                        />
                      )}

                    {/* Checkbox first, before the label — app-shell's column
                        settings puts it at the far right edge, and it was asked
                        to sit on the left here. */}
                    <span className="shrink-0">
                      <Checkbox
                        checked={!isHidden}
                        aria-label={
                          clearsFilter
                            ? `Hide ${String(section.label)}, which also clears its filter`
                            : isHidden
                              ? `Show ${String(section.label)}`
                              : `Hide ${String(section.label)}`
                        }
                        onCheckedChange={() => toggleHidden(section.id)}
                      />
                    </span>

                    {/* Draggable, and also keyboard-operable: drag-only
                        reordering cannot be done without a mouse. */}
                    <button
                      type="button"
                      aria-label={`Reorder ${String(section.label)}. Use arrow up and down.`}
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
                      className="shrink-0 cursor-grab rounded text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    >
                      <GripVertical className="size-3.5" aria-hidden />
                    </button>

                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${isHidden ? "text-muted-foreground" : ""}`}
                      title={
                        clearsFilter
                          ? "Filtering now — hiding this section also clears its filter"
                          : undefined
                      }
                    >
                      {section.label}
                      {/* A dot, not a word: this row is already carrying four
                          controls, and the only thing that needs saying is
                          "something will happen here that will not happen on the
                          other rows". The title and the aria-label carry the
                          detail. */}
                      {clearsFilter && (
                        <span
                          aria-hidden
                          className="ml-1.5 inline-block size-1.5 rounded-full bg-primary align-middle"
                        />
                      )}
                    </span>

                    {/* `container={panelRef}` is what makes app-shell's `Select`
                        usable in a hand-rolled popover at all. Base UI portals
                        its listbox to `document.body` by default, so clicking an
                        option lands outside this panel, the
                        outside-pointerdown handler fires, and the panel closes
                        with the listbox still mid-click. Rendering the portal
                        *into* the panel puts the listbox back inside
                        `panelRef.current.contains(target)`, and the handler
                        leaves it alone. (This is why the control was briefly a
                        native `<select>` — which themed as the OS menu rather
                        than as app-shell.) */}
                    {sortable ? (
                      <Select
                        items={SORT_ITEMS}
                        mapItem={(item) => ({ value: item.value, label: item.label })}
                        value={SORT_ITEMS.find((item) => item.value === current) ?? null}
                        onValueChange={(next) => {
                          if (next && !Array.isArray(next)) setSort(section.id, next.value);
                        }}
                        aria-label={`Sort ${String(section.label)} options`}
                        container={panelRef}
                        // No `size` prop on `Select`, and `className` goes to
                        // the root container — so the trigger is reached with a
                        // descendant variant. Two classes deep beats app-shell's
                        // single `astw:h-9` on specificity, which matters
                        // because its stylesheet loads last and would otherwise
                        // win on order.
                        className="w-[8.5rem] shrink-0 [&_[data-slot=select-trigger]]:h-7 [&_[data-slot=select-trigger]]:text-xs"
                      />
                    ) : (
                      // Text and radio sections have no option list to sort —
                      // a text box has no options at all, and a radio's three
                      // states are a curated vocabulary that must not move.
                      <span
                        aria-hidden
                        // Right-aligned, not centred: it occupies the same
                        // 8.5rem column as the `Select` below it, so flush right
                        // puts the dash on the same vertical line as the select
                        // boxes' right edge. Centred, it floated in the middle of
                        // an otherwise empty column and read as a stray mark.
                        className="w-[8.5rem] shrink-0 text-right text-xs text-muted-foreground"
                      >
                        —
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            {layout.onReset && (
              <div className="border-t border-border p-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  data-slot="button"
                  disabled={!dirty}
                  onClick={() => layout.onReset?.()}
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                  Reset to default
                </Button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
};

// ─── Why truncate is not in here ─────────────────────────────────────────────
//
// the design spec named three things: section order, option sort, and the truncate limit.
// The first two are here; the third is still the author's, and that is a
// judgement worth stating rather than an oversight.
//
// "Show 6 more" is already one click away and the count is in the link, so the
// limit costs a user nothing to work around — unlike order and sort, which they
// cannot work around at all. Putting a number picker on every row would be the
// busiest control in the panel in exchange for the least. If it turns out
// people do want it, it is one more field on `RailLayout` and one more control
// on this row.
