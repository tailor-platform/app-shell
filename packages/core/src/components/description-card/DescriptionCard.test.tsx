import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { DescriptionCard } from "./DescriptionCard";

const wrapper = createAppShellWrapper();

afterEach(() => {
  cleanup();
});

describe("DescriptionCard", () => {
  it("renders badge values in sentence case by default", () => {
    render(
      <DescriptionCard
        title="Order"
        data={{ status: "NOT_RECEIVED" }}
        fields={[{ key: "status", label: "Status", type: "badge" }]}
      />,
      { wrapper },
    );

    expect(screen.getByText("Not received")).toBeDefined();
  });

  it("renders badge values as provided when sentenceCaseBadges is false", () => {
    render(
      <DescriptionCard
        title="Order"
        data={{ status: "NOT_RECEIVED" }}
        fields={[
          {
            key: "status",
            label: "Status",
            type: "badge",
            meta: { sentenceCaseBadges: false },
          },
        ]}
      />,
      { wrapper },
    );

    expect(screen.getByText("NOT_RECEIVED")).toBeDefined();
  });

  it("renders multiple badges from array value", () => {
    render(
      <DescriptionCard
        title="Order"
        data={{ tags: ["urgent", "fragile", "international"] }}
        fields={[
          {
            key: "tags",
            label: "Tags",
            type: "badge",
            meta: {
              badgeVariantMap: {
                urgent: "error",
                fragile: "warning",
                international: "outline-info",
              },
            },
          },
        ]}
      />,
      { wrapper },
    );

    expect(screen.getByText("Urgent")).toBeDefined();
    expect(screen.getByText("Fragile")).toBeDefined();
    expect(screen.getByText("International")).toBeDefined();
  });

  describe("render", () => {
    it("renders custom output in place of the built-in renderer", () => {
      render(
        <DescriptionCard
          title="Order"
          data={{ deliveryBreakdown: [1, 2] }}
          fields={[
            {
              key: "deliveryBreakdown",
              label: "Delivery",
              render: (value) => <span>chart:{(value as number[]).join("/")}</span>,
            },
          ]}
        />,
        { wrapper },
      );

      expect(screen.getByText("chart:1/2")).toBeDefined();
      expect(screen.getByText("Delivery")).toBeDefined();
    });

    it("takes priority over type", () => {
      render(
        <DescriptionCard
          title="Order"
          data={{ status: "CONFIRMED" }}
          fields={[
            {
              key: "status",
              label: "Status",
              type: "badge",
              render: (value) => <span>custom-{String(value)}</span>,
            },
          ]}
        />,
        { wrapper },
      );

      expect(screen.getByText("custom-CONFIRMED")).toBeDefined();
      // the badge renderer's sentence-cased output must not appear
      expect(screen.queryByText("Confirmed")).toBeNull();
    });

    it("receives the dot-notation value and the full data object", () => {
      const data = { currency: { code: "JPY" }, total: 42 };
      const seen: unknown[] = [];

      render(
        <DescriptionCard
          title="Order"
          data={data}
          fields={[
            {
              key: "currency.code",
              label: "Currency",
              render: (value, rowData) => {
                seen.push(value, rowData);
                return <span>{String(value)}</span>;
              },
            },
          ]}
        />,
        { wrapper },
      );

      expect(screen.getByText("JPY")).toBeDefined();
      expect(seen[0]).toBe("JPY");
      expect(seen[1]).toBe(data);
    });

    it("is still called when the value is empty", () => {
      render(
        <DescriptionCard
          title="Order"
          data={{ note: null }}
          fields={[
            {
              key: "note",
              label: "Note",
              render: (value) => <span>{value === null ? "no note" : "has note"}</span>,
            },
          ]}
        />,
        { wrapper },
      );

      expect(screen.getByText("no note")).toBeDefined();
    });

    it("does not run when emptyBehavior hides the field", () => {
      let called = false;

      render(
        <DescriptionCard
          title="Order"
          data={{ note: null, other: "x" }}
          fields={[
            {
              key: "note",
              label: "Note",
              emptyBehavior: "hide",
              render: () => {
                called = true;
                return <span>rendered</span>;
              },
            },
            { key: "other", label: "Other" },
          ]}
        />,
        { wrapper },
      );

      expect(called).toBe(false);
      expect(screen.queryByText("Note")).toBeNull();
      expect(screen.getByText("Other")).toBeDefined();
    });

    it("types data from the data prop", () => {
      interface Order {
        total: number;
        currency: { code: string };
      }
      const order: Order = { total: 42, currency: { code: "JPY" } };

      render(
        <DescriptionCard
          title="Order"
          data={order}
          fields={[
            {
              key: "total",
              label: "Total",
              // `orderData` is typed as Order here - no cast needed
              render: (value, orderData) => (
                <span>
                  {String(value)} {orderData.currency.code}
                </span>
              ),
            },
          ]}
        />,
        { wrapper },
      );

      expect(screen.getByText("42 JPY")).toBeDefined();
    });
  });
});
