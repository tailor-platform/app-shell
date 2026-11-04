import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CellEditError } from "@/components/internals/table-core/cell-edit-error";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { LineItems } from "./line-items";
import { createLineItemHelper } from "./column-helper";
import { useLineItems } from "./use-line-items";
import type {
  LineItemsChangeSet,
  LineItemsColumn,
  LineItemsMode,
  UseLineItemsReturn,
  UseLineItemsOptions,
} from "./types";

afterEach(cleanup);
type Row = { id?: string; quantity: number | null; name: string | null };
const { column } = createLineItemHelper<Row>();
const columns = [
  column({
    accessorKey: "name",
    label: "Name",
    type: "text",
    edit: { editorType: "text" },
    width: "flex",
  }),
  column({
    accessorKey: "quantity",
    label: "Quantity",
    type: "number",
    edit: { editorType: "number" },
    footer: ({ rows }) => rows.reduce((sum, row) => sum + (row.quantity ?? 0), 0),
  }),
];
let current: UseLineItemsReturn<Row>;
const validateQuantity: NonNullable<UseLineItemsOptions<Row>["validate"]> = (
  lines,
  { getLineKey },
) =>
  lines
    .filter((line) => line.quantity === null || line.quantity <= 0)
    .map((line) => ({
      scope: "cell",
      lineKey: getLineKey(line),
      columnId: "quantity",
      message: "Positive quantity required",
    }));

function Harness({
  mode = "edit",
  schema = columns,
  validate = validateQuantity,
}: {
  mode?: LineItemsMode;
  schema?: readonly LineItemsColumn<Row>[];
  validate?: UseLineItemsOptions<Row>["validate"];
}) {
  const value = useLineItems<Row>({
    columns: schema,
    validate,
    defaultLines: [{ id: "A", quantity: 1, name: "One" }],
    mode,
  });
  current = value;
  const [saved, setSaved] = useState<LineItemsChangeSet<Row> | null>(null);
  const [blocked, setBlocked] = useState(false);
  return (
    <>
      <LineItems.Root value={value}>
        <LineItems.Table aria-label="Document lines" />
      </LineItems.Root>
      <button
        onClick={() => {
          void value.commitEdits().then((sent) => {
            setSaved(sent);
            setBlocked(sent === null);
          });
        }}
      >
        Save
      </button>
      <button onClick={() => value.revert()}>Discard</button>
      <output data-testid="changes">{JSON.stringify(value.getChangeSet())}</output>
      <output data-testid="saved">{JSON.stringify(saved)}</output>
      {blocked && <p>Save blocked</p>}
    </>
  );
}
function changes() {
  return JSON.parse(screen.getByTestId("changes").textContent!);
}
function edit(label: string, value: string) {
  const input = screen.getByRole("textbox", { name: label });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  return input;
}

