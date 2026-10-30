import { describe, expect, it } from "vitest";

import {
  allLeaves,
  buildTree,
  checkState,
  filterTree,
  flattenVisible,
  idsFromKeys,
  idsFromSelection,
  keysFromIds,
  leavesOf,
  pathId,
  selectionFromIds,
} from "./tree-model";

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
const byName = (q: string) => (node: { label: string }) =>
  node.label.toLowerCase().includes(q.toLowerCase());
const find = (path: string[]) => allLeaves(tree()).find((leaf) => leaf.id === pathId(path))!;

describe("tree-model", () => {
  describe("buildTree", () => {
    it("identifies nodes by path, so repeated keys under different parents stay distinct", () => {
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

  describe("checkState", () => {
    it("is checked when every enabled leaf is selected, ignoring disabled leaves", () => {
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
      const selected = new Set([pathId(["x", "x1"])]);
      expect(checkState(nodes[0]!, (leaf) => selected.has(leaf.id))).toEqual({
        checked: true,
        indeterminate: false,
      });
    });

    it("is indeterminate when some leaves are selected", () => {
      const selected = new Set([pathId(["p2", "a"])]);
      expect(checkState(tree()[1]!, (leaf) => selected.has(leaf.id))).toEqual({
        checked: false,
        indeterminate: true,
      });
    });
  });

  describe("keys shape", () => {
    it("selects every leaf with a listed key, wherever it sits", () => {
      const ids = idsFromKeys(allLeaves(tree()), ["a"]);
      expect([...ids]).toEqual([pathId(["p2", "a"]), pathId(["p3", "a"])]);
    });

    it("reports keys in tree order, once each, and keeps keys not in the tree", () => {
      const leaves = allLeaves(tree());
      const ids = new Set([pathId(["p3", "a"]), pathId(["p2", "a"]), pathId(["p1"])]);
      expect(keysFromIds(leaves, ids, ["gone"])).toEqual(["p1", "a", "gone"]);
    });
  });

  describe("exact shape", () => {
    it("selects exact leaves, and every leaf beneath a parent set to true", () => {
      const ids = idsFromSelection(tree(), { p2: { a: true, c: true }, p3: { nope: true } });
      expect([...ids]).toEqual([pathId(["p2", "a"]), pathId(["p2", "c", "wide"])]);
    });

    it("builds a nested selection listing every leaf explicitly", () => {
      const ids = new Set([find(["p2", "c", "wide"]).id, find(["p3", "a"]).id]);
      expect(selectionFromIds(tree(), ids, undefined)).toEqual({
        p2: { c: { wide: true } },
        p3: { a: true },
      });
    });

    it("keeps branches of the previous selection that aren't in the tree", () => {
      const ids = new Set([find(["p1"]).id]);
      expect(selectionFromIds(tree(), ids, { gone: true, p2: { missing: true } })).toEqual({
        p1: true,
        gone: true,
        p2: { missing: true },
      });
    });
  });
});
