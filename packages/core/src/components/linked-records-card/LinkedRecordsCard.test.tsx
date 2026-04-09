import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LinkedRecordsCard } from "./LinkedRecordsCard";
import type { LinkedRecord } from "./types";

const mockRecords: LinkedRecord[] = [
  {
    id: "po-1",
    type: "purchase_order",
    label: "PO-105539",
    href: "/po/105539",
    status: "Approved",
    statusVariant: "outline-success",
  },
  {
    id: "gr-1",
    type: "goods_receipt",
    label: "GR-200145",
    href: "/gr/200145",
    status: "Received",
    statusVariant: "outline-success",
  },
];

afterEach(() => {
  cleanup();
});

describe("LinkedRecordsCard", () => {
  it("renders default title", () => {
    render(<LinkedRecordsCard records={mockRecords} />);
    expect(screen.getByText("Related Documents")).toBeDefined();
  });

  it("renders string title", () => {
    render(<LinkedRecordsCard title="Linked Documents" records={mockRecords} />);
    expect(screen.getByText("Linked Documents")).toBeDefined();
  });

  it("renders ReactNode title", () => {
    render(
      <LinkedRecordsCard
        title={<span data-testid="custom">100% Matched</span>}
        records={mockRecords}
      />,
    );
    expect(screen.getByTestId("custom")).toBeDefined();
    expect(screen.getByText("100% Matched")).toBeDefined();
  });

  it("renders all record rows with links and statuses", () => {
    const { container } = render(<LinkedRecordsCard records={mockRecords} />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toContain("PO-105539");
    expect(links[1].textContent).toContain("GR-200145");
    expect(links[0].getAttribute("href")).toBe("/po/105539");
    expect(links[1].getAttribute("href")).toBe("/gr/200145");
  });

  it("renders empty state when no records", () => {
    render(<LinkedRecordsCard records={[]} />);
    expect(screen.getByText("No linked records")).toBeDefined();
  });

  it("matches snapshot", () => {
    const { container } = render(<LinkedRecordsCard records={mockRecords} />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});
