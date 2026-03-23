import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MetricCard } from "./MetricCard";

const MockIcon = () => <span data-testid="mock-icon">icon</span>;

afterEach(() => {
  cleanup();
});

describe("MetricCard", () => {
  it("renders required title and value", () => {
    render(<MetricCard title="Net total" value="$1,500.00" />);
    expect(screen.getByText("Net total")).toBeDefined();
    expect(screen.getByText("$1,500.00")).toBeDefined();
  });

  it("renders optional icon when provided", () => {
    render(<MetricCard title="Total" value="$100" icon={<MockIcon />} />);
    expect(screen.getByTestId("mock-icon")).toBeDefined();
    expect(screen.getByText("Total")).toBeDefined();
    expect(screen.getByText("$100")).toBeDefined();
  });

  it("renders trend up with value", () => {
    render(
      <MetricCard title="Revenue" value="$2,000" trend={{ direction: "up", value: "+12%" }} />,
    );
    expect(screen.getByText("+12%")).toBeDefined();
    const trendEl = screen.getByText("+12%").closest("[data-direction]");
    expect(trendEl?.getAttribute("data-direction")).toBe("up");
  });

  it("renders trend down with value", () => {
    render(<MetricCard title="Costs" value="$500" trend={{ direction: "down", value: "-5%" }} />);
    expect(screen.getByText("-5%")).toBeDefined();
    const trendEl = screen.getByText("-5%").closest("[data-direction]");
    expect(trendEl?.getAttribute("data-direction")).toBe("down");
  });

  it("renders trend neutral with value", () => {
    render(<MetricCard title="Balance" value="$0" trend={{ direction: "neutral", value: "0%" }} />);
    expect(screen.getByText("0%")).toBeDefined();
    const trendEl = screen.getByText("0%").closest("[data-direction]");
    expect(trendEl?.getAttribute("data-direction")).toBe("neutral");
  });

  it("renders description text when provided", () => {
    render(<MetricCard title="Sales" value="$3,000" description="vs last month" />);
    expect(screen.getByText("vs last month")).toBeDefined();
  });

  it("does not render description when description is empty string", () => {
    const { container } = render(<MetricCard title="Sales" value="$3,000" description="" />);
    expect(container.querySelector('[data-slot="metric-card"]')?.children.length).toBe(2);
  });

  it("renders trend and description together", () => {
    render(
      <MetricCard
        title="Profit"
        value="$1,200"
        trend={{ direction: "up", value: "+8%" }}
        description="vs last quarter"
      />,
    );
    expect(screen.getByText("+8%")).toBeDefined();
    expect(screen.getByText("vs last quarter")).toBeDefined();
  });

  it("does not render meta row when trend and description are absent", () => {
    const { container } = render(<MetricCard title="Title" value="Value" />);
    expect(container.querySelector('[data-slot="metric-card"]')?.children.length).toBe(2);
  });

  it("accepts custom className", () => {
    const { container } = render(
      <MetricCard title="KPI" value="42" className="custom-metric-card" />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("custom-metric-card");
  });
});
