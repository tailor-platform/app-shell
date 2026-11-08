import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { Tabs } from "./tabs";

afterEach(() => {
  cleanup();
});

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
  // Overflow — the list scrolls sideways instead of growing the page
  // ==========================================================================

  describe("overflow", () => {
    // Lays the tabs out in a 200px-wide container with 100px per tab, so that
    // "tab3" starts past the right edge. The list starts after the container's
    // 4px of padding. happy-dom has no layout, so the rects come from this stub.
    function stubLayout() {
      return vi
        .spyOn(HTMLElement.prototype, "getBoundingClientRect")
        .mockImplementation(function (this: HTMLElement) {
          if (this.dataset.slot === "tabs-list-container") {
            return new DOMRect(0, 0, 200, 40);
          }
          if (this.dataset.slot === "tabs-tab") {
            const index = Number(this.getAttribute("data-index"));
            const container = this.closest("[data-slot=tabs-list-container]")!;
            const left = 4 + index * 100 - container.scrollLeft;
            return new DOMRect(left, 0, 100, 40);
          }
          return new DOMRect(0, 0, 0, 0);
        });
    }

    function renderTabs(
      props: Omit<ComponentProps<typeof Tabs.Root>, "children"> = { defaultValue: "tab1" },
    ) {
      const view = render(
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
      const container = view.container.querySelector<HTMLElement>(
        "[data-slot=tabs-list-container]",
      )!;
      return { ...view, container };
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("renders the list inside a horizontal scroll container", () => {
      const { container } = renderTabs();
      const list = screen.getByRole("tablist");

      expect(list.parentElement).toBe(container);
      expect(container.className).toContain("overflow-x-auto");
      // The 4px padding and matching negative margin keep the focus ring inside
      // the clip box without moving the list.
      expect(container.className).toContain("astw:p-[4px]");
      expect(container.className).toContain("astw:-m-[4px]");
    });

    it("keeps className on the list, not on the scroll container", () => {
      render(
        <Tabs.Root defaultValue="tab1">
          <Tabs.List className="custom-list">
            <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>,
      );
      const list = screen.getByRole("tablist");

      expect(list.className).toContain("custom-list");
      expect(list.parentElement!.className).not.toContain("custom-list");
    });

    it("scrolls the active tab into view on mount", () => {
      stubLayout();
      const { container } = renderTabs({ defaultValue: "tab3" });

      // tab3 spans 204..304; the visible area ends at 200 - 4px of ring room.
      expect(container.scrollLeft).toBe(108);
    });

    it("leaves the container alone when the active tab is visible", () => {
      stubLayout();
      const { container } = renderTabs({ defaultValue: "tab1" });

      expect(container.scrollLeft).toBe(0);
    });

    it("scrolls a tab into view when it receives focus", () => {
      stubLayout();
      const { container } = renderTabs();

      act(() => {
        screen.getByRole("tab", { name: "Tab 3" }).focus();
      });

      expect(container.scrollLeft).toBe(108);
    });

    it("scrolls back when a tab to the left receives focus", () => {
      stubLayout();
      const { container } = renderTabs({ defaultValue: "tab3" });
      expect(container.scrollLeft).toBe(108);

      act(() => {
        screen.getByRole("tab", { name: "Tab 1" }).focus();
      });

      // tab1 now starts at 4 - 108 = -104; it has to sit at the 4px of ring room.
      expect(container.scrollLeft).toBe(0);
    });

    it("scrolls the active tab into view when the controlled value changes", async () => {
      stubLayout();
      const { container, rerender } = renderTabs({ value: "tab1" });
      expect(container.scrollLeft).toBe(0);

      rerender(
        <Tabs.Root value="tab3">
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

      await waitFor(() => {
        expect(container.scrollLeft).toBe(108);
      });
    });

    it("shows the start of a tab that is wider than the container", () => {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        function (this: HTMLElement) {
          if (this.dataset.slot === "tabs-list-container") return new DOMRect(0, 0, 200, 40);
          if (this.dataset.slot === "tabs-tab") {
            const container = this.closest("[data-slot=tabs-list-container]")!;
            // One 300px tab after a 100px one: it starts at 104 and ends at 404.
            const left = this.dataset.index === "0" ? 4 : 104;
            const width = this.dataset.index === "0" ? 100 : 300;
            return new DOMRect(left - container.scrollLeft, 0, width, 40);
          }
          return new DOMRect(0, 0, 0, 0);
        },
      );
      const { container } = renderTabs({ defaultValue: "tab2" });

      // Aligned to its start (104 - 4), not to its end (404 - 196 = 208).
      expect(container.scrollLeft).toBe(100);
    });

    it("reveals the active tab once a list that mounted hidden gets a size", () => {
      let visible = false;
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        function (this: HTMLElement) {
          if (!visible) return new DOMRect(0, 0, 0, 0);
          if (this.dataset.slot === "tabs-list-container") return new DOMRect(0, 0, 200, 40);
          if (this.dataset.slot === "tabs-tab") {
            const container = this.closest("[data-slot=tabs-list-container]")!;
            return new DOMRect(
              4 + Number(this.dataset.index) * 100 - container.scrollLeft,
              0,
              100,
              40,
            );
          }
          return new DOMRect(0, 0, 0, 0);
        },
      );
      const callbacks: ResizeObserverCallback[] = [];
      vi.stubGlobal(
        "ResizeObserver",
        class {
          constructor(callback: ResizeObserverCallback) {
            callbacks.push(callback);
          }
          observe() {}
          disconnect() {}
        },
      );

      const { container } = renderTabs({ defaultValue: "tab3" });
      expect(container.scrollLeft).toBe(0);

      // The container becomes visible: the browser reports a resize.
      visible = true;
      act(() => {
        for (const callback of callbacks) callback([], {} as ResizeObserver);
      });

      expect(container.scrollLeft).toBe(108);
      vi.unstubAllGlobals();
    });

    it("still calls the consumer's onFocus on a tab", () => {
      const handleFocus = vi.fn();
      render(
        <Tabs.Root defaultValue="tab1">
          <Tabs.List>
            <Tabs.Tab value="tab1" onFocus={handleFocus}>
              Tab 1
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>,
      );

      act(() => {
        screen.getByRole("tab", { name: "Tab 1" }).focus();
      });

      expect(handleFocus).toHaveBeenCalledTimes(1);
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
