import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "./tabs";

afterEach(() => {
  cleanup();
});

describe("Tabs", () => {
  it("renders tab triggers", () => {
    render(
      <Tabs.Root defaultValue="tab1">
        <Tabs.List>
          <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
          <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab1">Content 1</Tabs.Content>
        <Tabs.Content value="tab2">Content 2</Tabs.Content>
      </Tabs.Root>,
    );

    expect(screen.getByText("Tab 1")).toBeDefined();
    expect(screen.getByText("Tab 2")).toBeDefined();
  });

  it("shows the default tab content", () => {
    render(
      <Tabs.Root defaultValue="tab1">
        <Tabs.List>
          <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
          <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab1">Content 1</Tabs.Content>
        <Tabs.Content value="tab2">Content 2</Tabs.Content>
      </Tabs.Root>,
    );

    expect(screen.getByText("Content 1")).toBeDefined();
  });

  it("switches tab content on click", async () => {
    const user = userEvent.setup();

    render(
      <Tabs.Root defaultValue="tab1">
        <Tabs.List>
          <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
          <Tabs.Trigger value="tab2" data-testid="trigger-2">
            Tab 2
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab1">Content 1</Tabs.Content>
        <Tabs.Content value="tab2">Content 2</Tabs.Content>
      </Tabs.Root>,
    );

    expect(screen.getByText("Content 1")).toBeDefined();

    await user.click(screen.getByTestId("trigger-2"));

    await waitFor(() => {
      expect(screen.getByText("Content 2")).toBeDefined();
    });
  });

  it("marks the active trigger with data-active", async () => {
    render(
      <Tabs.Root defaultValue="tab1">
        <Tabs.List>
          <Tabs.Trigger value="tab1" data-testid="trigger-1">
            Tab 1
          </Tabs.Trigger>
          <Tabs.Trigger value="tab2" data-testid="trigger-2">
            Tab 2
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab1">Content 1</Tabs.Content>
        <Tabs.Content value="tab2">Content 2</Tabs.Content>
      </Tabs.Root>,
    );

    const trigger1 = screen.getByTestId("trigger-1");
    expect(trigger1.hasAttribute("data-active")).toBe(true);
    expect(trigger1.getAttribute("aria-selected")).toBe("true");
  });

  it("renders with disabled trigger", () => {
    render(
      <Tabs.Root defaultValue="tab1">
        <Tabs.List>
          <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
          <Tabs.Trigger value="tab2" disabled data-testid="trigger-2">
            Tab 2
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab1">Content 1</Tabs.Content>
        <Tabs.Content value="tab2">Content 2</Tabs.Content>
      </Tabs.Root>,
    );

    const trigger = screen.getByTestId("trigger-2");
    expect(trigger.hasAttribute("data-disabled")).toBe(true);
  });

  it("applies custom className to list", () => {
    render(
      <Tabs.Root defaultValue="tab1">
        <Tabs.List data-testid="list" className="custom-class">
          <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab1">Content 1</Tabs.Content>
      </Tabs.Root>,
    );

    expect(screen.getByTestId("list").classList.contains("custom-class")).toBe(
      true,
    );
  });
});
