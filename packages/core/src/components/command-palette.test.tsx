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
import {
  AppShellConfigContext,
  AppShellDataContext,
} from "@/contexts/appshell-context";
import { MemoryRouter } from "react-router";
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

const renderCommandPaletteContent = (navItems: NavItem[] = mockNavItems) => {
  const configurations = {
    modules: [],
    settingsResources: [] as Array<Resource>,
    basePath: undefined,
    errorBoundary: undefined,
    locale: "en",
  };

  return render(
    <AppShellConfigContext.Provider value={{ configurations }}>
      <AppShellDataContext.Provider value={{ contextData: {} }}>
        <MemoryRouter>
          <CommandPaletteContent navItems={navItems} />
        </MemoryRouter>
      </AppShellDataContext.Provider>
    </AppShellConfigContext.Provider>,
  );
};

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

      const analyticsButton = screen
        .getByText("Dashboard > Analytics")
        .closest("button");
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
