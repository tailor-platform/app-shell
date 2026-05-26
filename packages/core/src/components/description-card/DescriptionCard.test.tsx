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
});
