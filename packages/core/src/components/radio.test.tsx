import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Radio } from "./radio";

afterEach(() => {
  cleanup();
});

describe("Radio", () => {
  it("renders radio buttons", () => {
    render(
      <Radio.Group>
        <Radio.Root data-testid="radio-a" value="a" />
        <Radio.Root data-testid="radio-b" value="b" />
      </Radio.Group>,
    );

    expect(screen.getByTestId("radio-a")).toBeDefined();
    expect(screen.getByTestId("radio-b")).toBeDefined();
  });

  it("selects a radio on click", async () => {
    const user = userEvent.setup();

    render(
      <Radio.Group>
        <Radio.Root data-testid="radio-a" value="a" />
        <Radio.Root data-testid="radio-b" value="b" />
      </Radio.Group>,
    );

    const radioA = screen.getByTestId("radio-a");
    expect(radioA.hasAttribute("data-checked")).toBe(false);

    await user.click(radioA);

    await waitFor(() => {
      expect(radioA.hasAttribute("data-checked")).toBe(true);
    });
  });

  it("deselects previous radio when another is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Radio.Group>
        <Radio.Root data-testid="radio-a" value="a" />
        <Radio.Root data-testid="radio-b" value="b" />
      </Radio.Group>,
    );

    const radioA = screen.getByTestId("radio-a");
    const radioB = screen.getByTestId("radio-b");

    await user.click(radioA);
    await waitFor(() => {
      expect(radioA.hasAttribute("data-checked")).toBe(true);
    });

    await user.click(radioB);
    await waitFor(() => {
      expect(radioB.hasAttribute("data-checked")).toBe(true);
      expect(radioA.hasAttribute("data-checked")).toBe(false);
    });
  });

  it("calls onValueChange when selection changes", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Radio.Group onValueChange={onValueChange}>
        <Radio.Root data-testid="radio-a" value="a" />
        <Radio.Root data-testid="radio-b" value="b" />
      </Radio.Group>,
    );

    await user.click(screen.getByTestId("radio-a"));

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith("a", expect.anything());
    });
  });

  it("renders with a default value", () => {
    render(
      <Radio.Group defaultValue="b">
        <Radio.Root data-testid="radio-a" value="a" />
        <Radio.Root data-testid="radio-b" value="b" />
      </Radio.Group>,
    );

    expect(screen.getByTestId("radio-b").hasAttribute("data-checked")).toBe(true);
    expect(screen.getByTestId("radio-a").hasAttribute("data-checked")).toBe(false);
  });

  it("supports controlled value", () => {
    const { rerender } = render(
      <Radio.Group value="a">
        <Radio.Root data-testid="radio-a" value="a" />
        <Radio.Root data-testid="radio-b" value="b" />
      </Radio.Group>,
    );

    expect(screen.getByTestId("radio-a").hasAttribute("data-checked")).toBe(true);

    rerender(
      <Radio.Group value="b">
        <Radio.Root data-testid="radio-a" value="a" />
        <Radio.Root data-testid="radio-b" value="b" />
      </Radio.Group>,
    );

    expect(screen.getByTestId("radio-b").hasAttribute("data-checked")).toBe(true);
    expect(screen.getByTestId("radio-a").hasAttribute("data-checked")).toBe(false);
  });

  it("is disabled when disabled prop is set", () => {
    render(
      <Radio.Group disabled>
        <Radio.Root data-testid="radio-a" value="a" />
      </Radio.Group>,
    );

    expect(screen.getByTestId("radio-a").hasAttribute("data-disabled")).toBe(true);
  });

  it("applies custom className", () => {
    render(
      <Radio.Group data-testid="group" className="custom-class">
        <Radio.Root value="a" />
      </Radio.Group>,
    );

    expect(screen.getByTestId("group").classList.contains("custom-class")).toBe(true);
  });
});
