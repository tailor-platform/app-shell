import { useState } from "react";
import { Bookmark, Check, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../button";
import { Dialog } from "../dialog";
import { Input } from "../input";
import { Menu } from "../menu";
import { useFilterRailT } from "./i18n";
import type { SavedViewBinding } from "./types";

type SavedViewsProps = SavedViewBinding & { className?: string };

/**
 * A saved-view picker plus a Save button that appears only when saving would
 * achieve something (`dirty`).
 *
 * Takes its binding as props and reads nothing from the rail, so it also works
 * outside `FilterRail.Root` — in a page header, for instance. `useSavedViews`
 * returns a ready binding for a `DataTable`.
 */
function SavedViews({
  items,
  activeId,
  dirty,
  onSave,
  onApply,
  onDelete,
  describe,
  className,
}: SavedViewsProps) {
  const t = useFilterRailT();
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const active = items.find((item) => item.id === activeId) ?? null;

  const commitName = () => {
    const name = draftName.trim();
    if (!name) return;
    onSave(name);
    setNaming(false);
    setDraftName("");
  };

  return (
    <div
      data-slot="filter-rail-saved-views"
      className={cn(
        "astw:flex astw:shrink-0 astw:items-center astw:gap-2 astw:border-b astw:border-border astw:px-3 astw:py-2",
        className,
      )}
    >
      <Menu.Root>
        <Menu.Trigger
          render={
            <Button
              variant="outline"
              size="xs"
              className="astw:min-w-0 astw:flex-1 astw:justify-start"
            >
              <Bookmark className="astw:size-3.5 astw:shrink-0" aria-hidden />
              <span className="astw:truncate">{active ? active.name : t("savedViews")}</span>
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
          {items.length === 0 ? (
            <Menu.Item disabled>{t("noSavedViews")}</Menu.Item>
          ) : (
            <Menu.Group>
              {items.map((item) => (
                <Menu.Item key={item.id} onClick={() => onApply(item)}>
                  <span className="astw:flex astw:w-full astw:items-center astw:gap-2">
                    <span className="astw:w-3.5 astw:shrink-0">
                      {item.id === activeId && <Check className="astw:size-3.5" aria-hidden />}
                    </span>
                    <span className="astw:flex astw:min-w-0 astw:flex-1 astw:flex-col">
                      <span className="astw:truncate">{item.name}</span>
                      {describe && (
                        <span className="astw:truncate astw:text-xs astw:text-muted-foreground">
                          {describe(item)}
                        </span>
                      )}
                    </span>
                    <span
                      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <button> cannot nest inside the menu item
                      role="button"
                      tabIndex={0}
                      aria-label={t("deleteView", { name: item.name })}
                      className="astw:shrink-0 astw:rounded astw:p-0.5 astw:text-muted-foreground astw:hover:text-destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(item);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          onDelete(item);
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

      {dirty && (
        <Button
          variant="outline"
          size="xs"
          onClick={() => {
            setDraftName("");
            setNaming(true);
          }}
        >
          {t("saveView")}
        </Button>
      )}

      <Dialog.Root open={naming} onOpenChange={setNaming}>
        <Dialog.Content className="astw:sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>{t("saveViewTitle")}</Dialog.Title>
            <Dialog.Description>{t("saveViewDescription")}</Dialog.Description>
          </Dialog.Header>
          <Input
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- the dialog exists only to type this name
            autoFocus
            aria-label={t("saveViewTitle")}
            placeholder={t("saveViewPlaceholder")}
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitName();
            }}
          />
          <Dialog.Footer>
            <Button variant="outline" onClick={() => setNaming(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={commitName} disabled={draftName.trim().length === 0}>
              {t("save")}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
SavedViews.displayName = "FilterRail.SavedViews";

export { SavedViews };
export type { SavedViewsProps };
