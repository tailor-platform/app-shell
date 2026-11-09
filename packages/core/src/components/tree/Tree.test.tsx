import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Field } from "../field";
import { Form } from "../form";
import { Tree } from "./Tree";
import type { TreeMapItemContext } from "./types";

/** Warehouses with bins. Bin codes repeat across warehouses (A1 is in both). */
type Node = { id: string; name: string; bins?: Node[]; locked?: boolean };

const WAREHOUSES: Node[] = [
  {
    id: "wh-x",
    name: "Warehouse X",
    bins: [
      { id: "A1", name: "X · A1" },
      { id: "A2", name: "X · A2" },
    ],
  },
  { id: "wh-y", name: "Warehouse Y", bins: [{ id: "A1", name: "Y · A1" }] },
  { id: "loose", name: "Loose stock" },
];

const mapItem = (item: Node) => ({
  key: item.id,
  label: item.name,
  children: item.bins,
  disabled: item.locked,
});

/** Keys bins by warehouse, so the repeated `A1` codes stay distinct. */
const scopedMapItem = (item: Node, { parents }: TreeMapItemContext<Node>) => ({
  ...mapItem(item),
  key: parents.length > 0 ? `${parents.at(-1)!.id}/${item.id}` : item.id,
});

const rowFor = (label: string) => screen.getByText(label).closest("[role=treeitem]") as HTMLElement;
const checkedOf = (label: string) => rowFor(label).getAttribute("aria-checked");
const expand = async (user: ReturnType<typeof userEvent.setup>, label: string) =>
  user.click(screen.getByText(label));

afterEach(() => {
  cleanup();
});

