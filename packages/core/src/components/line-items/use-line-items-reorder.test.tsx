import type { DragEvent, KeyboardEvent, ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { useLineItems } from "./use-line-items";
import { useLineItemsReorder } from "./use-line-items-reorder";

type Row = { id?: string; name: string };
const handles = new Set<HTMLButtonElement>();
afterEach(() => {
  cleanup();
  handles.forEach((handle) => handle.remove());
  handles.clear();
  vi.restoreAllMocks();
});

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <AppShellConfigContext.Provider
      value={{ configurations: buildConfigurations({ modules: [], locale: "en" }) }}
    >
      {children}
    </AppShellConfigContext.Provider>
  );
}

function setup(initialOrderer?: boolean) {
  const hook = renderHook(
    ({ orderer }: { orderer?: boolean }) => {
      const value = useLineItems<Row>({
        columns: [{ accessorKey: "name" }],
        defaultLines: [
          { id: "A", name: "First" },
          { id: "B", name: "Second" },
          { id: "C", name: "Third" },
        ],
        orderer,
      });
      return { value, reorder: useLineItemsReorder(value) };
    },
    { initialProps: { orderer: initialOrderer }, wrapper: Wrapper },
  );
  return {
    ...hook,
    keys: () => hook.result.current.value.lines.map(hook.result.current.value.getLineKey),
  };
}

function mountedHandle() {
  const handle = document.createElement("button");
  handle.type = "button";
  document.body.append(handle);
  handles.add(handle);
  return handle;
}

function targetRow() {
  const row = document.createElement("tr");
  vi.spyOn(row, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 100, 400, 40));
  return row;
}

