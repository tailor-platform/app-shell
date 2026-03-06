import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Separator } from "./separator";

afterEach(() => {
  cleanup();
});

describe("Separator", () => {
  it("renders horizontal separator by default", () => {
    render(<Separator data-testid="separator" />);

    const separator = screen.getByTestId("separator");
    expect(separator).toBeDefined();
    expect(separator.getAttribute("data-orientation")).toBe("horizontal");
  });

  it("renders vertical separator when orientation is vertical", () => {
    render(<Separator data-testid="separator" orientation="vertical" />);

    const separator = screen.getByTestId("separator");
    expect(separator.getAttribute("data-orientation")).toBe("vertical");
  });

  it("applies custom className", () => {
    render(<Separator data-testid="separator" className="custom-class" />);

    const separator = screen.getByTestId("separator");
    expect(separator.className).toContain("custom-class");
  });

  it("sets decorative by default", () => {
    render(<Separator data-testid="separator" />);

    const separator = screen.getByTestId("separator");
    // When decorative is true, role is "none"
    expect(separator.getAttribute("role")).toBe("none");
  });

  it("has separator role when not decorative", () => {
    render(<Separator data-testid="separator" decorative={false} />);

    const separator = screen.getByTestId("separator");
    expect(separator.getAttribute("role")).toBe("separator");
  });
});
