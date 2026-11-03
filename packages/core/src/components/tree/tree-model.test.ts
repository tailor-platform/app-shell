import { describe, expect, it } from "vitest";

import {
  allLeaves,
  buildTree,
  checkState,
  filterTree,
  flattenVisible,
  indexTree,
  leavesOf,
  pathId,
  readValue,
  toggleChecked,
  writeValue,
  type CheckedState,
  type TreeNode,
} from "./tree-model";
import type { TreeSelectionPropagation, TreeValueStrategy } from "./types";

type Item = { key: string; name: string; children?: Item[]; disabled?: boolean };

const ITEMS: Item[] = [
  { key: "p1", name: "Nike Vomero 18" },
  {
    key: "p2",
    name: "Adidas Ultraboost 22",
    children: [
      { key: "a", name: "UK 8 / Black / Women" },
      { key: "b", name: "UK 9 / Black / Men" },
      { key: "c", name: "UK 10 / Black / Men", children: [{ key: "wide", name: "UK 10 / Wide" }] },
    ],
  },
  // Repeats the child key "a" under another parent.
  { key: "p3", name: "Hoka Bondi 8", children: [{ key: "a", name: "Bondi / Small" }] },
];

const mapItem = (item: Item) => ({
  key: item.key,
  label: item.name,
  children: item.children,
  disabled: item.disabled,
});

const tree = () => buildTree(ITEMS, mapItem);
const index = () => indexTree(tree());
const rowOf = (path: string[]) =>
  index().nodes.find((node) => node.id === pathId(path)) as TreeNode<Item>;
const valueOf = (
  state: CheckedState,
  propagation: TreeSelectionPropagation,
  strategy: TreeValueStrategy,
) => [
  ...writeValue(index(), state, propagation, strategy).map((node) => node.key),
  ...state.unknown,
];
const roundTrip = (
  value: string[],
  propagation: TreeSelectionPropagation,
  strategy: TreeValueStrategy,
) => valueOf(readValue(index(), value, propagation), propagation, strategy);

const byName = (q: string) => (node: { label: string }) =>
  node.label.toLowerCase().includes(q.toLowerCase());

