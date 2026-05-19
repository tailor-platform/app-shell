import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

import { BulkItemPicker, type BulkItemPickerNode } from "./bulk-item-picker";

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

function Harness({
  initialOpen = true,
  onCommit = vi.fn(),
}: {
  initialOpen?: boolean;
  onCommit?: (items: BulkItemPickerNode<Item>[]) => void;
}) {
  const [open, setOpen] = React.useState(initialOpen);
  return (
    <BulkItemPicker<Item>
      open={open}
      onOpenChange={setOpen}
      title="Bulk picker"
      items={TREE}
      rowLabel="Product Name"
      metricLabel="Total available"
      renderRow={(node) => <span>{node.data.name}</span>}
      renderMetric={(node) => <span>{node.data.available}</span>}
      matchesSearch={(node, q) => node.data.name.toLowerCase().includes(q.toLowerCase())}
      onCommit={onCommit}
    />
  );
}

describe("BulkItemPicker", () => {
  it("commits selected leaves in tree order and closes", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    // Expand the parent so its variants are visible.
    await user.click(screen.getByRole("button", { name: /expand/i }));

    // Select two leaves out of three under the parent + one flat leaf.
    const checkboxes = screen.getAllByRole("checkbox");
    // Layout: [Nike, Adidas-parent, UK8/W, UK9/M, UK10/M, Hoka]
    await user.click(checkboxes[2]!); // UK 8 / Women
    await user.click(checkboxes[4]!); // UK 10 / Men
    await user.click(checkboxes[5]!); // Hoka

    const cta = screen.getByRole("button", { name: /add 3 items/i }) as HTMLButtonElement;
    expect(cta.disabled).toBe(false);
    await user.click(cta);

    expect(onCommit).toHaveBeenCalledTimes(1);
    const selected = onCommit.mock.calls[0]![0] as BulkItemPickerNode<Item>[];
    expect(selected.map((n) => n.id)).toEqual(["p2-uk8w", "p2-uk10m", "p3"]);
  });

  it("parent toggle selects/deselects all descendant leaves", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    const expandBtn = screen.getByRole("button", { name: /expand/i });
    await user.click(expandBtn);

    let checkboxes = screen.getAllByRole("checkbox");
    const parentCheckbox = checkboxes[1]!;
    await user.click(parentCheckbox);

    // After parent toggle, all 3 children are checked.
    checkboxes = screen.getAllByRole("checkbox");
    expect((checkboxes[2] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[3] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[4] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(true);

    await user.click(screen.getByRole("button", { name: /add 3 items/i }));
    const selected = onCommit.mock.calls[0]![0] as BulkItemPickerNode<Item>[];
    expect(selected.map((n) => n.id)).toEqual(["p2-uk8w", "p2-uk9m", "p2-uk10m"]);
  });

  it("partial child selection drives parent into indeterminate state", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /expand/i }));
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[2]!); // pick one variant

    const updated = screen.getAllByRole("checkbox");
    const parent = updated[1] as HTMLInputElement;
    expect(parent.indeterminate).toBe(true);
    expect(parent.checked).toBe(false);
  });

  it("search filters subtrees and auto-expands parents whose descendants match", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // Initially Adidas variants are NOT shown (not auto-expanded).
    expect(screen.queryByText("UK 9 / Black / Men")).toBeNull();

    const search = screen.getByLabelText("Search");
    await user.type(search, "UK 9");

    // Parent now visible (it's an ancestor of a match) and auto-expanded.
    expect(screen.getByText("Adidas Ultraboost 22")).toBeTruthy();
    expect(screen.getByText("UK 9 / Black / Men")).toBeTruthy();
    // Non-matching products are hidden.
    expect(screen.queryByText("Nike Vomero 18")).toBeNull();
    expect(screen.queryByText("Hoka One One Bondi 8")).toBeNull();
  });

  it("CTA is disabled with no selection and Cancel does not commit", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    const cta = screen.getByRole("button", { name: /add items/i }) as HTMLButtonElement;
    expect(cta.disabled).toBe(true);

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("renders the empty text when search has no matches", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText("Search"), "zzz no match");
    expect(screen.getByText(/no matching items/i)).toBeTruthy();
  });
});
