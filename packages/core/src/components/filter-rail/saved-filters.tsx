import { useState } from "react";
import { Bookmark, Check, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Filter } from "@/types/collection";
import { Button } from "../button";
import { Dialog } from "../dialog";
import { Input } from "../input";
import { Menu } from "../menu";
import { useFilterRailContext } from "./filter-rail-context";
import { useFilterRailT } from "./i18n";
import type { SavedFilter, SavedFiltersBinding } from "./types";

/** Field / operator order and `in`-list order must not make equal sets look different. */
const normalise = (filters: readonly Filter[]): string =>
  JSON.stringify(
    filters
      .map((filter) => ({
        field: filter.field,
        operator: filter.operator,
        value: Array.isArray(filter.value) ? filter.value.map(String).toSorted() : filter.value,
      }))
      .toSorted((a, b) => `${a.field}:${a.operator}`.localeCompare(`${b.field}:${b.operator}`)),
  );

export const sameFilters = (a: readonly Filter[], b: readonly Filter[]) =>
  normalise(a) === normalise(b);

/** The saved filter matching what the rail shows now, if any. */
const useActive = (items: SavedFiltersBinding["items"], part: string) => {
  const { railFilters } = useFilterRailContext(part);
  if (railFilters.length === 0) return null;
  return items.find((item) => sameFilters(item.filters, railFilters)) ?? null;
};

// ─── Picker ──────────────────────────────────────────────────────────────────

type SavedFiltersProps = SavedFiltersBinding & { className?: string };

/**
 * A menu of saved filters. "No filter" (first) clears the rail; picking a saved
 * filter applies it. Each saved filter has a delete icon (or press Delete on
 * it), which asks for confirmation. Pair with `FilterRail.SaveFilter`, passing
 * both the same `useSavedFilters` result.
 */
