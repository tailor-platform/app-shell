import { StrictMode, type ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isColumnState, reconcileColumnOrder } from "./column-state";
import { useColumnLayout } from "./use-column-state";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
beforeEach(() => localStorage.clear());
const columns = [
  { id: "sku", pin: "left" as const },
  { id: "qty" },
  { id: "amount", pin: "right" as const },
];
const key = (id: string) => `as:line-items:v1:${id}`;
function Wrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}
function setup(tableId?: string) {
  return renderHook(
    (props: { tableId?: string }) =>
      useColumnLayout(columns, { ...props, namespace: "line-items" }),
    { initialProps: { tableId }, wrapper: Wrapper },
  );
}

describe("column layout preferences", () => {
  it("reconciles known keys and appends new definitions without duplicates", () => {
    expect(
      reconcileColumnOrder(["removed", "amount", "amount"], ["sku", "qty", "amount", "new"]),
    ).toEqual(["amount", "sku", "qty", "new"]);
  });
  it("does not read/write storage without an ID", () => {
    const read = vi.spyOn(window.localStorage, "getItem");
    const write = vi.spyOn(window.localStorage, "setItem");
    const { result } = setup();
    act(() => {
      result.current.moveColumn("qty", 0);
      result.current.setPin("amount", "none");
    });
    expect(result.current.columnOrder).toEqual(["qty", "sku", "amount"]);
    expect(result.current.pinnedColumns.amount).toBe("none");
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
  it("hydrates without writing and preserves the legacy DT namespace separately", () => {
    localStorage.setItem(
      key("orders"),
      JSON.stringify({ order: ["amount", "qty", "sku"], hidden: [], pinned: { amount: "none" } }),
    );
    localStorage.setItem(
      "as:data-table:v1:orders",
      JSON.stringify({ order: ["qty", "sku", "amount"], hidden: [], pinned: {} }),
    );
    const write = vi.spyOn(window.localStorage, "setItem");
    const li = setup("orders");
    const dt = renderHook(() =>
      useColumnLayout(columns, { tableId: "orders", namespace: "data-table" }),
    );
    expect(li.result.current.columnOrder).toEqual(["amount", "qty", "sku"]);
    expect(dt.result.current.columnOrder).toEqual(["qty", "sku", "amount"]);
    expect(write).not.toHaveBeenCalled();
  });
  it("composes sequential moves and pin changes before rendering, writing once per command", () => {
    const { result } = setup("orders");
    const write = vi.spyOn(window.localStorage, "setItem");
    act(() => {
      result.current.moveColumn("qty", 0);
      result.current.moveColumn("amount", 1);
      result.current.setPin("amount", "none");
    });
    expect(result.current.columnOrder).toEqual(["qty", "amount", "sku"]);
    expect(write).toHaveBeenCalledTimes(3);
    expect(JSON.parse(localStorage.getItem(key("orders"))!)).toEqual({
      order: ["qty", "amount", "sku"],
      hidden: [],
      pinned: { amount: "none" },
    });
  });
  it("null clears an override, none is explicit, and input arrays are copied", () => {
    const { result } = setup();
    const order = ["amount", "qty", "sku"];
    act(() => {
      result.current.setColumnOrder(order);
      result.current.setPin("amount", "none");
    });
    order.splice(0);
    expect(result.current.columnOrder).toEqual(["amount", "qty", "sku"]);
    act(() => result.current.setPin("amount", null));
    expect(result.current.pinnedColumns).not.toHaveProperty("amount");
  });
  it("retained commands follow the newly committed table ID", () => {
    const view = setup("first");
    const retained = view.result.current;
    view.rerender({ tableId: "second" });
    act(() => retained.setPin("amount", "left"));
    expect(localStorage.getItem(key("first"))).toBeNull();
    expect(JSON.parse(localStorage.getItem(key("second"))!).pinned.amount).toBe("left");
    view.rerender({ tableId: undefined });
    expect(view.result.current.columnOrder).toEqual(["sku", "qty", "amount"]);
    expect(view.result.current.pinnedColumns).toEqual({});
  });
  it("rejects corrupt storage members and remains usable if writes are blocked", () => {
    for (const corrupt of [
      { order: [1], hidden: [], pinned: {} },
      { order: [], hidden: [], pinned: { amount: "bad" } },
      { order: [], hidden: [null], pinned: {} },
    ])
      expect(isColumnState(corrupt)).toBe(false);
    localStorage.setItem(
      key("orders"),
      JSON.stringify({ order: [], hidden: [], pinned: { amount: "bad" } }),
    );
    const { result } = setup("orders");
    expect(result.current.columnOrder).toEqual(["sku", "qty", "amount"]);
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("Blocked");
    });
    act(() => result.current.setPin("amount", "left"));
    expect(result.current.pinnedColumns.amount).toBe("left");
  });
  it("does not write preferences through retained commands after unmount", () => {
    const view = setup("orders");
    const retained = view.result.current;
    view.unmount();
    const write = vi.spyOn(window.localStorage, "setItem");
    retained.setPin("amount", "left");
    retained.moveColumn("amount", 0);
    expect(write).not.toHaveBeenCalled();
  });

  it("handles special IDs as own properties, not prototype changes", () => {
    const view = renderHook(() =>
      useColumnLayout([{ id: "__proto__" }, { id: "constructor" }], { namespace: "line-items" }),
    );
    act(() => {
      view.result.current.setPin("__proto__", "right");
      view.result.current.setPin("constructor", "left");
    });
    expect(Object.hasOwn(view.result.current.pinnedColumns, "__proto__")).toBe(true);
    expect(view.result.current.pinnedColumns.constructor).toBe("left");
  });
});
