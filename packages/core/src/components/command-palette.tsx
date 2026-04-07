import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { useNavigate, Await } from "react-router";
import { SearchIcon } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Input } from "@/components/input";
import { useT } from "@/i18n-labels";
import { cn } from "@/lib/utils";
import { filterRoutes, NavigatableRoute } from "@/routing/path";
import { useNavItems, NavItem, NavItemResource } from "../routing/navigation";
import {
  useCommandPaletteActions,
  type CommandPaletteAction,
} from "@/contexts/command-palette-context";

type SelectableItem =
  | { type: "action"; action: CommandPaletteAction }
  | { type: "route"; route: NavigatableRoute };

const paletteItemBase =
  "astw:relative astw:flex astw:w-full astw:cursor-pointer astw:select-none astw:rounded-sm astw:px-2 astw:py-2 astw:text-sm astw:outline-none astw:text-left";

const paletteItemHighlight = (active: boolean) =>
  active
    ? "astw:bg-accent astw:text-accent-foreground"
    : "astw:hover:bg-accent astw:hover:text-accent-foreground";

export type UseCommandPaletteOptions = {
  routes: Array<NavigatableRoute>;
  contextualActions?: Array<CommandPaletteAction>;
};

/**
 * Convert NavItems (from navigation loader with access control) to NavigableRoutes.
 * Recursively processes subResources to include nested routes.
 */
export function navItemsToRoutes(
  navItems: Array<NavItem>,
): Array<NavigatableRoute> {
  const routes: Array<NavigatableRoute> = [];

  const processResourceItems = (
    items: Array<NavItemResource>,
    parentIcon: React.ReactNode,
    parentBreadcrumb: Array<string>,
  ) => {
    items.forEach((item) => {
      const breadcrumb = [...parentBreadcrumb, item.title];

      // Only add navigable routes (componentless resources have no url)
      if (item.url) {
        routes.push({
          path: item.url,
          title: item.title,
          icon: parentIcon,
          breadcrumb,
        });
      }

      // Recursively process sub-items even if parent has no url
      if (item.items && item.items.length > 0) {
        processResourceItems(item.items, parentIcon, breadcrumb);
      }
    });
  };

  navItems.forEach((navItem) => {
    // Add module-level route if it has a URL
    if (navItem.url) {
      routes.push({
        path: navItem.url,
        title: navItem.title,
        icon: navItem.icon,
        breadcrumb: [navItem.title],
      });
    }

    // Process resource-level routes (including subResources)
    processResourceItems(navItem.items, navItem.icon, [navItem.title]);
  });

  return routes;
}

export type UseCommandPaletteReturn = {
  open: boolean;
  handleOpenChange: (open: boolean) => void;
  search: string;
  setSearch: (search: string) => void;
  selectedIndex: number;
  filteredActions: Array<CommandPaletteAction>;
  filteredRoutes: Array<NavigatableRoute>;
  selectableItems: Array<SelectableItem>;
  handleSelectItem: (item: SelectableItem) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
};

function filterActions(
  actions: Array<CommandPaletteAction>,
  search: string,
): Array<CommandPaletteAction> {
  if (!search.trim()) return actions;
  const lowerSearch = search.toLowerCase();
  return actions.filter((action) => action.label.toLowerCase().includes(lowerSearch));
}

