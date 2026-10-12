import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BulkItemPicker } from "./BulkItemPicker";
import type { BulkItemPickerNode } from "./types";

afterEach(() => {
  cleanup();
});

type Item = { name: string; available: number };

const TREE: BulkItemPickerNode<Item>[] = [
  { id: "p1", data: { name: "Nike Vomero 18", available: 3 } },
  {
    id: "p2",
    data: { name: "Adidas Ultraboost 22", available: 0 },
    children: [
      { id: "p2-uk8w", data: { name: "UK 8 / Black / Women", available: 9 } },
      { id: "p2-uk9m", data: { name: "UK 9 / Black / Men", available: 9 } },
      { id: "p2-uk10m", data: { name: "UK 10 / Black / Men", available: 9 } },
    ],
  },
  { id: "p3", data: { name: "Hoka One One Bondi 8", available: 15 } },
];

type HarnessProps = {
  initialOpen?: boolean;
  onCommit?: (items: BulkItemPickerNode<Item>[]) => void;
  ctaLabel?: (count: number) => string;
  filterSlot?: React.ReactNode;
  withMetric?: boolean;
  items?: BulkItemPickerNode<Item>[];
};

function Harness({
  initialOpen = true,
  onCommit = vi.fn(),
  ctaLabel,
  filterSlot,
  withMetric = true,
  items = TREE,
}: HarnessProps) {
  const [open, setOpen] = React.useState(initialOpen);
  return (
    <>
      <button onClick={() => setOpen(true)}>Reopen</button>
      <BulkItemPicker<Item>
        open={open}
        onOpenChange={setOpen}
        title="Bulk picker"
        items={items}
        rowLabel="Product Name"
        metricLabel={withMetric ? "Total available" : undefined}
        renderRow={(node) => <span>{node.data.name}</span>}
        renderMetric={withMetric ? (node) => <span>{node.data.available}</span> : undefined}
        matchesSearch={(node, q) => node.data.name.toLowerCase().includes(q.toLowerCase())}
        onCommit={onCommit}
        ctaLabel={ctaLabel}
        filterSlot={filterSlot}
      />
    </>
  );
}

/** Row (`treeitem`) for a given visible label. */
const rowFor = (label: string): HTMLElement => screen.getByText(label).closest("[role=treeitem]")!;

/** The checkbox drawn inside the row for a given visible label. */
const checkboxFor = (label: string): HTMLElement =>
  rowFor(label).querySelector("[role=checkbox]") as HTMLElement;

// Mouse-only (hidden from assistive tech, which uses the row), so found by its tooltip.
const expandButton = () => screen.getByTitle(/expand/i);

