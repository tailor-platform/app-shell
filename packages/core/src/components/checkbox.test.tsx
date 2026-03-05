import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./checkbox";

afterEach(() => {
  cleanup();
});

describe("Checkbox", () => {
  it("renders as unchecked by default", () => {
    render(<Checkbox data-testid="checkbox" />);

    const checkbox = screen.getByTestId("checkbox");
    expect(checkbox).toBeDefined();
    expect(checkbox.hasAttribute("data-checked")).toBe(false);
  });

  it("renders as checked when defaultChecked is true", () => {
    render(<Checkbox data-testid="checkbox" defaultChecked />);

    const checkbox = screen.getByTestId("checkbox");
    expect(checkbox.hasAttribute("data-checked")).toBe(true);
  });

  it("toggles checked state on click", async () => {
    const user = userEvent.setup();

    render(<Checkbox data-testid="checkbox" />);

    const checkbox = screen.getByTestId("checkbox");
    expect(checkbox.hasAttribute("data-checked")).toBe(false);

    await user.click(checkbox);

    await waitFor(() => {
      expect(checkbox.hasAttribute("data-checked")).toBe(true);
    });

    await user.click(checkbox);

    await waitFor(() => {
      expect(checkbox.hasAttribute("data-checked")).toBe(false);
    });
  });

  it("calls onCheckedChange when toggled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <Checkbox data-testid="checkbox" onCheckedChange={onCheckedChange} />,
    );

    await user.click(screen.getByTestId("checkbox"));

    await waitFor(() => {
      expect(onCheckedChange).toHaveBeenCalledTimes(1);
      expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
    });
  });

  it("supports controlled checked state", () => {
    const { rerender } = render(
      <Checkbox data-testid="checkbox" checked={false} />,
    );

    const checkbox = screen.getByTestId("checkbox");
    expect(checkbox.hasAttribute("data-checked")).toBe(false);

    rerender(<Checkbox data-testid="checkbox" checked={true} />);

    expect(checkbox.hasAttribute("data-checked")).toBe(true);
  });

  it("renders indeterminate state", () => {
    render(<Checkbox data-testid="checkbox" indeterminate />);

    const checkbox = screen.getByTestId("checkbox");
    expect(checkbox.hasAttribute("data-indeterminate")).toBe(true);
  });

  it("is disabled when disabled prop is set", () => {
    render(<Checkbox data-testid="checkbox" disabled />);

    const checkbox = screen.getByTestId("checkbox");
    expect(checkbox.hasAttribute("data-disabled")).toBe(true);
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(
      <Checkbox
        data-testid="checkbox"
        disabled
        onCheckedChange={onCheckedChange}
      />,
    );

    await user.click(screen.getByTestId("checkbox"));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
