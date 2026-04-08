import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCommandPalette, navItemsToRoutes, parseSearchMode } from "./command-palette";
import { NavigatableRoute } from "@/routing/path";
import { CommandPaletteAction, SearchSource } from "@/contexts/command-palette-context";
import { MemoryRouter } from "react-router";
import { ReactNode, useState } from "react";

// Helper to create a mock React.KeyboardEvent
const createKeyboardEvent = (key: string, isComposing = false): React.KeyboardEvent => {
  const preventDefault = vi.fn();
  return {
    key,
    nativeEvent: { isComposing },
    preventDefault,
  } as unknown as React.KeyboardEvent;
};

// Helper to create test routes directly
const createTestRoutes = (): Array<NavigatableRoute> => [
  { path: "test", title: "Test Module", breadcrumb: ["Test Module"] },
  {
    path: "test/dashboard",
    title: "Dashboard",
    breadcrumb: ["Test Module", "Dashboard"],
  },
  { path: "test/users", title: "Users", breadcrumb: ["Test Module", "Users"] },
  {
    path: "test/settings",
    title: "Settings",
    breadcrumb: ["Test Module", "Settings"],
  },
];

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useNavigate: () => mockNavigate,
  };
});

// Wrapper for hooks that need router context
const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;

describe("useCommandPalette", () => {
  const renderCommandPaletteHook = (routes = createTestRoutes()) => {
    return renderHook(
      () => {
        const [open, setOpen] = useState(false);
        return useCommandPalette({ routes, open, setOpen });
      },
      { wrapper },
    );
  };

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe("initial state", () => {
    it("should start with closed dialog", () => {
      const { result } = renderCommandPaletteHook();
      expect(result.current.open).toBe(false);
    });

    it("should start with empty search", () => {
      const { result } = renderCommandPaletteHook();
      expect(result.current.search).toBe("");
    });

    it("should start with selectedIndex 0", () => {
      const { result } = renderCommandPaletteHook();
      expect(result.current.selectedIndex).toBe(0);
    });

    it("should have all routes in filteredRoutes initially", () => {
      const { result } = renderCommandPaletteHook();
      // Module (test) + 3 resources = 4 routes
      expect(result.current.filteredRoutes).toHaveLength(4);
    });
  });

  describe("open/close", () => {
    it("should allow opening dialog", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.handleOpenChange(true);
      });
      expect(result.current.open).toBe(true);
    });

    it("should reset search and selectedIndex when closing", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.handleOpenChange(true);
        result.current.setSearch("dash");
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
      });
      act(() => {
        result.current.handleOpenChange(false);
      });
      expect(result.current.search).toBe("");
      expect(result.current.selectedIndex).toBe(0);
    });
  });

  describe("search filtering", () => {
    it("should filter routes by search term", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.setSearch("dash");
      });
      expect(result.current.filteredRoutes).toHaveLength(1);
      expect(result.current.filteredRoutes[0].path).toBe("test/dashboard");
    });

    it("should reset selectedIndex when filtered results change", () => {
      const { result } = renderCommandPaletteHook();
      // Move to second item
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
      });
      expect(result.current.selectedIndex).toBe(1);
      // Change search - should reset index
      act(() => {
        result.current.setSearch("user");
      });
      expect(result.current.selectedIndex).toBe(0);
    });
  });

  describe("keyboard navigation", () => {
    it("should move down on ArrowDown", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
      });
      expect(result.current.selectedIndex).toBe(1);
    });

    it("should move up on ArrowUp", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
      });
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("ArrowUp"));
      });
      expect(result.current.selectedIndex).toBe(1);
    });

    it("should not go below 0", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("ArrowUp"));
      });
      expect(result.current.selectedIndex).toBe(0);
    });

    it("should not exceed list length", () => {
      const { result } = renderCommandPaletteHook();
      // 4 items: max index is 3
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
      });
      expect(result.current.selectedIndex).toBe(3);
    });
  });

  describe("IME composition", () => {
    it("should ignore key events during IME composition", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown", true));
      });
      expect(result.current.selectedIndex).toBe(0);
    });

    it("should not navigate on Enter during IME composition", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("Enter", true));
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("handleSelectItem", () => {
    it("should navigate to selected route", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        // filteredRoutes[0] is module, [1] is dashboard, [2] is users
        result.current.handleSelectItem({
          type: "route",
          route: result.current.filteredRoutes[2],
        });
      });
      expect(mockNavigate).toHaveBeenCalledWith("test/users");
    });

    it("should close dialog after selection", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.handleOpenChange(true);
      });
      act(() => {
        result.current.handleSelectItem({
          type: "route",
          route: result.current.filteredRoutes[0],
        });
      });
      expect(result.current.open).toBe(false);
    });

    it("should reset search after selection", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.setSearch("dash");
      });
      act(() => {
        result.current.handleSelectItem({
          type: "route",
          route: result.current.filteredRoutes[0],
        });
      });
      expect(result.current.search).toBe("");
    });
  });

  describe("Enter key navigation", () => {
    it("should navigate on Enter key press", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("Enter"));
      });
      // First route is the module itself
      expect(mockNavigate).toHaveBeenCalledWith("test");
    });

    it("should navigate to selected index on Enter", () => {
      const { result } = renderCommandPaletteHook();
      // Move to dashboard (index 1)
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
      });
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("Enter"));
      });
      expect(mockNavigate).toHaveBeenCalledWith("test/dashboard");
    });

    it("should not call navigate if no routes match", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.setSearch("nonexistent");
      });
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("Enter"));
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});

