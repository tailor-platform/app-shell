import {
  useReducer,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { useNavigate, Await } from "react-router";
import { SearchIcon, LoaderCircleIcon } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Input } from "@/components/input";
import { useT } from "@/i18n-labels";
import { cn } from "@/lib/utils";
import { filterRoutes, NavigatableRoute } from "@/routing/path";
import { useNavItems, NavItem, NavItemResource } from "../routing/navigation";
import {
  useCommandPaletteActions,
  useCommandPaletteState,
  type CommandPaletteAction,
  type CommandPaletteSearchResult,
  type SearchSource,
} from "@/contexts/command-palette-context";

type SelectableItem =
  | { type: "action"; action: CommandPaletteAction }
  | { type: "route"; route: NavigatableRoute }
  | { type: "search-mode"; source: SearchSource }
  | {
      type: "search-result";
      result: CommandPaletteSearchResult;
      source: SearchSource;
    };

const paletteItemBase =
  "astw:relative astw:flex astw:w-full astw:cursor-pointer astw:select-none astw:rounded-sm astw:px-2 astw:py-2 astw:text-sm astw:outline-none astw:text-left";

const paletteItemHighlight = (active: boolean) =>
  active
    ? "astw:bg-accent astw:text-accent-foreground"
    : "astw:hover:bg-accent astw:hover:text-accent-foreground";

export type UseCommandPaletteOptions = {
  routes: Array<NavigatableRoute>;
  contextualActions?: Array<CommandPaletteAction>;
  searchSources?: readonly SearchSource[];
  open: boolean;
  setOpen: (open: boolean) => void;
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
  searchResults: Array<CommandPaletteSearchResult>;
  activeSearchSource: SearchSource | null;
  isSearching: boolean;
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
  return actions.filter((action) =>
    action.label.toLowerCase().includes(lowerSearch),
  );
}

const SEARCH_DEBOUNCE_MS = 300;

// ── Reducer State (discriminated union) ──

type PaletteState =
  | {
      mode: "browse";
      search: string;
      selectedIndex: number;
    }
  | {
      mode: "search";
      source: SearchSource;
      query: string;
      selectedIndex: number;
      results: Array<CommandPaletteSearchResult>;
      isSearching: boolean;
    };

type PaletteAction =
  | {
      type: "SET_SEARCH";
      value: string;
      detectedSource?: SearchSource;
      detectedQuery?: string;
    }
  | { type: "ARROW_DOWN"; maxIndex: number }
  | { type: "ARROW_UP" }
  | { type: "ENTER_SEARCH_MODE"; source: SearchSource }
  | { type: "EXIT_SEARCH_MODE" }
  | { type: "SEARCH_START" }
  | { type: "SEARCH_DONE"; results: Array<CommandPaletteSearchResult> }
  | { type: "SEARCH_FAIL" }
  | { type: "RESET" };

const initialPaletteState: PaletteState = {
  mode: "browse",
  search: "",
  selectedIndex: 0,
};

const EMPTY_RESULTS: Array<CommandPaletteSearchResult> = [];

function paletteReducer(
  state: PaletteState,
  action: PaletteAction,
): PaletteState {
  switch (action.type) {
    case "SET_SEARCH":
      if (state.mode === "search") {
        return { ...state, query: action.value, selectedIndex: 0 };
      }
      if (action.detectedSource) {
        return {
          mode: "search",
          source: action.detectedSource,
          query: action.detectedQuery ?? "",
          selectedIndex: 0,
          results: [],
          isSearching: false,
        };
      }
      return { ...state, search: action.value, selectedIndex: 0 };

    case "ENTER_SEARCH_MODE":
      return {
        mode: "search",
        source: action.source,
        query: "",
        selectedIndex: 0,
        results: [],
        isSearching: false,
      };

    case "EXIT_SEARCH_MODE":
      return initialPaletteState;

    case "SEARCH_START":
      if (state.mode !== "search") return state;
      return { ...state, isSearching: true, results: [] };

    case "SEARCH_DONE":
      if (state.mode !== "search") return state;
      return { ...state, results: action.results, isSearching: false };

    case "SEARCH_FAIL":
      if (state.mode !== "search") return state;
      return { ...state, results: [], isSearching: false };

    case "ARROW_DOWN":
      return {
        ...state,
        selectedIndex: Math.min(state.selectedIndex + 1, action.maxIndex),
      };

    case "ARROW_UP":
      return {
        ...state,
        selectedIndex: Math.max(state.selectedIndex - 1, 0),
      };

    case "RESET":
      return initialPaletteState;
  }
}

