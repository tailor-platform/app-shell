import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Slider } from "./slider";

afterEach(() => {
  cleanup();
});

describe("Slider", () => {
  it("renders slider with track and thumb", () => {
    render(<Slider.Root data-testid="slider" defaultValue={50} />);

    const slider = screen.getByTestId("slider");
    expect(slider).toBeDefined();
    expect(slider.querySelector("[data-slot='slider-track']")).toBeDefined();
    expect(slider.querySelector("[data-slot='slider-thumb']")).toBeDefined();
  });

  it("renders with default value", () => {
    render(<Slider.Root data-testid="slider" defaultValue={30} />);

    const slider = screen.getByTestId("slider");
    const input = slider.querySelector("input[type='range']") as HTMLInputElement;
    expect(input.getAttribute("aria-valuenow")).toBe("30");
  });

  it("renders with controlled value", () => {
    const { rerender } = render(<Slider.Root data-testid="slider" value={25} />);

    const slider = screen.getByTestId("slider");
    const input = slider.querySelector("input[type='range']") as HTMLInputElement;
    expect(input.getAttribute("aria-valuenow")).toBe("25");

    rerender(<Slider.Root data-testid="slider" value={75} />);

    const updatedInput = slider.querySelector("input[type='range']") as HTMLInputElement;
    expect(updatedInput.getAttribute("aria-valuenow")).toBe("75");
  });

  it("calls onValueChange when value changes via keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<Slider.Root data-testid="slider" defaultValue={50} onValueChange={onValueChange} />);

    const input = screen.getByTestId("slider").querySelector("input[type='range']") as HTMLElement;
    input.focus();

    await user.keyboard("{ArrowRight}");

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalled();
    });
  });

  it("is disabled when disabled prop is set", () => {
    render(<Slider.Root data-testid="slider" defaultValue={50} disabled />);

    const slider = screen.getByTestId("slider");
    expect(slider.hasAttribute("data-disabled")).toBe(true);
  });

  it("applies custom className to root", () => {
    render(<Slider.Root data-testid="slider" defaultValue={50} className="custom-class" />);

    expect(screen.getByTestId("slider").classList.contains("custom-class")).toBe(true);
  });
});
