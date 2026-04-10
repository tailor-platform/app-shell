import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReconciliationList } from "./ReconciliationList";
import type { ReconciliationListItem, StatusConfig, StatusTab, ListColumn } from "./types";

// ============================================================================
// TEST CONFIG
// ============================================================================

const TEST_STATUS_CONFIG: StatusConfig = {
  processingStatus: "processing",
  errorStatus: "error",
  hideActionsForStatuses: ["matched", "processing"],
  badgeVariantMap: {
    matched: "subtle-success",
    partial_match: "subtle-warning",
    processing: "subtle-default",
  },
  labelMap: {
    matched: "Matched",
    partial_match: "Partial Match",
    processing: "Processing",
  },
};

const TEST_TABS: StatusTab[] = [
  { key: "all", label: "All" },
  { key: "matched", label: "Matched" },
  { key: "partial_match", label: "Partial Match" },
  { key: "processing", label: "Processing" },
];

const TEST_COLUMNS: ListColumn[] = [
  { key: "invoiceNumber", header: "Invoice #" },
  { key: "supplier", header: "Supplier" },
  { key: "status", header: "Status", type: "badge" },
  { key: "matchScore", header: "Score", type: "score", align: "right" },
  {
    key: "totalAmount",
    header: "Amount",
    type: "money",
    align: "right",
    meta: { currencyKey: "currency" },
  },
  { key: "date", header: "Date", type: "date" },
];

// ============================================================================
// MOCK DATA
// ============================================================================

const mockItems: ReconciliationListItem[] = [
  {
    id: "1",
    status: "matched",
    data: {
      invoiceNumber: "26TKC-00200",
      supplier: "CADICA Tekstil VE Tic. Ltd. Sti.",
      matchScore: 100,
      totalAmount: 7854.01,
      currency: "USD",
      date: new Date("2026-04-07"),
    },
  },
  {
    id: "2",
    status: "partial_match",
    data: {
      invoiceNumber: "SS26-0522",
      supplier: "Karmen Deri Urunleri Sanayi ve Ticaret A.S.",
      matchScore: 75,
      totalAmount: 157990.0,
      currency: "USD",
      date: new Date("2026-04-07"),
    },
  },
  {
    id: "3",
    status: "processing",
    data: {
      invoiceNumber: "DT26010026",
      supplier: "Dongtex Industrial Co., Ltd.",
      matchScore: 0,
      totalAmount: 621.37,
      currency: "USD",
      date: new Date("2026-04-07"),
    },
  },
];

// ============================================================================
// DEFAULT PROPS HELPER
// ============================================================================

function defaultProps(overrides?: Partial<React.ComponentProps<typeof ReconciliationList>>) {
  return {
    items: mockItems,
    statusConfig: TEST_STATUS_CONFIG,
    tabs: TEST_TABS,
    columns: TEST_COLUMNS,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("ReconciliationList", () => {
  it("renders table headers from columns config", () => {
    render(<ReconciliationList {...defaultProps()} />);
    expect(screen.getByText("Invoice #")).toBeDefined();
    expect(screen.getByText("Supplier")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();
    expect(screen.getByText("Score")).toBeDefined();
    expect(screen.getByText("Amount")).toBeDefined();
    expect(screen.getByText("Date")).toBeDefined();
  });

  it("renders data from items", () => {
    render(<ReconciliationList {...defaultProps()} />);
    expect(screen.getByText("26TKC-00200")).toBeDefined();
    expect(screen.getByText("SS26-0522")).toBeDefined();
    expect(screen.getByText("CADICA Tekstil VE Tic. Ltd. Sti.")).toBeDefined();
  });

  it("renders status badges using statusConfig", () => {
    render(<ReconciliationList {...defaultProps()} />);
    expect(screen.getAllByText("Matched").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Partial Match").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Processing").length).toBeGreaterThan(0);
  });

  it("shows dash for score when processing", () => {
    render(<ReconciliationList {...defaultProps({ items: [mockItems[2]] })} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows percentage with color for score when not processing", () => {
    render(<ReconciliationList {...defaultProps({ items: [mockItems[0]] })} />);
    const score = screen.getByText("100%");
    expect(score).toBeDefined();
    expect(score.className).toContain("green");
  });

  it("calls onItemClick when row is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ReconciliationList {...defaultProps({ onItemClick: onClick })} />);

    const row = screen.getByText("26TKC-00200").closest("tr") as HTMLElement;
    await user.click(row);

    expect(onClick).toHaveBeenCalledWith(mockItems[0]);
  });

  it("renders upload dialog when uploadOpen is true", () => {
    render(
      <ReconciliationList
        {...defaultProps({
          onUpload: () => {},
          uploadOpen: true,
          onUploadOpenChange: () => {},
        })}
      />,
    );
    expect(screen.getByRole("heading", { name: "Upload Document" })).toBeDefined();
  });

  it("renders empty state when no items", () => {
    render(<ReconciliationList {...defaultProps({ items: [] })} />);
    expect(screen.getByText("No records found.")).toBeDefined();
  });

  it("renders custom empty state", () => {
    render(
      <ReconciliationList {...defaultProps({ items: [], emptyState: <p>Custom empty</p> })} />,
    );
    expect(screen.getByText("Custom empty")).toBeDefined();
  });

  describe("loading state", () => {
    it("shows skeleton rows when loading", () => {
      const { container } = render(<ReconciliationList {...defaultProps({ loading: true })} />);
      const pulsingElements = container.querySelectorAll("[class*='animate-pulse']");
      expect(pulsingElements.length).toBeGreaterThan(0);
    });

    it("does not show items when loading", () => {
      render(<ReconciliationList {...defaultProps({ loading: true })} />);
      expect(screen.queryByText("26TKC-00200")).toBeNull();
    });
  });

  describe("status tabs", () => {
    it("filters items when a status tab is clicked", async () => {
      const user = userEvent.setup();
      render(<ReconciliationList {...defaultProps()} />);

      await user.click(screen.getAllByText("Matched")[0]);

      expect(screen.getByText("26TKC-00200")).toBeDefined();
      expect(screen.queryByText("SS26-0522")).toBeNull();
      expect(screen.queryByText("DT26010026")).toBeNull();
    });

    it("falls back to All when active tab has no items", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<ReconciliationList {...defaultProps()} />);

      await user.click(screen.getAllByText("Matched")[0]);
      expect(screen.getByText("26TKC-00200")).toBeDefined();

      const noMatchedItems = mockItems.filter((i) => i.status !== "matched");
      rerender(<ReconciliationList {...defaultProps({ items: noMatchedItems })} />);
      expect(screen.getByText("SS26-0522")).toBeDefined();
      expect(screen.getByText("DT26010026")).toBeDefined();
    });
  });

  it("matches snapshot", () => {
    const { container } = render(<ReconciliationList {...defaultProps({ onUpload: () => {} })} />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});
