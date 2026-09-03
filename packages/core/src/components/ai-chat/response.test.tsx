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

  it("does not render a protocol-relative link as a link", () => {
    render(<Response>{"[click me](//evil.example/phish)"}</Response>);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("click me")).toBeDefined();
  });

  it("renders a bulleted list", () => {
    render(<Response>{"- one\n- two"}</Response>);
    expect(screen.getByText("one").closest("ul")).not.toBeNull();
  });

  // The inline and list-marker patterns run on untrusted model output. An
  // unbounded scan that fails at every start position is quadratic, so these
  // pathological inputs would blow the test timeout if the bounds regressed.
  describe("pathological input", () => {
    it("handles a long run of unclosed link brackets", () => {
      const { container } = render(<Response>{"[".repeat(20000)}</Response>);
      expect(container.textContent).toContain("[[[");
    });

    it("handles a long run of unclosed emphasis and code markers", () => {
      const { container } = render(<Response>{"*".repeat(20000)}</Response>);
      expect(container.textContent).toContain("***");
      const backticks = render(<Response>{"`".repeat(20000)}</Response>);
      expect(backticks.container.textContent).toContain("```");
    });

    it("handles a long run of leading whitespace on a list-shaped line", () => {
      const { container } = render(<Response>{`${" ".repeat(20000)}- item`}</Response>);
      expect(container.textContent).toContain("item");
    });
  });

  it("does not treat an over-long span as markdown", () => {
    const long = "x".repeat(600);
    render(<Response>{`**${long}**`}</Response>);
    expect(screen.queryByText(long)).toBeNull();
  });

  it("renders an ordered list", () => {
    render(<Response>{"1. first\n2. second"}</Response>);
    expect(screen.getByText("first").closest("ol")).not.toBeNull();
  });
});
