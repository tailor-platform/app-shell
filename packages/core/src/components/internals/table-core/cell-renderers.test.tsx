import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { createValueRenderer } from "./cell-renderers";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("neutral value rendering", () => {
  it("renders the supplied value without looking up row properties or edit choices", () => {
    const descriptor = {
      type: "text" as const,
      id: "status",
      edit: { options: [{ value: "open", label: "Choice label" }] },
    };
    const renderer = createValueRenderer(descriptor, "UTC");
    expect(renderer("open", { status: "different" })).toBe("open");
    expect(renderer(false, { status: "different" })).toBe("✗");
    expect(createValueRenderer({}, "UTC")({ count: 2 }, {})).toBe('{"count":2}');
  });

  it("formats display precision without changing a supplied number", () => {
    const value = 12.345;
    const renderer = createValueRenderer(
      { type: "number", typeOptions: { locale: "en-US", minDecimals: 2, maxDecimals: 2 } },
      "UTC",
    );
    render(<>{renderer(value, {})}</>);
    expect(screen.getByText("12.35")).toBeDefined();
    expect(value).toBe(12.345);
  });

  it("resolves currency from each row and retains the invalid-currency fallback", () => {
    const renderer = createValueRenderer<{ currency: string }>(
      { type: "money", typeOptions: { locale: "en-US", currency: (row) => row.currency } },
      "UTC",
    );
    const view = render(<>{renderer(12.5, { currency: "EUR" })}</>);
    expect(screen.getByText("€12.50")).toBeDefined();
    view.rerender(<>{renderer(12.5, { currency: "invalid currency" })}</>);
    expect(screen.getByText("$12.50")).toBeDefined();
  });

  it("applies only the explicitly supplied badge display policy", () => {
    const descriptor = { type: "badge" as const, typeOptions: { badgeLabelMap: { open: "Open" } } };
    const normal = createValueRenderer(descriptor, "UTC");
    const resolved = createValueRenderer(descriptor, "UTC", {
      resolveBadgeLabel: (value) => `Resolved ${value}`,
    });
    const view = render(<>{normal("open", {})}</>);
    expect(screen.getByText("Open")).toBeDefined();
    view.rerender(<>{resolved("open", {})}</>);
    expect(screen.getByText("Resolved open")).toBeDefined();
    expect(screen.queryByText("Open")).toBeNull();
  });

  it("renders links from the supplied label and row-dependent href, or plain text without href", () => {
    const renderer = createValueRenderer<{ id?: string }>(
      { type: "link", typeOptions: { href: (row) => (row.id ? `/rows/${row.id}` : null) } },
      "UTC",
    );
    const view = render(<MemoryRouter>{renderer("Resolved label", { id: "A" })}</MemoryRouter>);
    expect(screen.getByRole("link", { name: "Resolved label" }).getAttribute("href")).toBe(
      "/rows/A",
    );
    view.rerender(<MemoryRouter>{renderer("Resolved label", {})}</MemoryRouter>);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Resolved label")).toBeDefined();
  });

  it("keeps independent date-only and zoned formatter caches across rows", () => {
    const DateTimeFormat = Intl.DateTimeFormat;
    const spy = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (locale, options) {
      return new DateTimeFormat(locale, options);
    });
    const renderer = createValueRenderer(
      { type: "date", typeOptions: { locale: "en-US" } },
      "America/New_York",
    );
    for (let index = 0; index < 3; index++) {
      expect(renderer("2026-10-09", {})).toBe("Oct 9, 2026");
      expect(renderer("2026-10-09T00:00:00Z", {})).toBe("Oct 8, 2026");
    }
    expect(
      spy.mock.calls
        .filter(([locale, options]) => locale === "en-US" && options?.month === "short")
        .map(([, options]) => options?.timeZone),
    ).toEqual(["UTC", "America/New_York"]);
  });

  it("preserves a skipped calendar date and placeholders without constructing invalid formatters", () => {
    const renderer = createValueRenderer(
      { type: "date", typeOptions: { locale: "en-US" } },
      "Pacific/Apia",
    );
    expect(renderer("2011-12-30", {})).toBe("Dec 30, 2011");
    const view = render(<>{renderer("2026-02-30", {})}</>);
    expect(screen.getByText("—")).toBeDefined();
    view.rerender(<>{createValueRenderer({ type: "badge" }, "UTC")([null, ""], {})}</>);
    expect(screen.getByText("—")).toBeDefined();
  });
});
