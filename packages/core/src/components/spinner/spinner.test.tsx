import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner } from "./spinner";

describe("Spinner", () => {
  it("is decorative by default and has a default size", () => {
    render(<Spinner data-testid="spinner" />);

    const spinner = screen.getByTestId("spinner");
    expect(spinner.getAttribute("aria-hidden")).toBe("true");
    expect(spinner.getAttribute("width")).toBe("16");
    expect(spinner.getAttribute("height")).toBe("16");
  });

  it("stays exposed when labeled", () => {
    render(<Spinner aria-label="Loading" />);

    expect(screen.getByLabelText("Loading").getAttribute("aria-hidden")).toBeNull();
  });
});
