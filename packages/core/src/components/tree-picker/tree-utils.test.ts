import { describe, expect, it } from "vitest";

import {
  allLeaves,
  defaultMatcher,
  filterTree,
  flattenVisible,
  isLeaf,
  leafIds,
} from "./tree-utils";
import type { BulkItemPickerNode } from "./types";

type Item = { name: string };

const node = (id: string, name: string, children?: BulkItemPickerNode<Item>[]) =>
  ({ id, data: { name }, ...(children ? { children } : {}) }) as BulkItemPickerNode<Item>;

const TREE: BulkItemPickerNode<Item>[] = [
  node("p1", "Nike Vomero 18"),
  node("p2", "Adidas Ultraboost 22", [
    node("p2-a", "UK 8 / Black / Women"),
    node("p2-b", "UK 9 / Black / Men"),
    node("p2-c", "UK 10 / Black / Men", [node("p2-c-1", "UK 10 / Wide")]),
  ]),
  node("p3", "Hoka Bondi 8"),
];

const byName = (n: BulkItemPickerNode<Item>, q: string) =>
  n.data.name.toLowerCase().includes(q.toLowerCase());

describe("tree-utils", () => {
  describe("isLeaf", () => {
    it("treats a node with no children key as a leaf", () => {
      expect(isLeaf(node("a", "A"))).toBe(true);
    });

    it("treats an empty children array as a leaf", () => {
      expect(isLeaf({ id: "a", data: { name: "A" }, children: [] })).toBe(true);
    });

    it("treats a node with children as a branch", () => {
      expect(isLeaf(TREE[1]!)).toBe(false);
    });
  });

  describe("leafIds", () => {
    it("returns the node's own id for a leaf", () => {
      expect(leafIds(TREE[0]!)).toEqual(["p1"]);
    });

    it("collects nested leaf ids in DFS order and skips branch ids", () => {
      expect(leafIds(TREE[1]!)).toEqual(["p2-a", "p2-b", "p2-c-1"]);
    });
  });

  describe("allLeaves", () => {
    it("flattens the whole forest to leaves in DFS order", () => {
      expect(allLeaves(TREE).map((n) => n.id)).toEqual(["p1", "p2-a", "p2-b", "p2-c-1", "p3"]);
    });

    it("returns an empty list for an empty forest", () => {
      expect(allLeaves([])).toEqual([]);
    });
  });

  describe("filterTree", () => {
    it("keeps a matching leaf and drops the rest", () => {
      const { kept } = filterTree(TREE, (n) => byName(n, "hoka"));
      expect(kept.map((n) => n.id)).toEqual(["p3"]);
    });

    it("keeps ancestors of a match and prunes their non-matching children", () => {
      const { kept } = filterTree(TREE, (n) => byName(n, "UK 9"));
      expect(kept.map((n) => n.id)).toEqual(["p2"]);
      expect(kept[0]!.children?.map((n) => n.id)).toEqual(["p2-b"]);
    });

    it("auto-expands every ancestor on the path to a match", () => {
      const { autoExpand } = filterTree(TREE, (n) => byName(n, "wide"));
      expect([...autoExpand].toSorted()).toEqual(["p2", "p2-c"]);
    });

    it("keeps a matching parent's full child list when no descendant matches", () => {
      const { kept, autoExpand } = filterTree(TREE, (n) => byName(n, "adidas"));
      expect(kept.map((n) => n.id)).toEqual(["p2"]);
      expect(kept[0]!.children?.map((n) => n.id)).toEqual(["p2-a", "p2-b", "p2-c"]);
      // Nothing below matched, so the parent is not force-expanded.
      expect(autoExpand.size).toBe(0);
    });

    it("does not mutate the input forest", () => {
      const before = JSON.stringify(TREE);
      filterTree(TREE, (n) => byName(n, "UK 9"));
      expect(JSON.stringify(TREE)).toBe(before);
    });

    it("returns nothing when the query matches nothing", () => {
      const { kept, autoExpand } = filterTree(TREE, (n) => byName(n, "zzzz"));
      expect(kept).toEqual([]);
      expect(autoExpand.size).toBe(0);
    });
  });

  describe("defaultMatcher", () => {
    it("matches primitive payloads case-insensitively", () => {
      expect(defaultMatcher({ id: "a", data: "Nike Vomero" }, "vomero")).toBe(true);
      expect(defaultMatcher({ id: "a", data: "Nike Vomero" }, "adidas")).toBe(false);
    });

    it("treats a nullish payload as an empty string", () => {
      expect(defaultMatcher({ id: "a", data: null }, "x")).toBe(false);
    });

    it("stringifies object payloads (why consumers must override it)", () => {
      expect(defaultMatcher({ id: "a", data: { name: "Nike" } }, "nike")).toBe(false);
      expect(defaultMatcher({ id: "a", data: { name: "Nike" } }, "object")).toBe(true);
    });
  });

  describe("flattenVisible", () => {
    it("hides the children of a collapsed parent", () => {
      const rows = flattenVisible(TREE, () => false);
      expect(rows.map((r) => r.node.id)).toEqual(["p1", "p2", "p3"]);
    });

    it("includes the children of an expanded parent with depth and parent id", () => {
      const rows = flattenVisible(TREE, (id) => id === "p2");
      expect(rows.map((r) => r.node.id)).toEqual(["p1", "p2", "p2-a", "p2-b", "p2-c", "p3"]);
      expect(rows.map((r) => r.depth)).toEqual([0, 0, 1, 1, 1, 0]);
      expect(rows.find((r) => r.node.id === "p2-a")?.parentId).toBe("p2");
      expect(rows.find((r) => r.node.id === "p1")?.parentId).toBeNull();
    });

    it("flags leaf and expanded state per row", () => {
      const rows = flattenVisible(TREE, (id) => id === "p2" || id === "p2-c");
      const p2c = rows.find((r) => r.node.id === "p2-c")!;
      expect(p2c.leaf).toBe(false);
      expect(p2c.expanded).toBe(true);
      expect(rows.find((r) => r.node.id === "p2-c-1")?.leaf).toBe(true);
    });

    it("never reports a leaf as expanded", () => {
      const rows = flattenVisible(TREE, () => true);
      expect(rows.filter((r) => r.leaf).every((r) => r.expanded === false)).toBe(true);
    });
  });
});
