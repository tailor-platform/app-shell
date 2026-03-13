import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "./toggle";

afterEach(() => {
  cleanup();
});

describe("Toggle", () => {
  it("renders as not pressed by default", () => {
    render(<Toggle.Root data-testid="toggle">Bold</Toggle.Root>);

    const toggle = screen.getByTestId("toggle");
    expect(toggle).toBeDefined();
    expect(toggle.hasAttribute("data-pressed")).toBe(false);
  });

  it("renders as pressed when defaultPressed is true", () => {
    render(
      <Toggle.Root data-testid="toggle" defaultPressed>
        Bold
      </Toggle.Root>,
    );

    const toggle = screen.getByTestId("toggle");
    expect(toggle.hasAttribute("data-pressed")).toBe(true);
  });

  it("toggles pressed state on click", async () => {
    const user = userEvent.setup();

    render(<Toggle.Root data-testid="toggle">Bold</Toggle.Root>);

    const toggle = screen.getByTestId("toggle");
    expect(toggle.hasAttribute("data-pressed")).toBe(false);

    await user.click(toggle);

    await waitFor(() => {
      expect(toggle.hasAttribute("data-pressed")).toBe(true);
    });

    await user.click(toggle);

    await waitFor(() => {
      expect(toggle.hasAttribute("data-pressed")).toBe(false);
    });
  });

  it("calls onPressedChange when toggled", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();

    render(
      <Toggle.Root data-testid="toggle" onPressedChange={onPressedChange}>
        Bold
      </Toggle.Root>,
    );

    await user.click(screen.getByTestId("toggle"));

    await waitFor(() => {
      expect(onPressedChange).toHaveBeenCalledTimes(1);
      expect(onPressedChange).toHaveBeenCalledWith(true, expect.anything());
    });
  });

  it("supports controlled pressed state", () => {
    const { rerender } = render(
      <Toggle.Root data-testid="toggle" pressed={false}>
        Bold
      </Toggle.Root>,
    );

    const toggle = screen.getByTestId("toggle");
    expect(toggle.hasAttribute("data-pressed")).toBe(false);

    rerender(
      <Toggle.Root data-testid="toggle" pressed={true}>
        Bold
      </Toggle.Root>,
    );

    expect(toggle.hasAttribute("data-pressed")).toBe(true);
  });

  it("is disabled when disabled prop is set", () => {
    render(
      <Toggle.Root data-testid="toggle" disabled>
        Bold
      </Toggle.Root>,
    );

    const toggle = screen.getByTestId("toggle");
    expect(toggle.hasAttribute("disabled")).toBe(true);
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();

    render(
      <Toggle.Root data-testid="toggle" disabled onPressedChange={onPressedChange}>
        Bold
      </Toggle.Root>,
    );

    await user.click(screen.getByTestId("toggle"));

    expect(onPressedChange).not.toHaveBeenCalled();
  });
});