describe("navItemsToRoutes", () => {
  it("should convert NavItems to NavigableRoutes", () => {
    const navItems = [
      {
        title: "Module A",
        url: "module-a",
        icon: null,
        items: [
          { title: "Resource 1", url: "module-a/resource-1" },
          { title: "Resource 2", url: "module-a/resource-2" },
        ],
      },
    ];

    const routes = navItemsToRoutes(navItems);

    expect(routes).toHaveLength(3);
    expect(routes[0]).toEqual({
      path: "module-a",
      title: "Module A",
      icon: null,
      breadcrumb: ["Module A"],
    });
    expect(routes[1]).toEqual({
      path: "module-a/resource-1",
      title: "Resource 1",
      icon: null,
      breadcrumb: ["Module A", "Resource 1"],
    });
  });

  it("should skip module-level routes when URL is undefined", () => {
    const navItems = [
      {
        title: "Module B",
        url: undefined,
        icon: null,
        items: [{ title: "Resource 1", url: "module-b/resource-1" }],
      },
    ];

    const routes = navItemsToRoutes(navItems);

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe("module-b/resource-1");
  });

  it("should return empty array for empty input", () => {
    const routes = navItemsToRoutes([]);
    expect(routes).toHaveLength(0);
  });

  it("should recursively process subResources", () => {
    const navItems = [
      {
        title: "Custom Page",
        url: undefined,
        icon: null,
        items: [
          {
            title: "Sub1",
            url: "custom-page/sub1",
            items: [
              {
                title: "Sub1-1",
                url: "custom-page/sub1/sub1-1",
              },
              {
                title: "Sub1-2",
                url: "custom-page/sub1/sub1-2",
              },
            ],
          },
          { title: "Sub2", url: "custom-page/sub2" },
        ],
      },
    ];

    const routes = navItemsToRoutes(navItems);

    expect(routes).toHaveLength(4);
    expect(routes[0]).toEqual({
      path: "custom-page/sub1",
      title: "Sub1",
      icon: null,
      breadcrumb: ["Custom Page", "Sub1"],
    });
    expect(routes[1]).toEqual({
      path: "custom-page/sub1/sub1-1",
      title: "Sub1-1",
      icon: null,
      breadcrumb: ["Custom Page", "Sub1", "Sub1-1"],
    });
    expect(routes[2]).toEqual({
      path: "custom-page/sub1/sub1-2",
      title: "Sub1-2",
      icon: null,
      breadcrumb: ["Custom Page", "Sub1", "Sub1-2"],
    });
    expect(routes[3]).toEqual({
      path: "custom-page/sub2",
      title: "Sub2",
      icon: null,
      breadcrumb: ["Custom Page", "Sub2"],
    });
  });

  it("should skip items without url but include their children", () => {
    const navItems = [
      {
        title: "Module",
        url: "module",
        icon: null,
        items: [
          {
            title: "Settings",
            url: undefined,
            items: [
              { title: "General", url: "module/settings/general" },
              { title: "Advanced", url: "module/settings/advanced" },
            ],
          },
          { title: "Dashboard", url: "module/dashboard" },
        ],
      },
    ];

    const routes = navItemsToRoutes(navItems);

    // Module + General + Advanced + Dashboard = 4 (Settings itself is skipped)
    expect(routes).toHaveLength(4);
    expect(routes.map((r) => r.path)).toEqual([
      "module",
      "module/settings/general",
      "module/settings/advanced",
      "module/dashboard",
    ]);
    // Children of the url-less item should have it in their breadcrumb
    expect(routes[1].breadcrumb).toEqual(["Module", "Settings", "General"]);
    expect(routes[2].breadcrumb).toEqual(["Module", "Settings", "Advanced"]);
  });
});

