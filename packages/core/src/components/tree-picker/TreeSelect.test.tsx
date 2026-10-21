import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TreeSelect } from "./TreeSelect";
import type { TreePickerNode } from "./types";

type Item = { name: string };

const TREE: TreePickerNode<Item>[] = [
  { id: "w1", data: { name: "Tokyo warehouse" } },
  {
    id: "w2",
    data: { name: "Osaka warehouse" },
    children: [
      { id: "w2-a", data: { name: "Bin A" } },
      { id: "w2-b", data: { name: "Bin B" } },
    ],
  },
];

const shared = {
  items: TREE,
  renderRow: ({ node }: { node: TreePickerNode<Item> }) => <span>{node.data.name}</span>,
  matchesSearch: ({ node, query }: { node: TreePickerNode<Item>; query: string }) =>
    node.data.name.toLowerCase().includes(query.toLowerCase()),
};

const rowFor = (label: string) => screen.getByText(label).closest("[role=treeitem]") as HTMLElement;

afterEach(() => {
  cleanup();
});

describe("TreeSelect", () => {
  it("renders inline, without a dialog, named by aria-label", () => {
    render(<TreeSelect<Item> {...shared} aria-label="Warehouses" />);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("tree", { name: "Warehouses" })).toBeDefined();
  });

  it("is uncontrolled with defaultValue, reporting each change", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <TreeSelect<Item>
        {...shared}
        aria-label="Warehouses"
        defaultValue={["w1"]}
        onValueChange={onValueChange}
      />,
    );

    expect(rowFor("Tokyo warehouse").getAttribute("aria-checked")).toBe("true");
    await user.click(screen.getByText("Osaka warehouse"));
    await user.click(screen.getByText("Bin A"));

    expect(rowFor("Bin A").getAttribute("aria-checked")).toBe("true");
    expect(onValueChange).toHaveBeenLastCalledWith(
      ["w1", "w2-a"],
      [expect.objectContaining({ id: "w1" }), expect.objectContaining({ id: "w2-a" })],
    );
  });

  it("follows a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = React.useState<string[]>([]);
      return (
        <>
          <TreeSelect<Item>
            {...shared}
            aria-label="Warehouses"
            value={value}
            onValueChange={(ids) => setValue(ids)}
          />
          <output>{value.join(",")}</output>
        </>
      );
    }
    render(<Controlled />);

    await user.click(screen.getByText("Tokyo warehouse"));
    expect(screen.getByRole("status").textContent).toBe("w1");
  });

  it("calls onSubmit for Enter on a row", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TreeSelect<Item> {...shared} aria-label="Warehouses" onSubmit={onSubmit} />);

    rowFor("Tokyo warehouse").focus();
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
