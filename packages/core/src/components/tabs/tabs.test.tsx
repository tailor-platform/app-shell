import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { Tabs } from "./tabs";

afterEach(() => {
  cleanup();
});

// happy-dom has no layout, so the geometry Base UI reads when it scrolls the
// tablist (offsets, client and scroll widths) comes from these getters: a
// 200px-wide tablist whose tabs are 100px each and start after 4px of padding.
const define = (proto: object, name: string, get: (this: HTMLElement) => unknown) =>
  Object.defineProperty(proto, name, { configurable: true, get });
const isTablist = (el: HTMLElement) => el.getAttribute("role") === "tablist";
const isTab = (el: HTMLElement) => el.getAttribute("role") === "tab";

function stubLayout({ scrollWidth = 300 } = {}) {
  define(HTMLElement.prototype, "offsetParent", function () {
    return isTab(this) ? this.closest("[role=tablist]") : null;
  });
  define(HTMLElement.prototype, "offsetLeft", function () {
    return isTab(this) ? 4 + Number(this.dataset.index) * 100 : 0;
  });
  define(HTMLElement.prototype, "offsetWidth", function () {
    return isTab(this) ? 100 : 0;
  });
  // happy-dom defines these on a prototype between HTMLElement and Element,
  // so they are shadowed on HTMLElement.prototype and removed again below.
  define(HTMLElement.prototype, "clientWidth", function () {
    return isTablist(this) ? 200 : 0;
  });
  define(HTMLElement.prototype, "scrollWidth", function () {
    return isTablist(this) ? scrollWidth : 0;
  });
  return () => {
    for (const name of [
      "offsetParent",
      "offsetLeft",
      "offsetWidth",
      "clientWidth",
      "scrollWidth",
    ]) {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>)[name];
    }
  };
}

