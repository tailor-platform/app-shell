import { cleanup, render } from "@testing-library/react";
import {
  AppShell,
  GlobalHeaderLayout,
  SidebarLayout,
  defineModule,
} from "@tailor-platform/app-shell";
import { afterEach, beforeEach, expect, it } from "vitest";
import { page } from "vitest/browser";

const originalUrl = window.location.href;
const modules = [defineModule({ path: "", component: () => null, resources: [] })];

beforeEach(async () => {
  await page.viewport(1440, 1000);
  window.history.replaceState({}, "", "/");
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", originalUrl);
});

it.each(["rail", "offcanvas", "fixed"] as const)(
  "applies live CSS widths and restores the %s layout without inline geometry",
  async (mode) => {
    const Layout = mode === "rail" ? GlobalHeaderLayout : SidebarLayout;
    const view = render(
      <AppShell title="Resize test" modules={modules}>
        <Layout resizable defaultOpen={false} collapsible={mode !== "fixed"} body={<div />} />
      </AppShell>,
    );
    const handle = await view.findByRole(mode === "fixed" ? "separator" : "button", {
      name: mode === "fixed" ? "Resize sidebar" : "Expand sidebar",
    });
    const root = handle.closest<HTMLElement>('[data-slot="sidebar"]')!;
    const pane = root.querySelector<HTMLElement>('[data-slot="sidebar-container"]') ?? root;
    const gap = root.querySelector<HTMLElement>('[data-slot="sidebar-gap"]');
    // These are static CSS contracts; event/state transitions are covered by the unit tests.
    pane.style.transition = "none";
    if (gap) gap.style.transition = "none";
    const originalPaneWidth = pane.getBoundingClientRect().width;
    const originalGapWidth = gap?.getBoundingClientRect().width;
    const liveWidth = { rail: 80, offcanvas: 24, fixed: 320 }[mode];

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
