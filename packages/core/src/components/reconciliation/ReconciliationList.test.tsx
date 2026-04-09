import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReconciliationList } from "./ReconciliationList";
import type { ReconciliationListItem } from "./types";

const mockItems: ReconciliationListItem[] = [
  {
    id: "1",
    invoiceNumber: "26TKC-00200",
    supplier: "CADICA Tekstil VE Tic. Ltd. Sti.",
    status: "matched",
    matchScore: 100,
    totalAmount: 7854.01,
    currency: "USD",
    date: new Date("2026-04-07"),
  },
  {
    id: "2",
    invoiceNumber: "SS26-0522",
    supplier: "Karmen Deri Urunleri Sanayi ve Ticaret A.S.",
    status: "partial_match",
    matchScore: 75,
    totalAmount: 157990.0,
    currency: "USD",
    date: new Date("2026-04-07"),
  },
  {
    id: "3",
    invoiceNumber: "DT26010026",
    supplier: "Un-Available Co., Ltd.",
    status: "processing",
    matchScore: 0,
    totalAmount: 621.37,
    currency: "USD",
    date: new Date("2026-04-07"),
  },
];

afterEach(() => {
  cleanup();
});

describe("ReconciliationList", () => {
  it("renders table headers", () => {
    render(<ReconciliationList items={mockItems} />);
    expect(screen.getByText("Invoice #")).toBeDefined();
    expect(screen.getByText("Supplier")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();
    expect(screen.getByText("Score")).toBeDefined();
    expect(screen.getByText("Amount")).toBeDefined();
    expect(screen.getByText("Date")).toBeDefined();
  });

  it("renders invoice numbers and suppliers", () => {
    render(<ReconciliationList items={mockItems} />);
    expect(screen.getByText("26TKC-00200")).toBeDefined();
    expect(screen.getByText("SS26-0522")).toBeDefined();
    expect(screen.getByText("CADICA Tekstil VE Tic. Ltd. Sti.")).toBeDefined();
  });

  it("renders status badges", () => {
    render(<ReconciliationList items={mockItems} />);
    expect(screen.getAllByText("Matched").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Partial Match").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Processing").length).toBeGreaterThan(0);
  });

  it("shows dash for score when processing", () => {
    render(<ReconciliationList items={[mockItems[2]]} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows percentage with color for score when not processing", () => {
    render(<ReconciliationList items={[mockItems[0]]} />);
    const score = screen.getByText("100%");
    expect(score).toBeDefined();
    // 100% should have green color class
    expect(score.className).toContain("green");
  });

  it("shows amber color for scores 70-89", () => {
    render(<ReconciliationList items={[mockItems[1]]} />);
    const score = screen.getByText("75%");
    expect(score).toBeDefined();
    expect(score.className).toContain("yellow");
  });

  it("calls onItemClick when row is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ReconciliationList items={mockItems} onItemClick={onClick} />);

    const row = screen.getByText("26TKC-00200").closest("tr") as HTMLElement;
    await user.click(row);

    expect(onClick).toHaveBeenCalledWith(mockItems[0]);
  });

  it("renders upload dialog when uploadOpen is true", () => {
    render(
      <ReconciliationList
        items={mockItems}
        onUpload={() => {}}
        uploadOpen
        onUploadOpenChange={() => {}}
      />,
    );
    // Dialog title rendered via Dialog.Title
    expect(screen.getByRole("heading", { name: "Upload Invoice" })).toBeDefined();
  });

  it("renders empty state when no items", () => {
    render(<ReconciliationList items={[]} />);
    expect(screen.getByText("No reconciliation records found.")).toBeDefined();
  });

  it("renders custom empty state", () => {
    render(<ReconciliationList items={[]} emptyState={<p>Custom empty</p>} />);
    expect(screen.getByText("Custom empty")).toBeDefined();
  });

  describe("loading state", () => {
    it("shows skeleton rows when loading", () => {
      const { container } = render(<ReconciliationList items={[]} loading />);
      const pulsingElements = container.querySelectorAll("[class*='animate-pulse']");
      expect(pulsingElements.length).toBeGreaterThan(0);
    });

    it("does not show items when loading", () => {
      render(<ReconciliationList items={mockItems} loading />);
      expect(screen.queryByText("26TKC-00200")).toBeNull();
    });
  });

  it("matches snapshot", () => {
    const { container } = render(<ReconciliationList items={mockItems} onUpload={() => {}} />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});
