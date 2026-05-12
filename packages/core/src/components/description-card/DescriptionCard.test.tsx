import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DescriptionCard } from "./DescriptionCard";

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
    );

    expect(screen.getByText("NOT_RECEIVED")).toBeDefined();
  });
});