describe("LineItems public composition", () => {
  it("uses onValueCommitted to reject adoption, display a safe message, and retain the correctable draft", () => {
    const check = vi.fn((_row: Readonly<Row>, value: number | null) => {
      if (value === 0) throw new CellEditError("Enter a positive quantity.");
    });
    const schema = [
      columns[0]!,
      column({
        accessorKey: "quantity",
        label: "Quantity",
        edit: {
          editorType: "number",
          onValueCommitted: check,
        },
      }),
    ];
    render(<Harness schema={schema} />, { wrapper: createAppShellWrapper("en") });
    const input = edit("Quantity, line 1", "0") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Enter" });
    expect(check).toHaveBeenCalledWith(current.allLines[0], 0);
    expect(current.allLines[0]!.quantity).toBe(1);
    expect(input.value).toBe("0");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getAllByText("Enter a positive quantity.").length).toBeGreaterThan(0);
    expect(current.errors).toHaveLength(0);
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(current.allLines[0]!.quantity).toBe(3);
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("does not leak unexpected callback error messages through the standard cell UI", () => {
    const schema = [
      columns[0]!,
      column({
        accessorKey: "quantity",
        label: "Quantity",
        edit: {
          editorType: "number",
          onValueCommitted: () => {
            throw new Error("Private backend details");
          },
        },
      }),
    ];
    render(<Harness schema={schema} />, { wrapper: createAppShellWrapper("en") });
    const input = edit("Quantity, line 1", "3");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByText("Private backend details")).toBeNull();
    expect(current.allLines[0]!.quantity).toBe(1);
  });

  it("does not adopt an async cell result after Discard through the mounted editor", async () => {
    let resolve!: () => void;
    const request = new Promise<void>((success) => {
      resolve = success;
    });
    const check = vi.fn(() => request);
    const schema = [
      columns[0]!,
      column({
        accessorKey: "quantity",
        label: "Quantity",
        edit: {
          editorType: "number",
          onValueCommitted: check,
        },
      }),
    ];
    render(<Harness schema={schema} />, { wrapper: createAppShellWrapper("en") });
    const input = edit("Quantity, line 1", "9");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(current.allLines[0]!.quantity).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    await act(async () => {
      resolve();
      await request;
    });
    expect(check).toHaveBeenCalledTimes(1);
    expect(current.allLines[0]!.quantity).toBe(1);
    expect(current.hasUnsavedChanges()).toBe(false);
  });

  it("renders real columns/footer and holds raw input until confirmation", async () => {
    render(<Harness />, { wrapper: createAppShellWrapper("en") });
    expect(screen.getByRole("table", { name: "Document lines" })).toBeDefined();
    const input = edit("Quantity, line 1", "12");
    expect(changes().isEmpty).toBe(true);
    expect(current.hasUnsavedChanges()).toBe(true);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(changes().lineChanges).toEqual([
      { action: "update", lineId: "A", patch: { quantity: 12 } },
    ]);
    expect(screen.getAllByRole("cell").some((cell) => cell.textContent === "12")).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(
        JSON.parse(screen.getByTestId("saved").textContent!).lineChanges[0].patch.quantity,
      ).toBe(12),
    );
  });

  it("commitEdits confirms a focused editor without relying on blur", async () => {
    render(<Harness />, { wrapper: createAppShellWrapper("en") });
    edit("Name, line 1", "Changed");
    expect(changes().isEmpty).toBe(true);
    let sent: LineItemsChangeSet<Row> | null = null;
    await act(async () => {
      sent = await current.commitEdits();
    });
    expect(sent).toMatchObject({
      lineChanges: [{ action: "update", lineId: "A", patch: { name: "Changed" } }],
    });
  });

  it("does not replace an unchanged optional empty value with null on focus or preparation", async () => {
    type OptionalRow = { id: string; note?: string | null };
    const optional = createLineItemHelper<OptionalRow>();
    const schema = [
      optional.column({ accessorKey: "note", label: "Optional", edit: { editorType: "text" } }),
    ];
    let model!: UseLineItemsReturn<OptionalRow>;
    function OptionalHarness() {
      model = useLineItems<OptionalRow>({ columns: schema, defaultLines: [{ id: "A" }] });
      return (
        <LineItems.Root value={model}>
          <LineItems.Table />
        </LineItems.Root>
      );
    }
    render(<OptionalHarness />, { wrapper: createAppShellWrapper("en") });
    fireEvent.focus(screen.getByRole("textbox", { name: "Optional, line 1" }));
    expect(model.hasUnsavedChanges()).toBe(false);
    await act(async () => {
      expect((await model.commitEdits())?.isEmpty).toBe(true);
    });
    expect(model.allLines[0]!.note).toBeUndefined();
  });

  it("blocks malformed drafts rather than saving the older adopted value", async () => {
    render(<Harness />, { wrapper: createAppShellWrapper("en") });
    const input = edit("Quantity, line 1", "-");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(current.allLines[0]!.quantity).toBe(1);
    await act(async () => {
      expect(await current.commitEdits()).toBeNull();
    });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(current.hasUnsavedChanges()).toBe(false);
  });

  it("adopts business-invalid values, displays their error, and allows correction", async () => {
    render(<Harness />, { wrapper: createAppShellWrapper("en") });
    const input = edit("Quantity, line 1", "-2");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(current.allLines[0]!.quantity).toBe(-2);
    expect(input.getAttribute("aria-invalid")).toBeNull();
    await act(async () => {
      expect(await current.commitEdits()).toBeNull();
    });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await act(async () => {
      expect(await current.commitEdits()).not.toBeNull();
    });
    expect(current.errors).toHaveLength(0);
  });

  it("Discard clears adopted changes and unfinished drafts", async () => {
    render(<Harness />, { wrapper: createAppShellWrapper("en") });
    edit("Quantity, line 1", "9");
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(changes().isEmpty).toBe(true);
    expect(current.hasUnsavedChanges()).toBe(false);
    expect(
      (screen.getByRole("textbox", { name: "Quantity, line 1" }) as HTMLInputElement).value,
    ).toBe("1");
  });

  it("does not remount an unfinished editor when a creation receives its server ID", async () => {
    render(<Harness />, { wrapper: createAppShellWrapper("en") });
    let tempId!: string;
    act(() => {
      tempId = current.addLine({ name: "New", quantity: 1 });
    });
    const sent = current.getChangeSet();
    const input = edit("Quantity, line 2", "19");
    act(() => current.reset({ idMap: { [tempId]: "N" } }, { sent }));
    expect(screen.getByRole("textbox", { name: "Quantity, line 2" })).toBe(input);
    expect((input as HTMLInputElement).value).toBe("19");
    await act(async () => {
      expect(await current.commitEdits()).toMatchObject({
        lineChanges: [{ action: "update", lineId: "N", patch: { quantity: 19 } }],
      });
    });
  });

  it("does not treat IME Enter as cell confirmation", () => {
    render(<Harness />, { wrapper: createAppShellWrapper("en") });
    const input = edit("Name, line 1", "変換中");
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(changes().isEmpty).toBe(true);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(current.allLines[0]!.name).toBe("変換中");
  });

  it("retains the numeric parser when a column loses its editor", () => {
    const view = render(<Harness />, { wrapper: createAppShellWrapper("en") });
    edit("Quantity, line 1", "1,000");
    view.rerender(
      <Harness
        schema={[
          columns[0]!,
          column({ accessorKey: "quantity", label: "Quantity", type: "number" }),
        ]}
      />,
    );
    expect(current.allLines[0]!.quantity).toBe(1000);
    expect(typeof current.allLines[0]!.quantity).toBe("number");
  });

  it("flushes mode-locked drafts only after the new normalizer is committed", () => {
    const initial = [
      columns[0]!,
      column({
        accessorKey: "quantity",
        label: "Quantity",
        edit: { editorType: "number" },
        normalize: (value) => value,
      }),
    ];
    const changed = [
      columns[0]!,
      column({
        accessorKey: "quantity",
        label: "Quantity",
        edit: { editorType: "number" },
        normalize: (value) => (value === null ? null : Math.max(10, value)),
      }),
    ];
    const view = render(<Harness schema={initial} />, { wrapper: createAppShellWrapper("en") });
    edit("Quantity, line 1", "9");
    view.rerender(<Harness mode="view" schema={changed} />);
    expect(current.allLines[0]!.quantity).toBe(10);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("uses the current document validator only when preparation is requested", async () => {
    const view = render(<Harness />, { wrapper: createAppShellWrapper("en") });
    const message = "New validation error";
    const changed: NonNullable<UseLineItemsOptions<Row>["validate"]> = (lines, { getLineKey }) =>
      lines.map((line) => ({
        scope: "cell",
        lineKey: getLineKey(line),
        columnId: "quantity",
        message,
      }));
    view.rerender(<Harness validate={changed} />);
    expect(current.errors).toHaveLength(0);
    await act(async () => {
      await current.commitEdits();
    });
    const input = screen.getByRole("textbox", { name: "Quantity, line 1" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toContain(
      "New validation error",
    );
  });

  it("rejects changing the source/editor type of an active draft", () => {
    const view = render(<Harness />, { wrapper: createAppShellWrapper("en") });
    edit("Quantity, line 1", "9");
    const swapped = [
      column({
        id: "name",
        accessorKey: "quantity",
        label: "Name",
        type: "number",
        edit: { editorType: "number" },
      }),
      column({
        id: "quantity",
        accessorKey: "name",
        label: "Quantity",
        type: "text",
        edit: { editorType: "text" },
      }),
    ];
    expect(() => view.rerender(<Harness schema={swapped} />)).toThrow(
      /changing their value source or editor type/,
    );
    expect(current.allLines[0]!.quantity).toBe(1);
    expect(current.allLines[0]!.name).toBe("One");
  });

  it("view mode is read-only but document validation still covers command writes", async () => {
    render(<Harness mode="view" />, { wrapper: createAppShellWrapper("en") });
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    act(() => current.updateField("A", "quantity", -1));
    expect(current.errors).toHaveLength(0);
    await act(async () => {
      await current.commitEdits();
    });
    expect(screen.getByText("Positive quantity required")).toBeDefined();
    expect(current.errors).toHaveLength(1);
  });
});