const createTestRoutes2 = (): Array<NavigatableRoute> => [
  { path: "dashboard", title: "Dashboard", breadcrumb: ["Dashboard"] },
  { path: "orders", title: "Orders", breadcrumb: ["Orders"] },
];

describe("useCommandPalette with contextualActions", () => {
  const mockOnSelect = vi.fn();

  const createTestActions = (): Array<CommandPaletteAction> => [
    {
      key: "create-invoice",
      label: "Create Invoice",
      group: "Actions",
      onSelect: mockOnSelect,
    },
    {
      key: "export-csv",
      label: "Export CSV",
      group: "Actions",
      onSelect: vi.fn(),
    },
  ];

  const renderWithActions = (
    routes = createTestRoutes2(),
    contextualActions = createTestActions(),
  ) => {
    return renderHook(
      () => {
        const [open, setOpen] = useState(false);
        return useCommandPalette({ routes, contextualActions, open, setOpen });
      },
      {
        wrapper,
      },
    );
  };

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  describe("filtering actions", () => {
    it("should return all actions when search is empty", () => {
      const { result } = renderWithActions();
      expect(result.current.filteredActions).toHaveLength(2);
    });

    it("should filter actions by label", () => {
      const { result } = renderWithActions();
      act(() => {
        result.current.setSearch("invoice");
      });
      expect(result.current.filteredActions).toHaveLength(1);
      expect(result.current.filteredActions[0].key).toBe("create-invoice");
    });

    it("should filter actions case-insensitively", () => {
      const { result } = renderWithActions();
      act(() => {
        result.current.setSearch("EXPORT");
      });
      expect(result.current.filteredActions).toHaveLength(1);
      expect(result.current.filteredActions[0].key).toBe("export-csv");
    });

    it("should return empty when no actions match", () => {
      const { result } = renderWithActions();
      act(() => {
        result.current.setSearch("nonexistent");
      });
      expect(result.current.filteredActions).toHaveLength(0);
    });
  });

  describe("selectableItems ordering", () => {
    it("should place actions before routes", () => {
      const { result } = renderWithActions();
      expect(result.current.selectableItems).toHaveLength(4);
      expect(result.current.selectableItems[0].type).toBe("action");
      expect(result.current.selectableItems[1].type).toBe("action");
      expect(result.current.selectableItems[2].type).toBe("route");
      expect(result.current.selectableItems[3].type).toBe("route");
    });

    it("should include only matching items when search filters both", () => {
      const { result } = renderWithActions();
      act(() => {
        result.current.setSearch("order");
      });
      // "Orders" route matches, no actions match
      expect(result.current.selectableItems).toHaveLength(1);
      expect(result.current.selectableItems[0].type).toBe("route");
    });
  });

  describe("keyboard navigation across actions and routes", () => {
    it("should navigate through actions then routes with ArrowDown", () => {
      const { result } = renderWithActions();
      // Start at 0 (first action)
      expect(result.current.selectedIndex).toBe(0);

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
      });
      expect(result.current.selectedIndex).toBe(1); // second action

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
      });
      expect(result.current.selectedIndex).toBe(2); // first route

      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
      });
      expect(result.current.selectedIndex).toBe(3); // second route
    });

    it("should not exceed total selectableItems length", () => {
      const { result } = renderWithActions();
      // 2 actions + 2 routes = 4, max index = 3
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
        }
      });
      expect(result.current.selectedIndex).toBe(3);
    });
  });

  describe("handleSelectItem with action", () => {
    it("should call onSelect when action is selected", () => {
      const { result } = renderWithActions();
      act(() => {
        result.current.handleSelectItem({
          type: "action",
          action: result.current.filteredActions[0],
        });
      });
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should close dialog after action selection", () => {
      const { result } = renderWithActions();
      act(() => {
        result.current.handleOpenChange(true);
      });
      act(() => {
        result.current.handleSelectItem({
          type: "action",
          action: result.current.filteredActions[0],
        });
      });
      expect(result.current.open).toBe(false);
    });

    it("should reset search after action selection", () => {
      const { result } = renderWithActions();
      act(() => {
        result.current.setSearch("invoice");
      });
      act(() => {
        result.current.handleSelectItem({
          type: "action",
          action: result.current.filteredActions[0],
        });
      });
      expect(result.current.search).toBe("");
    });
  });

  describe("Enter key with actions", () => {
    it("should call onSelect on Enter when action is selected", () => {
      const { result } = renderWithActions();
      // index 0 = first action
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("Enter"));
      });
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should navigate on Enter when route is selected", () => {
      const { result } = renderWithActions();
      // Move past 2 actions to first route (index 2)
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
      });
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("Enter"));
      });
      expect(mockNavigate).toHaveBeenCalledWith("dashboard");
      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });
});

