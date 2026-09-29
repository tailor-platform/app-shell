import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner } from "./spinner";

describe("Spinner", () => {
  it("is decorative by default and has a default size", () => {
    render(<Spinner data-testid="spinner-default" />);

    const spinner = screen.getByTestId("spinner-default");
    expect(spinner.getAttribute("aria-hidden")).toBe("true");
    expect(spinner.getAttribute("width")).toBe("16");
    expect(spinner.getAttribute("height")).toBe("16");
    expect(spinner.getAttribute("role")).toBeNull();
  });

  it("supports ergonomic size tokens", () => {
    render(<Spinner data-testid="spinner-sm" size="sm" />);

    const spinner = screen.getByTestId("spinner-sm");
    expect(spinner.getAttribute("width")).toBe("14");
    expect(spinner.getAttribute("height")).toBe("14");
  });

  it("uses status semantics when labeled", () => {
    render(<Spinner aria-label="Loading" />);

    const spinner = screen.getByRole("status", { name: "Loading" });
    expect(spinner.getAttribute("aria-hidden")).toBeNull();
  });

  it("stays decorative when explicitly hidden", () => {
    render(<Spinner data-testid="spinner-hidden" aria-hidden />);

    const spinner = screen.getByTestId("spinner-hidden");
    expect(spinner.getAttribute("aria-hidden")).toBe("true");
    expect(spinner.getAttribute("role")).toBeNull();
  });
});
