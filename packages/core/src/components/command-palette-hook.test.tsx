import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommandPalette, navItemsToRoutes } from "./command-palette";
import { NavigatableRoute } from "@/routing/path";
import { MemoryRouter } from "react-router";
import { ReactNode } from "react";

// Helper to create a mock React.KeyboardEvent
const createKeyboardEvent = (
  key: string,
  isComposing = false
): React.KeyboardEvent => {
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
const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe("useCommandPalette", () => {
  const renderCommandPaletteHook = (routes = createTestRoutes()) => {
    return renderHook(() => useCommandPalette({ routes }), { wrapper });
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
        result.current.setOpen(true);
      });
      expect(result.current.open).toBe(true);
    });

    it("should reset search and selectedIndex when closing", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.setOpen(true);
        result.current.setSearch("dash");
        result.current.handleKeyDown(createKeyboardEvent("ArrowDown"));
      });
      act(() => {
        result.current.setOpen(false);
      });
      expect(result.current.search).toBe("");
      expect(result.current.selectedIndex).toBe(0);
    });
  });

  describe("global keyboard shortcut", () => {
    it("should open with Cmd+K", () => {
      const { result } = renderCommandPaletteHook();
      expect(result.current.open).toBe(false);

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true })
        );
      });

      expect(result.current.open).toBe(true);
    });

    it("should open with Ctrl+K", () => {
      const { result } = renderCommandPaletteHook();
      expect(result.current.open).toBe(false);

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
        );
      });

      expect(result.current.open).toBe(true);
    });

    it("should toggle with repeated Cmd+K", () => {
      const { result } = renderCommandPaletteHook();

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true })
        );
      });
      expect(result.current.open).toBe(true);

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true })
        );
      });
      expect(result.current.open).toBe(false);
    });

    it("should not open with just K key (no modifier)", () => {
      const { result } = renderCommandPaletteHook();

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
      });

      expect(result.current.open).toBe(false);
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

  describe("handleSelect", () => {
    it("should navigate to selected route", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        // filteredRoutes[0] is module, [1] is dashboard, [2] is users
        result.current.handleSelect(result.current.filteredRoutes[2]);
      });
      expect(mockNavigate).toHaveBeenCalledWith("test/users");
    });

    it("should close dialog after selection", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.setOpen(true);
      });
      act(() => {
        result.current.handleSelect(result.current.filteredRoutes[0]);
      });
      expect(result.current.open).toBe(false);
    });

    it("should reset search after selection", () => {
      const { result } = renderCommandPaletteHook();
      act(() => {
        result.current.setSearch("dash");
      });
      act(() => {
        result.current.handleSelect(result.current.filteredRoutes[0]);
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
});