describe("parseSearchMode", () => {
  const sources: Array<SearchSource> = [
    { prefix: "PO", title: "Purchase Orders", search: vi.fn() },
    { prefix: "CU", title: "Customers", search: vi.fn() },
  ];

  it("returns null activeSource when no colon is present", () => {
    const result = parseSearchMode("hello", sources);
    expect(result.activeSource).toBeNull();
    expect(result.searchQuery).toBe("hello");
  });

  it("returns null activeSource when colon is at position 0", () => {
    const result = parseSearchMode(":query", sources);
    expect(result.activeSource).toBeNull();
    expect(result.searchQuery).toBe(":query");
  });

  it("detects matching prefix (case-sensitive)", () => {
    const result = parseSearchMode("PO: 12345", sources);
    expect(result.activeSource).toBe(sources[0]);
    expect(result.searchQuery).toBe("12345");
  });

  it("does not match lowercase prefix", () => {
    const result = parseSearchMode("po: 12345", sources);
    expect(result.activeSource).toBeNull();
    expect(result.searchQuery).toBe("po: 12345");
  });

  it("trims leading whitespace from query", () => {
    const result = parseSearchMode("CU:   some query", sources);
    expect(result.activeSource).toBe(sources[1]);
    expect(result.searchQuery).toBe("some query");
  });

  it("returns empty query when only prefix is typed", () => {
    const result = parseSearchMode("PO:", sources);
    expect(result.activeSource).toBe(sources[0]);
    expect(result.searchQuery).toBe("");
  });

  it("returns null for unknown prefix", () => {
    const result = parseSearchMode("XX: query", sources);
    expect(result.activeSource).toBeNull();
    expect(result.searchQuery).toBe("XX: query");
  });

  it("handles empty search sources", () => {
    const result = parseSearchMode("PO: query", []);
    expect(result.activeSource).toBeNull();
    expect(result.searchQuery).toBe("PO: query");
  });
});

