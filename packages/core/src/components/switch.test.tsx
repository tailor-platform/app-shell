import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "./switch";

afterEach(() => {
  cleanup();
});

describe("Switch", () => {
  it("renders as unchecked by default", () => {
    render(<Switch data-testid="switch" />);

    const sw = screen.getByTestId("switch");
    expect(sw).toBeDefined();
    expect(sw.hasAttribute("data-checked")).toBe(false);
  });

  it("renders as checked when defaultChecked is true", () => {
    render(<Switch data-testid="switch" defaultChecked />);

    const sw = screen.getByTestId("switch");
    expect(sw.hasAttribute("data-checked")).toBe(true);
  });

  it("toggles checked state on click", async () => {
    const user = userEvent.setup();

    render(<Switch data-testid="switch" />);

    const sw = screen.getByTestId("switch");
    expect(sw.hasAttribute("data-checked")).toBe(false);

    await user.click(sw);

    await waitFor(() => {
      expect(sw.hasAttribute("data-checked")).toBe(true);
    });

    await user.click(sw);

    await waitFor(() => {
      expect(sw.hasAttribute("data-checked")).toBe(false);
    });
  });

  it("calls onCheckedChange when toggled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Switch data-testid="switch" onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByTestId("switch"));

    await waitFor(() => {
      expect(onCheckedChange).toHaveBeenCalledTimes(1);
      expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
    });
  });

  it("supports controlled checked state", () => {
    const { rerender } = render(
      <Switch data-testid="switch" checked={false} />,
    );

    const sw = screen.getByTestId("switch");
    expect(sw.hasAttribute("data-checked")).toBe(false);

    rerender(<Switch data-testid="switch" checked={true} />);

    expect(sw.hasAttribute("data-checked")).toBe(true);
  });

  it("is disabled when disabled prop is set", () => {
    render(<Switch data-testid="switch" disabled />);

    const sw = screen.getByTestId("switch");
    expect(sw.hasAttribute("data-disabled")).toBe(true);
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <Switch
        data-testid="switch"
        disabled
        onCheckedChange={onCheckedChange}
      />,
    );

    await user.click(screen.getByTestId("switch"));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("renders thumb element", () => {
    render(<Switch data-testid="switch" />);

    const sw = screen.getByTestId("switch");
    const thumb = sw.querySelector("[data-slot='switch-thumb']");
    expect(thumb).toBeDefined();
    expect(thumb).not.toBeNull();
  });
});
