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
  {
    id: "pi-1",
    type: "purchase_invoice",
    label: "PI-2026-00371",
    href: "/pi/371",
    status: "Draft",
    statusVariant: "outline-neutral",
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

  it("renders custom title", () => {
    render(<LinkedRecordsCard title="Linked Documents" records={mockRecords} />);
    expect(screen.getByText("Linked Documents")).toBeDefined();
  });

  it("renders all record rows with labels and statuses", () => {
    const { container } = render(<LinkedRecordsCard records={mockRecords} />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(3);
    expect(links[0].textContent).toContain("PO-105539");
    expect(links[1].textContent).toContain("GR-200145");
    expect(links[2].textContent).toContain("PI-2026-00371");
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Received").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Draft").length).toBeGreaterThan(0);
  });

  it("renders record labels as links with correct href", () => {
    const { container } = render(<LinkedRecordsCard records={mockRecords} />);
    const links = container.querySelectorAll("a");
    expect(links[0].getAttribute("href")).toBe("/po/105539");
    expect(links[1].getAttribute("href")).toBe("/gr/200145");
    expect(links[2].getAttribute("href")).toBe("/pi/371");
  });

  it("renders match score when provided", () => {
    render(
      <LinkedRecordsCard
        records={mockRecords}
        matchScore={{ value: 100, statusLabel: "Matched", statusVariant: "success" }}
      />,
    );
    expect(screen.getByText("100% Matched")).toBeDefined();
  });

  it("shows title when score is omitted", () => {
    render(<LinkedRecordsCard records={mockRecords} />);
    expect(screen.getByText("Related Documents")).toBeDefined();
  });

  it("renders empty state when no records", () => {
    render(<LinkedRecordsCard records={[]} />);
    expect(screen.getByText("No linked records")).toBeDefined();
  });

  it("matches snapshot", () => {
    const { container } = render(
      <LinkedRecordsCard
        records={mockRecords}
        matchScore={{ value: 75, statusLabel: "Partial Match", statusVariant: "warning" }}
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });
});
