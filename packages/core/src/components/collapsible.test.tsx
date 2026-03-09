import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Collapsible } from "./collapsible";

afterEach(() => {
  cleanup();
});

describe("Collapsible", () => {
  it("renders trigger and content", () => {
    render(
      <Collapsible.Root>
        <Collapsible.Trigger data-testid="trigger">Toggle</Collapsible.Trigger>
        <Collapsible.Content data-testid="content">Content</Collapsible.Content>
      </Collapsible.Root>,
    );

    expect(screen.getByTestId("trigger")).toBeDefined();
    expect(screen.getByText("Toggle")).toBeDefined();
  });

  it("expands content when trigger is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Collapsible.Root defaultOpen={false}>
        <Collapsible.Trigger data-testid="trigger">Toggle</Collapsible.Trigger>
        <Collapsible.Content data-testid="content">Hidden Content</Collapsible.Content>
      </Collapsible.Root>,
    );

    const trigger = screen.getByTestId("trigger");
    // Base UI uses data-panel-open attribute for trigger
    expect(trigger.hasAttribute("data-panel-open")).toBe(false);

    await user.click(trigger);

    await waitFor(() => {
      expect(trigger.hasAttribute("data-panel-open")).toBe(true);
    });
  });

  it("collapses content when trigger is clicked while open", async () => {
    const user = userEvent.setup();

    render(
      <Collapsible.Root defaultOpen={true}>
        <Collapsible.Trigger data-testid="trigger">Toggle</Collapsible.Trigger>
        <Collapsible.Content data-testid="content">Content</Collapsible.Content>
      </Collapsible.Root>,
    );

    const trigger = screen.getByTestId("trigger");
    expect(trigger.hasAttribute("data-panel-open")).toBe(true);

    await user.click(trigger);

    await waitFor(() => {
      expect(trigger.hasAttribute("data-panel-open")).toBe(false);
    });
  });

  it("calls onOpenChange when state changes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Collapsible.Root defaultOpen={false} onOpenChange={onOpenChange}>
        <Collapsible.Trigger data-testid="trigger">Toggle</Collapsible.Trigger>
        <Collapsible.Content>Content</Collapsible.Content>
      </Collapsible.Root>,
    );

    const trigger = screen.getByTestId("trigger");
    await user.click(trigger);

    await waitFor(() => {
      // Base UI calls onOpenChange with (open, eventDetails)
      expect(onOpenChange).toHaveBeenCalled();
      expect(onOpenChange.mock.calls[0][0]).toBe(true);
    });
  });

  it("supports controlled open state", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <Collapsible.Root open={false} onOpenChange={onOpenChange}>
        <Collapsible.Trigger data-testid="trigger">Toggle</Collapsible.Trigger>
        <Collapsible.Content>Content</Collapsible.Content>
      </Collapsible.Root>,
    );

    const trigger = screen.getByTestId("trigger");
    expect(trigger.hasAttribute("data-panel-open")).toBe(false);

    await user.click(trigger);
    // Base UI calls onOpenChange with (open, eventDetails)
    expect(onOpenChange).toHaveBeenCalled();
    expect(onOpenChange.mock.calls[0][0]).toBe(true);

    // Simulate parent updating the state
    rerender(
      <Collapsible.Root open={true} onOpenChange={onOpenChange}>
        <Collapsible.Trigger data-testid="trigger">Toggle</Collapsible.Trigger>
        <Collapsible.Content>Content</Collapsible.Content>
      </Collapsible.Root>,
    );

    expect(trigger.hasAttribute("data-panel-open")).toBe(true);
  });
});
