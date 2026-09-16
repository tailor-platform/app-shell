import { afterEach, describe, expect, it, vi } from "vitest";
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
              render: (data) => <span>chart:{data.deliveryBreakdown.join("/")}</span>,
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
              render: (data) => <span>custom-{data.status}</span>,
            },
          ]}
        />,
        { wrapper },
      );

      expect(screen.getByText("custom-CONFIRMED")).toBeDefined();
      // the badge renderer's sentence-cased output must not appear
      expect(screen.queryByText("Confirmed")).toBeNull();
    });

    it("receives the data object it was given, as its only argument", () => {
      const data = { currency: { code: "JPY" }, total: 42 };
      const spy = vi.fn((_data: typeof data) => <span>rendered</span>);

      render(
        <DescriptionCard
          title="Order"
          data={data}
          fields={[{ key: "currency.code", label: "Currency", render: spy }]}
        />,
        { wrapper },
      );

      expect(spy).toHaveBeenCalledTimes(1);
      // the same object identity, not a copy
      expect(spy.mock.calls[0][0]).toBe(data);
      // exactly one argument - no pre-resolved value is passed
      expect(spy.mock.calls[0]).toHaveLength(1);
    });

    it("can reach nested keys itself, without dot-notation resolution", () => {
      render(
        <DescriptionCard
          title="Order"
          data={{ customer: { contact: { email: "a@b.example" } } }}
          fields={[
            {
              key: "customer",
              label: "Email",
              render: (data) => <span>{data.customer.contact.email}</span>,
            },
          ]}
        />,
        { wrapper },
      );

      expect(screen.getByText("a@b.example")).toBeDefined();
    });

    it("is still called when the value at key is empty", () => {
      render(
        <DescriptionCard
          title="Order"
          data={{ note: null }}
          fields={[
            {
              key: "note",
              label: "Note",
              render: (data) => <span>{data.note === null ? "no note" : "has note"}</span>,
            },
          ]}
        />,
        { wrapper },
      );

      expect(screen.getByText("no note")).toBeDefined();
    });

    it("does not run when emptyBehavior hides the field", () => {
      const spy = vi.fn(() => <span>rendered</span>);

      render(
        <DescriptionCard
          title="Order"
          data={{ note: null, other: "x" }}
          fields={[
            { key: "note", label: "Note", emptyBehavior: "hide", render: spy },
            { key: "other", label: "Other" },
          ]}
        />,
        { wrapper },
      );

      expect(spy).not.toHaveBeenCalled();
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
              // `data` is typed as Order here - no cast, nothing is `unknown`
              render: (data) => (
                <span>
                  {data.total} {data.currency.code}
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
