import { StrictMode, Suspense, type ReactNode } from "react";
import { afterEach, expect, it } from "vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { useLineItems } from "./use-line-items";
import type { LineItemsColumn } from "./document";
import type { UseLineItemsOptions, UseLineItemsReturn } from "./types";

afterEach(cleanup);
type Row = { id?: string | number; name: string };
const columns: LineItemsColumn<Row>[] = [{ accessorKey: "name", type: "text" }];
function Wrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

it("owns a shallow-frozen initial snapshot with stable line keys", () => {
  const input: Row[] = [{ id: 1, name: "Existing" }, { name: "New" }, { name: "New" }];
  const { result, rerender } = renderHook(
    (props: UseLineItemsOptions<Row>) => useLineItems(props),
    { initialProps: { columns, defaultLines: input }, wrapper: Wrapper },
  );
  const initial = result.current;
  const keys = initial.lines.map(initial.getLineKey);
  expect(keys[0]).toBe("1");
  expect(new Set(keys).size).toBe(3);
  expect(Object.isFrozen(initial.lines)).toBe(true);
  expect(initial.lines.every(Object.isFrozen)).toBe(true);
  expect(initial.lines[0]).not.toBe(input[0]);
  input[0].name = "Mutated input";
  rerender({ columns, defaultLines: [{ name: "Replacement" }] });
  expect(result.current.lines).toBe(initial.lines);
  expect(result.current.lines[0].name).toBe("Existing");
  expect(result.current.lines.map(result.current.getLineKey)).toEqual(keys);
  expect(() => result.current.getLineKey(input[0])).toThrow("does not belong");
});

it("supports an alternative identity property", () => {
  type Alternative = { code?: number; name: string };
  const { result } = renderHook(() =>
    useLineItems<Alternative>({
      columns: [{ accessorKey: "name" }],
      defaultLines: [{ code: 42, name: "Line" }],
      idKey: "code",
    }),
  );
  expect(result.current.getLineKey(result.current.lines[0])).toBe("42");
  act(() => result.current.addLine({ name: "New" }));
  expect(result.current.lines[1].code).toBeUndefined();
  expect(result.current.getLineKey(result.current.lines[1])).toMatch(/^line:/);
});

it.each(["", Number.NaN, Number.POSITIVE_INFINITY, true, {}])(
  "rejects an invalid persisted ID %s",
  (id) => {
    expect(() =>
      renderHook(() => useLineItems({ columns, defaultLines: [{ id, name: "Invalid" }] as Row[] })),
    ).toThrow("Line IDs must be non-empty strings or finite numbers");
  },
);

it("rejects duplicate identities after string normalization", () => {
  expect(() =>
    renderHook(() =>
      useLineItems<Row>({
        columns,
        defaultLines: [
          { id: 1, name: "One" },
          { id: "1", name: "Another" },
        ],
      }),
    ),
  ).toThrow("Line IDs must be unique");
});

it("rejects duplicate and empty column identities", () => {
  expect(() => renderHook(() => useLineItems({ columns: [columns[0], columns[0]] }))).toThrow(
    "column IDs must be non-empty and unique",
  );
  expect(() =>
    renderHook(() => useLineItems<Row>({ columns: [{ id: "", render: () => null }] })),
  ).toThrow("column IDs must be non-empty and unique");
});

it.each(["custom", "constructor", "__proto__", { toString: () => "text" }, Object("number")])(
  "rejects unsupported editor %s instead of silently ignoring it",
  (editorType) => {
    const unsupported = [{ accessorKey: "name", edit: { editorType } }];
    expect(() =>
      renderHook(() =>
        useLineItems({ columns: unsupported } as unknown as UseLineItemsOptions<Row>),
      ),
    ).toThrow("Unsupported LineItems editor type");
  },
);

it.each([
  { options: undefined },
  { options: null },
  { options: {} },
  { options: () => [] },
  { options: [null] },
  { options: [{ value: 1, label: "One" }] },
  { options: [{ value: "one", label: 1 }] },
])("rejects malformed combobox options $options", ({ options }) => {
  const invalid = [{ accessorKey: "name", edit: { editorType: "combobox", options } }];
  expect(() =>
    renderHook(() => useLineItems({ columns: invalid } as unknown as UseLineItemsOptions<Row>)),
  ).toThrow("Combobox editors require fixed string options");
});

it("reflects sequential commands and dirty state under StrictMode", () => {
  const { result } = renderHook(
    () => useLineItems<Row>({ columns, defaultLines: [{ id: "A", name: "Existing" }] }),
    { wrapper: Wrapper },
  );
  const commands = result.current;
  expect(result.current.isDirty).toBe(false);
  let key = "";
  act(() => {
    commands.updateField("A", "name", "Changed");
    key = commands.addLine({ name: "Added" });
    commands.updateField(key, "name", "Updated creation");
  });
  expect(result.current.lines.map((row) => row.name)).toEqual(["Changed", "Updated creation"]);
  expect(result.current.isDirty).toBe(true);
  act(() => {
    commands.removeLine(key);
    commands.revert();
  });
  expect(result.current.lines.map((row) => row.name)).toEqual(["Existing"]);
  expect(result.current.isDirty).toBe(false);
});

