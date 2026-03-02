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
import { Dialog, DialogContent, DialogTitle } from "@/components/dialog";
import { Input } from "@/components/input";

import { useT } from "@/i18n-labels";
import { cn } from "@/lib/utils";
import { filterRoutes, NavigatableRoute } from "@/routing/path";
import { useNavItems, NavItem, NavItemResource } from "../routing/navigation";

export type UseCommandPaletteOptions = {
  routes: Array<NavigatableRoute>;
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

      routes.push({
        path: item.url,
        title: item.title,
        icon: parentIcon,
        breadcrumb,
      });

      // Recursively process sub-items
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
  filteredRoutes: Array<NavigatableRoute>;
  handleSelect: (route: NavigatableRoute) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
};

export function useCommandPalette({
  routes,
}: UseCommandPaletteOptions): UseCommandPaletteReturn {
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearchInternal] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredRoutes = useMemo(
    () => filterRoutes(routes, search),
    [routes, search],
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

  const handleSelect = useCallback(
    (route: NavigatableRoute) => {
      navigate(route.path);
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
          setSelectedIndex((prev) =>
            prev < filteredRoutes.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredRoutes[selectedIndex]) {
            handleSelect(filteredRoutes[selectedIndex]);
          }
          break;
      }
    },
    [filteredRoutes, selectedIndex, handleSelect],
  );

  return {
    open,
    handleOpenChange,
    search,
    setSearch,
    selectedIndex,
    filteredRoutes,
    handleSelect,
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
  const routes = useMemo(() => navItemsToRoutes(navItems), [navItems]);
  const {
    open,
    handleOpenChange,
    search,
    setSearch,
    selectedIndex,
    filteredRoutes,
    handleSelect,
    handleKeyDown,
    listRef,
  } = useCommandPalette({ routes });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="astw:p-0 astw:gap-0 astw:sm:max-w-2xl astw:overflow-hidden"
        onKeyDown={handleKeyDown}
        aria-describedby={undefined}
      >
        <DialogTitle className="astw:sr-only">
          {t("commandPaletteSearch")}
        </DialogTitle>
        <div className="astw:flex astw:items-center astw:border-b astw:px-3 astw:py-1">
          <SearchIcon className="astw:mr-2 astw:h-4 astw:w-4 astw:shrink-0 astw:opacity-50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("commandPaletteSearch")}
            className="astw:flex astw:h-10 astw:w-full astw:rounded-md astw:bg-transparent astw:py-3 astw:text-sm astw:outline-none astw:border-0 astw:shadow-none astw:focus-visible:ring-0 astw:placeholder:text-muted-foreground astw:disabled:cursor-not-allowed astw:disabled:opacity-50"
            autoFocus
          />
        </div>
        <div
          ref={listRef}
          className="astw:max-h-75 astw:overflow-y-auto astw:overflow-x-hidden"
        >
          {filteredRoutes.length === 0 ? (
            <div className="astw:py-6 astw:text-center astw:text-sm astw:text-muted-foreground">
              {t("commandPaletteNoResults")}
            </div>
          ) : (
            <div className="astw:p-1">
              {filteredRoutes.map((route, index) => (
                <button
                  key={route.path}
                  data-index={index}
                  onClick={() => handleSelect(route)}
                  className={cn(
                    "astw:relative astw:flex astw:flex-col astw:w-full astw:cursor-pointer astw:select-none astw:items-start astw:rounded-sm astw:px-2 astw:py-2 astw:text-sm astw:outline-none astw:text-left",
                    index === selectedIndex
                      ? "astw:bg-accent astw:text-accent-foreground"
                      : "astw:hover:bg-accent astw:hover:text-accent-foreground",
                  )}
                >
                  <span className="astw:truncate astw:w-full astw:text-left">
                    {route.breadcrumb.join(" > ")}
                  </span>
                  <span className="astw:text-[11px] astw:text-muted-foreground astw:truncate astw:w-full astw:text-left">
                    /{route.path}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
