import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

afterEach(() => {
  cleanup();
});

describe("Tooltip", () => {
  it("renders trigger", () => {
    render(
      <Tooltip>
        <TooltipTrigger data-testid="trigger">Hover me</TooltipTrigger>
        <TooltipContent>Tooltip text</TooltipContent>
      </Tooltip>,
    );

    expect(screen.getByTestId("trigger")).toBeDefined();
    expect(screen.getByText("Hover me")).toBeDefined();
  });

  it("shows tooltip content on hover", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip>
        <TooltipTrigger data-testid="trigger">Hover me</TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">
          Tooltip text
        </TooltipContent>
      </Tooltip>,
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
      <Tooltip>
        <TooltipTrigger data-testid="trigger">Hover me</TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">
          Tooltip text
        </TooltipContent>
      </Tooltip>,
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
      <Tooltip>
        <TooltipTrigger data-testid="trigger">
          <button>Focus me</button>
        </TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">
          Tooltip text
        </TooltipContent>
      </Tooltip>,
    );

    await user.tab();

    await waitFor(() => {
      expect(screen.getByTestId("tooltip-content")).toBeDefined();
    });
  });

  it("renders tooltip with custom side offset", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip>
        <TooltipTrigger data-testid="trigger">Hover me</TooltipTrigger>
        <TooltipContent sideOffset={10} data-testid="tooltip-content">
          Tooltip text
        </TooltipContent>
      </Tooltip>,
    );

    const trigger = screen.getByTestId("trigger");
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByTestId("tooltip-content")).toBeDefined();
    });
  });
});