describe("tree-model", () => {
  describe("buildTree", () => {
    it("gives every row its own id, even where keys repeat", () => {
      const leaves = allLeaves(tree());
      const withKeyA = leaves.filter((leaf) => leaf.key === "a");
      expect(withKeyA.map((leaf) => leaf.path)).toEqual([
        ["p2", "a"],
        ["p3", "a"],
      ]);
      expect(new Set(leaves.map((leaf) => leaf.id)).size).toBe(leaves.length);
    });

    it("records parents and leaf-ness, and treats empty children as a leaf", () => {
      const [, p2] = buildTree([...ITEMS, { key: "empty", name: "Empty", children: [] }], mapItem);
      expect(p2!.isLeaf).toBe(false);
      const wide = leavesOf(p2!).find((leaf) => leaf.key === "wide")!;
      expect(wide.parents.map((parent) => parent.key)).toEqual(["p2", "c"]);
      expect(buildTree([{ key: "empty", name: "Empty", children: [] }], mapItem)[0]!.isLeaf).toBe(
        true,
      );
    });

    it("cascades disabled downwards, and disables a parent whose leaves are all disabled", () => {
      const nodes = buildTree(
        [
          { key: "x", name: "X", disabled: true, children: [{ key: "x1", name: "X1" }] },
          { key: "y", name: "Y", children: [{ key: "y1", name: "Y1", disabled: true }] },
        ],
        mapItem,
      );
      expect(nodes[0]!.children[0]!.disabled).toBe(true);
      expect(nodes[1]!.disabled).toBe(true);
    });

    it("encodes paths unambiguously, even with separators in keys", () => {
      expect(pathId(["a/b", "c"])).not.toBe(pathId(["a", "b/c"]));
    });
  });

  describe("filterTree", () => {
    it("keeps matching leaves and their ancestors, and auto-expands those ancestors", () => {
      const { kept, autoExpand } = filterTree(tree(), byName("wide"));
      expect(kept.map((node) => node.key)).toEqual(["p2"]);
      expect(kept[0]!.children.map((node) => node.key)).toEqual(["c"]);
      expect([...autoExpand]).toEqual([pathId(["p2", "c"]), pathId(["p2"])]);
    });

    it("keeps a matching parent's full child list when no child matches", () => {
      const { kept } = filterTree(tree(), byName("hoka"));
      expect(kept[0]!.children.map((node) => node.key)).toEqual(["a"]);
    });
  });

  describe("flattenVisible", () => {
    it("lists only rows under expanded parents, with depth and parent", () => {
      const rows = flattenVisible(tree(), (id) => id === pathId(["p2"]));
      expect(rows.map((row) => [row.node.key, row.depth])).toEqual([
        ["p1", 0],
        ["p2", 0],
        ["a", 1],
        ["b", 1],
        ["c", 1],
        ["p3", 0],
      ]);
      expect(rows[2]!.parentId).toBe(pathId(["p2"]));
    });
  });

  describe('selectionPropagation "full"', () => {
    it("reads a leaf key wherever it appears, and a parent key as every leaf beneath it", () => {
      const { checked, unknown } = readValue(index(), ["a", "c", "gone"], "full");
      expect([...checked].sort()).toEqual(["a", "wide"]);
      expect(unknown).toEqual(["gone"]);
    });

    it("is checked when every enabled leaf is, ignoring disabled leaves", () => {
      const nodes = buildTree(
        [
          {
            key: "x",
            name: "X",
            children: [
              { key: "x1", name: "X1" },
              { key: "x2", name: "X2", disabled: true },
            ],
          },
        ],
        mapItem,
      );
      expect(checkState(nodes[0]!, new Set(["x1"]), "full")).toEqual({
        checked: true,
        indeterminate: false,
      });
    });

    it("is indeterminate when some leaves are checked", () => {
      expect(checkState(rowOf(["p2"]), new Set(["a"]), "full")).toEqual({
        checked: false,
        indeterminate: true,
      });
    });

    it("ticks every enabled leaf beneath a parent, and never the parent itself", () => {
      const nodes = indexTree(
        buildTree(
          [
            {
              key: "x",
              name: "X",
              children: [
                { key: "x1", name: "X1" },
                { key: "x2", name: "X2", disabled: true },
              ],
            },
          ],
          mapItem,
        ),
      ).nodes;
      expect([...toggleChecked(nodes[0]!, true, new Set(), "full")]).toEqual(["x1"]);
    });

    it('lists checked leaves in tree order, once each, with "leaves"', () => {
      const state = { checked: new Set(["wide", "a", "p1"]), unknown: ["gone"] };
      expect(valueOf(state, "full", "leaves")).toEqual(["p1", "a", "wide", "gone"]);
    });

    it('lists a fully checked parent in place of its leaves with "topmost"', () => {
      // p2 is partly checked, but its child c is complete, so c stands in for "wide".
      const state = { checked: new Set(["a", "wide"]), unknown: [] };
      expect(valueOf(state, "full", "topmost")).toEqual(["a", "c", "p3"]);
    });

    it('keeps a parent with an unchecked disabled leaf out of "topmost"', () => {
      const nodes = buildTree(
        [
          {
            key: "x",
            name: "X",
            children: [
              { key: "x1", name: "X1" },
              { key: "x2", name: "X2", disabled: true },
            ],
          },
        ],
        mapItem,
      );
      const state = { checked: new Set(["x1"]), unknown: [] };
      expect(writeValue(indexTree(nodes), state, "full", "topmost").map((n) => n.key)).toEqual([
        "x1",
      ]);
    });

    it('lists fully checked parents and every checked leaf with "all"', () => {
      const state = { checked: new Set(["a", "wide"]), unknown: [] };
      expect(valueOf(state, "full", "all")).toEqual(["a", "c", "wide", "p3"]);
    });

    it("round-trips every strategy", () => {
      expect(roundTrip(["a", "wide", "gone"], "full", "leaves")).toEqual(["a", "wide", "gone"]);
      expect(roundTrip(["a", "c", "p3", "gone"], "full", "topmost")).toEqual([
        "a",
        "c",
        "p3",
        "gone",
      ]);
      expect(roundTrip(["a", "c", "wide", "p3"], "full", "all")).toEqual(["a", "c", "wide", "p3"]);
    });
  });

  describe('selectionPropagation "down"', () => {
    it("ticks a parent and every enabled item beneath it", () => {
      const checked = toggleChecked(rowOf(["p2"]), true, new Set(), "down");
      expect(valueOf({ checked, unknown: [] }, "down", "all")).toEqual([
        "p2",
        "a",
        "b",
        "c",
        "wide",
      ]);
    });

    it("leaves a parent ticked when a child is unticked, and shows its own state", () => {
      const all = toggleChecked(rowOf(["p2"]), true, new Set(), "down");
      const checked = toggleChecked(rowOf(["p2", "b"]), false, all, "down");
      expect(checkState(rowOf(["p2"]), checked, "down")).toEqual({
        checked: true,
        indeterminate: false,
      });
      expect(checkState(rowOf(["p2", "b"]), checked, "down").checked).toBe(false);
    });

    it("reads a parent key as that parent alone, and round-trips", () => {
      expect([...readValue(index(), ["p2"], "down").checked]).toEqual(["p2"]);
      expect(roundTrip(["p2", "wide", "gone"], "down", "all")).toEqual(["p2", "wide", "gone"]);
    });
  });

  describe('selectionPropagation "none"', () => {
    it("ticks only the item itself, parents included", () => {
      const checked = toggleChecked(rowOf(["p2"]), true, new Set(), "none");
      expect([...checked]).toEqual(["p2"]);
      expect(checkState(rowOf(["p2", "a"]), checked, "none").checked).toBe(false);
    });

    it("never changes a disabled item", () => {
      const nodes = indexTree(buildTree([{ key: "x", name: "X", disabled: true }], mapItem)).nodes;
      const checked = new Set<string>();
      expect(toggleChecked(nodes[0]!, true, checked, "none")).toBe(checked);
    });
  });
});
