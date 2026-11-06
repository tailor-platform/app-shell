import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import { defineLineItemsEditor } from "./editor-adapter";
import type { LineItemsColumn, UseLineItemsReturn } from "./types";

afterEach(cleanup);
type Row = {
  id?: string;
  name: string | null;
  quantity: number | null;
  enabled: boolean;
  day: string | null;
  unit: string | null;
  priority: 1 | 2 | null;
  supplier: string | null;
  pack: { units: number } | null;
};
const columns: LineItemsColumn<Row>[] = [
  { accessorKey: "name", label: "Name", type: "text", edit: { editor: { type: "text" } } },
  {
    accessorKey: "quantity",
    label: "Quantity",
    type: "number",
    edit: { editor: { type: "number" } },
  },
  { accessorKey: "enabled", label: "Enabled", type: "text", edit: { editor: { type: "boolean" } } },
  {
    accessorKey: "day",
    label: "Date",
    type: "date",
    edit: { editor: { type: "date", options: { min: "2026-12-01", max: "2026-12-31" } } },
  },
  {
    accessorKey: "unit",
    label: "Unit",
    render: (row) => (row.unit === "box" ? "Display box" : "Display each"),
    edit: {
      editor: {
        type: "combobox",
        options: {
          options: [
            { value: "pcs", label: "Each" },
            { value: "box", label: "Box" },
          ],
        },
      },
    },
  },
  {
    accessorKey: "priority",
    label: "Priority",
    type: "number",
    edit: {
      editor: {
        type: "combobox",
        options: {
          options: [
            { value: 1, label: "Normal" },
            { value: 2, label: "High" },
          ],
        },
      },
    },
  },
  {
    accessorKey: "supplier",
    label: "Supplier",
    type: "text",
    edit: {
      editor: {
        type: "combobox",
        options: {
          fetcher: { fn: async () => [{ value: "S2", label: "Second supplier" }], debounceMs: 0 },
          getOptionLabel: (value) => (value === "S1" ? "Current supplier" : "Second supplier"),
        },
      },
    },
  },
  {
    accessorKey: "pack",
    label: "Pack",
    render: (row) => `${row.pack?.units ?? 0} units`,
    edit: {
      editor: defineLineItemsEditor<Row, Row["pack"], Row["pack"]>({
        toDraft: (value) => value,
        parse: (draft) => ({ ok: true, value: draft }),
        render: ({ draft, onChange, onCommit, onCancel, ariaLabel }) => (
          <button
            aria-label={`Increase ${ariaLabel}`}
            onClick={() => {
              onChange({ units: (draft?.units ?? 0) + 1 });
              void onCommit();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") onCancel();
            }}
          >
            Increase
          </button>
        ),
      }),
    },
  },
];
const initial: Row[] = [
  {
    id: "A",
    name: "First",
    quantity: 0.3,
    enabled: false,
    day: "2026-12-10",
    unit: "pcs",
    priority: 1,
    supplier: "S1",
    pack: { units: 5 },
  },
];
let current: UseLineItemsReturn<Row>;
function Harness({
  schema = columns,
  visible = true,
}: {
  schema?: readonly LineItemsColumn<Row>[];
  visible?: boolean;
}) {
  current = useLineItems({ columns: schema, defaultLines: initial });
  return (
    <>
      <LineItems.Root value={current}>{visible && <LineItems.Table />}</LineItems.Root>
      <button onClick={current.revert}>Discard</button>
      <button>Outside</button>
    </>
  );
}
function setup(schema?: readonly LineItemsColumn<Row>[], locale = "en") {
  const view = render(
    <StrictMode>
      <Harness schema={schema} />
    </StrictMode>,
    { wrapper: createAppShellWrapper(locale) },
  );
  return { ...view, user: userEvent.setup() };
}
function dayButton(day: string) {
  const popup = document.querySelector<HTMLElement>('[data-slot="table-cell-calendar"]')!;
  return within(popup)
    .getAllByRole("button")
    .find((button) => button.textContent === day && !button.hasAttribute("data-outside-month"))!;
}
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((success, failure) => {
    resolve = success;
    reject = failure;
  });
  return { promise, resolve, reject };
}

