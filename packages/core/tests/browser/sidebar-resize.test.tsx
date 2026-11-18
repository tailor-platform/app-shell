import { cleanup, render } from "@testing-library/react";
import {
  AppShell,
  GlobalHeaderLayout,
  SidebarLayout,
  defineModule,
} from "@tailor-platform/app-shell";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";

const originalUrl = window.location.href;
const modules = [
  defineModule({
    path: "dashboard",
    meta: { title: "Dashboard" },
    component: () => null,
    resources: [],
  }),
];

beforeEach(async () => {
  await page.viewport(1440, 1000);
  window.history.replaceState({}, "", "/dashboard");
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", originalUrl);
});

describe.each([
  ["SidebarLayout", SidebarLayout],
  ["GlobalHeaderLayout", GlobalHeaderLayout],
] as const)("%s", (_name, Layout) => {
  describe.each([375, 1024])("responsive navigation at %ipx", (width) => {
    it.each([
      { sidebarBehaviour: "fixed" },
      { sidebarBehaviour: "collapse" },
      { sidebarBehaviour: "resize" },
      { sidebarBehaviour: "collapse-and-resize" },
      { collapsible: false },
    ] as const)("opens the full menu with %j", async (props) => {
      await page.viewport(width, 1000);
      render(
        <AppShell title="Responsive test" modules={modules}>
          <Layout {...props} />
        </AppShell>,
      );

      await page.getByRole("button", { name: "Toggle Sidebar" }).click();
      const dialog = page.getByRole("dialog", { name: "Sidebar" });
      const link = dialog.getByRole("link", { name: "Dashboard" });
      await expect.element(dialog).toBeVisible();
      await expect.element(link.getByText("Dashboard")).toBeVisible();
      await expect
        .element(page.getByRole("separator", { name: "Resize sidebar" }))
        .not.toBeInTheDocument();
      await link.click();
      await expect.element(dialog).not.toBeInTheDocument();
    });
  });
});

it.each(["rail", "offcanvas", "fixed", "resize"] as const)(
  "uses live CSS geometry according to sidebarBehaviour (%s)",
  async (mode) => {
    const Layout = mode === "rail" ? GlobalHeaderLayout : SidebarLayout;
    const view = render(
      <AppShell title="Resize test" modules={modules}>
        <Layout
          defaultOpen={false}
          sidebarBehaviour={mode === "rail" || mode === "offcanvas" ? "collapse-and-resize" : mode}
          body={<div data-testid="layout-content" />}
        />
      </AppShell>,
    );
    await view.findByTestId("layout-content");
    const root = view.container.querySelector<HTMLElement>('[data-slot="sidebar"]')!;
    if (mode === "fixed") {
      expect(root.querySelector('[data-slot="sidebar-resize-handle"]')).toBeNull();
      expect(view.queryByRole("button", { name: "Toggle Sidebar" })).toBeNull();
      expect(root.getBoundingClientRect().width).toBe(256);
      root.style.setProperty("--sidebar-drag-width", "320px");
      expect(root.getBoundingClientRect().width).toBe(256);
      root.style.removeProperty("--sidebar-drag-width");
      return;
    }
    if (mode === "resize") {
      const handle = await view.findByRole("separator", { name: "Resize sidebar" });
      expect(view.queryByRole("button", { name: "Toggle Sidebar" })).toBeNull();
      expect(root.getBoundingClientRect().width).toBe(256);
      root.style.setProperty("--sidebar-drag-width", "320px");
      handle.dataset.resizing = "true";
      expect(root.style.width).toBe("");
      expect(root.getBoundingClientRect().width).toBe(320);
      handle.dataset.resizing = "false";
      root.style.removeProperty("--sidebar-drag-width");
      expect(root.getBoundingClientRect().width).toBe(256);
      return;
    }
    const handle = await view.findByRole("button", { name: "Expand sidebar" });
    const pane = root.querySelector<HTMLElement>('[data-slot="sidebar-container"]')!;
    const gap = root.querySelector<HTMLElement>('[data-slot="sidebar-gap"]');
    // These are static CSS contracts; event/state transitions are covered by the unit tests.
    pane.style.transition = "none";
    if (gap) gap.style.transition = "none";
    const originalPaneWidth = pane.getBoundingClientRect().width;
    const originalGapWidth = gap?.getBoundingClientRect().width;
    const liveWidth = mode === "rail" ? 80 : 24;

    root.style.setProperty("--sidebar-drag-width", `${liveWidth}px`);
    handle.dataset.resizing = "true";

    expect(pane.style.width).toBe("");
    if (gap) {
      expect(gap.style.width).toBe("");
      expect(gap.getBoundingClientRect().width).toBe(liveWidth);
    }
    if (mode === "offcanvas") {
      expect(pane.getBoundingClientRect().width).toBe(192);
      expect(pane.getBoundingClientRect().left).toBe(-168);
      expect(pane.getBoundingClientRect().right).toBe(liveWidth);
    } else {
      expect(pane.getBoundingClientRect().width).toBe(liveWidth);
    }

    handle.dataset.resizing = "false";
    root.style.removeProperty("--sidebar-drag-width");
    expect(pane.getBoundingClientRect().width).toBe(originalPaneWidth);
    if (gap) expect(gap.getBoundingClientRect().width).toBe(originalGapWidth);
  },
);
