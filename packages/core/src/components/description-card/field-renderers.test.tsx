import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { renderField } from "./field-renderers";
import type { ResolvedField } from "./types";

afterEach(() => {
  cleanup();
});

function makeField(overrides: Partial<ResolvedField>): ResolvedField {
  return {
    id: "test-field",
    label: "Test",
    type: "text",
    value: null,
    emptyBehavior: "dash",
    data: {},
    ...overrides,
  };
}

describe("renderField", () => {
  describe("text", () => {
    it("renders text value", () => {
      const { container } = render(renderField(makeField({ type: "text", value: "hello" })));
      expect(container.textContent).toContain("hello");
    });

    it("renders dash for empty value", () => {
      const { container } = render(renderField(makeField({ type: "text", value: null })));
      expect(container.textContent).toBe("–");
    });
  });

  describe("badge", () => {
    it("renders badge with sentence case", () => {
      const { container } = render(renderField(makeField({ type: "badge", value: "CONFIRMED" })));
      expect(container.textContent).toContain("Confirmed");
    });

    it("renders snake_case badge in sentence case", () => {
      const { container } = render(
        renderField(makeField({ type: "badge", value: "NOT_RECEIVED" })),
      );
      expect(container.textContent).toContain("Not received");
    });

    it("renders dash for empty value", () => {
      const { container } = render(renderField(makeField({ type: "badge", value: null })));
      expect(container.textContent).toBe("–");
    });
  });

  describe("date", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-18T10:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("renders 'Today' when date is today", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "date",
            value: "2026-05-18T09:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        ),
      );
      expect(container.textContent).toBe("Today");
    });

    it("renders 'Today' when date is slightly in the future (negative diff)", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "date",
            value: "2026-05-18T10:00:00.437Z",
            meta: { dateFormat: "relative" },
          }),
        ),
      );
      expect(container.textContent).toBe("Today");
    });

    it("renders 'Yesterday' for 1 day ago", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "date",
            value: "2026-05-17T08:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        ),
      );
      expect(container.textContent).toBe("Yesterday");
    });

    it("renders 'N days ago' for 2-6 days ago", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "date",
            value: "2026-05-15T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        ),
      );
      expect(container.textContent).toBe("3 days ago");
    });

    it("renders 'N weeks ago' for 7-29 days ago", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "date",
            value: "2026-05-04T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        ),
      );
      expect(container.textContent).toBe("2 weeks ago");
    });

    it("renders 'N months ago' for 30-364 days ago", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "date",
            value: "2026-02-18T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        ),
      );
      expect(container.textContent).toBe("2 months ago");
    });

    it("renders 'N years ago' for 365+ days ago", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "date",
            value: "2024-05-18T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        ),
      );
      expect(container.textContent).toBe("2 years ago");
    });

    it("renders dash for empty value", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "date",
            value: null,
            meta: { dateFormat: "relative" },
          }),
        ),
      );
      expect(container.textContent).toBe("–");
    });
  });

  describe("money", () => {
    it("renders formatted currency", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "money",
            value: 1234.5,
            data: { currency: "USD" },
            meta: { currencyKey: "currency" },
          }),
        ),
      );
      expect(container.textContent).toContain("1,234.50");
    });

    it("renders dash for empty value", () => {
      const { container } = render(renderField(makeField({ type: "money", value: null })));
      expect(container.textContent).toBe("–");
    });
  });

  describe("link", () => {
    it("renders link with href", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "link",
            value: "Click here",
            data: { url: "https://example.com" },
            meta: { hrefKey: "url" },
          }),
        ),
      );
      const link = container.querySelector("a");
      expect(link).not.toBeNull();
      expect(link?.getAttribute("href")).toBe("https://example.com");
      expect(link?.textContent).toBe("Click here");
    });

    it("renders dash for empty value", () => {
      const { container } = render(renderField(makeField({ type: "link", value: null })));
      expect(container.textContent).toBe("–");
    });
  });

  describe("address", () => {
    it("renders address lines from string", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "address",
            value: "123 Main St, City, ST 12345",
          }),
        ),
      );
      expect(container.textContent).toContain("123 Main St");
      expect(container.textContent).toContain("City");
    });

    it("renders address from object", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "address",
            value: {
              line1: "123 Main St",
              city: "Springfield",
              state: "IL",
              zip: "62701",
            },
          }),
        ),
      );
      expect(container.textContent).toContain("123 Main St");
      expect(container.textContent).toContain("Springfield, IL, 62701");
    });

    it("renders dash for empty value", () => {
      const { container } = render(renderField(makeField({ type: "address", value: null })));
      expect(container.textContent).toBe("–");
    });
  });
});
