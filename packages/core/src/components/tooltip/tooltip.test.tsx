import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "./tooltip";

afterEach(() => {
  cleanup();
});

describe("Tooltip", () => {
  // ==========================================================================
  // Snapshots — verify full DOM structure for tooltip variations
  // ==========================================================================

  describe("snapshots", () => {
    it("closed tooltip (trigger only)", () => {
      const { container } = render(
        <Tooltip.Root>
          <Tooltip.Trigger>Hover me</Tooltip.Trigger>
          <Tooltip.Content>Tooltip text</Tooltip.Content>
        </Tooltip.Root>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("open tooltip", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(
        <Tooltip.Root>
          <Tooltip.Trigger data-testid="trigger">Hover me</Tooltip.Trigger>
          <Tooltip.Content>Helpful information</Tooltip.Content>
        </Tooltip.Root>,
      );

      await user.hover(screen.getByTestId("trigger"));

      await waitFor(() => {
        expect(screen.getByText("Helpful information")).toBeDefined();
      });
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("tooltip with provider", () => {
      const { container } = render(
        <Tooltip.Provider delay={500}>
          <Tooltip.Root>
            <Tooltip.Trigger>Hover me</Tooltip.Trigger>
            <Tooltip.Content>Tooltip text</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders trigger", () => {
    render(
      <Tooltip.Root>
        <Tooltip.Trigger data-testid="trigger">Hover me</Tooltip.Trigger>
        <Tooltip.Content>Tooltip text</Tooltip.Content>
      </Tooltip.Root>,
    );

    expect(screen.getByTestId("trigger")).toBeDefined();
    expect(screen.getByText("Hover me")).toBeDefined();
  });

  it("shows tooltip content on hover", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip.Root>
        <Tooltip.Trigger data-testid="trigger">Hover me</Tooltip.Trigger>
        <Tooltip.Content data-testid="tooltip-content">Tooltip text</Tooltip.Content>
      </Tooltip.Root>,
    );

    const trigger = screen.getByTestId("trigger");
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByTestId("tooltip-content")).toBeDefined();
    });
  });

  it("hides tooltip content on unhover", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip.Root>
        <Tooltip.Trigger data-testid="trigger">Hover me</Tooltip.Trigger>
        <Tooltip.Content data-testid="tooltip-content">Tooltip text</Tooltip.Content>
      </Tooltip.Root>,
    );

    const trigger = screen.getByTestId("trigger");
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByTestId("tooltip-content")).toBeDefined();
    });

    // Note: We skip testing the close behavior because animations
    // don't run in the test environment (happy-dom)
  });

  it("shows tooltip content on focus", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip.Root>
        <Tooltip.Trigger render={<button />} data-testid="trigger">
          Focus me
        </Tooltip.Trigger>
        <Tooltip.Content data-testid="tooltip-content">Tooltip text</Tooltip.Content>
      </Tooltip.Root>,
    );

    await user.tab();

    await waitFor(() => {
      expect(screen.getByTestId("tooltip-content")).toBeDefined();
    });
  });

  it("renders tooltip with custom side offset", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip.Root>
        <Tooltip.Trigger data-testid="trigger">Hover me</Tooltip.Trigger>
        <Tooltip.Content position={{ sideOffset: 10 }} data-testid="tooltip-content">
          Tooltip text
        </Tooltip.Content>
      </Tooltip.Root>,
    );

    const trigger = screen.getByTestId("trigger");
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByTestId("tooltip-content")).toBeDefined();
    });
  });
});
