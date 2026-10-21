import { describe, expect, it, vi } from "vitest";
import { createCellEditNavigation } from "./use-navigation";

function cell(isConnected = true) {
  return { focus: vi.fn(), isConnected } as unknown as HTMLElement & {
    focus: ReturnType<typeof vi.fn>;
  };
}

// A 3×3 grid where only some cells are editable:
//        a   b   c
//   r1   x   .   x
//   r2   .   .   x
//   r3   x   .   .
function setup() {
  const navigation = createCellEditNavigation();
  navigation.setOrder(["r1", "r2", "r3"], ["a", "b", "c"]);
  const cells = { r1a: cell(), r1c: cell(), r2c: cell(), r3a: cell() };
  navigation.register("r1", "a", cells.r1a);
  navigation.register("r1", "c", cells.r1c);
  navigation.register("r2", "c", cells.r2c);
  navigation.register("r3", "a", cells.r3a);
  return { navigation, cells };
}

describe("createCellEditNavigation", () => {
  it("moves next and prev in row-major order, skipping read-only cells", () => {
    const { navigation, cells } = setup();
    navigation.move({ rowKey: "r1", colKey: "a" }, "next");
    expect(cells.r1c.focus).toHaveBeenCalled();
    navigation.move({ rowKey: "r1", colKey: "c" }, "next");
    expect(cells.r2c.focus).toHaveBeenCalled();
    navigation.move({ rowKey: "r2", colKey: "c" }, "prev");
    expect(cells.r1c.focus).toHaveBeenCalledTimes(2);
  });

  it("returns false past the last and first editable cell", () => {
    const { navigation } = setup();
    expect(navigation.move({ rowKey: "r3", colKey: "a" }, "next")).toBe(false);
    expect(navigation.move({ rowKey: "r1", colKey: "a" }, "prev")).toBe(false);
  });

  it("stops navigating to a cell once it unregisters", () => {
    const { navigation, cells } = setup();
    const unregister = navigation.register("r2", "a", cell());
    unregister();
    navigation.move({ rowKey: "r1", colKey: "c" }, "next");
    expect(cells.r2c.focus).toHaveBeenCalled();
  });

  it("skips a cell that left the page without unregistering", () => {
    const { navigation, cells } = setup();
    const detached = cell(false);
    navigation.register("r2", "a", detached);
    navigation.move({ rowKey: "r1", colKey: "c" }, "next");
    expect(detached.focus).not.toHaveBeenCalled();
    expect(cells.r2c.focus).toHaveBeenCalled();
  });

  it("keeps a newer registration when a stale cleanup runs late", () => {
    const navigation = createCellEditNavigation();
    navigation.setOrder(["r1", "r2"], ["a"]);
    const first = cell();
    const second = cell();
    navigation.register("r1", "a", cell());
    const staleCleanup = navigation.register("r2", "a", first);
    navigation.register("r2", "a", second);
    staleCleanup();
    expect(navigation.move({ rowKey: "r1", colKey: "a" }, "next")).toBe(true);
    expect(second.focus).toHaveBeenCalled();
    expect(first.focus).not.toHaveBeenCalled();
  });
});
