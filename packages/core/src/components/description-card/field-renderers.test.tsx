import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { renderField } from "./field-renderers";
import type { ResolvedField } from "./types";

afterEach(() => {
  cleanup();
});

const wrapper = createAppShellWrapper();

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

    it("renders multiple badges from array value", () => {
      const { container } = render(
        renderField(makeField({ type: "badge", value: ["urgent", "fragile"] })),
      );
      expect(container.textContent).toContain("Urgent");
      expect(container.textContent).toContain("Fragile");
    });

    it("renders multiple badges with variant map", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "badge",
            value: ["urgent", "low"],
            meta: { badgeVariantMap: { urgent: "error", low: "neutral" } },
          }),
        ),
      );
      expect(container.textContent).toContain("Urgent");
      expect(container.textContent).toContain("Low");
    });

    it("renders dash for empty array", () => {
      const { container } = render(renderField(makeField({ type: "badge", value: [] })));
      expect(container.textContent).toBe("–");
    });

    it("skips null values in array", () => {
      const { container } = render(
        renderField(makeField({ type: "badge", value: ["active", null, "featured"] })),
      );
      expect(container.textContent).toContain("Active");
      expect(container.textContent).toContain("Featured");
      expect(container.textContent).not.toContain("–");
    });

    it("renders maxVisible badges with +N overflow indicator", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "badge",
            value: ["a", "b", "c", "d", "e"],
            meta: { maxVisible: 2 },
          }),
        ),
      );
      expect(container.textContent).toContain("A");
      expect(container.textContent).toContain("B");
      expect(container.textContent).toContain("+3");
      expect(container.textContent).not.toContain("C");
      expect(container.textContent).not.toContain("D");
      expect(container.textContent).not.toContain("E");
    });

    it("does not show overflow when values fit within maxVisible", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "badge",
            value: ["a", "b"],
            meta: { maxVisible: 5 },
          }),
        ),
      );
      expect(container.textContent).toContain("A");
      expect(container.textContent).toContain("B");
      expect(container.textContent).not.toContain("+");
    });

    it("shows overflow badges in popover on click", async () => {
      const user = userEvent.setup();
      render(
        renderField(
          makeField({
            type: "badge",
            value: ["a", "b", "c", "d"],
            meta: { maxVisible: 2 },
          }),
        ),
        { wrapper },
      );

      const trigger = screen.getByText("+2");
      await user.click(trigger);

      expect(screen.getByText("C")).toBeDefined();
      expect(screen.getByText("D")).toBeDefined();
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

    const renderDate = (field: ResolvedField) => render(renderField(field), { wrapper });

    it("renders dash for empty value", () => {
      const { container } = renderDate(
        makeField({
          type: "date",
          value: null,
          meta: { dateFormat: "relative" },
        }),
      );
      expect(container.textContent).toBe("–");
    });

    describe("relative format - past", () => {
      it("renders 'Just now' for less than 1 minute ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-18T09:59:30.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("Just now");
      });

      it("renders 'Just now' for 0 seconds ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-18T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("Just now");
      });

      it("renders '1 minutes ago' for exactly 1 minute ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-18T09:59:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("1 minutes ago");
      });

      it("renders '30 minutes ago' for 30 minutes ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-18T09:30:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("30 minutes ago");
      });

      it("renders '59 minutes ago' for 59 minutes ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-18T09:01:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("59 minutes ago");
      });

      it("renders '1 hours ago' for exactly 1 hour ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-18T09:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("1 hours ago");
      });

      it("renders '23 hours ago' for 23 hours ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-17T11:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("23 hours ago");
      });

      it("renders 'Yesterday' for exactly 1 day ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-17T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("Yesterday");
      });

      it("renders 'N days ago' for 2-6 days ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-15T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("3 days ago");
      });

      it("renders '6 days ago' for 6 days ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-12T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("6 days ago");
      });

      it("renders '1 weeks ago' for 7 days ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-11T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("1 weeks ago");
      });

      it("renders '4 weeks ago' for 29 days ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-04-19T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("4 weeks ago");
      });

      it("renders '1 months ago' for 30 days ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-04-18T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("1 months ago");
      });

      it("renders '12 months ago' for 364 days ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2025-05-19T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("12 months ago");
      });

      it("renders '1 years ago' for 365 days ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2025-05-18T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("1 years ago");
      });

      it("renders '2 years ago' for 730 days ago", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2024-05-18T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("2 years ago");
      });
    });

    describe("relative format - future", () => {
      it("renders 'Just now' for less than 1 minute in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-18T10:00:30.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("Just now");
      });

      it("renders 'In 1 minutes' for exactly 1 minute in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-18T10:01:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("In 1 minutes");
      });

      it("renders 'In 30 minutes' for 30 minutes in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-18T10:30:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("In 30 minutes");
      });

      it("renders 'In 59 minutes' for 59 minutes in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-18T10:59:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("In 59 minutes");
      });

      it("renders 'In 1 hours' for exactly 1 hour in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-18T11:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("In 1 hours");
      });

      it("renders 'In 23 hours' for 23 hours in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-19T09:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("In 23 hours");
      });

      it("renders 'Tomorrow' for exactly 1 day in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-19T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("Tomorrow");
      });

      it("renders 'In 3 days' for 3 days in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-21T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("In 3 days");
      });

      it("renders 'In 6 days' for 6 days in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-24T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("In 6 days");
      });

      it("renders 'In 1 weeks' for 7 days in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-05-25T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("In 1 weeks");
      });

      it("renders 'In 4 weeks' for 29 days in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-06-16T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("In 4 weeks");
      });

      it("renders 'In 1 months' for 30 days in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2026-06-17T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("In 1 months");
      });

      it("renders 'In 12 months' for 364 days in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2027-05-17T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("In 12 months");
      });

      it("renders 'In 1 years' for 365 days in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2027-05-18T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("In 1 years");
      });

      it("renders 'In 2 years' for 730 days in the future", () => {
        const { container } = renderDate(
          makeField({
            type: "date",
            value: "2028-05-17T10:00:00.000Z",
            meta: { dateFormat: "relative" },
          }),
        );
        expect(container.textContent).toBe("In 2 years");
      });
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
    it("renders internal link with SPA navigation", () => {
      const { container } = render(
        <MemoryRouter>
          {renderField(
            makeField({
              type: "link",
              value: "Click here",
              data: { url: "/orders/123" },
              meta: { hrefKey: "url" },
            }),
          )}
        </MemoryRouter>,
      );
      const link = container.querySelector("a");
      expect(link).not.toBeNull();
      expect(link?.getAttribute("href")).toBe("/orders/123");
      expect(link?.textContent).toBe("Click here");
      expect(link?.getAttribute("target")).toBeNull();
    });

    it("renders external link with target=_blank", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "link",
            value: "Click here",
            data: { url: "https://example.com" },
            meta: { hrefKey: "url", external: true },
          }),
        ),
      );
      const link = container.querySelector("a");
      expect(link).not.toBeNull();
      expect(link?.getAttribute("href")).toBe("https://example.com");
      expect(link?.getAttribute("target")).toBe("_blank");
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

  describe("reference", () => {
    it("renders reference as SPA link", () => {
      const { container } = render(
        <MemoryRouter>
          {renderField(
            makeField({
              type: "reference",
              value: "Supplier A",
              data: { supplierId: "abc-123" },
              meta: {
                referenceIdKey: "supplierId",
                referenceUrlPattern: "/master-data/business-partner/{id}",
              },
            }),
          )}
        </MemoryRouter>,
      );
      const link = container.querySelector("a");
      expect(link).not.toBeNull();
      expect(link?.getAttribute("href")).toBe("/master-data/business-partner/abc-123");
      expect(link?.textContent).toBe("Supplier A");
    });

    it("renders plain text when id or pattern is missing", () => {
      const { container } = render(
        renderField(
          makeField({
            type: "reference",
            value: "Supplier A",
            data: {},
            meta: { referenceIdKey: "supplierId" },
          }),
        ),
      );
      expect(container.querySelector("a")).toBeNull();
      expect(container.textContent).toBe("Supplier A");
    });

    it("renders dash for empty value", () => {
      const { container } = render(renderField(makeField({ type: "reference", value: null })));
      expect(container.textContent).toBe("–");
    });
  });
});
