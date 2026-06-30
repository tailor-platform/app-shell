import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DocumentProgressCard } from "./DocumentProgressCard";

afterEach(() => {
  cleanup();
});

const getRoot = (container: HTMLElement) =>
  container.querySelector('[data-slot="document-progress-card"]') as HTMLElement;

const getPercentText = () =>
  screen.getByText((_, el) => el?.getAttribute("data-slot") === "document-progress-percent")
    .textContent;

const segments = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll('[data-slot="document-progress-segment"]'),
  ) as HTMLElement[];

describe("DocumentProgressCard", () => {
  describe("snapshots", () => {
    it("title, percent, and three segments", () => {
      const { container } = render(
        <DocumentProgressCard
          title="Shipment status"
          percent={60}
          segments={[
            { label: "Shipped", value: 30, color: "green" },
            { label: "Returned", value: 3, color: "red" },
            { label: "Pending", value: 17, color: "neutral" },
          ]}
        />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("with an unfilled remainder via total", () => {
      const { container } = render(
        <DocumentProgressCard
          percent={25}
          total={40}
          segments={[{ label: "Done", value: 10, color: "indigo" }]}
        />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("legend override distinct from bar segments", () => {
      const { container } = render(
        <DocumentProgressCard
          percent={30}
          total={40}
          segments={[
            { label: "Net", value: 10, color: "indigo" },
            { label: "Returned", value: 2, color: "pink" },
          ]}
          legend={[
            { label: "Received items", value: 12, color: "indigo" },
            { label: "Returned items", value: 2, color: "pink" },
            { label: "Yet to receive", value: 28, color: "neutral" },
          ]}
        />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders segment labels and values in the legend", () => {
    render(
      <DocumentProgressCard
        segments={[
          { label: "Shipped", value: 30, color: "green" },
          { label: "Pending", value: 10, color: "neutral" },
        ]}
      />,
    );
    expect(screen.getByText("Shipped")).toBeDefined();
    expect(screen.getByText("Pending")).toBeDefined();
    expect(screen.getByText("30")).toBeDefined();
    expect(screen.getByText("10")).toBeDefined();
  });

  it("renders the headline percentage when provided", () => {
    render(
      <DocumentProgressCard percent={42} segments={[{ label: "A", value: 1, color: "indigo" }]} />,
    );
    expect(getPercentText()).toBe("42%");
  });

  it("omits the header when neither title nor percent is provided", () => {
    const { container } = render(
      <DocumentProgressCard segments={[{ label: "A", value: 1, color: "indigo" }]} />,
    );
    expect(container.querySelector('[data-slot="document-progress-percent"]')).toBeNull();
    // only the bar+legend wrapper is a child of the root (no header row)
    expect(getRoot(container).children.length).toBe(1);
  });

  it("clamps the percentage to [0, 100] and rounds it", () => {
    render(
      <DocumentProgressCard
        percent={142.6}
        segments={[{ label: "A", value: 1, color: "indigo" }]}
      />,
    );
    expect(getPercentText()).toBe("100%");
  });

  it("sizes bar segments against the sum of values by default", () => {
    const { container } = render(
      <DocumentProgressCard
        segments={[
          { label: "A", value: 30, color: "indigo" },
          { label: "B", value: 10, color: "pink" },
        ]}
      />,
    );
    const [a, b] = segments(container);
    // sum = 40 → 75% / 25%
    expect(a.style.width).toBe("75%");
    expect(b.style.width).toBe("25%");
  });

  it("leaves an unfilled remainder when total exceeds the segment sum", () => {
    const { container } = render(
      <DocumentProgressCard total={40} segments={[{ label: "A", value: 10, color: "indigo" }]} />,
    );
    const segs = segments(container);
    expect(segs).toHaveLength(1);
    expect(segs[0].style.width).toBe("25%"); // 10 / 40
  });

  it("renders the legend independently of the bar when `legend` is provided", () => {
    const { container } = render(
      <DocumentProgressCard
        total={40}
        segments={[
          { label: "Net", value: 10, color: "indigo" },
          { label: "Returned", value: 2, color: "pink" },
        ]}
        legend={[
          { label: "Received items", value: 12, color: "indigo" },
          { label: "Returned items", value: 2, color: "pink" },
          { label: "Yet to receive", value: 28, color: "neutral" },
        ]}
      />,
    );
    // bar reflects segments (2), legend reflects the override (3 rows)
    expect(segments(container)).toHaveLength(2);
    expect(container.querySelectorAll('[data-slot="document-progress-legend-row"]')).toHaveLength(
      3,
    );
    expect(screen.getByText("Received items")).toBeDefined();
    expect(screen.getByText("12")).toBeDefined();
  });

  it("applies the segment color to the bar", () => {
    const { container } = render(
      <DocumentProgressCard
        segments={[
          { label: "A", value: 1, color: "green" },
          { label: "B", value: 1, color: "amber" },
        ]}
      />,
    );
    const [a, b] = segments(container);
    expect(a.getAttribute("data-color")).toBe("green");
    expect(b.getAttribute("data-color")).toBe("amber");
  });

  it("sanitizes non-finite and negative values to zero", () => {
    render(
      <DocumentProgressCard
        segments={[
          { label: "A", value: Number.NaN, color: "indigo" },
          { label: "B", value: -5, color: "pink" },
          { label: "C", value: Number.POSITIVE_INFINITY, color: "neutral" },
        ]}
      />,
    );
    expect(screen.getAllByText("0")).toHaveLength(3);
  });

  it("renders the bar as a decorative element", () => {
    const { container } = render(
      <DocumentProgressCard percent={50} segments={[{ label: "A", value: 1, color: "indigo" }]} />,
    );
    const bar = container.querySelector('[data-slot="document-progress-bar"]') as HTMLElement;
    expect(bar.getAttribute("aria-hidden")).toBe("true");
  });

  it("accepts a custom className on the root", () => {
    const { container } = render(
      <DocumentProgressCard
        className="custom-card"
        segments={[{ label: "A", value: 1, color: "indigo" }]}
      />,
    );
    expect(getRoot(container).className).toContain("custom-card");
  });
});