function dragEvent<T extends HTMLElement>(
  currentTarget: T,
  clientY = 0,
  relatedTarget: Node | null = null,
) {
  return {
    currentTarget,
    clientY,
    relatedTarget,
    dataTransfer: { effectAllowed: "", dropEffect: "", setData: vi.fn() },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as DragEvent<T>;
}

function keyEvent(currentTarget: HTMLButtonElement, key: string) {
  return {
    currentTarget,
    key,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent<HTMLButtonElement>;
}

it.each([
  { from: 0, target: 2, after: true, expected: ["B", "C", "A"] },
  { from: 2, target: 0, after: false, expected: ["C", "A", "B"] },
  { from: 0, target: 2, after: false, expected: ["B", "A", "C"] },
  { from: 2, target: 0, after: true, expected: ["A", "C", "B"] },
  { from: 2, target: 1, after: true, expected: ["A", "B", "C"] },
])(
  "inserts row $from at row $target (after: $after), including no-op gaps",
  ({ from, target, after, expected }) => {
    const { result, keys } = setup();
    const handle = mountedHandle();
    const start = dragEvent(handle);
    const drop = dragEvent(targetRow(), after ? 130 : 110);
    handle.focus();
    act(() => result.current.reorder.getHandleProps(from).onDragStart(start));
    expect(start.dataTransfer.effectAllowed).toBe("move");
    expect(start.dataTransfer.setData).toHaveBeenCalledWith("text/plain", "");
    expect(result.current.reorder.getRowProps(from)["data-dragging"]).toBe("");
    act(() => result.current.reorder.getRowProps(target).onDragOver(drop));
    expect(drop.dataTransfer.dropEffect).toBe("move");
    expect(result.current.reorder.getRowProps(target)["data-drop-position"]).toBe(
      after ? "after" : "before",
    );
    expect(keys()).toEqual(["A", "B", "C"]);
    act(() => result.current.reorder.getRowProps(target).onDrop(drop));
    expect(keys()).toEqual(expected);
    expect(result.current.value.isDirty).toBe(expected.join(",") !== "A,B,C");
    expect(document.activeElement).toBe(handle);
    expect(result.current.reorder.getRowProps(0)["data-dragging"]).toBeUndefined();
    expect(result.current.reorder.getRowProps(target)["data-drop-position"]).toBeUndefined();
  },
);

it("moves by arrow keys by default, retaining focus and dirty state without crossing boundaries", () => {
  const { result, keys } = setup();
  const handle = mountedHandle();
  const up = keyEvent(handle, "ArrowUp");
  const down = keyEvent(handle, "ArrowDown");
  expect(result.current.reorder.getHandleProps(0).draggable).toBe(true);
  act(() => result.current.reorder.getHandleProps(0).onKeyDown(up));
  expect(keys()).toEqual(["A", "B", "C"]);
  expect(result.current.value.isDirty).toBe(false);
  act(() => result.current.reorder.getHandleProps(0).onKeyDown(down));
  expect(keys()).toEqual(["B", "A", "C"]);
  expect(document.activeElement).toBe(handle);
  expect(result.current.value.isDirty).toBe(true);
  act(() => result.current.reorder.getHandleProps(1).onKeyDown(down));
  act(() => result.current.reorder.getHandleProps(2).onKeyDown(down));
  expect(keys()).toEqual(["B", "C", "A"]);
  expect(document.activeElement).toBe(handle);
  const enter = keyEvent(handle, "Enter");
  act(() => result.current.reorder.getHandleProps(2).onKeyDown(enter));
  expect(enter.preventDefault).not.toHaveBeenCalled();
  act(() => result.current.value.revert());
  expect(result.current.value.isDirty).toBe(false);
});

it("ignores foreign drops and clears the guide on table leave or cancelled dragging", () => {
  const first = setup();
  const second = setup();
  const handle = mountedHandle();
  const row = targetRow();
  const drop = dragEvent(row, 130);
  act(() => first.result.current.reorder.getRowProps(2).onDrop(drop));
  expect(drop.preventDefault).not.toHaveBeenCalled();
  act(() => first.result.current.reorder.getHandleProps(0).onDragStart(dragEvent(handle)));
  act(() => second.result.current.reorder.getRowProps(2).onDragOver(drop));
  act(() => second.result.current.reorder.getRowProps(2).onDrop(drop));
  expect(second.keys()).toEqual(["A", "B", "C"]);
  expect(second.result.current.reorder.getRowProps(2)["data-drop-position"]).toBeUndefined();
  act(() => first.result.current.reorder.getRowProps(2).onDragOver(drop));
  const body = document.createElement("tbody");
  body.append(row);
  act(() => first.result.current.reorder.bodyProps.onDragLeave(dragEvent(body, 0, row)));
  expect(first.result.current.reorder.getRowProps(2)["data-drop-position"]).toBe("after");
  act(() => first.result.current.reorder.bodyProps.onDragLeave(dragEvent(body)));
  expect(first.result.current.reorder.getRowProps(2)["data-drop-position"]).toBeUndefined();
  act(() => first.result.current.reorder.getHandleProps(0).onDragEnd());
  expect(first.result.current.reorder.getRowProps(0)["data-dragging"]).toBeUndefined();
  act(() => first.result.current.reorder.getRowProps(2).onDrop(drop));
  expect(first.keys()).toEqual(["A", "B", "C"]);
});

it("rejects disabled reordering and cancels an active drag across policy changes", () => {
  const { result, rerender, keys } = setup(false);
  const handle = mountedHandle();
  const start = dragEvent(handle);
  const drop = dragEvent(targetRow(), 130);
  expect(result.current.reorder.getHandleProps(0).draggable).toBe(false);
  expect(result.current.reorder.getHandleProps(0)["aria-disabled"]).toBe(true);
  act(() => result.current.reorder.getHandleProps(0).onDragStart(start));
  expect(start.preventDefault).toHaveBeenCalled();
  act(() => result.current.reorder.getHandleProps(0).onKeyDown(keyEvent(handle, "ArrowDown")));
  expect(keys()).toEqual(["A", "B", "C"]);
  rerender({ orderer: true });
  act(() => result.current.reorder.getHandleProps(0).onDragStart(dragEvent(handle)));
  act(() => result.current.reorder.getRowProps(2).onDragOver(drop));
  rerender({ orderer: false });
  rerender({ orderer: true });
  expect(result.current.reorder.getRowProps(0)["data-dragging"]).toBeUndefined();
  expect(result.current.reorder.getRowProps(2)["data-drop-position"]).toBeUndefined();
  act(() => result.current.reorder.getRowProps(2).onDrop(drop));
  expect(keys()).toEqual(["A", "B", "C"]);
});

it.each(["source row", "detached handle"])(
  "does not revive a cancelled drag after restoring a %s",
  (removed) => {
    const { result, keys } = setup();
    const handle = mountedHandle();
    act(() => result.current.reorder.getHandleProps(0).onDragStart(dragEvent(handle)));
    act(() => result.current.reorder.getRowProps(2).onDragOver(dragEvent(targetRow(), 130)));
    if (removed === "source row") {
      act(() => result.current.value.removeLine("A"));
    } else {
      handle.remove();
      act(() => result.current.value.updateField("B", "name", "Updated"));
      document.body.append(handle);
    }
    act(() => result.current.value.revert());
    expect(result.current.reorder.getRowProps(0)["data-dragging"]).toBeUndefined();
    expect(result.current.reorder.getRowProps(2)["data-drop-position"]).toBeUndefined();
    act(() => result.current.reorder.getRowProps(2).onDrop(dragEvent(targetRow(), 130)));
    expect(keys()).toEqual(["A", "B", "C"]);
    expect(result.current.value.isDirty).toBe(false);
  },
);
