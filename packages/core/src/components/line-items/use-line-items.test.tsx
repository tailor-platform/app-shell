import { StrictMode, type ReactNode } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { useLineItems } from "./use-line-items";
import type { LineItemsColumn, UseLineItemsOptions } from "./types";

afterEach(cleanup);
type Row = { id?: string | number; name: string };
const columns: LineItemsColumn<Row>[] = [{ accessorKey: "name", type: "text" }];
function Wrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

it("owns a shallow-frozen initial snapshot with stable server and client keys", () => {
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
  type Alternative = { code: number; name: string };
  const { result } = renderHook(() =>
    useLineItems<Alternative>({
      columns: [{ accessorKey: "name" }],
      defaultLines: [{ code: 42, name: "Line" }],
      idKey: "code",
    }),
  );
  expect(result.current.getLineKey(result.current.lines[0])).toBe("42");
});

it.each(["", Number.NaN, Number.POSITIVE_INFINITY, true, {}])(
  "rejects an invalid server identity %s",
  (id) => {
    expect(() =>
      renderHook(() => useLineItems({ columns, defaultLines: [{ id, name: "Invalid" }] as Row[] })),
    ).toThrow("Line IDs must be non-empty strings or finite numbers");
  },
);

it("rejects duplicate identities after string normalization", () => {
  expect(() =>
    renderHook(() =>
      useLineItems({
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

it("rejects cell editors instead of silently ignoring them", () => {
  const editable = { accessorKey: "name" as const, edit: { editorType: "text" } };
  expect(() => renderHook(() => useLineItems<Row>({ columns: [editable] }))).toThrow(
    "cell editors are not supported yet",
  );
});

it("rejects controlled rows instead of silently ignoring them", () => {
  const options = { columns, lines: [] };
  expect(() => renderHook(() => useLineItems(options))).toThrow(
    "use defaultLines, not controlled lines",
  );
});