describe("Tabs", () => {
  // ==========================================================================
  // Snapshots — verify full DOM structure for tabs variations
  // ==========================================================================

  describe("snapshots", () => {
    it("default tabs", () => {
      const { container } = render(
        <Tabs.Root defaultValue="tab1">
          <Tabs.List>
            <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
            <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
          <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
        </Tabs.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("tabs with three tabs", () => {
      const { container } = render(
        <Tabs.Root defaultValue="overview">
          <Tabs.List>
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="projects">Projects</Tabs.Tab>
            <Tabs.Tab value="account">Account</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="overview">Overview content</Tabs.Panel>
          <Tabs.Panel value="projects">Projects content</Tabs.Panel>
          <Tabs.Panel value="account">Account content</Tabs.Panel>
        </Tabs.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("tabs with disabled tab", () => {
      const { container } = render(
        <Tabs.Root defaultValue="tab1">
          <Tabs.List>
            <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
            <Tabs.Tab value="tab2" disabled>
              Tab 2
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
          <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
        </Tabs.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("line variant", () => {
      const { container } = render(
        <Tabs.Root defaultValue="tab1" variant="line">
          <Tabs.List>
            <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
            <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
          <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
        </Tabs.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("capsule variant", () => {
      const { container } = render(
        <Tabs.Root defaultValue="tab1" variant="capsule">
          <Tabs.List>
            <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
            <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
          <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
        </Tabs.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("capsule variant with icon-only tabs (square)", () => {
      const { container } = render(
        <Tabs.Root defaultValue="table" variant="capsule" size="default">
          <Tabs.List>
            <Tabs.Tab value="table" aria-label="Table view">
              <svg viewBox="0 0 16 16" />
            </Tabs.Tab>
            <Tabs.Tab value="kanban" aria-label="Board view">
              <svg viewBox="0 0 16 16" />
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="table">Table content</Tabs.Panel>
          <Tabs.Panel value="kanban">Kanban content</Tabs.Panel>
        </Tabs.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it.each(["xs", "sm", "lg"] as const)("capsule variant with %s size", (size) => {
      const { container } = render(
        <Tabs.Root defaultValue="tab1" variant="capsule" size={size}>
          <Tabs.List>
            <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
            <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
          <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
        </Tabs.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  // ==========================================================================
  // Overflow — the tablist scrolls sideways instead of growing the page
  // ==========================================================================

  describe("overflow", () => {
    let restoreLayout: (() => void) | undefined;

    afterEach(() => {
      restoreLayout?.();
      restoreLayout = undefined;
      vi.restoreAllMocks();
    });

    function renderTabs(
      props: Omit<ComponentProps<typeof Tabs.Root>, "children"> = { defaultValue: "tab1" },
    ) {
      const scrollTo = vi.fn();
      vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(scrollTo);
      render(
        <Tabs.Root {...props}>
          <Tabs.List>
            <Tabs.Tab value="tab1" data-index="0">
              Tab 1
            </Tabs.Tab>
            <Tabs.Tab value="tab2" data-index="1">
              Tab 2
            </Tabs.Tab>
            <Tabs.Tab value="tab3" data-index="2">
              Tab 3
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
          <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
          <Tabs.Panel value="tab3">Content 3</Tabs.Panel>
        </Tabs.Root>,
      );
      return { tablist: screen.getByRole("tablist"), scrollTo };
    }

    it("makes the tablist itself the horizontal scroll container", () => {
      const { tablist } = renderTabs();

      expect(tablist.className).toContain("overflow-x-auto");
      // The 4px padding and matching negative margin keep the focus ring inside
      // the clip box without moving the list; scroll-padding keeps that room
      // clear when Base UI scrolls a tab into view.
      expect(tablist.className).toContain("astw:p-[4px]");
      expect(tablist.className).toContain("astw:-m-[4px]");
      expect(tablist.className).toContain("[scroll-padding-inline:4px]");
      // The tabs sit in a track inside the scroll container.
      const track = tablist.querySelector("[data-slot=tabs-list-track]");
      expect(track).not.toBeNull();
      expect(track!.contains(screen.getByRole("tab", { name: "Tab 1" }))).toBe(true);
    });

    it("keeps className on the track, not on the scroll container", () => {
      render(
        <Tabs.Root defaultValue="tab1">
          <Tabs.List className="custom-list" aria-label="Views">
            <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>,
      );
      const tablist = screen.getByRole("tablist", { name: "Views" });

      expect(tablist.className).not.toContain("custom-list");
      expect(tablist.querySelector("[data-slot=tabs-list-track]")!.className).toContain(
        "custom-list",
      );
    });

    it("scrolls the tablist to the active tab on mount", () => {
      restoreLayout = stubLayout();
      const { scrollTo } = renderTabs({ defaultValue: "tab3" });

      // tab3 spans 204..304 in a 200px-wide tablist: align its end with the edge.
      expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 104 }));
    });

    it("scrolls the tablist to the tab focused with the arrow keys", () => {
      restoreLayout = stubLayout();
      const { scrollTo } = renderTabs();
      const first = screen.getByRole("tab", { name: "Tab 1" });

      act(() => first.focus());
      scrollTo.mockClear();
      fireEvent.keyDown(first, { key: "ArrowRight" });

      // tab2 spans 104..204: it is 4px past the edge.
      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 4 }));
    });

    it("does not move the tablist while the tabs fit", () => {
      restoreLayout = stubLayout({ scrollWidth: 200 });
      const { scrollTo } = renderTabs({ defaultValue: "tab3" });
      const third = screen.getByRole("tab", { name: "Tab 3" });

      act(() => third.focus());
      fireEvent.keyDown(third, { key: "Home" });

      for (const call of scrollTo.mock.calls) {
        expect(call[0]).toEqual(expect.objectContaining({ left: 0 }));
      }
    });
  });

  it("renders all tabs", () => {
    render(
      <Tabs.Root defaultValue="tab1">
        <Tabs.List>
          <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
          <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
        <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
      </Tabs.Root>,
    );

    expect(screen.getByText("Tab 1")).toBeDefined();
    expect(screen.getByText("Tab 2")).toBeDefined();
  });

  it("displays the active panel content", () => {
    render(
      <Tabs.Root defaultValue="tab1">
        <Tabs.List>
          <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
          <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
        <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
      </Tabs.Root>,
    );

    expect(screen.getByText("Content 1")).toBeDefined();
  });

  it("switches panel on tab click", async () => {
    const user = userEvent.setup();

    render(
      <Tabs.Root defaultValue="tab1">
        <Tabs.List>
          <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
          <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
        <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
      </Tabs.Root>,
    );

    await user.click(screen.getByText("Tab 2"));

    await waitFor(() => {
      expect(screen.getByText("Content 2")).toBeDefined();
    });
  });

  it("calls onValueChange when tab is clicked", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Tabs.Root defaultValue="tab1" onValueChange={handleChange}>
        <Tabs.List>
          <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
          <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
        <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
      </Tabs.Root>,
    );

    await user.click(screen.getByText("Tab 2"));

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalled();
      expect(handleChange.mock.calls[0][0]).toBe("tab2");
    });
  });

  it("supports controlled value", () => {
    render(
      <Tabs.Root value="tab2">
        <Tabs.List>
          <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
          <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
        <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
      </Tabs.Root>,
    );

    expect(screen.getByText("Content 2")).toBeDefined();
  });
});
