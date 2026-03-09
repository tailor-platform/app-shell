import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Radio, RadioGroup } from "./radio";

afterEach(() => {
  cleanup();
});

describe("Radio", () => {
  it("renders radio buttons", () => {
    render(
      <RadioGroup>
        <Radio data-testid="radio-a" value="a" />
        <Radio data-testid="radio-b" value="b" />
      </RadioGroup>,
    );

    expect(screen.getByTestId("radio-a")).toBeDefined();
    expect(screen.getByTestId("radio-b")).toBeDefined();
  });

  it("selects a radio on click", async () => {
    const user = userEvent.setup();

    render(
      <RadioGroup>
        <Radio data-testid="radio-a" value="a" />
        <Radio data-testid="radio-b" value="b" />
      </RadioGroup>,
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
      <RadioGroup>
        <Radio data-testid="radio-a" value="a" />
        <Radio data-testid="radio-b" value="b" />
      </RadioGroup>,
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
      <RadioGroup onValueChange={onValueChange}>
        <Radio data-testid="radio-a" value="a" />
        <Radio data-testid="radio-b" value="b" />
      </RadioGroup>,
    );

    await user.click(screen.getByTestId("radio-a"));

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith("a", expect.anything());
    });
  });

  it("renders with a default value", () => {
    render(
      <RadioGroup defaultValue="b">
        <Radio data-testid="radio-a" value="a" />
        <Radio data-testid="radio-b" value="b" />
      </RadioGroup>,
    );

    expect(screen.getByTestId("radio-b").hasAttribute("data-checked")).toBe(
      true,
    );
    expect(screen.getByTestId("radio-a").hasAttribute("data-checked")).toBe(
      false,
    );
  });

  it("supports controlled value", () => {
    const { rerender } = render(
      <RadioGroup value="a">
        <Radio data-testid="radio-a" value="a" />
        <Radio data-testid="radio-b" value="b" />
      </RadioGroup>,
    );

    expect(screen.getByTestId("radio-a").hasAttribute("data-checked")).toBe(
      true,
    );

    rerender(
      <RadioGroup value="b">
        <Radio data-testid="radio-a" value="a" />
        <Radio data-testid="radio-b" value="b" />
      </RadioGroup>,
    );

    expect(screen.getByTestId("radio-b").hasAttribute("data-checked")).toBe(
      true,
    );
    expect(screen.getByTestId("radio-a").hasAttribute("data-checked")).toBe(
      false,
    );
  });

  it("is disabled when disabled prop is set", () => {
    render(
      <RadioGroup disabled>
        <Radio data-testid="radio-a" value="a" />
      </RadioGroup>,
    );

    expect(screen.getByTestId("radio-a").hasAttribute("data-disabled")).toBe(
      true,
    );
  });

  it("applies custom className", () => {
    render(
      <RadioGroup data-testid="group" className="custom-class">
        <Radio value="a" />
      </RadioGroup>,
    );

    expect(screen.getByTestId("group").classList.contains("custom-class")).toBe(
      true,
    );
  });
});
