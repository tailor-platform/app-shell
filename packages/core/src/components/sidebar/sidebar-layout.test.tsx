import { render, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { SidebarLayout } from "./sidebar-layout";
import { AppShell } from "@/components/appshell";
import { defineModule } from "@/resource";
import { Home } from "lucide-react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

const createMinimalModules = () => [
  defineModule({
    path: "dashboard",
    meta: { title: "Dashboard", icon: <Home /> },
    component: () => <div>Dashboard</div>,
    resources: [],
  }),
];

/**
 * Stub window.innerWidth so useIsMobile() returns false (desktop mode).
 * This is needed because happy-dom defaults to innerWidth=0 which triggers mobile mode.
 */
const stubDesktopViewport = () => {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
  window.dispatchEvent(new Event("resize"));
};

const renderSidebarLayout = (props: Parameters<typeof SidebarLayout>[0] = {}) => {
  window.history.pushState({}, "", "/dashboard");
  return render(
    <AppShell title="Test" modules={createMinimalModules()}>
      <SidebarLayout {...props} />
    </AppShell>,
  );
};

describe("SidebarLayout", () => {
  describe("defaultOpen", () => {
    it("renders sidebar in expanded state by default", async () => {
      stubDesktopViewport();
      renderSidebarLayout();

      await waitFor(() => {
        const sidebar = document.querySelector('[data-slot="sidebar"]')!;
        expect(sidebar).toBeDefined();
        expect(sidebar.getAttribute("data-state")).toBe("expanded");
      });
    });

    it("renders sidebar in collapsed state when defaultOpen is false", async () => {
      stubDesktopViewport();
      renderSidebarLayout({ defaultOpen: false });

      await waitFor(() => {
        const sidebar = document.querySelector('[data-slot="sidebar"]')!;
        expect(sidebar).toBeDefined();
        expect(sidebar.getAttribute("data-state")).toBe("collapsed");
      });
    });
  });

  describe("collapsible", () => {
    it("renders sidebar with collapsible=none when collapsible is false", async () => {
      renderSidebarLayout({ collapsible: false });

      await waitFor(() => {
        const sidebar = document.querySelector('[data-slot="sidebar"]');
        expect(sidebar).not.toBeNull();
        // collapsible="none" renders a plain div without data-collapsible or data-state
        expect(sidebar!.getAttribute("data-collapsible")).toBeNull();
        expect(sidebar!.getAttribute("data-state")).toBeNull();
      });
    });

    it("does not render sidebar trigger when collapsible is false", async () => {
      renderSidebarLayout({ collapsible: false });

      await waitFor(() => {
        const sidebar = document.querySelector('[data-slot="sidebar"]')!;
        expect(sidebar).toBeDefined();
      });

      const trigger = document.querySelector('[data-slot="sidebar-trigger"]');
      expect(trigger).toBeNull();
    });

    it("renders sidebar trigger when collapsible is true (default)", async () => {
      stubDesktopViewport();
      renderSidebarLayout();

      await waitFor(() => {
        const triggers = document.querySelectorAll('[data-slot="sidebar-trigger"]');
        expect(triggers.length).toBeGreaterThan(0);
      });
    });
  });

  describe("headerActions", () => {
    it("does not render any custom actions when headerActions is omitted", async () => {
      renderSidebarLayout();

      await waitFor(() => {
        expect(document.querySelector("header")).not.toBeNull();
      });

      expect(document.querySelector('[data-testid="bell"]')).toBeNull();
    });

    it("renders a single headerActions node", async () => {
      renderSidebarLayout({ headerActions: <button data-testid="bell">Bell</button> });

      await waitFor(() => {
        expect(document.querySelector('[data-testid="bell"]')).not.toBeNull();
      });
    });

    it("renders an array of headerActions nodes", async () => {
      renderSidebarLayout({
        headerActions: [
          <button key="bell" data-testid="bell">
            Bell
          </button>,
          <button key="user" data-testid="user">
            User
          </button>,
        ],
      });

      await waitFor(() => {
        expect(document.querySelector('[data-testid="bell"]')).not.toBeNull();
      });
      expect(document.querySelector('[data-testid="user"]')).not.toBeNull();
    });

    it("renders headerActions before the appearance switcher", async () => {
      renderSidebarLayout({ headerActions: <button data-testid="bell">Bell</button> });

      const bell = await waitFor(() => {
        const el = document.querySelector('[data-testid="bell"]');
        expect(el).not.toBeNull();
        return el!;
      });

      // Right-side container = last child div of the header's inner flex row.
      // It holds the headerActions wrapper followed by the appearance switcher.
      const rightContainer = bell.closest("header")!.querySelector(":scope > div")!
        .lastElementChild as HTMLElement;
      // The headerActions wrapper is the first child and contains the bell.
      expect(rightContainer.firstElementChild!.contains(bell)).toBe(true);
      // The appearance switcher renders after it (last child, a separate node).
      const appearanceSwitcher = rightContainer.lastElementChild!;
      expect(appearanceSwitcher).not.toBe(rightContainer.firstElementChild);
      expect(
        bell.compareDocumentPosition(appearanceSwitcher) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });
});