describe("useCommandPalette with searchSources", () => {
  const mockSearch = vi.fn();

  const createTestSearchSources = (): Array<SearchSource> => [
    {
      prefix: "PO",
      title: "Purchase Orders",
      search: mockSearch,
    },
    {
      prefix: "CU",
      title: "Customers",
      search: vi.fn().mockResolvedValue([]),
    },
  ];

  const renderWithSources = (
    routes = createTestRoutes2(),
    searchSources = createTestSearchSources(),
  ) => {
    return renderHook(
      () => {
        const [open, setOpen] = useState(false);
        return useCommandPalette({
          routes,
          searchSources,
          contextualActions: [],
          open,
          setOpen,
        });
      },
      {
        wrapper,
      },
    );
  };

  beforeEach(() => {
    mockSearch.mockReset();
    mockSearch.mockResolvedValue([]);
    mockNavigate.mockClear();
  });

  describe("default mode with search sources", () => {
    it("should include search-mode items when search is empty", () => {
      const { result } = renderWithSources();
      const modeItems = result.current.selectableItems.filter((i) => i.type === "search-mode");
      expect(modeItems).toHaveLength(2);
    });

    it("should not include search-mode items when search has text", () => {
      const { result } = renderWithSources();
      act(() => {
        result.current.setSearch("dashboard");
      });
      const modeItems = result.current.selectableItems.filter((i) => i.type === "search-mode");
      expect(modeItems).toHaveLength(0);
    });

    it("should filter search-mode items by title match", () => {
      const { result } = renderWithSources();
      act(() => {
        result.current.setSearch("order");
      });
      const modeItems = result.current.selectableItems.filter((i) => i.type === "search-mode");
      // "Purchase Orders" title matches "order"
      expect(modeItems).toHaveLength(1);
      expect(modeItems[0].type === "search-mode" && modeItems[0].source.prefix).toBe("PO");
    });

    it("should filter search-mode items by prefix match (case-insensitive)", () => {
      const { result } = renderWithSources();
      act(() => {
        result.current.setSearch("cu");
      });
      const modeItems = result.current.selectableItems.filter((i) => i.type === "search-mode");
      // "CU" prefix matches "cu"
      expect(modeItems).toHaveLength(1);
      expect(modeItems[0].type === "search-mode" && modeItems[0].source.prefix).toBe("CU");
    });

    it("should show routes in default mode", () => {
      const { result } = renderWithSources();
      expect(result.current.filteredRoutes).toHaveLength(2);
    });
  });

  describe("entering search mode", () => {
    it("should detect search mode when prefix is typed", () => {
      const { result } = renderWithSources();
      act(() => {
        result.current.setSearch("PO: ");
      });
      expect(result.current.activeSearchSource).not.toBeNull();
      expect(result.current.activeSearchSource?.prefix).toBe("PO");
      // Prefix is locked in state; input shows only the query part
      expect(result.current.search).toBe("");
    });

    it("should hide actions and routes in search mode", () => {
      const { result } = renderWithSources();
      act(() => {
        result.current.setSearch("PO: test");
      });
      expect(result.current.filteredActions).toHaveLength(0);
      expect(result.current.filteredRoutes).toHaveLength(0);
    });

    it("should set search input to empty and lock source when selecting a search-mode item", () => {
      const { result } = renderWithSources();
      const modeItem = result.current.selectableItems.find((i) => i.type === "search-mode");
      expect(modeItem).toBeDefined();

      act(() => {
        result.current.handleSelectItem(modeItem!);
      });

      // Should keep palette open with source locked; input is empty
      expect(result.current.search).toBe("");
      expect(result.current.activeSearchSource?.prefix).toBe("PO");
    });
  });

  describe("async search", () => {
    it("should call search function after debounce", async () => {
      mockSearch.mockResolvedValue([{ key: "1", label: "PO #1", path: "/orders/1" }]);

      const { result } = renderWithSources();
      act(() => {
        result.current.setSearch("PO: test");
      });

      expect(result.current.isSearching).toBe(true);

      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledWith("test", {
          signal: expect.any(AbortSignal),
        });
      });

      await waitFor(() => {
        expect(result.current.isSearching).toBe(false);
        expect(result.current.searchResults).toHaveLength(1);
        expect(result.current.searchResults[0].label).toBe("PO #1");
      });
    });

    it("should navigate when selecting a search result", async () => {
      mockSearch.mockResolvedValue([{ key: "1", label: "PO #1", path: "/orders/1" }]);

      const { result } = renderWithSources();
      act(() => {
        result.current.setSearch("PO: test");
      });

      await waitFor(() => {
        expect(result.current.searchResults).toHaveLength(1);
      });

      act(() => {
        result.current.handleSelectItem(result.current.selectableItems[0]);
      });

      expect(mockNavigate).toHaveBeenCalledWith("/orders/1");
      expect(result.current.open).toBe(false);
    });

    it("should clear search results when leaving search mode via Backspace", async () => {
      mockSearch.mockResolvedValue([{ key: "1", label: "PO #1", path: "/orders/1" }]);

      const { result } = renderWithSources();
      act(() => {
        result.current.setSearch("PO: test");
      });

      await waitFor(() => {
        expect(result.current.searchResults).toHaveLength(1);
      });

      // Clear query first, then Backspace to exit search mode
      act(() => {
        result.current.setSearch("");
      });
      act(() => {
        result.current.handleKeyDown(createKeyboardEvent("Backspace"));
      });

      await waitFor(() => {
        expect(result.current.searchResults).toHaveLength(0);
        expect(result.current.activeSearchSource).toBeNull();
      });
    });

    it("should clear search results when dialog closes", async () => {
      mockSearch.mockResolvedValue([{ key: "1", label: "PO #1", path: "/orders/1" }]);

      const { result } = renderWithSources();
      act(() => {
        result.current.handleOpenChange(true);
        result.current.setSearch("PO: test");
      });

      await waitFor(() => {
        expect(result.current.searchResults).toHaveLength(1);
      });

      act(() => {
        result.current.handleOpenChange(false);
      });

      expect(result.current.searchResults).toHaveLength(0);
      expect(result.current.search).toBe("");
      expect(result.current.isSearching).toBe(false);
    });
  });
});