function SavedFilters({ items, loading, error, remove, className }: SavedFiltersProps) {
  const t = useFilterRailT();
  const { railFilters, applyRailFilters } = useFilterRailContext("SavedFilters");
  const active = useActive(items, "SavedFilters");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SavedFilter | null>(null);
  const noFilter = railFilters.length === 0;

  // The active saved filter's name, else the plain "Saved filters" label.
  const label = active ? active.name : t("savedFilters");

  const askToDelete = (item: SavedFilter) => {
    setMenuOpen(false);
    setPendingDelete(item);
  };

  return (
    <div
      data-slot="filter-rail-saved-filters"
      className={cn(
        "astw:flex astw:shrink-0 astw:flex-col astw:gap-1 astw:border-b astw:border-border astw:px-3 astw:py-2",
        className,
      )}
    >
      <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Menu.Trigger
          render={
            <Button variant="outline" size="xs" className="astw:w-full astw:justify-start">
              <Bookmark className="astw:size-3.5 astw:shrink-0" aria-hidden />
              <span className="astw:truncate">{label}</span>
              <ChevronDown
                className="astw:ml-auto astw:size-3.5 astw:shrink-0 astw:opacity-60"
                aria-hidden
              />
            </Button>
          }
        />
        <Menu.Content className="astw:min-w-(--anchor-width)">
          {/* First option: back to no rail filters at all. */}
          <Menu.Item onClick={() => applyRailFilters([])}>
            <span className="astw:flex astw:w-full astw:items-center astw:gap-2">
              <span className="astw:w-3.5 astw:shrink-0">
                {noFilter && <Check className="astw:size-3.5" aria-hidden />}
              </span>
              <span className="astw:truncate">{t("noFilter")}</span>
            </span>
          </Menu.Item>
          <Menu.Separator />
          {loading && <Menu.Item disabled>{t("savedFiltersLoading")}</Menu.Item>}
          {!loading && items.length === 0 && <Menu.Item disabled>{t("noSavedFilters")}</Menu.Item>}
          {!loading && items.length > 0 && (
            <Menu.Group>
              {items.map((item) => (
                <Menu.Item
                  key={item.id}
                  onClick={() => applyRailFilters(item.filters)}
                  // Keyboard path to delete: Delete / Backspace on the item.
                  onKeyDown={(event) => {
                    if (event.key === "Delete" || event.key === "Backspace") {
                      event.preventDefault();
                      askToDelete(item);
                    }
                  }}
                  className="astw:group/saved-item"
                >
                  <span className="astw:flex astw:w-full astw:items-center astw:gap-2">
                    <span className="astw:w-3.5 astw:shrink-0">
                      {item.id === active?.id && <Check className="astw:size-3.5" aria-hidden />}
                    </span>
                    <span className="astw:min-w-0 astw:flex-1 astw:truncate">{item.name}</span>
                    <span
                      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <button> cannot nest inside the menu item
                      role="button"
                      tabIndex={-1}
                      aria-label={t("deleteSaved", { name: item.name })}
                      title={t("deleteSaved", { name: item.name })}
                      className="astw:shrink-0 astw:rounded astw:p-0.5 astw:text-muted-foreground astw:opacity-0 astw:transition-opacity astw:group-hover/saved-item:opacity-100 astw:group-data-highlighted/saved-item:opacity-100 astw:hover:text-danger-text"
                      onClick={(event) => {
                        // Delete, not apply.
                        event.stopPropagation();
                        askToDelete(item);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          askToDelete(item);
                        }
                      }}
                    >
                      <Trash2 className="astw:size-3.5" aria-hidden />
                    </span>
                  </span>
                </Menu.Item>
              ))}
            </Menu.Group>
          )}
        </Menu.Content>
      </Menu.Root>

      {error && (
        <p role="alert" className="astw:text-body-sm astw:text-danger-text">
          {t("savedFiltersError")}
        </p>
      )}

      {/* The app-shell Confirm pattern: a question naming the object, the
          consequence, an outline Cancel and a destructive confirm. */}
      <Dialog.Root
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <Dialog.Content className="astw:sm:max-w-sm">
          <Dialog.Header>
            <Dialog.Title>
              {t("deleteSavedTitle", { name: pendingDelete?.name ?? "" })}
            </Dialog.Title>
            <Dialog.Description>{t("deleteSavedDescription")}</Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Dialog.Close render={<Button variant="outline" />}>{t("cancel")}</Dialog.Close>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDelete) remove(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              {t("delete")}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
SavedFilters.displayName = "FilterRail.SavedFilters";

// ─── Save footer ─────────────────────────────────────────────────────────────

type SaveFilterProps = SavedFiltersBinding & { className?: string };

/**
 * A footer pinned to the bottom of the rail with a "Save filters" button. It
 * appears only when saving would help: some filters are applied and they are
 * not already a saved filter. Place it after `FilterRail.Sections`.
 */
function SaveFilter({ items, loading, save, className }: SaveFilterProps) {
  const t = useFilterRailT();
  const { railFilters } = useFilterRailContext("SaveFilter");
  const active = useActive(items, "SaveFilter");
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState("");

  const trimmed = draft.trim();
  const replaces = items.find((item) => item.name.toLowerCase() === trimmed.toLowerCase());

  const commit = () => {
    if (!trimmed) return;
    save(trimmed, [...railFilters]);
    setNaming(false);
    setDraft("");
  };

  const show = !loading && railFilters.length > 0 && !active;

  return (
    <>
      {show && (
        <div
          data-slot="filter-rail-save-filter"
          className={cn("astw:shrink-0 astw:border-t astw:border-border astw:p-2", className)}
        >
          <Button
            variant="outline"
            size="sm"
            className="astw:w-full"
            onClick={() => {
              setDraft("");
              setNaming(true);
            }}
          >
            <Bookmark className="astw:size-3.5" aria-hidden />
            {t("saveFilter")}
          </Button>
        </div>
      )}

      <Dialog.Root open={naming} onOpenChange={setNaming}>
        <Dialog.Content className="astw:sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>{t("saveFilter")}</Dialog.Title>
            <Dialog.Description>{t("saveFilterDescription")}</Dialog.Description>
          </Dialog.Header>
          <Input
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- the dialog exists only to type this name
            autoFocus
            aria-label={t("saveFilterName")}
            placeholder={t("saveFilterPlaceholder")}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
            }}
          />
          {replaces && (
            <p className="astw:text-body-sm astw:text-muted-foreground">
              {t("replacesExisting", { name: replaces.name })}
            </p>
          )}
          <Dialog.Footer>
            <Button variant="outline" onClick={() => setNaming(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={commit} disabled={!trimmed}>
              {replaces ? t("replace") : t("save")}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
SaveFilter.displayName = "FilterRail.SaveFilter";

export { SavedFilters, SaveFilter };
export type { SavedFiltersProps, SaveFilterProps };
