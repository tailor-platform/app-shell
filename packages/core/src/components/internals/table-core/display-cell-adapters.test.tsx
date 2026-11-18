import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { createValueRenderer } from "./cell-renderers";
import { displayCellAdapters } from "./display-cell-adapters";
import type { ColumnCellType } from "./column-types";

const context = { timeZone: "America/New_York" };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const adapterCases: Record<
  ColumnCellType,
  {
    adapter: { defaultAlign: "left" | "right" };
    align: "left" | "right";
    renderValue: () => ReactNode;
    text: string;
    href?: string;
  }
> = {
  text: {
    adapter: displayCellAdapters.text,
    align: "left",
    renderValue: () =>
      displayCellAdapters.text.createRenderer({ type: "text" }, context)("Text", {}),
    text: "Text",
  },
  number: {
    adapter: displayCellAdapters.number,
    align: "right",
    renderValue: () =>
      displayCellAdapters.number.createRenderer(
        { type: "number", typeOptions: { locale: "en-US", minDecimals: 2, maxDecimals: 2 } },
        context,
      )(12.5, {}),
    text: "12.50",
  },
  money: {
    adapter: displayCellAdapters.money,
    align: "right",
    renderValue: () =>
      displayCellAdapters.money.createRenderer<{ currency: string }>(
        { type: "money", typeOptions: { locale: "en-US", currency: (row) => row.currency } },
        context,
      )(12.5, { currency: "EUR" }),
    text: "€12.50",
  },
  date: {
    adapter: displayCellAdapters.date,
    align: "left",
    renderValue: () =>
      displayCellAdapters.date.createRenderer(
        { type: "date", typeOptions: { locale: "en-US" } },
        context,
      )("2026-10-09T00:00:00Z", {}),
    text: "Oct 8, 2026",
  },
  badge: {
    adapter: displayCellAdapters.badge,
    align: "left",
    renderValue: () =>
      displayCellAdapters.badge.createRenderer(
        { type: "badge", typeOptions: { badgeLabelMap: { open: "Open" } } },
        context,
      )("open", {}),
    text: "Open",
  },
  link: {
    adapter: displayCellAdapters.link,
    align: "left",
    renderValue: () =>
      displayCellAdapters.link.createRenderer<{ id: string }>(
        { type: "link", typeOptions: { href: (row) => `/rows/${row.id}` } },
        context,
      )("Resolved", { id: "A" }),
    text: "Resolved",
    href: "/rows/A",
  },
};

describe("display cell adapters", () => {
  it.each(Object.entries(adapterCases))(
    "pairs %s rendering with its default alignment",
    (_kind, { adapter, align, renderValue, text, href }) => {
      expect(adapter.defaultAlign).toBe(align);
      render(<MemoryRouter>{renderValue()}</MemoryRouter>);
      expect(screen.getByText(text)).toBeDefined();
      if (href) expect(screen.getByRole("link").getAttribute("href")).toBe(href);
    },
  );

  it.each([undefined, { timeZone: "" }])(
    "rejects date preparation without a timezone at runtime (%j)",
    (invalidContext) => {
      expect(() =>
        displayCellAdapters.date.createRenderer(
          { type: "date" },
          // @ts-expect-error Exercise JavaScript configuration outside the typed contract.
          invalidContext,
        ),
      ).toThrow("Date rendering requires a timezone.");
    },
  );
});

describe("neutral value rendering", () => {
  it("renders the supplied value without looking up row properties or edit choices", () => {
    const descriptor = {
      type: "text" as const,
      id: "status",
      edit: { options: [{ value: "open", label: "Choice label" }] },
    };
    const renderer = createValueRenderer(descriptor, context);
    expect(renderer("open", { status: "different" })).toBe("open");
    expect(renderer(false, { status: "different" })).toBe("✗");
    expect(createValueRenderer({}, context)({ count: 2 }, {})).toBe('{"count":2}');
  });

  it("formats display precision without changing a supplied number", () => {
    const value = 12.345;
    const renderer = createValueRenderer(
      { type: "number", typeOptions: { locale: "en-US", minDecimals: 2, maxDecimals: 2 } },
      context,
    );
    render(<>{renderer(value, {})}</>);
    expect(screen.getByText("12.35")).toBeDefined();
    expect(value).toBe(12.345);
  });

  it("resolves currency from each row and retains the invalid-currency fallback", () => {
    const renderer = createValueRenderer<{ currency: string }>(
      { type: "money", typeOptions: { locale: "en-US", currency: (row) => row.currency } },
      context,
    );
    const view = render(<>{renderer(12.5, { currency: "EUR" })}</>);
    expect(screen.getByText("€12.50")).toBeDefined();
    view.rerender(<>{renderer(12.5, { currency: "invalid currency" })}</>);
    expect(screen.getByText("$12.50")).toBeDefined();
  });

  it("applies only the explicitly supplied badge display policy", () => {
    const descriptor = { type: "badge" as const, typeOptions: { badgeLabelMap: { open: "Open" } } };
    const normal = createValueRenderer(descriptor, context);
    const resolved = createValueRenderer(descriptor, {
      ...context,
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
      context,
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
      context,
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
      { timeZone: "Pacific/Apia" },
    );
    expect(renderer("2011-12-30", {})).toBe("Dec 30, 2011");
    const view = render(<>{renderer("2026-02-30", {})}</>);
    expect(screen.getByText("—")).toBeDefined();
    view.rerender(<>{createValueRenderer({ type: "badge" }, context)([null, ""], {})}</>);
    expect(screen.getByText("—")).toBeDefined();
  });
});
