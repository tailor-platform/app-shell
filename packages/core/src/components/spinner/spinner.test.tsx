import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner } from "./spinner";

describe("Spinner", () => {
  it("is decorative by default", () => {
    render(<Spinner data-testid="spinner" />);

    expect(screen.getByTestId("spinner").getAttribute("aria-hidden")).toBe("true");
  });

  it("stays exposed when labeled", () => {
    render(<Spinner aria-label="Loading" />);

    expect(screen.getByLabelText("Loading").getAttribute("aria-hidden")).toBeNull();
  });
});