describe("Tree", () => {
  it("renders inline, without a dialog, named by aria-label", () => {
    render(
      <Tree<Node>
        selectionMode="checkbox"
        items={WAREHOUSES}
        mapItem={mapItem}
        aria-label="Bins"
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("tree", { name: "Bins" })).toBeDefined();
  });

  it("shows each item's label by default, with no search box of its own", () => {
    render(
      <Tree<Node>
        selectionMode="checkbox"
        items={WAREHOUSES}
        mapItem={mapItem}
        aria-label="Bins"
      />,
    );

    expect(screen.getByText("Warehouse X")).toBeDefined();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("gives renderItem the row state", async () => {
    const user = userEvent.setup();
    render(
      <Tree<Node>
        selectionMode="checkbox"
        items={WAREHOUSES}
        mapItem={mapItem}
        aria-label="Bins"
        renderItem={({ item, depth, isLeaf, indeterminate }) => (
          <span>{`${item.name} (depth ${depth}${isLeaf ? ", leaf" : ""}${indeterminate ? ", some" : ""})`}</span>
        )}
      />,
    );

    await expand(user, "Warehouse X (depth 0)");
    await user.click(screen.getByText("X · A1 (depth 1, leaf)"));
    expect(screen.getByText("Warehouse X (depth 0, some)")).toBeDefined();
  });

  describe("filter", () => {
    it("shows matches and their ancestors, and opens the groups they're in", () => {
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          filter={(_, { label }) => label === "Y · A1"}
        />,
      );

      expect(rowFor("Warehouse Y").getAttribute("aria-expanded")).toBe("true");
      expect(screen.getByText("Y · A1")).toBeDefined();
      expect(screen.queryByText("Warehouse X")).toBeNull();
      expect(screen.queryByText("Loose stock")).toBeNull();
    });

    it("passes each item's label and parents to the filter", () => {
      const seen: Array<[string, string, string[]]> = [];
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          filter={(item, { label, parents }) => {
            seen.push([item.id, label, parents.map((parent) => parent.id)]);
            return true;
          }}
        />,
      );

      expect(seen).toContainEqual(["A1", "Y · A1", ["wh-y"]]);
    });

    it("keeps a group the user closed closed when an inline filter is recreated", async () => {
      const user = userEvent.setup();
      function Harness() {
        const [count, setCount] = React.useState(0);
        return (
          <>
            <button onClick={() => setCount(count + 1)}>Rerender {count}</button>
            <Tree<Node>
              selectionMode="checkbox"
              items={WAREHOUSES}
              mapItem={mapItem}
              aria-label="Bins"
              filter={(_, { label }) => label.endsWith("A1")}
            />
          </>
        );
      }
      render(<Harness />);

      await user.click(rowFor("Warehouse X").querySelector("button[title]") as HTMLElement);
      expect(rowFor("Warehouse X").getAttribute("aria-expanded")).toBe("false");
      await user.click(screen.getByRole("button", { name: /Rerender/ }));
      expect(rowFor("Warehouse X").getAttribute("aria-expanded")).toBe("false");
    });

    it('says "No matching items." while filtering, and "No items." otherwise', () => {
      const { rerender } = render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          filter={() => false}
        />,
      );
      expect(screen.getByText("No matching items.")).toBeDefined();
      rerender(
        <Tree<Node> selectionMode="checkbox" items={[]} mapItem={mapItem} aria-label="Bins" />,
      );
      expect(screen.getByText("No items.")).toBeDefined();
    });
  });

  describe('selectionMode "none" (default)', () => {
    it("draws no checkboxes and exposes no selection", () => {
      const { container } = render(
        <Tree<Node> items={WAREHOUSES} mapItem={mapItem} aria-label="Bins" />,
      );

      const tree = screen.getByRole("tree");
      expect(tree.getAttribute("aria-multiselectable")).toBeNull();
      expect(container.querySelector("[data-slot=tree-checkbox]")).toBeNull();
      expect(container.querySelector("input")).toBeNull();
      expect(rowFor("Loose stock").getAttribute("aria-checked")).toBeNull();
      expect(rowFor("Loose stock").getAttribute("aria-selected")).toBeNull();
    });

    it("runs onAction when a leaf is clicked, and opens a parent when it is", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(
        <Tree<Node> items={WAREHOUSES} mapItem={mapItem} aria-label="Bins" onAction={onAction} />,
      );

      await user.click(screen.getByText("Warehouse X"));
      expect(rowFor("Warehouse X").getAttribute("aria-expanded")).toBe("true");
      expect(onAction).not.toHaveBeenCalled();

      await user.click(screen.getByText("X · A2"));
      expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: "A2" }), "A2");
    });

    it("runs onAction for Enter on any row, parents included", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(
        <Tree<Node> items={WAREHOUSES} mapItem={mapItem} aria-label="Bins" onAction={onAction} />,
      );

      rowFor("Warehouse Y").focus();
      await user.keyboard(" ");
      await user.keyboard("{Enter}");
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: "wh-y" }), "wh-y");
    });

    it("indents a nested leaf past its parent's caret", async () => {
      const user = userEvent.setup();
      render(<Tree<Node> items={WAREHOUSES} mapItem={mapItem} aria-label="Bins" />);

      await user.click(screen.getByText("Warehouse X"));
      // One indent step plus the caret's space, against the parent's caret alone.
      const spacers = rowFor("X · A1").querySelectorAll(":scope > span[aria-hidden]");
      expect(spacers.length).toBe(2);
    });
  });

  describe('selectionMode "single"', () => {
    it("selects the clicked row, one at a time, parents included", async () => {
      const user = userEvent.setup();
      const onSelectedKeyChange = vi.fn();
      render(
        <Tree<Node>
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          selectionMode="single"
          onSelectedKeyChange={onSelectedKeyChange}
        />,
      );

      expect(rowFor("Loose stock").getAttribute("aria-selected")).toBe("false");
      await user.click(screen.getByText("Loose stock"));
      expect(rowFor("Loose stock").getAttribute("aria-selected")).toBe("true");
      expect(rowFor("Loose stock").hasAttribute("data-selected")).toBe(true);

      await user.click(screen.getByText("Warehouse X"));
      expect(rowFor("Warehouse X").getAttribute("aria-selected")).toBe("true");
      expect(rowFor("Loose stock").getAttribute("aria-selected")).toBe("false");
      expect(onSelectedKeyChange).toHaveBeenLastCalledWith(
        "wh-x",
        expect.objectContaining({ id: "wh-x" }),
      );
    });

    it("opens a closed parent when it is selected, and leaves closing to the caret", async () => {
      const user = userEvent.setup();
      render(
        <Tree<Node>
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          selectionMode="single"
        />,
      );

      await user.click(screen.getByText("Warehouse X"));
      expect(rowFor("Warehouse X").getAttribute("aria-expanded")).toBe("true");
      await user.click(screen.getByText("Warehouse X"));
      expect(rowFor("Warehouse X").getAttribute("aria-expanded")).toBe("true");
      await user.click(rowFor("Warehouse X").querySelector("button[title]") as HTMLElement);
      expect(rowFor("Warehouse X").getAttribute("aria-expanded")).toBe("false");
    });

    it("selects the focused row with Space", async () => {
      const user = userEvent.setup();
      render(
        <Tree<Node>
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          selectionMode="single"
        />,
      );

      rowFor("Warehouse Y").focus();
      await user.keyboard(" ");
      expect(rowFor("Warehouse Y").getAttribute("aria-selected")).toBe("true");
    });

    it("follows a controlled selectedKey", () => {
      const { rerender } = render(
        <Tree<Node>
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          selectionMode="single"
          selectedKey="loose"
        />,
      );
      expect(rowFor("Loose stock").getAttribute("aria-selected")).toBe("true");

      rerender(
        <Tree<Node>
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          selectionMode="single"
          selectedKey={null}
        />,
      );
      expect(rowFor("Loose stock").getAttribute("aria-selected")).toBe("false");
    });

    it("never selects a disabled row", async () => {
      const user = userEvent.setup();
      const onSelectedKeyChange = vi.fn();
      render(
        <Tree<Node>
          items={[{ id: "locked", name: "Locked", locked: true }]}
          mapItem={mapItem}
          aria-label="Bins"
          selectionMode="single"
          onSelectedKeyChange={onSelectedKeyChange}
        />,
      );

      await user.click(screen.getByText("Locked"));
      expect(onSelectedKeyChange).not.toHaveBeenCalled();
    });

    it("only takes value and form props in checkbox mode", () => {
      const base = { items: WAREHOUSES, mapItem, "aria-label": "Bins" };
      // @ts-expect-error `value` belongs to checkbox mode
      void (<Tree<Node> {...base} selectionMode="single" value={["A1"]} />);
      // @ts-expect-error `name` belongs to checkbox mode
      void (<Tree<Node> {...base} name="bins" />);
      // @ts-expect-error `selectedKey` belongs to single mode
      void (<Tree<Node> {...base} selectionMode="checkbox" selectedKey="A1" />);
    });
  });

  describe("review fixes", () => {
    const LOCKED_CHILDREN: Node[] = [
      {
        id: "p",
        name: "Parent",
        bins: [
          { id: "c1", name: "Child 1", locked: true },
          { id: "c2", name: "Child 2", locked: true },
        ],
      },
    ];

    it('locks a parent with no enabled leaves under "full", but not when parents are items', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const { rerender } = render(
        <Tree<Node>
          items={LOCKED_CHILDREN}
          mapItem={mapItem}
          aria-label="Bins"
          selectionMode="checkbox"
        />,
      );
      expect(rowFor("Parent").getAttribute("aria-disabled")).toBe("true");

      rerender(
        <Tree<Node>
          items={LOCKED_CHILDREN}
          mapItem={mapItem}
          aria-label="Bins"
          selectionMode="checkbox"
          selectionStrategy="cascade"
          onValueChange={onValueChange}
        />,
      );
      expect(rowFor("Parent").getAttribute("aria-disabled")).toBeNull();
      rowFor("Parent").focus();
      await user.keyboard(" ");
      // The disabled children are skipped, so only the parent ticks.
      expect(onValueChange).toHaveBeenLastCalledWith(["p"], expect.anything());
    });

    it("selects a parent with no enabled leaves in single mode", async () => {
      const user = userEvent.setup();
      const onSelectedKeyChange = vi.fn();
      render(
        <Tree<Node>
          items={LOCKED_CHILDREN}
          mapItem={mapItem}
          aria-label="Bins"
          selectionMode="single"
          onSelectedKeyChange={onSelectedKeyChange}
        />,
      );

      await user.click(screen.getByText("Parent"));
      expect(onSelectedKeyChange).toHaveBeenCalledWith("p", expect.anything());
    });

    it("never runs onAction or submits for Enter on a disabled row or tree", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      const { rerender } = render(
        <Tree<Node>
          items={[
            { id: "a", name: "Locked", locked: true },
            { id: "b", name: "Open" },
          ]}
          mapItem={mapItem}
          aria-label="Bins"
          onAction={onAction}
        />,
      );
      rowFor("Locked").focus();
      await user.keyboard("{Enter}");
      expect(onAction).not.toHaveBeenCalled();

      rerender(
        <Tree<Node>
          items={[{ id: "b", name: "Open" }]}
          mapItem={mapItem}
          aria-label="Bins"
          disabled
          onAction={onAction}
        />,
      );
      rowFor("Open").focus();
      await user.keyboard("{Enter}");
      expect(onAction).not.toHaveBeenCalled();

      cleanup();
      render(
        <form onSubmit={onSubmit}>
          <Tree<Node>
            items={[{ id: "b", name: "Open" }]}
            mapItem={mapItem}
            aria-label="Bins"
            selectionMode="checkbox"
            disabled
          />
        </form>,
      );
      rowFor("Open").focus();
      await user.keyboard("{Enter}");
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("reveals a hidden selected row and puts the tab stop on it", () => {
      render(
        <Tree<Node>
          items={WAREHOUSES}
          mapItem={scopedMapItem}
          aria-label="Bins"
          selectionMode="single"
          defaultSelectedKey="wh-y/A1"
        />,
      );

      expect(rowFor("Warehouse Y").getAttribute("aria-expanded")).toBe("true");
      expect(rowFor("Y · A1").getAttribute("aria-selected")).toBe("true");
      expect(rowFor("Y · A1").tabIndex).toBe(0);
      expect(rowFor("Warehouse X").tabIndex).toBe(-1);
    });

    it("with revealSelected false, keeps the tab stop on the nearest visible ancestor", () => {
      render(
        <Tree<Node>
          items={WAREHOUSES}
          mapItem={scopedMapItem}
          aria-label="Bins"
          selectionMode="single"
          defaultSelectedKey="wh-y/A1"
          revealSelected={false}
        />,
      );

      expect(rowFor("Warehouse Y").getAttribute("aria-expanded")).toBe("false");
      expect(rowFor("Warehouse Y").tabIndex).toBe(0);
    });

    it("leaves a group the user closed closed, and reveals again when selectedKey changes from outside", async () => {
      const user = userEvent.setup();
      const props = {
        items: WAREHOUSES,
        mapItem: scopedMapItem,
        "aria-label": "Bins",
        selectionMode: "single",
      } as const;
      const { rerender } = render(<Tree<Node> {...props} selectedKey="wh-y/A1" />);

      await user.click(rowFor("Warehouse Y").querySelector("button[title]") as HTMLElement);
      expect(rowFor("Warehouse Y").getAttribute("aria-expanded")).toBe("false");
      rerender(<Tree<Node> {...props} selectedKey="wh-y/A1" />);
      expect(rowFor("Warehouse Y").getAttribute("aria-expanded")).toBe("false");

      rerender(<Tree<Node> {...props} selectedKey="wh-x/A2" />);
      expect(rowFor("Warehouse X").getAttribute("aria-expanded")).toBe("true");
    });

    it("ticks only the visible matches of a filtered group, and shows the group as partly ticked", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Tree<Node>
          items={WAREHOUSES}
          mapItem={scopedMapItem}
          aria-label="Bins"
          selectionMode="checkbox"
          selectionStrategy="topmost"
          filter={(_, { label }) => label === "X · A1"}
          onValueChange={onValueChange}
        />,
      );

      rowFor("Warehouse X").focus();
      await user.keyboard(" ");
      expect(onValueChange).toHaveBeenLastCalledWith(["wh-x/A1"], expect.anything());
      expect(checkedOf("Warehouse X")).toBe("mixed");

      // Space again clears the visible matches rather than getting stuck.
      await user.keyboard(" ");
      expect(onValueChange).toHaveBeenLastCalledWith([], expect.anything());
    });

    it("warns about a key that is a parent in one place and a leaf in another", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      render(
        <Tree<Node>
          items={[
            { id: "x", name: "X", bins: [{ id: "a", name: "A" }] },
            { id: "g", name: "G", bins: [{ id: "x", name: "X as a leaf" }] },
          ]}
          mapItem={mapItem}
          aria-label="Bins"
        />,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"x"'));
      warn.mockRestore();
    });
  });

  describe("value", () => {
    it("selects a key wherever it appears, and reports keys plus the selected leaves", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          onValueChange={onValueChange}
        />,
      );

      await expand(user, "Warehouse X");
      await expand(user, "Warehouse Y");
      await user.click(screen.getByText("X · A1"));

      // A1 is one key, so both bins tick.
      expect(checkedOf("X · A1")).toBe("true");
      expect(checkedOf("Y · A1")).toBe("true");
      expect(onValueChange).toHaveBeenLastCalledWith(["A1"], {
        selected: [expect.objectContaining({ key: "A1", parents: [WAREHOUSES[0]] })],
      });
    });

    it("pre-fills from defaultValue and keeps keys that aren't in the tree", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          defaultValue={["loose", "not-loaded-yet"]}
          onValueChange={onValueChange}
        />,
      );

      expect(checkedOf("Loose stock")).toBe("true");
      await expand(user, "Warehouse X");
      await user.click(screen.getByText("X · A2"));

      expect(onValueChange).toHaveBeenLastCalledWith(
        ["A2", "loose", "not-loaded-yet"],
        expect.anything(),
      );
    });

    it("treats a controlled value reset to undefined as an empty selection", async () => {
      const user = userEvent.setup();
      function Resettable() {
        const [value, setValue] = React.useState<string[] | undefined>(undefined);
        return (
          <>
            <Tree<Node>
              selectionMode="checkbox"
              items={WAREHOUSES}
              mapItem={mapItem}
              aria-label="Bins"
              value={value}
              onValueChange={setValue}
            />
            <button onClick={() => setValue(undefined)}>Reset</button>
          </>
        );
      }
      render(<Resettable />);

      await user.click(screen.getByText("Loose stock"));
      expect(checkedOf("Loose stock")).toBe("true");
      await user.click(screen.getByRole("button", { name: "Reset" }));
      expect(checkedOf("Loose stock")).toBe("false");
    });

    it("follows a controlled value", async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [value, setValue] = React.useState<string[]>([]);
        return (
          <>
            <Tree<Node>
              selectionMode="checkbox"
              items={WAREHOUSES}
              mapItem={mapItem}
              aria-label="Bins"
              value={value}
              onValueChange={setValue}
            />
            <output>{value.join(",")}</output>
          </>
        );
      }
      render(<Controlled />);

      await user.click(screen.getByText("Loose stock"));
      expect(screen.getByRole("status").textContent).toBe("loose");
    });
  });

  describe("keys composed from parents", () => {
    it("passes each item's ancestors to mapItem", () => {
      const seen: Array<[string, string[]]> = [];
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WAREHOUSES}
          mapItem={(item, { parents }) => {
            seen.push([item.id, parents.map((parent) => parent.id)]);
            return mapItem(item);
          }}
          aria-label="Bins"
        />,
      );

      expect(seen).toEqual(
        expect.arrayContaining([
          ["wh-x", []],
          ["A1", ["wh-x"]],
          ["A1", ["wh-y"]],
        ]),
      );
    });

    it("keeps repeated codes separate when keys are composed from parents", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WAREHOUSES}
          mapItem={scopedMapItem}
          aria-label="Bins"
          onValueChange={onValueChange}
        />,
      );

      await expand(user, "Warehouse X");
      await expand(user, "Warehouse Y");
      await user.click(screen.getByText("X · A1"));

      expect(checkedOf("X · A1")).toBe("true");
      expect(checkedOf("Y · A1")).toBe("false");
      expect(onValueChange).toHaveBeenLastCalledWith(["wh-x/A1"], {
        selected: [
          expect.objectContaining({
            key: "wh-x/A1",
            parents: [expect.objectContaining({ id: "wh-x" })],
          }),
        ],
      });
    });
  });

  describe("selectionStrategy", () => {
    const tickBox = (user: ReturnType<typeof userEvent.setup>, label: string) =>
      user.click(rowFor(label).querySelector("[data-slot=tree-checkbox]") as HTMLElement);

    it('reports a fully ticked parent in place of its leaves with "topmost"', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WAREHOUSES}
          mapItem={scopedMapItem}
          aria-label="Bins"
          selectionStrategy="topmost"
          onValueChange={onValueChange}
        />,
      );

      await tickBox(user, "Warehouse X");
      expect(onValueChange).toHaveBeenLastCalledWith(["wh-x"], {
        selected: [expect.objectContaining({ key: "wh-x" })],
      });
    });

    it("reads a parent key in the value as every leaf beneath it", async () => {
      const user = userEvent.setup();
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WAREHOUSES}
          mapItem={scopedMapItem}
          aria-label="Bins"
          defaultValue={["wh-x"]}
        />,
      );

      await expand(user, "Warehouse X");
      expect(checkedOf("Warehouse X")).toBe("true");
      expect(checkedOf("X · A2")).toBe("true");
    });

    it('treats parents as items with "cascade"', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WAREHOUSES}
          mapItem={scopedMapItem}
          aria-label="Bins"
          selectionStrategy="cascade"
          onValueChange={onValueChange}
        />,
      );

      await tickBox(user, "Warehouse X");
      expect(onValueChange).toHaveBeenLastCalledWith(
        ["wh-x", "wh-x/A1", "wh-x/A2"],
        expect.anything(),
      );

      await expand(user, "Warehouse X");
      await user.click(screen.getByText("X · A1"));
      // The parent keeps its own state.
      expect(checkedOf("Warehouse X")).toBe("true");
      expect(onValueChange).toHaveBeenLastCalledWith(["wh-x", "wh-x/A2"], expect.anything());
    });

    it('ticks only the row itself with "independent", and never shows mixed', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WAREHOUSES}
          mapItem={scopedMapItem}
          aria-label="Bins"
          selectionStrategy="independent"
          onValueChange={onValueChange}
        />,
      );

      await expand(user, "Warehouse X");
      await user.click(screen.getByText("X · A1"));
      expect(checkedOf("Warehouse X")).toBe("false");
      await tickBox(user, "Warehouse X");
      expect(checkedOf("X · A2")).toBe("false");
      expect(onValueChange).toHaveBeenLastCalledWith(["wh-x", "wh-x/A1"], expect.anything());
    });

    it('ticks everything beneath a parent with "all", and lists the parent too', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WAREHOUSES}
          mapItem={scopedMapItem}
          aria-label="Bins"
          selectionStrategy="all"
          onValueChange={onValueChange}
        />,
      );

      await tickBox(user, "Warehouse X");
      expect(onValueChange).toHaveBeenLastCalledWith(
        ["wh-x", "wh-x/A1", "wh-x/A2"],
        expect.anything(),
      );
    });
  });

  describe("disabled items", () => {
    const WITH_LOCKED: Node[] = [
      {
        id: "wh-x",
        name: "Warehouse X",
        bins: [
          { id: "A1", name: "X · A1" },
          { id: "A2", name: "X · A2", locked: true },
        ],
      },
      { id: "wh-y", name: "Warehouse Y", locked: true, bins: [{ id: "B1", name: "Y · B1" }] },
    ];

    it("skips disabled leaves when a parent is ticked, and still shows the parent as checked", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WITH_LOCKED}
          mapItem={mapItem}
          aria-label="Bins"
          onValueChange={onValueChange}
        />,
      );

      await user.click(rowFor("Warehouse X").querySelector("[data-slot=tree-checkbox]")!);

      expect(onValueChange).toHaveBeenLastCalledWith(["A1"], expect.anything());
      expect(checkedOf("Warehouse X")).toBe("true");
    });

    it("cascades a disabled parent to its children and ignores clicks on them", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WITH_LOCKED}
          mapItem={mapItem}
          aria-label="Bins"
          onValueChange={onValueChange}
        />,
      );

      await expand(user, "Warehouse Y");
      expect(rowFor("Y · B1").getAttribute("aria-disabled")).toBe("true");
      await user.click(screen.getByText("Y · B1"));

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it("keeps an already-selected disabled leaf selected", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WITH_LOCKED}
          mapItem={mapItem}
          aria-label="Bins"
          defaultValue={["A1", "A2"]}
          onValueChange={onValueChange}
        />,
      );

      await user.click(rowFor("Warehouse X").querySelector("[data-slot=tree-checkbox]")!);
      expect(onValueChange).toHaveBeenLastCalledWith(["A2"], expect.anything());
    });
  });

  describe("onAction", () => {
    it("runs onAction for Enter on a row", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(
        <Tree<Node>
          selectionMode="checkbox"
          items={WAREHOUSES}
          mapItem={mapItem}
          aria-label="Bins"
          onAction={onAction}
        />,
      );

      rowFor("Loose stock").focus();
      await user.keyboard("{Enter}");
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it("submits the owning form on Enter when there's no onAction", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Tree<Node>
            selectionMode="checkbox"
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
          />
        </form>,
      );

      rowFor("Loose stock").focus();
      await user.keyboard("{Enter}");
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe("forms", () => {
    it("submits one hidden input per selected leaf under `name`", async () => {
      const user = userEvent.setup();
      render(
        <form data-testid="form">
          <Tree<Node>
            selectionMode="checkbox"
            items={WAREHOUSES}
            mapItem={scopedMapItem}
            aria-label="Bins"
            name="bins"
          />
        </form>,
      );

      await expand(user, "Warehouse X");
      await expand(user, "Warehouse Y");
      await user.click(screen.getByText("X · A1"));
      await user.click(screen.getByText("Y · A1"));

      const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
      expect(data.getAll("bins")).toEqual(["wh-x/A1", "wh-y/A1"]);
    });

    it("lets itemToStringValue decide what's submitted", async () => {
      const user = userEvent.setup();
      render(
        <form data-testid="form">
          <Tree<Node>
            selectionMode="checkbox"
            items={WAREHOUSES}
            mapItem={scopedMapItem}
            aria-label="Bins"
            name="bins"
            itemToStringValue={(bin, { parents }) => `${parents.at(-1)?.id ?? ""}:${bin.id}`}
          />
        </form>,
      );

      await expand(user, "Warehouse Y");
      await user.click(screen.getByText("Y · A1"));

      const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
      expect(data.getAll("bins")).toEqual(["wh-y:A1"]);
    });

    it("blocks submission while `required` and nothing is selected", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Tree<Node>
            selectionMode="checkbox"
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
            name="bins"
            required
          />
          <button type="submit">Save</button>
        </form>,
      );

      await user.click(screen.getByRole("button", { name: "Save" }));
      expect(onSubmit).not.toHaveBeenCalled();

      await user.click(screen.getByText("Loose stock"));
      await user.click(screen.getByRole("button", { name: "Save" }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("leaves a disabled tree out of submission and ignores clicks", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <form data-testid="form">
          <Tree<Node>
            selectionMode="checkbox"
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
            name="bins"
            defaultValue={["loose"]}
            onValueChange={onValueChange}
            disabled
          />
        </form>,
      );

      await user.click(screen.getByText("Warehouse X"));
      expect(onValueChange).not.toHaveBeenCalled();
      const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
      expect(data.getAll("bins")).toEqual([]);
    });

    it("takes its name, label and description from Field.Root", async () => {
      const user = userEvent.setup();
      render(
        <form data-testid="form">
          <Field.Root name="scope">
            <Field.Label>Bins to count</Field.Label>
            <Tree<Node>
              selectionMode="checkbox"
              items={WAREHOUSES}
              mapItem={mapItem}
              name="ignored"
            />
            <Field.Description>Pick at least one.</Field.Description>
          </Field.Root>
        </form>,
      );

      const tree = screen.getByRole("tree", { name: "Bins to count" });
      const describedBy = tree.getAttribute("aria-describedby") ?? "";
      expect(describedBy).not.toBe("");
      expect(document.getElementById(describedBy.split(" ")[0]!)?.textContent).toBe(
        "Pick at least one.",
      );

      await user.click(screen.getByText("Loose stock"));
      const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
      expect(data.getAll("scope")).toEqual(["loose"]);
      expect(data.getAll("ignored")).toEqual([]);
    });

    it("marks itself invalid inside an invalid Field.Root, and disabled from it", () => {
      render(
        <Field.Root name="scope" error={{ message: "Required" }} disabled>
          <Tree<Node>
            selectionMode="checkbox"
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
          />
        </Field.Root>,
      );

      const root = document.querySelector("[data-slot=tree]")!;
      expect(root.hasAttribute("data-invalid")).toBe(true);
      expect(root.hasAttribute("data-disabled")).toBe(true);
    });

    it("gives Base UI Form and Field validate the selection as an array", async () => {
      const user = userEvent.setup();
      const onFormSubmit = vi.fn();
      const validate = vi.fn(() => null);
      render(
        <Form onFormSubmit={onFormSubmit}>
          <Field.Root name="bins" validate={validate} validationMode="onChange">
            <Tree<Node>
              selectionMode="checkbox"
              items={WAREHOUSES}
              mapItem={mapItem}
              aria-label="Bins"
              defaultValue={["A2"]}
            />
          </Field.Root>
          <button type="submit">Save</button>
        </Form>,
      );

      await user.click(screen.getByText("Loose stock"));
      expect(validate).toHaveBeenLastCalledWith(["A2", "loose"], expect.anything());
      await user.click(screen.getByRole("button", { name: "Save" }));
      expect(onFormSubmit.mock.calls[0]![0]).toMatchObject({ bins: ["A2", "loose"] });
    });

    it("submits leaves that serialize to the same string, without key collisions", async () => {
      const user = userEvent.setup();
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      render(
        <form data-testid="form">
          <Tree<Node>
            selectionMode="checkbox"
            items={WAREHOUSES}
            mapItem={scopedMapItem}
            aria-label="Bins"
            name="bins"
            itemToStringValue={(bin) => bin.id}
          />
        </form>,
      );

      await expand(user, "Warehouse X");
      await expand(user, "Warehouse Y");
      await user.click(screen.getByText("X · A1"));
      await user.click(screen.getByText("Y · A1"));

      const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
      expect(data.getAll("bins")).toEqual(["A1", "A1"]);
      expect(consoleError).not.toHaveBeenCalledWith(
        expect.stringContaining("same key"),
        expect.anything(),
        expect.anything(),
      );
      consoleError.mockRestore();
    });

    it("submits keys for items that aren't loaded yet", () => {
      render(
        <form data-testid="form">
          <Tree<Node>
            selectionMode="checkbox"
            items={WAREHOUSES}
            mapItem={scopedMapItem}
            aria-label="Bins"
            name="bins"
            defaultValue={["wh-z/B1", "loose"]}
          />
        </form>,
      );

      const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
      expect(data.getAll("bins")).toEqual(["loose", "wh-z/B1"]);
    });

    it("marks the tree aria-invalid inside an invalid Field.Root", () => {
      render(
        <Field.Root name="scope" error={{ message: "Required" }}>
          <Tree<Node>
            selectionMode="checkbox"
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
          />
        </Field.Root>,
      );
      expect(screen.getByRole("tree").getAttribute("aria-invalid")).toBe("true");
    });

    it("reports a pre-filled selection to Field on mount", () => {
      render(
        <Field.Root name="scope">
          <Tree<Node>
            selectionMode="checkbox"
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
            defaultValue={["loose"]}
          />
        </Field.Root>,
      );
      const root =
        document.querySelector("[data-slot=field]") ?? document.querySelector("[data-filled]");
      expect(document.querySelector("[data-filled]")).not.toBeNull();
      expect(root).not.toBeNull();
    });

    it("fires onBlur once focus leaves the tree, not between rows", () => {
      const onBlur = vi.fn();
      render(
        <>
          <Tree<Node>
            selectionMode="checkbox"
            items={WAREHOUSES}
            mapItem={mapItem}
            aria-label="Bins"
            onBlur={onBlur}
          />
          <button>Outside</button>
        </>,
      );

      const first = rowFor("Warehouse X");
      const second = rowFor("Warehouse Y");
      fireEvent.blur(first, { relatedTarget: second });
      expect(onBlur).not.toHaveBeenCalled();
      fireEvent.blur(second, { relatedTarget: screen.getByRole("button", { name: "Outside" }) });
      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });
});