/**
 * Parse the search input to detect an active search mode.
 *
 * If the input starts with a registered prefix followed by `:`, the matching
 * source is returned together with the query portion after the colon.
 * The prefix match is case-sensitive.
 */
export function parseSearchMode(
  search: string,
  searchSources: readonly SearchSource[],
): { activeSource: SearchSource | null; searchQuery: string } {
  const colonIndex = search.indexOf(":");
  if (colonIndex < 1) return { activeSource: null, searchQuery: search };

  const prefix = search.slice(0, colonIndex);
  const source = searchSources.find((s) => s.prefix === prefix);
  if (!source) return { activeSource: null, searchQuery: search };

  return {
    activeSource: source,
    searchQuery: search.slice(colonIndex + 1).trimStart(),
  };
}

export function useCommandPalette({
  routes,
  contextualActions = [],
  searchSources = [],
  open,
  setOpen,
}: UseCommandPaletteOptions): UseCommandPaletteReturn {
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(paletteReducer, initialPaletteState);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Derive flat values from discriminated state
  const search = state.mode === "search" ? state.query : state.search;
  const selectedIndex = state.selectedIndex;
  const activeSource = state.mode === "search" ? state.source : null;
  const searchResults = state.mode === "search" ? state.results : EMPTY_RESULTS;
  const isSearching = state.mode === "search" ? state.isSearching : false;

  // In default mode: sync filter actions & routes
  const filteredActions = useMemo(
    () => (activeSource ? [] : filterActions(contextualActions, search)),
    [contextualActions, search, activeSource],
  );
  const filteredRoutes = useMemo(
    () => (activeSource ? [] : filterRoutes(routes, search)),
    [routes, search, activeSource],
  );

  // Debounced async search when in search mode
  useEffect(() => {
    if (!activeSource) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      return;
    }

    const timer = setTimeout(() => {
      dispatch({ type: "SEARCH_START" });

      // Abort previous in-flight request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      activeSource
        .search(search, { signal: controller.signal })
        .then((results) => {
          if (!controller.signal.aborted) {
            dispatch({ type: "SEARCH_DONE", results });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            dispatch({ type: "SEARCH_FAIL" });
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [activeSource, search]);

  // Unified selectable items list
  const selectableItems = useMemo<Array<SelectableItem>>(() => {
    if (activeSource) {
      // In search mode: only search results
      return searchResults.map((result) => ({
        type: "search-result" as const,
        result,
        source: activeSource,
      }));
    }

    // Default mode: search mode entries (filtered by prefix/title) + actions + routes
    const items: Array<SelectableItem> = [];
    if (searchSources.length > 0) {
      const lowerSearch = search.trim().toLowerCase();
      const matchingSources = lowerSearch
        ? searchSources.filter(
            (source) =>
              source.prefix.toLowerCase().includes(lowerSearch) ||
              source.title.toLowerCase().includes(lowerSearch),
          )
        : searchSources;
      items.push(
        ...matchingSources.map((source) => ({
          type: "search-mode" as const,
          source,
        })),
      );
    }
    items.push(
      ...filteredActions.map((action) => ({ type: "action" as const, action })),
    );
    items.push(
      ...filteredRoutes.map((route) => ({ type: "route" as const, route })),
    );
    return items;
  }, [
    activeSource,
    searchResults,
    search,
    searchSources,
    filteredActions,
    filteredRoutes,
  ]);

  // Wrapper that dispatches SET_SEARCH with auto-detected search mode
  const setSearch = useCallback(
    (newSearch: string) => {
      if (state.mode === "search") {
        dispatch({ type: "SET_SEARCH", value: newSearch });
        return;
      }
      const parsed = parseSearchMode(newSearch, searchSources);
      dispatch({
        type: "SET_SEARCH",
        value: newSearch,
        detectedSource: parsed.activeSource ?? undefined,
        detectedQuery: parsed.activeSource ? parsed.searchQuery : undefined,
      });
    },
    [state.mode, searchSources],
  );

  // Handler for dialog open state changes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      if (!newOpen) {
        dispatch({ type: "RESET" });
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
      }
    },
    [setOpen],
  );

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
      if (item.type === "search-mode") {
        // Enter search mode: lock source and clear input
        dispatch({ type: "ENTER_SEARCH_MODE", source: item.source });
        return;
      }
      if (item.type === "search-result") {
        navigate(item.result.path);
      } else if (item.type === "route") {
        navigate(item.route.path);
      } else {
        const result = item.action.onSelect();
        if (result instanceof Promise) {
          result.catch((err) => console.error("[CommandPalette] onSelect error:", err));
        }
      }
      setOpen(false);
      dispatch({ type: "RESET" });
    },
    [navigate, setOpen],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ignore during IME composition
      if (e.nativeEvent.isComposing) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          dispatch({
            type: "ARROW_DOWN",
            maxIndex: selectableItems.length - 1,
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          dispatch({ type: "ARROW_UP" });
          break;
        case "Enter":
          e.preventDefault();
          if (selectableItems[selectedIndex]) {
            handleSelectItem(selectableItems[selectedIndex]);
          }
          break;
        case "Backspace":
          if (activeSource && search === "") {
            e.preventDefault();
            dispatch({ type: "EXIT_SEARCH_MODE" });
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
          }
          break;
      }
    },
    [selectableItems, selectedIndex, handleSelectItem, activeSource, search],
  );

  return {
    open,
    handleOpenChange,
    search,
    setSearch,
    selectedIndex,
    filteredActions,
    filteredRoutes,
    searchResults,
    activeSearchSource: activeSource,
    isSearching,
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
  const { searchSources, open, setOpen } = useCommandPaletteState();
  const routes = useMemo(() => navItemsToRoutes(navItems), [navItems]);
  const {
    open: paletteOpen,
    handleOpenChange,
    search,
    setSearch,
    selectedIndex,
    filteredActions,
    filteredRoutes,
    searchResults,
    activeSearchSource,
    isSearching,
    selectableItems,
    handleSelectItem,
    handleKeyDown,
    listRef,
  } = useCommandPalette({
    routes,
    contextualActions,
    searchSources,
    open,
    setOpen,
  });

  // Compute index offsets for each section
  const searchModeItems = activeSearchSource
    ? []
    : selectableItems.filter((i) => i.type === "search-mode");
  const searchModesCount = searchModeItems.length;
  const actionIndexOffset = searchModesCount;
  const routeIndexOffset = actionIndexOffset + filteredActions.length;

  return (
    <Dialog.Root open={paletteOpen} onOpenChange={handleOpenChange}>
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
          {activeSearchSource && (
            <span className="astw:inline-flex astw:items-center astw:shrink-0 astw:rounded astw:bg-muted astw:px-1.5 astw:py-0.5 astw:mr-1.5 astw:text-xs astw:font-medium astw:text-muted-foreground">
              {activeSearchSource.prefix}
            </span>
          )}
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
          {selectableItems.length === 0 && !isSearching ? (
            <div className="astw:py-6 astw:text-center astw:text-sm astw:text-muted-foreground">
              {t("commandPaletteNoResults")}
            </div>
          ) : (
            <div className="astw:p-1">
              {/* Search mode entries (default mode, filtered by search) */}
              {searchModesCount > 0 && (
                <>
                  <div className="astw:px-2 astw:py-1.5 astw:text-xs astw:font-medium astw:text-muted-foreground">
                    {t("commandPaletteSearchModes")}
                  </div>
                  {searchModeItems.map((item, index) => {
                    const source =
                      item.type === "search-mode" ? item.source : null;
                    if (!source) return null;
                    return (
                      <button
                        key={`search-mode-${source.prefix}`}
                        data-index={index}
                        onClick={() =>
                          handleSelectItem({ type: "search-mode", source })
                        }
                        className={cn(
                          paletteItemBase,
                          "astw:items-center astw:gap-2",
                          paletteItemHighlight(index === selectedIndex),
                        )}
                      >
                        {source.icon && (
                          <span className="astw:flex astw:size-4 astw:items-center astw:justify-center astw:shrink-0">
                            {source.icon}
                          </span>
                        )}
                        <span className="astw:font-mono astw:text-xs astw:text-muted-foreground astw:shrink-0">
                          {source.prefix}:
                        </span>
                        <span className="astw:truncate">{source.title}</span>
                      </button>
                    );
                  })}
                </>
              )}
              {/* Actions section (default mode only) */}
              {filteredActions.length > 0 && (
                <>
                  <div className="astw:px-2 astw:py-1.5 astw:text-xs astw:font-medium astw:text-muted-foreground">
                    {t("commandPaletteActions")}
                  </div>
                  {filteredActions.map((action, index) => {
                    const globalIndex = actionIndexOffset + index;
                    return (
                      <button
                        key={`action-${action.key}`}
                        data-index={globalIndex}
                        onClick={() =>
                          handleSelectItem({ type: "action", action })
                        }
                        className={cn(
                          paletteItemBase,
                          "astw:items-center astw:gap-2",
                          paletteItemHighlight(globalIndex === selectedIndex),
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
                    );
                  })}
                </>
              )}
              {/* Pages section (default mode only) */}
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
                        onClick={() =>
                          handleSelectItem({ type: "route", route })
                        }
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
              {/* Search results (search mode only) */}
              {activeSearchSource && searchResults.length > 0 && (
                <>
                  <div className="astw:px-2 astw:py-1.5 astw:text-xs astw:font-medium astw:text-muted-foreground">
                    {activeSearchSource.title}
                  </div>
                  {searchResults.map((result, index) => (
                    <button
                      key={`search-result-${result.key}`}
                      data-index={index}
                      onClick={() =>
                        handleSelectItem({
                          type: "search-result",
                          result,
                          source: activeSearchSource,
                        })
                      }
                      className={cn(
                        paletteItemBase,
                        "astw:flex-col astw:items-start",
                        paletteItemHighlight(index === selectedIndex),
                      )}
                    >
                      <span className="astw:flex astw:items-center astw:gap-2 astw:w-full">
                        {(result.icon || activeSearchSource.icon) && (
                          <span className="astw:flex astw:size-4 astw:items-center astw:justify-center astw:shrink-0">
                            {result.icon ?? activeSearchSource.icon}
                          </span>
                        )}
                        <span className="astw:truncate">{result.label}</span>
                      </span>
                      {result.description && (
                        <span className="astw:text-[11px] astw:text-muted-foreground astw:truncate astw:w-full astw:text-left">
                          {result.description}
                        </span>
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
          {/* Searching indicator */}
          {isSearching && (
            <div className="astw:flex astw:items-center astw:justify-center astw:gap-2 astw:py-4 astw:text-sm astw:text-muted-foreground">
              <LoaderCircleIcon className="astw:h-4 astw:w-4 astw:animate-spin" />
              {t("commandPaletteSearching")}
            </div>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/**
 * @deprecated CommandPalette is now built into AppShell and rendered automatically.
 * Remove `<CommandPalette>` from your JSX.
 */
export function CommandPalette(): React.ReactNode {
  return null;
}

/**
 * Built-in CommandPalette rendered internally by AppShell.
 *
 * @internal — not intended for direct use.
 */
export function BuiltInCommandPalette() {
  const navItems = useNavItems();

  return (
    <Suspense fallback={null}>
      <Await resolve={navItems}>
        {(items) => <CommandPaletteContent navItems={items ?? []} />}
      </Await>
    </Suspense>
  );
}
