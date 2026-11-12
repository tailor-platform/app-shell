import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import {
  createDateRenderer,
  createValueRenderer,
  displayCellAdapters,
  getDisplayCellAdapter,
} from "./cell-renderers";
import type { ColumnCellType } from "./column-types";

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
    renderValue: () => displayCellAdapters.text.createRenderer()("Text"),
    text: "Text",
  },
  number: {
    adapter: displayCellAdapters.number,
    align: "right",
    renderValue: () =>
      displayCellAdapters.number.createRenderer({
        type: "number",
        typeOptions: { locale: "en-US", minDecimals: 2, maxDecimals: 2 },
      })(12.5),
    text: "12.50",
  },
  money: {
    adapter: displayCellAdapters.money,
    align: "right",
    renderValue: () =>
      displayCellAdapters.money.createRenderer<{ currency: string }>({
        type: "money",
        typeOptions: { locale: "en-US", currency: (row) => row.currency },
      })(12.5, { currency: "EUR" }),
    text: "€12.50",
  },
  date: {
    adapter: displayCellAdapters.date,
    align: "left",
    renderValue: () =>
      displayCellAdapters.date.createRenderer(
        { locale: "en-US" },
        "America/New_York",
      )("2026-10-09T00:00:00Z"),
    text: "Oct 8, 2026",
  },
  badge: {
    adapter: displayCellAdapters.badge,
    align: "left",
    renderValue: () =>
      displayCellAdapters.badge.createRenderer({
        type: "badge",
        typeOptions: { badgeLabelMap: { open: "Open" } },
      })("open"),
    text: "Open",
  },
  link: {
    adapter: displayCellAdapters.link,
    align: "left",
    renderValue: () =>
      displayCellAdapters.link.createRenderer<{ id: string }>({
        type: "link",
        typeOptions: { href: (row) => `/rows/${row.id}` },
      })("Resolved", { id: "A" }),
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

  it("looks up metadata without creating a renderer", () => {
    const createRenderer = vi.spyOn(displayCellAdapters.date, "createRenderer");
    expect(getDisplayCellAdapter("date")).toBe(displayCellAdapters.date);
    expect(getDisplayCellAdapter(undefined)).toBe(displayCellAdapters.text);
    expect(createRenderer).not.toHaveBeenCalled();
  });

  it("creates value renderers through the catalog implementation", () => {
    const createRenderer = vi.spyOn(displayCellAdapters.number, "createRenderer");
    const descriptor = { type: "number" as const, typeOptions: { minDecimals: 2 } };
    createValueRenderer(descriptor);
    expect(createRenderer).toHaveBeenCalledExactlyOnceWith(descriptor, {});
    expect(displayCellAdapters.date.createRenderer).toBe(createDateRenderer);
  });

  it("keeps date dependencies out of generic preparation even at runtime", () => {
    // @ts-expect-error Date descriptors use timezone-specific preparation.
    expect(createValueRenderer({ type: "date" })("Raw value", {})).toBe("Raw value");
  });

  it.each(["custom", "constructor", "__proto__", Object("number"), { toString: () => "number" }])(
    "retains the text fallback for unsupported runtime type %s",
    (type: unknown) => {
      // @ts-expect-error Exercise malformed JavaScript configuration outside the typed contract.
      expect(getDisplayCellAdapter(type)).toBe(displayCellAdapters.text);
      // @ts-expect-error Exercise malformed JavaScript configuration outside the typed contract.
      expect(createValueRenderer({ type })("Raw value", {})).toBe("Raw value");
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
    const renderer = createValueRenderer(descriptor);
    expect(renderer("open", { status: "different" })).toBe("open");
    expect(renderer(false, { status: "different" })).toBe("✗");
    expect(createValueRenderer({})({ count: 2 }, {})).toBe('{"count":2}');
  });

  it("formats display precision without changing a supplied number", () => {
    const value = 12.345;
    const renderer = createValueRenderer({
      type: "number",
      typeOptions: { locale: "en-US", minDecimals: 2, maxDecimals: 2 },
    });
    render(<>{renderer(value, {})}</>);
    expect(screen.getByText("12.35")).toBeDefined();
    expect(value).toBe(12.345);
  });

  it("resolves currency from each row and retains the invalid-currency fallback", () => {
    const renderer = createValueRenderer<{ currency: string }>({
      type: "money",
      typeOptions: { locale: "en-US", currency: (row) => row.currency },
    });
    const view = render(<>{renderer(12.5, { currency: "EUR" })}</>);
    expect(screen.getByText("€12.50")).toBeDefined();
    view.rerender(<>{renderer(12.5, { currency: "invalid currency" })}</>);
    expect(screen.getByText("$12.50")).toBeDefined();
  });

  it("applies only the explicitly supplied badge display policy", () => {
    const descriptor = { type: "badge" as const, typeOptions: { badgeLabelMap: { open: "Open" } } };
    const normal = createValueRenderer(descriptor);
    const resolved = createValueRenderer(descriptor, {
      resolveBadgeLabel: (value) => `Resolved ${value}`,
    });
    const view = render(<>{normal("open", {})}</>);
    expect(screen.getByText("Open")).toBeDefined();
    view.rerender(<>{resolved("open", {})}</>);
    expect(screen.getByText("Resolved open")).toBeDefined();
    expect(screen.queryByText("Open")).toBeNull();
  });

  it("renders links from the supplied label and row-dependent href, or plain text without href", () => {
    const renderer = createValueRenderer<{ id?: string }>({
      type: "link",
      typeOptions: { href: (row) => (row.id ? `/rows/${row.id}` : null) },
    });
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
    const renderer = createDateRenderer({ locale: "en-US" }, "America/New_York");
    for (let index = 0; index < 3; index++) {
      expect(renderer("2026-10-09")).toBe("Oct 9, 2026");
      expect(renderer("2026-10-09T00:00:00Z")).toBe("Oct 8, 2026");
    }
    expect(
      spy.mock.calls
        .filter(([locale, options]) => locale === "en-US" && options?.month === "short")
        .map(([, options]) => options?.timeZone),
    ).toEqual(["UTC", "America/New_York"]);
  });

  it("preserves a skipped calendar date and placeholders without constructing invalid formatters", () => {
    const renderer = createDateRenderer({ locale: "en-US" }, "Pacific/Apia");
    expect(renderer("2011-12-30")).toBe("Dec 30, 2011");
    const view = render(<>{renderer("2026-02-30")}</>);
    expect(screen.getByText("—")).toBeDefined();
    view.rerender(<>{createValueRenderer({ type: "badge" })([null, ""], {})}</>);
    expect(screen.getByText("—")).toBeDefined();
  });
});
