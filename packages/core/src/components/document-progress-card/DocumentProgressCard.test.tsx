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

describe("DocumentProgressCard", () => {
  describe("snapshots", () => {
    it("empty — nothing received (Figma baseline)", () => {
      const { container } = render(
        <DocumentProgressCard
          received={{ value: 0 }}
          returned={{ value: 0 }}
          yetToReceive={{ value: 40 }}
        />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("partial — received with some returns", () => {
      const { container } = render(
        <DocumentProgressCard
          received={{ value: 12 }}
          returned={{ value: 2 }}
          yetToReceive={{ value: 28 }}
        />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("returns subtracted from progress", () => {
      const { container } = render(
        <DocumentProgressCard
          received={{ value: 12 }}
          returned={{ value: 2 }}
          yetToReceive={{ value: 28 }}
          returnedCountsAsComplete={false}
        />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("fully received", () => {
      const { container } = render(
        <DocumentProgressCard
          received={{ value: 40 }}
          returned={{ value: 0 }}
          yetToReceive={{ value: 0 }}
        />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("custom title, labels, and colors", () => {
      const { container } = render(
        <DocumentProgressCard
          title="Shipment status"
          received={{ value: 30, label: "Shipped", color: "green" }}
          returned={{ value: 3, label: "Returned", color: "red" }}
          yetToReceive={{ value: 17, label: "Pending", color: "neutral" }}
        />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  it("renders default title and labels", () => {
    render(
      <DocumentProgressCard
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

  it("renders a custom title and custom labels", () => {
    render(
      <DocumentProgressCard
        title="Shipment status"
        received={{ value: 1, label: "Shipped" }}
        returned={{ value: 0, label: "Returned" }}
        yetToReceive={{ value: 1, label: "Pending" }}
      />,
    );
    expect(screen.getByText("Shipment status")).toBeDefined();
    expect(screen.getByText("Shipped")).toBeDefined();
    expect(screen.getByText("Pending")).toBeDefined();
  });

  it("renders each bucket's figure, including zeroes", () => {
    render(
      <DocumentProgressCard
        received={{ value: 0 }}
        returned={{ value: 0 }}
        yetToReceive={{ value: 40 }}
      />,
    );
    // two zero figures (received, returned) + the 40
    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(screen.getByText("40")).toBeDefined();
  });

  it("derives the percentage with returned counting as complete (default)", () => {
    render(
      <DocumentProgressCard
        received={{ value: 12 }}
        returned={{ value: 2 }}
        yetToReceive={{ value: 28 }}
      />,
    );
    // total = 12 + 28 = 40; percent = round(100 * 12/40) = 30
    expect(getPercentText()).toBe("30%");
  });

  it("subtracts returned from progress when returnedCountsAsComplete is false", () => {
    const { container } = render(
      <DocumentProgressCard
        received={{ value: 12 }}
        returned={{ value: 2 }}
        yetToReceive={{ value: 28 }}
        returnedCountsAsComplete={false}
      />,
    );
    // percent = round(100 * (12 - 2)/40) = 25
    expect(getPercentText()).toBe("25%");
    expect(getRoot(container).getAttribute("data-percent")).toBe("25");
  });

  it("renders 0% when there are no items (zero total)", () => {
    render(
      <DocumentProgressCard
        received={{ value: 0 }}
        returned={{ value: 0 }}
        yetToReceive={{ value: 0 }}
      />,
    );
    expect(getPercentText()).toBe("0%");
  });

  it("clamps the percentage to [0, 100]", () => {
    // returned exceeds received → net negative, clamped to 0
    render(
      <DocumentProgressCard
        received={{ value: 5 }}
        returned={{ value: 10 }}
        yetToReceive={{ value: 5 }}
        returnedCountsAsComplete={false}
      />,
    );
    expect(getPercentText()).toBe("0%");
  });

  it("draws received and returned bar segments when non-zero", () => {
    const { container } = render(
      <DocumentProgressCard
        received={{ value: 12 }}
        returned={{ value: 2 }}
        yetToReceive={{ value: 28 }}
      />,
    );
    const segments = container.querySelectorAll('[data-slot="document-progress-segment"]');
    expect(segments).toHaveLength(2);
    const received = container.querySelector('[data-segment="received"]') as HTMLElement;
    const returned = container.querySelector('[data-segment="returned"]') as HTMLElement;
    // received-net = (12 - 2)/40 = 25%, returned = 2/40 = 5%
    expect(received.style.width).toBe("25%");
    expect(returned.style.width).toBe("5%");
  });

  it("draws no bar segments when nothing has been received", () => {
    const { container } = render(
      <DocumentProgressCard
        received={{ value: 0 }}
        returned={{ value: 0 }}
        yetToReceive={{ value: 40 }}
      />,
    );
    expect(container.querySelectorAll('[data-slot="document-progress-segment"]')).toHaveLength(0);
  });

  it("applies default colors and color overrides", () => {
    const { container } = render(
      <DocumentProgressCard
        received={{ value: 10, color: "green" }}
        returned={{ value: 0 }}
        yetToReceive={{ value: 10 }}
      />,
    );
    const received = container.querySelector('[data-segment="received"]') as HTMLElement;
    expect(received.className).toContain("bg-green-500");
  });

  it("accepts a custom className on the root", () => {
    const { container } = render(
      <DocumentProgressCard
        className="custom-progress-card"
        received={{ value: 1 }}
        returned={{ value: 0 }}
        yetToReceive={{ value: 1 }}
      />,
    );
    expect(getRoot(container).className).toContain("custom-progress-card");
  });

  it("keeps the colored bar in sync with the header when returns are excluded", () => {
    const { container } = render(
      <DocumentProgressCard
        received={{ value: 12 }}
        returned={{ value: 2 }}
        yetToReceive={{ value: 28 }}
        returnedCountsAsComplete={false}
      />,
    );
    // header = (12 − 2)/40 = 25%; the bar must fill 25% too — received segment only,
    // no returned segment contributing to the fill
    expect(getPercentText()).toBe("25%");
    const received = container.querySelector('[data-segment="received"]') as HTMLElement;
    expect(received.style.width).toBe("25%");
    expect(container.querySelector('[data-segment="returned"]')).toBeNull();
  });

  it("clamps returned to received so the bar never contradicts the header", () => {
    const { container } = render(
      <DocumentProgressCard
        received={{ value: 2 }}
        returned={{ value: 5 }}
        yetToReceive={{ value: 8 }}
      />,
    );
    // total = 10; default-mode header = 2/10 = 20%
    expect(getPercentText()).toBe("20%");
    // net received = (2 − min(5,2))/10 = 0 → no received segment; returned clamped to 2 → 20%
    expect(container.querySelector('[data-segment="received"]')).toBeNull();
    const returned = container.querySelector('[data-segment="returned"]') as HTMLElement;
    expect(returned.style.width).toBe("20%");
  });

  it("sanitizes non-finite and negative values to zero", () => {
    render(
      <DocumentProgressCard
        received={{ value: Number.NaN }}
        returned={{ value: -5 }}
        yetToReceive={{ value: Number.POSITIVE_INFINITY }}
      />,
    );
    // all coerced to 0 → zero total → 0%, and each legend figure shows 0
    expect(getPercentText()).toBe("0%");
    expect(screen.getAllByText("0")).toHaveLength(3);
  });

  it("renders the bar as a decorative element", () => {
    const { container } = render(
      <DocumentProgressCard
        received={{ value: 1 }}
        returned={{ value: 0 }}
        yetToReceive={{ value: 1 }}
      />,
    );
    const bar = container.querySelector('[data-slot="document-progress-bar"]') as HTMLElement;
    expect(bar.getAttribute("aria-hidden")).toBe("true");
    // total = 2, received = 1 → 50%
    expect(getPercentText()).toBe("50%");
  });
});