describe("LineItems cell editing", () => {
  it("keeps text drafts local, confirms on Enter/Tab/blur, and clears explicitly to null", async () => {
    const { user } = setup();
    const input = screen.getByRole("textbox", { name: "Name, line 1" });
    const row = input.closest("tr");
    await user.click(input);
    await user.keyboard("Updated");
    expect(current.lines[0].name).toBe("First");
    expect(current.isDirty).toBe(false);
    await user.keyboard("{Enter}");
    expect(current.lines[0].name).toBe("Updated");
    expect(input.closest("tr")).toBe(row);
    await user.clear(input);
    await user.keyboard("{Tab}");
    expect(current.lines[0].name).toBeNull();
    await user.click(input);
    await user.keyboard("Blurred");
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(current.lines[0].name).toBe("Blurred");
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(current.lines[0].name).toBe("First");
    expect(current.isDirty).toBe(false);
  });

  it("retains malformed number drafts, blocks Tab, and cancels without adopting them", async () => {
    const { user } = setup();
    const input = screen.getByRole("textbox", { name: "Quantity, line 1" }) as HTMLInputElement;
    await user.click(input);
    await user.keyboard("1,5{Tab}");
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("1,5");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(current.lines[0].quantity).toBe(0.3);
    expect(current.isDirty).toBe(false);
    await user.keyboard("{Escape}{Escape}");
    expect(input.value).toBe("0.3");
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("normalizes pasted number syntax but never rounds adopted values to display precision", async () => {
    const { user } = setup();
    const input = screen.getByRole("textbox", { name: "Quantity, line 1" });
    await user.click(input);
    fireEvent.change(input, { target: { value: "￥１，２３４．５" } });
    await user.keyboard("{Enter}");
    expect(current.lines[0].quantity).toBe(1234.5);
    await user.click(input);
    fireEvent.change(input, { target: { value: "0.30000000000000004" } });
    await user.keyboard("{Enter}");
    expect(current.lines[0].quantity).toBe(0.1 + 0.2);
    expect(current.isDirty).toBe(true);
    fireEvent.change(input, { target: { value: "0.3" } });
    await user.keyboard("{Enter}");
    expect(current.isDirty).toBe(false);
  });

  it("does not confirm text when Enter belongs to an IME composition", () => {
    setup();
    const input = screen.getByRole("textbox", { name: "Name, line 1" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "編集中" } });
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(current.lines[0].name).toBe("First");
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(current.lines[0].name).toBe("編集中");
  });

  it("confirms booleans with Space and restores them on revert", async () => {
    const { user } = setup();
    const checkbox = screen.getByRole("checkbox", { name: "Enabled, line 1" });
    act(() => checkbox.focus());
    await user.keyboard(" ");
    expect(current.lines[0].enabled).toBe(true);
    expect(checkbox.closest("td")?.className).not.toContain(
      "astw:focus-within:[background-image:none]",
    );
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(current.lines[0].enabled).toBe(false);
  });

  it("adopts date-only selections, enforces bounds, and cancels/clears explicitly", async () => {
    const { user } = setup();
    const trigger = () => screen.getByRole("button", { name: /^Date, line 1/ });
    await user.click(trigger());
    expect(dayButton("1").getAttribute("aria-disabled")).not.toBe("true");
    await user.click(dayButton("20"));
    expect(current.lines[0].day).toBe("2026-12-20");
    await user.click(trigger());
    await user.keyboard("{Escape}");
    expect(current.lines[0].day).toBe("2026-12-20");
    await user.click(trigger());
    await user.click(screen.getByRole("button", { name: "Clear date" }));
    expect(current.lines[0].day).toBeNull();
    await user.click(trigger());
    act(() => current.revert());
    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
  });

  it("preserves choice value types and keeps labels/search independent of document values", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("combobox", { name: "Priority, line 1" }));
    await user.click(screen.getByRole("option", { name: "High" }));
    expect(current.lines[0].priority).toBe(2);
    const combo = screen.getByRole("combobox", { name: "Unit, line 1" }) as HTMLInputElement;
    await user.click(combo);
    fireEvent.change(combo, { target: { value: "Box" } });
    expect(current.lines[0].unit).toBe("pcs");
    await user.click(screen.getByRole("option", { name: "Box" }));
    expect(current.lines[0].unit).toBe("box");
    expect(screen.getByText("Display box")).toBeDefined();
    await user.click(combo);
    await user.click(screen.getByRole("button", { name: "Clear value" }));
    expect(current.lines[0].unit).toBeNull();
    await user.click(combo);
    fireEvent.change(combo, { target: { value: "Box" } });
    act(() => current.revert());
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(combo.value).toBe("Each");
  });

  it("preserves active choice UI across row updates and restores the display on leave", async () => {
    const { user } = setup();
    const combo = screen.getByRole("combobox", { name: "Unit, line 1" }) as HTMLInputElement;
    const display = screen.getByText("Display each");
    expect(display.classList.contains("astw:invisible")).toBe(false);
    await user.click(combo);
    fireEvent.change(combo, { target: { value: "Box" } });
    expect(display.classList.contains("astw:invisible")).toBe(true);
    act(() => current.updateField("A", "name", "Updated elsewhere"));
    expect(screen.getByRole("combobox", { name: "Unit, line 1" })).toBe(combo);
    expect(document.activeElement).toBe(combo);
    expect(combo.value).toBe("Box");
    expect(screen.getByRole("option", { name: "Box" })).toBeDefined();
    expect(display.classList.contains("astw:invisible")).toBe(true);
    expect(current.lines[0].unit).toBe("pcs");
    await user.keyboard("{Escape}");
    expect(display.classList.contains("astw:invisible")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(display.classList.contains("astw:invisible")).toBe(false);
    expect(combo.value).toBe("Each");
  });

  it("retains failed choice drafts without retaining transient UI across table detachment", async () => {
    const request = deferred();
    const check = vi.fn().mockReturnValueOnce(request.promise).mockReturnValue(undefined);
    const schema: LineItemsColumn<Row>[] = [
      {
        accessorKey: "unit",
        label: "Unit",
        render: columns[4].render,
        edit: {
          editor: {
            type: "combobox",
            options: {
              options: [
                { value: "pcs", label: "Each" },
                { value: "box", label: "Box" },
              ],
            },
          },
          onValueCommitted: check,
        },
      },
    ];
    const { user, rerender } = setup(schema);
    await user.click(screen.getByRole("combobox", { name: "Unit, line 1" }));
    await user.click(screen.getByRole("option", { name: "Box" }));
    expect(check).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("cell").getAttribute("aria-busy")).toBe("true");
    expect(current.lines[0].unit).toBe("pcs");
    expect(current.isDirty).toBe(false);
    rerender(
      <StrictMode>
        <Harness schema={schema} visible={false} />
      </StrictMode>,
    );
    await act(async () => {
      request.reject(new Error("Rejected choice"));
      await request.promise.catch(() => undefined);
    });
    rerender(
      <StrictMode>
        <Harness schema={schema} />
      </StrictMode>,
    );
    const combo = screen.getByRole("combobox", { name: "Unit, line 1" }) as HTMLInputElement;
    expect(combo.value).toBe("Box");
    expect(combo.getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByText("Display each").classList.contains("astw:invisible")).toBe(true);
    expect(current.lines[0].unit).toBe("pcs");
    await user.click(combo);
    await user.click(screen.getByRole("option", { name: "Box" }));
    expect(current.lines[0].unit).toBe("box");
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("loads remote choices only on demand and never adopts their query/fallback label", async () => {
    const { user } = setup();
    const combo = screen.getByRole("combobox", { name: "Supplier, line 1" });
    await user.click(combo);
    await screen.findByRole("option", { name: "Second supplier" });
    fireEvent.change(combo, { target: { value: "query" } });
    expect(current.lines[0].supplier).toBe("S1");
    await user.click(await screen.findByRole("option", { name: "Second supplier" }));
    expect(current.lines[0].supplier).toBe("S2");
  });

  it("adopts structured custom values without serializing or mutating the original leaf", async () => {
    const { user } = setup();
    const original = current.lines[0].pack;
    await user.click(screen.getByRole("button", { name: "Increase Pack, line 1" }));
    expect(current.lines[0].pack).toEqual({ units: 6 });
    expect(current.lines[0].pack).not.toBe(original);
    expect(original).toEqual({ units: 5 });
  });

  it("waits for checks, retains rejection with its draft, and allows explicit retry", async () => {
    const request = deferred();
    const check = vi.fn().mockReturnValueOnce(request.promise).mockReturnValue(undefined);
    const schema: LineItemsColumn<Row>[] = [
      {
        accessorKey: "name",
        label: "Name",
        edit: { editor: { type: "text" }, onValueCommitted: check },
      },
    ];
    const { user } = setup(schema);
    const input = screen.getByRole("textbox", { name: "Name, line 1" }) as HTMLInputElement;
    await user.click(input);
    await user.keyboard("Candidate{Enter}{Enter}");
    expect(check).toHaveBeenCalledTimes(1);
    expect(input.closest("td")?.getAttribute("aria-busy")).toBe("true");
    expect(current.lines[0].name).toBe("First");
    await act(async () => {
      request.reject(new Error("Private failure details"));
      await request.promise.catch(() => undefined);
    });
    expect(input.value).toBe("Candidate");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByText("Private failure details")).toBeNull();
    await user.keyboard("{Enter}");
    expect(current.lines[0].name).toBe("Candidate");
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("retains a logical draft across table detachment and keeps disabled rows readonly", async () => {
    const schema: LineItemsColumn<Row>[] = [
      {
        accessorKey: "name",
        label: "Name",
        edit: { editor: { type: "text" }, canEdit: (row) => !row.enabled },
      },
      { accessorKey: "enabled", label: "Enabled" },
    ];
    const { user, rerender } = setup(schema);
    await user.click(screen.getByRole("textbox", { name: "Name, line 1" }));
    await user.keyboard("Retained");
    rerender(
      <StrictMode>
        <Harness schema={schema} visible={false} />
      </StrictMode>,
    );
    rerender(
      <StrictMode>
        <Harness schema={schema} />
      </StrictMode>,
    );
    const input = screen.getByRole("textbox", { name: "Name, line 1" }) as HTMLInputElement;
    expect(input.value).toBe("Retained");
    expect(current.lines[0].name).toBe("First");
    act(() => current.updateField("A", "enabled", true));
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("completes an in-flight edit after only its table view detaches", async () => {
    const request = deferred();
    const schema: LineItemsColumn<Row>[] = [
      {
        accessorKey: "name",
        label: "Name",
        edit: { editor: { type: "text" }, onValueCommitted: () => request.promise },
      },
    ];
    const { user, rerender } = setup(schema);
    await user.click(screen.getByRole("textbox", { name: "Name, line 1" }));
    await user.keyboard("Confirmed{Enter}");
    rerender(
      <StrictMode>
        <Harness schema={schema} visible={false} />
      </StrictMode>,
    );
    await act(async () => {
      request.resolve();
      await request.promise;
    });
    expect(current.lines[0].name).toBe("Confirmed");
    rerender(
      <StrictMode>
        <Harness schema={schema} />
      </StrictMode>,
    );
    expect((screen.getByRole("textbox", { name: "Name, line 1" }) as HTMLInputElement).value).toBe(
      "Confirmed",
    );
  });

  it("rebinds a reused column ID to its new property without retaining the previous draft", () => {
    const before: LineItemsColumn<Row>[] = [
      { id: "editor", accessorKey: "name", label: "Name", edit: { editor: { type: "text" } } },
      { id: "other", accessorKey: "quantity" },
    ];
    const after: LineItemsColumn<Row>[] = [
      {
        id: "editor",
        accessorKey: "quantity",
        label: "Quantity",
        edit: { editor: { type: "number" } },
      },
      { id: "other", accessorKey: "name" },
    ];
    const { rerender } = setup(before);
    const input = screen.getByRole("textbox", { name: "Name, line 1" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Stale" } });
    rerender(
      <StrictMode>
        <Harness schema={after} />
      </StrictMode>,
    );
    const next = screen.getByRole("textbox", { name: "Quantity, line 1" }) as HTMLInputElement;
    expect(next.value).toBe("0.3");
    fireEvent.change(next, { target: { value: "3" } });
    fireEvent.keyDown(next, { key: "Enter" });
    expect(current.lines[0]).toMatchObject({ name: "First", quantity: 3 });
  });

  it("does not pass an old numeric text draft into a newly configured custom editor", () => {
    const before: LineItemsColumn<Row>[] = [
      { accessorKey: "quantity", label: "Quantity", edit: { editor: { type: "number" } } },
    ];
    const after: LineItemsColumn<Row>[] = [
      {
        accessorKey: "quantity",
        label: "Quantity",
        edit: {
          editor: defineLineItemsEditor<Row, Row["quantity"], Row["quantity"]>({
            toDraft: (value) => value,
            parse: (draft) => ({ ok: true, value: draft }),
            render: ({ draft, onChange, onCommit }) => (
              <button
                onClick={() => {
                  onChange(4);
                  void onCommit();
                }}
              >
                Custom {draft?.toFixed(1)}
              </button>
            ),
          }),
        },
      },
    ];
    const { rerender } = setup(before);
    const input = screen.getByRole("textbox", { name: "Quantity, line 1" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "12" } });
    expect(() =>
      rerender(
        <StrictMode>
          <Harness schema={after} />
        </StrictMode>,
      ),
    ).not.toThrow();
    const button = screen.getByRole("button", { name: "Custom 0.3" });
    expect(current.lines[0].quantity).toBe(0.3);
    fireEvent.click(button);
    expect(current.lines[0].quantity).toBe(4);
  });

  it("localizes editor names and parse feedback in Japanese", () => {
    setup(undefined, "ja");
    const input = screen.getByRole("textbox", { name: "Quantity, 行1" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "-" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toContain(
      "有効な数値を入力してください。",
    );
  });
});
