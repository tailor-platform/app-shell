import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { Response } from "./response";

afterEach(() => {
  cleanup();
});

describe("Response", () => {
  it("renders bold and inline code", () => {
    render(<Response>{"**bold** and `code`"}</Response>);
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("code").tagName).toBe("CODE");
  });

  it("renders an http link", () => {
    render(<Response>{"[docs](https://example.com/docs)"}</Response>);
    const link = screen.getByRole("link", { name: "docs" });
    expect(link.getAttribute("href")).toBe("https://example.com/docs");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("renders a relative link", () => {
    render(<Response>{"[order](/orders/1)"}</Response>);
    expect(screen.getByRole("link", { name: "order" }).getAttribute("href")).toBe("/orders/1");
  });

  it("does not render a javascript: link as a link", () => {
    render(<Response>{"[click me](javascript:doEvil)"}</Response>);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("click me")).toBeDefined();
  });

  it("renders a bulleted list", () => {
    render(<Response>{"- one\n- two"}</Response>);
    expect(screen.getByText("one").closest("ul")).not.toBeNull();
  });

  it("renders an ordered list", () => {
    render(<Response>{"1. first\n2. second"}</Response>);
    expect(screen.getByText("first").closest("ol")).not.toBeNull();
  });
});