describe("BulkItemPicker", () => {
  // ==========================================================================
  // Snapshots
  // ==========================================================================

  describe("snapshots", () => {
    it("closed", () => {
      const { container } = render(<Harness initialOpen={false} />);
      expect(container.innerHTML).toMatchSnapshot();
    });

    it("open with collapsed tree", async () => {
      const { baseElement } = render(<Harness />);
      await waitFor(() => expect(screen.getByText("Nike Vomero 18")).toBeDefined());
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("open without the metric column", async () => {
      const { baseElement } = render(<Harness withMetric={false} />);
      await waitFor(() => expect(screen.getByText("Nike Vomero 18")).toBeDefined());
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("open with a filter slot", async () => {
      const { baseElement } = render(<Harness filterSlot={<button>Filters</button>} />);
      await waitFor(() => expect(screen.getByText("Filters")).toBeDefined());
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("expanded parent with a partial selection", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(<Harness />);
      await waitFor(() => expect(screen.getByText("Nike Vomero 18")).toBeDefined());
      await user.click(expandButton());
      await user.click(checkboxFor("UK 9 / Black / Men"));
      expect(baseElement.innerHTML).toMatchSnapshot();
    });

    it("empty state", async () => {
      const user = userEvent.setup();
      const { baseElement } = render(<Harness />);
      await user.type(screen.getByLabelText("Search items"), "zzz");
      await waitFor(() => expect(screen.getByText(/no matching items/i)).toBeDefined());
      expect(baseElement.innerHTML).toMatchSnapshot();
    });
  });

  // ==========================================================================
  // Selection + commit
  // ==========================================================================

  it("commits selected leaves in tree order and closes", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    await user.click(expandButton());
    await user.click(checkboxFor("UK 8 / Black / Women"));
    await user.click(checkboxFor("UK 10 / Black / Men"));
    await user.click(checkboxFor("Hoka One One Bondi 8"));

    const cta = screen.getByRole("button", { name: /add 3 items/i }) as HTMLButtonElement;
    expect(cta.disabled).toBe(false);
    await user.click(cta);

    expect(onCommit).toHaveBeenCalledTimes(1);
    const selected = onCommit.mock.calls[0]![0] as BulkItemPickerNode<Item>[];
    expect(selected.map((n) => n.id)).toEqual(["p2-uk8w", "p2-uk10m", "p3"]);
    await waitFor(() => expect(screen.queryByText("Nike Vomero 18")).toBeNull());
  });

  it("parent toggle selects every descendant leaf", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    await user.click(expandButton());
    await user.click(checkboxFor("Adidas Ultraboost 22"));

    for (const label of ["UK 8 / Black / Women", "UK 9 / Black / Men", "UK 10 / Black / Men"]) {
      expect(checkboxFor(label).getAttribute("aria-checked")).toBe("true");
    }
    expect(rowFor("Adidas Ultraboost 22").getAttribute("aria-checked")).toBe("true");

    await user.click(screen.getByRole("button", { name: /add 3 items/i }));
    const selected = onCommit.mock.calls[0]![0] as BulkItemPickerNode<Item>[];
    expect(selected.map((n) => n.id)).toEqual(["p2-uk8w", "p2-uk9m", "p2-uk10m"]);
  });

  it("parent toggle deselects every descendant leaf", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(expandButton());
    await user.click(checkboxFor("Adidas Ultraboost 22"));
    expect(screen.getByRole("button", { name: /add 3 items/i })).toBeDefined();

    await user.click(checkboxFor("Adidas Ultraboost 22"));
    expect((screen.getByRole("button", { name: /add items/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(checkboxFor("UK 8 / Black / Women").getAttribute("aria-checked")).toBe("false");
  });

  it("partial child selection drives the parent into the mixed state", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(expandButton());
    await user.click(checkboxFor("UK 8 / Black / Women"));

    expect(rowFor("Adidas Ultraboost 22").getAttribute("aria-checked")).toBe("mixed");
    expect(checkboxFor("Adidas Ultraboost 22").getAttribute("aria-checked")).toBe("mixed");
  });

  it("never stores parent ids in the selection — commit yields leaves only", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    await user.click(checkboxFor("Adidas Ultraboost 22"));
    await user.click(screen.getByRole("button", { name: /add 3 items/i }));

    const selected = onCommit.mock.calls[0]![0] as BulkItemPickerNode<Item>[];
    expect(selected.some((n) => n.id === "p2")).toBe(false);
    expect(selected.every((n) => n.children === undefined)).toBe(true);
  });

  it("disables the CTA with no selection and Cancel does not commit", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    const cta = screen.getByRole("button", { name: /add items/i }) as HTMLButtonElement;
    expect(cta.disabled).toBe(true);

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(onCommit).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Nike Vomero 18")).toBeNull());
  });

  it("supports a custom ctaLabel", async () => {
    const user = userEvent.setup();
    render(<Harness ctaLabel={(count) => `Import ${count}`} />);

    expect(screen.getByRole("button", { name: "Import 0" })).toBeDefined();
    await user.click(checkboxFor("Nike Vomero 18"));
    expect(screen.getByRole("button", { name: "Import 1" })).toBeDefined();
  });

  it("resets query, selection and expansion when reopened", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(expandButton());
    await user.click(checkboxFor("UK 8 / Black / Women"));
    await user.type(screen.getByLabelText("Search items"), "UK");

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => expect(screen.queryByLabelText("Search items")).toBeNull());

    await user.click(screen.getByRole("button", { name: "Reopen" }));
    await waitFor(() => expect(screen.getByText("Nike Vomero 18")).toBeDefined());

    expect((screen.getByLabelText("Search items") as HTMLInputElement).value).toBe("");
    expect((screen.getByRole("button", { name: /add items/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    // Collapsed again — the variants are not rendered.
    expect(screen.queryByText("UK 8 / Black / Women")).toBeNull();
  });

  // ==========================================================================
  // Search
  // ==========================================================================

  it("filters subtrees and auto-expands parents whose descendants match", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.queryByText("UK 9 / Black / Men")).toBeNull();

    await user.type(screen.getByLabelText("Search items"), "UK 9");

    expect(screen.getByText("Adidas Ultraboost 22")).toBeDefined();
    expect(screen.getByText("UK 9 / Black / Men")).toBeDefined();
    expect(screen.queryByText("Nike Vomero 18")).toBeNull();
    expect(screen.queryByText("Hoka One One Bondi 8")).toBeNull();
    // The pruned siblings are gone too.
    expect(screen.queryByText("UK 8 / Black / Women")).toBeNull();
  });

  it("keeps manual expansion after the query is cleared", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(expandButton());
    expect(screen.getByText("UK 9 / Black / Men")).toBeDefined();

    const search = screen.getByLabelText("Search items");
    await user.type(search, "Hoka");
    expect(screen.queryByText("UK 9 / Black / Men")).toBeNull();

    await user.clear(search);
    expect(screen.getByText("UK 9 / Black / Men")).toBeDefined();
  });

  it("renders the empty text when the query matches nothing", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Search items"), "zzz no match");
    expect(screen.getByText(/no matching items/i)).toBeDefined();
    expect(screen.queryByRole("tree")).toBeNull();
  });

  it("renders the empty text for an empty catalog", async () => {
    render(<Harness items={[]} />);
    await waitFor(() => expect(screen.getByText(/no matching items/i)).toBeDefined());
  });

  it("renders the filter slot next to the search input", async () => {
    render(<Harness filterSlot={<button>Filters</button>} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Filters" })).toBeDefined());
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  it("exposes a multiselectable tree labelled by the dialog title", async () => {
    render(<Harness />);
    const tree = await waitFor(() => screen.getByRole("tree"));

    expect(tree.getAttribute("aria-multiselectable")).toBe("true");
    const labelId = tree.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)?.textContent).toBe("Bulk picker");
  });

  it("marks rows as treeitems with aria-level and aria-expanded only on branches", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const parent = rowFor("Adidas Ultraboost 22");
    expect(parent.getAttribute("aria-level")).toBe("1");
    expect(parent.getAttribute("aria-expanded")).toBe("false");
    // Leaves must not advertise an expanded state.
    expect(rowFor("Nike Vomero 18").hasAttribute("aria-expanded")).toBe(false);

    await user.click(expandButton());
    expect(rowFor("Adidas Ultraboost 22").getAttribute("aria-expanded")).toBe("true");
    expect(rowFor("UK 9 / Black / Men").getAttribute("aria-level")).toBe("2");
  });

  it("keeps exactly one row in the tab order", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await waitFor(() => expect(screen.getAllByRole("treeitem")).toHaveLength(3));
    const tabStops = () =>
      screen.getAllByRole("treeitem").filter((row) => row.getAttribute("tabindex") === "0");

    expect(tabStops()).toHaveLength(1);
    expect(tabStops()[0]).toBe(rowFor("Nike Vomero 18"));

    rowFor("Hoka One One Bondi 8").focus();
    await waitFor(() => expect(tabStops()).toHaveLength(1));
    expect(tabStops()[0]).toBe(rowFor("Hoka One One Bondi 8"));

    // The checkbox inside a row is never its own tab stop.
    expect(checkboxFor("Hoka One One Bondi 8").getAttribute("tabindex")).toBe("-1");
    await user.click(checkboxFor("Nike Vomero 18"));
    await waitFor(() => expect(tabStops()).toHaveLength(1));
  });

  // ==========================================================================
  // Keyboard
  // ==========================================================================

  it("moves focus between visible rows with ArrowDown and ArrowUp", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await waitFor(() => expect(screen.getAllByRole("treeitem")).toHaveLength(3));
    rowFor("Nike Vomero 18").focus();

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(rowFor("Adidas Ultraboost 22"));

    // The collapsed parent's children are not visible, so they are skipped.
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(rowFor("Hoka One One Bondi 8"));

    // Already at the end — focus stays put.
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(rowFor("Hoka One One Bondi 8"));

    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(document.activeElement).toBe(rowFor("Nike Vomero 18"));
  });

  it("expands with ArrowRight and then steps into the first child", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await waitFor(() => expect(screen.getAllByRole("treeitem")).toHaveLength(3));
    rowFor("Adidas Ultraboost 22").focus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("UK 8 / Black / Women")).toBeDefined();
    expect(document.activeElement).toBe(rowFor("Adidas Ultraboost 22"));

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(rowFor("UK 8 / Black / Women"));

    // ArrowRight on a leaf is inert.
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(rowFor("UK 8 / Black / Women"));
  });

  it("steps out with ArrowLeft and then collapses the parent", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await waitFor(() => expect(screen.getAllByRole("treeitem")).toHaveLength(3));
    await user.click(expandButton());
    rowFor("UK 9 / Black / Men").focus();

    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(rowFor("Adidas Ultraboost 22"));

    await user.keyboard("{ArrowLeft}");
    expect(screen.queryByText("UK 9 / Black / Men")).toBeNull();
    expect(rowFor("Adidas Ultraboost 22").getAttribute("aria-expanded")).toBe("false");
  });

  it("jumps to the first and last visible rows with Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await waitFor(() => expect(screen.getAllByRole("treeitem")).toHaveLength(3));
    rowFor("Adidas Ultraboost 22").focus();

    await user.keyboard("{End}");
    expect(document.activeElement).toBe(rowFor("Hoka One One Bondi 8"));

    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(rowFor("Nike Vomero 18"));
  });

  it("toggles the focused row with Space without moving focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await waitFor(() => expect(screen.getAllByRole("treeitem")).toHaveLength(3));
    rowFor("Nike Vomero 18").focus();

    await user.keyboard(" ");
    expect(rowFor("Nike Vomero 18").getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(rowFor("Nike Vomero 18"));

    await user.keyboard(" ");
    expect(rowFor("Nike Vomero 18").getAttribute("aria-checked")).toBe("false");
  });

  it("cascades a Space toggle on a parent to all descendants", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await waitFor(() => expect(screen.getAllByRole("treeitem")).toHaveLength(3));
    rowFor("Adidas Ultraboost 22").focus();

    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: /add 3 items/i })).toBeDefined();
    expect(rowFor("Adidas Ultraboost 22").getAttribute("aria-checked")).toBe("true");
  });

  it("commits on Enter from a row but not while typing in the search box", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    await waitFor(() => expect(screen.getAllByRole("treeitem")).toHaveLength(3));
    await user.click(checkboxFor("Nike Vomero 18"));

    await user.click(screen.getByLabelText("Search items"));
    await user.keyboard("{Enter}");
    expect(onCommit).not.toHaveBeenCalled();

    rowFor("Nike Vomero 18").focus();
    await user.keyboard("{Enter}");
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect((onCommit.mock.calls[0]![0] as BulkItemPickerNode<Item>[]).map((n) => n.id)).toEqual([
      "p1",
    ]);
  });

  it("does not commit on Enter when nothing is selected", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    await waitFor(() => expect(screen.getAllByRole("treeitem")).toHaveLength(3));
    rowFor("Nike Vomero 18").focus();
    await user.keyboard("{Enter}");

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText("Nike Vomero 18")).toBeDefined();
  });
});