export function useCommandPalette({
  routes,
  contextualActions = [],
}: UseCommandPaletteOptions): UseCommandPaletteReturn {
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearchInternal] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredActions = useMemo(
    () => filterActions(contextualActions, search),
    [contextualActions, search],
  );
  const filteredRoutes = useMemo(() => filterRoutes(routes, search), [routes, search]);

  // Unified list: actions first, then routes
  const selectableItems = useMemo<Array<SelectableItem>>(
    () => [
      ...filteredActions.map((action) => ({ type: "action" as const, action })),
      ...filteredRoutes.map((route) => ({ type: "route" as const, route })),
    ],
    [filteredActions, filteredRoutes],
  );

  // Wrapper to reset selectedIndex when search changes
  const setSearch = useCallback((newSearch: string) => {
    setSearchInternal(newSearch);
    setSelectedIndex(0);
  }, []);

  // Global keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Windows)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Handler for dialog open state changes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchInternal("");
      setSelectedIndex(0);
    }
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      listRef.current
        .querySelector(`[data-index="${selectedIndex}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSelectItem = useCallback(
    (item: SelectableItem) => {
      if (item.type === "route") {
        navigate(item.route.path);
      } else {
        const result = item.action.onSelect();
        if (result instanceof Promise) {
          result.catch((err) => console.error("[CommandPalette] onSelect error:", err));
        }
      }
      setOpen(false);
      setSearchInternal("");
    },
    [navigate],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ignore during IME composition
      if (e.nativeEvent.isComposing) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev < selectableItems.length - 1 ? prev + 1 : prev));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (selectableItems[selectedIndex]) {
            handleSelectItem(selectableItems[selectedIndex]);
          }
          break;
      }
    },
    [selectableItems, selectedIndex, handleSelectItem],
  );

  return {
    open,
    handleOpenChange,
    search,
    setSearch,
    selectedIndex,
    filteredActions,
    filteredRoutes,
    selectableItems,
    handleSelectItem,
    handleKeyDown,
    listRef,
  };
}

type CommandPaletteContentProps = {
  navItems: Array<NavItem>;
};

export function CommandPaletteContent({
  navItems,
}: CommandPaletteContentProps) {
  const t = useT();
  const contextualActions = useCommandPaletteActions();
  const routes = useMemo(() => navItemsToRoutes(navItems), [navItems]);
  const {
    open,
    handleOpenChange,
    search,
    setSearch,
    selectedIndex,
    filteredActions,
    filteredRoutes,
    selectableItems,
    handleSelectItem,
    handleKeyDown,
    listRef,
  } = useCommandPalette({ routes, contextualActions });

  // Compute the global index offset for routes (actions come first)
  const routeIndexOffset = filteredActions.length;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content
        className="astw:p-0 astw:gap-0 astw:sm:max-w-2xl astw:overflow-hidden astw:top-[30%] astw:translate-y-[-30%]"
        onKeyDown={handleKeyDown}
        aria-describedby={undefined}
      >
        <Dialog.Title className="astw:sr-only">
          {t("commandPaletteSearch")}
        </Dialog.Title>
        <div className="astw:flex astw:items-center astw:border-b astw:px-3 astw:py-1">
          <SearchIcon className="astw:mr-2 astw:h-4 astw:w-4 astw:shrink-0 astw:opacity-50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("commandPaletteSearch")}
            className="astw:flex astw:h-10 astw:w-full astw:rounded-md astw:bg-transparent astw:py-3 astw:text-sm astw:outline-none astw:border-0 astw:shadow-none astw:focus-visible:ring-0 astw:placeholder:text-muted-foreground astw:disabled:cursor-not-allowed astw:disabled:opacity-50"
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- intentional: command palette should auto-focus the search input when opened
            autoFocus
          />
        </div>
        <div
          ref={listRef}
          className="astw:max-h-[50vh] astw:overflow-y-auto astw:overflow-x-hidden"
        >
          {selectableItems.length === 0 ? (
            <div className="astw:py-6 astw:text-center astw:text-sm astw:text-muted-foreground">
              {t("commandPaletteNoResults")}
            </div>
          ) : (
            <div className="astw:p-1">
              {filteredActions.length > 0 && (
                <>
                  <div className="astw:px-2 astw:py-1.5 astw:text-xs astw:font-medium astw:text-muted-foreground">
                    {t("commandPaletteActions")}
                  </div>
                  {filteredActions.map((action, index) => (
                    <button
                      key={`action-${action.key}`}
                      data-index={index}
                      onClick={() => handleSelectItem({ type: "action", action })}
                      className={cn(
                        paletteItemBase,
                        "astw:items-center astw:gap-2",
                        paletteItemHighlight(index === selectedIndex),
                      )}
                    >
                      {action.icon && (
                        <span className="astw:flex astw:size-4 astw:items-center astw:justify-center astw:shrink-0">
                          {action.icon}
                        </span>
                      )}
                      <span className="astw:truncate">{action.label}</span>
                      {action.group && (
                        <span className="astw:ml-auto astw:text-xs astw:text-muted-foreground astw:shrink-0">
                          {action.group}
                        </span>
                      )}
                    </button>
                  ))}
                </>
              )}
              {filteredRoutes.length > 0 && (
                <>
                  <div className="astw:px-2 astw:py-1.5 astw:text-xs astw:font-medium astw:text-muted-foreground">
                    {t("commandPalettePages")}
                  </div>
                  {filteredRoutes.map((route, index) => {
                    const globalIndex = routeIndexOffset + index;
                    return (
                      <button
                        key={route.path}
                        data-index={globalIndex}
                        onClick={() => handleSelectItem({ type: "route", route })}
                        className={cn(
                          paletteItemBase,
                          "astw:flex-col astw:items-start",
                          paletteItemHighlight(globalIndex === selectedIndex),
                        )}
                      >
                        <span className="astw:truncate astw:w-full astw:text-left">
                          {route.breadcrumb.join(" > ")}
                        </span>
                        <span className="astw:text-[11px] astw:text-muted-foreground astw:truncate astw:w-full astw:text-left">
                          /{route.path}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/**
 * CommandPalette component that uses navigation items with access control.
 * Renders a searchable command palette UI triggered by Cmd+K / Ctrl+K.
 */
export function CommandPalette() {
  const navItems = useNavItems();

  return (
    <Suspense fallback={null}>
      <Await resolve={navItems}>
        {(items) => <CommandPaletteContent navItems={items ?? []} />}
      </Await>
    </Suspense>
  );
}
