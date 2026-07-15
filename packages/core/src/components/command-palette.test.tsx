/**
 * Integration tests for CommandPaletteContent component.
 *
 * These tests verify the component rendering and DOM integration.
 * Pure logic tests (keyboard navigation, filtering, global shortcuts) are covered in:
 * - command-palette.hook.test.tsx
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPaletteContent } from "./command-palette";
import { AppShellConfigContext, AppShellDataContext } from "@/contexts/appshell-context";
import {
  CommandPaletteProvider,
  useOpenCommandPalette,
  type SearchSource,
} from "@/contexts/command-palette-context";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";
import type { Resource } from "@/resource";
import type { NavItem } from "../routing/navigation";

// Mock NavItems for testing
const mockNavItems: NavItem[] = [
  {
    title: "Dashboard",
    url: undefined,
    icon: null,
    items: [
      {
        title: "Analytics",
        url: "dashboard/analytics",
      },
      {
        title: "Reports",
        url: "dashboard/reports",
      },
    ],
  },
];

afterEach(() => {
  cleanup();
});

const ProgrammaticOpenButton = ({ search }: { search?: string }) => {
  const openCommandPalette = useOpenCommandPalette();

  return (
    <button type="button" onClick={() => openCommandPalette(search ? { search } : undefined)}>
      Open palette
    </button>
  );
};

const TestCommandPalette = ({
  navItems = mockNavItems,
  searchSources,
  opener,
}: {
  navItems?: NavItem[];
  searchSources?: readonly SearchSource[];
  opener?: ReactNode;
}) => {
  const configurations = {
    modules: [],
    settingsResources: [] as Array<Resource>,
    basePath: undefined,
    errorBoundary: undefined,
    locale: "en",
  };

  return (
    <AppShellConfigContext.Provider value={{ configurations }}>
      <AppShellDataContext.Provider value={{ contextData: {} }}>
        <CommandPaletteProvider searchSources={searchSources}>
          <MemoryRouter>
            {opener}
            <CommandPaletteContent navItems={navItems} />
          </MemoryRouter>
        </CommandPaletteProvider>
      </AppShellDataContext.Provider>
    </AppShellConfigContext.Provider>
  );
};

const renderCommandPaletteContent = (props: {
  navItems?: NavItem[];
  searchSources?: readonly SearchSource[];
  opener?: ReactNode;
} = {}) => render(<TestCommandPalette {...props} />);

describe("CommandPaletteContent Integration", () => {
  describe("keyboard shortcut to open", () => {
    it("opens with Cmd+K", async () => {
      renderCommandPaletteContent();

      expect(screen.queryByPlaceholderText("Search pages...")).toBeNull();

      fireEvent.keyDown(document, { key: "k", metaKey: true });

      const input = await screen.findByPlaceholderText("Search pages...");
      expect(input).toBeDefined();
    });

    it("opens with Ctrl+K", async () => {
      renderCommandPaletteContent();

      fireEvent.keyDown(document, { key: "k", ctrlKey: true });

      const input = await screen.findByPlaceholderText("Search pages...");
      expect(input).toBeDefined();
    });

    it("toggles with repeated Cmd+K", async () => {
      renderCommandPaletteContent();

      fireEvent.keyDown(document, { key: "k", metaKey: true });
      await screen.findByPlaceholderText("Search pages...");

      fireEvent.keyDown(document, { key: "k", metaKey: true });

      await vi.waitFor(() => {
        expect(screen.queryByPlaceholderText("Search pages...")).toBeNull();
      });
    });
  });

  describe("navigation", () => {
    it("navigates on Enter key and closes dialog", async () => {
      renderCommandPaletteContent();

      fireEvent.keyDown(document, { key: "k", metaKey: true });
      const dialog = await screen.findByRole("dialog");

      fireEvent.keyDown(dialog, { key: "Enter" });

      await vi.waitFor(() => {
        expect(screen.queryByPlaceholderText("Search pages...")).toBeNull();
      });
    });

    it("navigates on click and closes dialog", async () => {
      const user = userEvent.setup();
      renderCommandPaletteContent();

      fireEvent.keyDown(document, { key: "k", metaKey: true });
      await screen.findByPlaceholderText("Search pages...");

      const analyticsButton = screen.getByText("Dashboard > Analytics").closest("button");
      await user.click(analyticsButton!);

      await vi.waitFor(() => {
        expect(screen.queryByPlaceholderText("Search pages...")).toBeNull();
      });
    });

    it("ignores Enter during IME composition", async () => {
      renderCommandPaletteContent();

      fireEvent.keyDown(document, { key: "k", metaKey: true });
      const dialog = await screen.findByRole("dialog");

      // Simulate IME composition
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        isComposing: true,
      });

      dialog.dispatchEvent(enterEvent);

      // Dialog should remain open
      expect(screen.getByPlaceholderText("Search pages...")).toBeDefined();
    });
  });

  describe("programmatic open", () => {
    it("opens with a prefilled search string", async () => {
      const user = userEvent.setup();
      renderCommandPaletteContent({ opener: <ProgrammaticOpenButton search="report" /> });

      await user.click(screen.getByRole("button", { name: "Open palette" }));

      const input = (await screen.findByPlaceholderText("Search pages...")) as HTMLInputElement;
      await vi.waitFor(() => {
        expect(input.value).toBe("report");
      });
    });

    it("opens directly in a search mode from the prefilled search string", async () => {
      const user = userEvent.setup();
      const searchSources: SearchSource[] = [
        {
          prefix: "PO",
          title: "Purchase Orders",
          search: vi.fn().mockResolvedValue([]),
        },
      ];

      renderCommandPaletteContent({
        searchSources,
        opener: <ProgrammaticOpenButton search="PO: alice" />,
      });

      await user.click(screen.getByRole("button", { name: "Open palette" }));

      const input = (await screen.findByPlaceholderText("Search pages...")) as HTMLInputElement;
      await vi.waitFor(() => {
        expect(input.value).toBe("alice");
      });
      expect(screen.getByText("PO")).toBeDefined();
    });

    it("does not replay a stale programmatic search after searchSources rerender", async () => {
      const user = userEvent.setup();
      const initialSearchSources: SearchSource[] = [
        {
          prefix: "PO",
          title: "Purchase Orders",
          search: vi.fn().mockResolvedValue([]),
        },
      ];

      const { rerender } = renderCommandPaletteContent({
        searchSources: initialSearchSources,
        opener: <ProgrammaticOpenButton search="foo" />,
      });

      await user.click(screen.getByRole("button", { name: "Open palette" }));

      const input = (await screen.findByPlaceholderText("Search pages...")) as HTMLInputElement;
      await vi.waitFor(() => {
        expect(input.value).toBe("foo");
      });

      await user.clear(input);
      await user.type(input, "bar");
      expect(input.value).toBe("bar");

      rerender(
        <TestCommandPalette
          searchSources={[...initialSearchSources]}
          opener={<ProgrammaticOpenButton search="foo" />}
        />,
      );

      await vi.waitFor(() => {
        expect((screen.getByPlaceholderText("Search pages...") as HTMLInputElement).value).toBe(
          "bar",
        );
      });
    });
  });

  describe("UI state", () => {
    it("displays routes with breadcrumb hierarchy", async () => {
      renderCommandPaletteContent();

      fireEvent.keyDown(document, { key: "k", metaKey: true });
      await screen.findByPlaceholderText("Search pages...");

      expect(screen.getByText("Dashboard > Analytics")).toBeDefined();
      expect(screen.getByText("Dashboard > Reports")).toBeDefined();
    });

    it("shows no results message when search has no matches", async () => {
      const user = userEvent.setup();
      renderCommandPaletteContent();

      fireEvent.keyDown(document, { key: "k", metaKey: true });
      const input = await screen.findByPlaceholderText("Search pages...");

      await user.type(input, "nonexistent");

      expect(screen.getByText("No results found")).toBeDefined();
    });
  });
});
