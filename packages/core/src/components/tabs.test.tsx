import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