describe("useCommandPalette with actions, routes, and searchSources combined", () => {
  const mockOnSelect = vi.fn();

  const createMixedActions = (): Array<CommandPaletteAction> => [
    {
      key: "create-order",
      label: "Create Order",
      group: "Actions",
      onSelect: mockOnSelect,
    },
    {
      key: "export-csv",
      label: "Export CSV",
      group: "Actions",
      onSelect: vi.fn(),
    },
  ];

  const createMixedSources = (): Array<SearchSource> => [
    {
      prefix: "ORD",
      title: "Orders",
      search: vi.fn().mockResolvedValue([]),
    },
    {
      prefix: "CU",
      title: "Customers",
      search: vi.fn().mockResolvedValue([]),
    },
  ];

  const renderMixed = (
    routes = createTestRoutes2(),
    contextualActions = createMixedActions(),
    searchSources = createMixedSources(),
  ) => {
    return renderHook(
      () => {
        const [open, setOpen] = useState(false);
        return useCommandPalette({
          routes,
          contextualActions,
          searchSources,
          open,
          setOpen,
        });
      },
      { wrapper },
    );
  };

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it("should show all item types when search is empty", () => {
    const { result } = renderMixed();
    const types = result.current.selectableItems.map((i) => i.type);
    // 2 search-modes + 2 actions + 2 routes
    expect(types).toEqual(["search-mode", "search-mode", "action", "action", "route", "route"]);
  });

  it("should filter across all types when search matches multiple", () => {
    const { result } = renderMixed();
    act(() => {
      // "order" matches: route "Orders", action "Create Order", search-mode "Orders" (title)
      result.current.setSearch("order");
    });
    const types = result.current.selectableItems.map((i) => i.type);
    expect(types).toContain("search-mode");
    expect(types).toContain("action");
    expect(types).toContain("route");
    expect(result.current.selectableItems).toHaveLength(3);
  });

  it("should show only routes when search matches no action or source", () => {
    const { result } = renderMixed();
    act(() => {
      result.current.setSearch("dashboard");
    });
    const types = result.current.selectableItems.map((i) => i.type);
    expect(types).toEqual(["route"]);
  });

  it("should show only search-mode when search matches only a source prefix", () => {
    const { result } = renderMixed();
    act(() => {
      result.current.setSearch("cu");
    });
    const modeItems = result.current.selectableItems.filter((i) => i.type === "search-mode");
    expect(modeItems).toHaveLength(1);
    expect(modeItems[0].type === "search-mode" && modeItems[0].source.prefix).toBe("CU");
    // No actions or routes match "cu"
    expect(result.current.selectableItems).toHaveLength(1);
  });
});
