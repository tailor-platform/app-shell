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
import type { SavedFiltersBinding } from "./types";

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
 * A menu of saved filters: pick one to apply it. "Manage saved filters…" opens
 * a dialog to delete them. Pair with `FilterRail.SaveFilter`, passing both the
 * same `useSavedFilters` result.
 */
function SavedFilters({ items, loading, error, remove, className }: SavedFiltersProps) {
  const t = useFilterRailT();
  const { applyRailFilters } = useFilterRailContext("SavedFilters");
  const active = useActive(items, "SavedFilters");
  const [managing, setManaging] = useState(false);

  return (
    <div
      data-slot="filter-rail-saved-filters"
      className={cn(
        "astw:flex astw:shrink-0 astw:flex-col astw:gap-1 astw:border-b astw:border-border astw:px-3 astw:py-2",
        className,
      )}
    >
      <Menu.Root>
        <Menu.Trigger
          render={
            <Button variant="outline" size="xs" className="astw:w-full astw:justify-start">
              <Bookmark className="astw:size-3.5 astw:shrink-0" aria-hidden />
              <span className="astw:truncate">{active ? active.name : t("savedFilters")}</span>
              {!active && items.length > 0 && (
                <span className="astw:shrink-0 astw:text-muted-foreground">({items.length})</span>
              )}
              <ChevronDown
                className="astw:ml-auto astw:size-3.5 astw:shrink-0 astw:opacity-60"
                aria-hidden
              />
            </Button>
          }
        />
        <Menu.Content className="astw:min-w-(--anchor-width)">
          {loading && <Menu.Item disabled>{t("savedFiltersLoading")}</Menu.Item>}
          {!loading && items.length === 0 && <Menu.Item disabled>{t("noSavedFilters")}</Menu.Item>}
          {!loading && items.length > 0 && (
            <>
              <Menu.Group>
                {items.map((item) => (
                  <Menu.Item key={item.id} onClick={() => applyRailFilters(item.filters)}>
                    <span className="astw:flex astw:w-full astw:items-center astw:gap-2">
                      <span className="astw:w-3.5 astw:shrink-0">
                        {item.id === active?.id && <Check className="astw:size-3.5" aria-hidden />}
                      </span>
                      <span className="astw:truncate">{item.name}</span>
                    </span>
                  </Menu.Item>
                ))}
              </Menu.Group>
              <Menu.Separator />
              <Menu.Item onClick={() => setManaging(true)}>{t("manageSavedFilters")}</Menu.Item>
            </>
          )}
        </Menu.Content>
      </Menu.Root>

      {error && (
        <p role="alert" className="astw:text-xs astw:text-destructive">
          {t("savedFiltersError")}
        </p>
      )}

      {/* Delete lives here, as real buttons, not inside the menu items. */}
      <Dialog.Root open={managing} onOpenChange={setManaging}>
        <Dialog.Content className="astw:sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>{t("savedFilters")}</Dialog.Title>
            <Dialog.Description>{t("manageDescription")}</Dialog.Description>
          </Dialog.Header>
          {items.length === 0 ? (
            <p className="astw:text-sm astw:text-muted-foreground">{t("noSavedFilters")}</p>
          ) : (
            <ul className="astw:m-0 astw:flex astw:list-none astw:flex-col astw:gap-1 astw:p-0">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="astw:flex astw:items-center astw:justify-between astw:gap-2 astw:rounded-md astw:px-2 astw:py-1 astw:hover:bg-accent"
                >
                  <span className="astw:truncate astw:text-sm">{item.name}</span>
                  <Button
                    variant="ghost"
                    size="xs"
                    aria-label={t("deleteSaved", { name: item.name })}
                    className="astw:text-muted-foreground astw:hover:text-destructive"
                    onClick={() => remove(item.id)}
                  >
                    <Trash2 className="astw:size-3.5" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Dialog.Footer>
            <Button variant="outline" onClick={() => setManaging(false)}>
              {t("close")}
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
            <p className="astw:text-xs astw:text-muted-foreground">
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