it("discards ID-less initial rows without accepting replacement defaultLines", () => {
  const initialProps: UseLineItemsOptions<Row> = { columns, defaultLines: [{ name: "Unsaved" }] };
  const { result, rerender } = renderHook(
    (options: UseLineItemsOptions<Row>) => useLineItems(options),
    { initialProps, wrapper: Wrapper },
  );
  expect(result.current.isDirty).toBe(true);
  act(() => result.current.revert());
  rerender({ columns, defaultLines: [{ id: "B", name: "Replacement" }] });
  expect(result.current.lines).toEqual([]);
  expect(result.current.isDirty).toBe(false);
});

it("requires remounting to change idKey or document property ownership", () => {
  const initialProps: UseLineItemsOptions<Row & { code?: number }> = {
    columns,
    defaultLines: [{ id: "A", name: "Existing" }],
  };
  const first = renderHook(
    (options: UseLineItemsOptions<Row & { code?: number }>) => useLineItems(options),
    { initialProps },
  );
  expect(() => first.rerender({ columns, idKey: "code" })).toThrow(
    "Remount LineItems to change idKey",
  );
  const second = renderHook((options: UseLineItemsOptions<Row>) => useLineItems(options), {
    initialProps: { columns },
  });
  expect(() => second.rerender({ columns: [] })).toThrow("change document property ownership");
});

it("defaults to manual ordering and applies boolean changes to retained commands", () => {
  const initialProps: UseLineItemsOptions<Row> = {
    columns,
    defaultLines: [
      { id: "A", name: "First" },
      { id: "B", name: "Second" },
    ],
  };
  const { result, rerender } = renderHook(
    (options: UseLineItemsOptions<Row>) => useLineItems(options),
    { initialProps, wrapper: Wrapper },
  );
  const reorder = result.current.reorderLine;
  expect(result.current.orderer).toBe(true);
  act(() => reorder("A", "B"));
  expect(result.current.lines.map(result.current.getLineKey)).toEqual(["B", "A"]);
  expect(result.current.isDirty).toBe(true);
  rerender({ ...initialProps, orderer: false });
  const moved = result.current.lines;
  expect(result.current.orderer).toBe(false);
  expect(() => reorder("A", null)).toThrow("Manual reordering is disabled");
  expect(result.current.lines).toBe(moved);
  expect(result.current.isDirty).toBe(true);
  act(() => {
    result.current.updateField("B", "name", "Updated");
    const key = result.current.addLine({ name: "Added" });
    result.current.removeLine(key);
  });
  expect(result.current.lines[0].name).toBe("Updated");
  act(() => result.current.revert());
  expect(result.current.lines.map(result.current.getLineKey)).toEqual(["A", "B"]);
  expect(result.current.isDirty).toBe(false);
  rerender({ ...initialProps, orderer: true });
  act(() => reorder("B", null));
  expect(result.current.lines.map(result.current.getLineKey)).toEqual(["B", "A"]);
});

it("does not adopt an orderer policy from a suspended render", () => {
  const pending = new Promise<never>(() => {});
  let value!: UseLineItemsReturn<Row>;
  function Owner({ orderer, suspend }: { orderer: boolean; suspend: boolean }) {
    value = useLineItems<Row>({
      columns,
      defaultLines: [
        { id: "A", name: "First" },
        { id: "B", name: "Second" },
      ],
      orderer,
    });
    if (suspend) throw pending;
    return null;
  }
  const { rerender } = render(
    <Suspense fallback={null}>
      <Owner orderer={true} suspend={false} />
    </Suspense>,
  );
  const reorder = value.reorderLine;
  rerender(
    <Suspense fallback={null}>
      <Owner orderer={false} suspend={true} />
    </Suspense>,
  );
  act(() => reorder("B", null));
  rerender(
    <Suspense fallback={null}>
      <Owner orderer={false} suspend={false} />
    </Suspense>,
  );
  expect(value.lines.map(value.getLineKey)).toEqual(["B", "A"]);
  expect(() => reorder("A", null)).toThrow("Manual reordering is disabled");
});

it("rejects non-boolean orderer configuration", () => {
  const options: UseLineItemsOptions<Row> = { columns };
  Object.assign(options, { orderer: "manual" });
  expect(() => renderHook(() => useLineItems(options))).toThrow("orderer must be a boolean");
});

it("rejects controlled rows instead of silently ignoring them", () => {
  const options = { columns, lines: [] };
  expect(() => renderHook(() => useLineItems(options))).toThrow(
    "use defaultLines, not controlled lines",
  );
});
