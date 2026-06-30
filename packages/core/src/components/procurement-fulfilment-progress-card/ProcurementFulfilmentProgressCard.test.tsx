import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProcurementFulfilmentProgressCard } from "./ProcurementFulfilmentProgressCard";

afterEach(() => {
  cleanup();
});

const getRoot = (container: HTMLElement) =>
  container.querySelector('[data-slot="document-progress-card"]') as HTMLElement;

const getPercentText = () =>
  screen.getByText((_, el) => el?.getAttribute("data-slot") === "document-progress-percent")
    .textContent;

const segmentByColor = (container: HTMLElement, color: string) =>
  container.querySelector(
    `[data-slot="document-progress-segment"][data-color="${color}"]`,
  ) as HTMLElement | null;

describe("ProcurementFulfilmentProgressCard", () => {
  describe("snapshots", () => {
    it("partial receipt with returns", () => {
      const { container } = render(
        <ProcurementFulfilmentProgressCard
          received={{ value: 12 }}
          returned={{ value: 2 }}
          yetToReceive={{ value: 28 }}
        />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("returns excluded from progress", () => {
      const { container } = render(
        <ProcurementFulfilmentProgressCard
          received={{ value: 12 }}
          returned={{ value: 2 }}
          yetToReceive={{ value: 28 }}
          returnedCountsAsComplete={false}
        />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders default title and bucket labels", () => {
    render(
      <ProcurementFulfilmentProgressCard
        received={{ value: 0 }}
        returned={{ value: 0 }}
        yetToReceive={{ value: 40 }}
      />,
    );
    expect(screen.getByText("Fulfilment rate")).toBeDefined();
    expect(screen.getByText("Received items")).toBeDefined();
    expect(screen.getByText("Returned items")).toBeDefined();
    expect(screen.getByText("Yet to receive")).toBeDefined();
  });

  it("supports custom title and labels", () => {
    render(
      <ProcurementFulfilmentProgressCard
        title="Goods receipt"
        received={{ value: 1, label: "Received" }}
        returned={{ value: 0, label: "Sent back" }}
        yetToReceive={{ value: 1, label: "Outstanding" }}
      />,
    );
    expect(screen.getByText("Goods receipt")).toBeDefined();
    expect(screen.getByText("Received")).toBeDefined();
    expect(screen.getByText("Sent back")).toBeDefined();
    expect(screen.getByText("Outstanding")).toBeDefined();
  });

  it("shows the raw bucket figures in the legend (received is the full amount)", () => {
    render(
      <ProcurementFulfilmentProgressCard
        received={{ value: 12 }}
        returned={{ value: 2 }}
        yetToReceive={{ value: 28 }}
      />,
    );
    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("28")).toBeDefined();
  });

  it("derives the percentage with returned counting as complete (default)", () => {
    render(
      <ProcurementFulfilmentProgressCard
        received={{ value: 12 }}
        returned={{ value: 2 }}
        yetToReceive={{ value: 28 }}
      />,
    );
    // total = 40; percent = round(100 * 12/40) = 30
    expect(getPercentText()).toBe("30%");
  });

  it("subtracts returned from progress when returnedCountsAsComplete is false", () => {
    const { container } = render(
      <ProcurementFulfilmentProgressCard
        received={{ value: 12 }}
        returned={{ value: 2 }}
        yetToReceive={{ value: 28 }}
        returnedCountsAsComplete={false}
      />,
    );
    // percent = round(100 * (12 − 2)/40) = 25
    expect(getPercentText()).toBe("25%");
    expect(getRoot(container).getAttribute("data-percent")).toBe("25");
  });

  it("renders 0% when there are no items", () => {
    render(
      <ProcurementFulfilmentProgressCard
        received={{ value: 0 }}
        returned={{ value: 0 }}
        yetToReceive={{ value: 0 }}
      />,
    );
    expect(getPercentText()).toBe("0%");
  });

  it("splits the bar into net-received and returned segments sized against the total", () => {
    const { container } = render(
      <ProcurementFulfilmentProgressCard
        received={{ value: 12 }}
        returned={{ value: 2 }}
        yetToReceive={{ value: 28 }}
      />,
    );
    const received = segmentByColor(container, "indigo");
    const returned = segmentByColor(container, "pink");
    // net received = (12 − 2)/40 = 25%, returned = 2/40 = 5%; remainder is the empty track
    expect(received?.style.width).toBe("25%");
    expect(returned?.style.width).toBe("5%");
  });

  it("clamps returned to received so the bar never exceeds the total", () => {
    const { container } = render(
      <ProcurementFulfilmentProgressCard
        received={{ value: 2 }}
        returned={{ value: 5 }}
        yetToReceive={{ value: 8 }}
      />,
    );
    // total = 10; default-mode percent = 2/10 = 20%
    expect(getPercentText()).toBe("20%");
    // net received = (2 − min(5,2))/10 = 0 → no indigo segment; returned clamped to 2 → 20%
    expect(segmentByColor(container, "indigo")).toBeNull();
    expect(segmentByColor(container, "pink")?.style.width).toBe("20%");
  });

  it("sanitizes non-finite and negative values to zero", () => {
    render(
      <ProcurementFulfilmentProgressCard
        received={{ value: Number.NaN }}
        returned={{ value: -5 }}
        yetToReceive={{ value: Number.POSITIVE_INFINITY }}
      />,
    );
    expect(getPercentText()).toBe("0%");
  });

  it("accepts color overrides per bucket", () => {
    const { container } = render(
      <ProcurementFulfilmentProgressCard
        received={{ value: 10, color: "green" }}
        returned={{ value: 0 }}
        yetToReceive={{ value: 10 }}
      />,
    );
    expect(segmentByColor(container, "green")?.style.width).toBe("50%");
  });

  it("accepts a custom className on the root", () => {
    const { container } = render(
      <ProcurementFulfilmentProgressCard
        className="custom-receipt"
        received={{ value: 1 }}
        returned={{ value: 0 }}
        yetToReceive={{ value: 1 }}
      />,
    );
    expect(getRoot(container).className).toContain("custom-receipt");
  });
});
