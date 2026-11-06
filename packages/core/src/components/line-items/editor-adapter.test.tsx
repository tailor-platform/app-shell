import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Input } from "@/components/input";
import { createAppShellWrapper } from "../../../tests/test-utils";
import {
  defineLineItemsEditor,
  LineItems,
  useLineItems,
  type LineItemsColumn,
  type LineItemsCustomEditorContext,
  type UseLineItemsReturn,
} from "./index";
import { resolveLineItemsEditor } from "./editors";

afterEach(cleanup);

type Row = {
  id: string;
  quantity: number | null;
  day: string | null;
  packed: { amount: number; unit: string } | null;
};
type QuantityContext = LineItemsCustomEditorContext<Row, number | null, string>;
type QuantityEdit = NonNullable<Extract<LineItemsColumn<Row>, { accessorKey: "quantity" }>["edit"]>;
const initial: Row[] = [
  { id: "A", quantity: 1, day: "2026-12-10", packed: { amount: 1, unit: "pcs" } },
];

function QuantityInput(context: QuantityContext) {
  const [local, setLocal] = useState(0);
  return (
    <>
      <Input
        aria-label={context.ariaLabel}
        aria-invalid={context.invalid || undefined}
        aria-describedby={context.describedBy}
        value={context.draft}
        onFocus={context.onBegin}
        onChange={(event) => context.onChange(event.target.value)}
      />
      <span data-testid="adopted">{String(context.value)}</span>
      <button onClick={() => setLocal((value) => value + 1)}>Local {local}</button>
      <button
        onClick={() => {
          void context.onCommit();
        }}
      >
        Confirm
      </button>
      <button onClick={context.onCancel}>Cancel</button>
    </>
  );
}
function parseQuantity(
  draft: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (draft.trim() === "") return { ok: true, value: null };
  const value = Number(draft);
  return Number.isFinite(value)
    ? { ok: true, value }
    : { ok: false, message: "Quantity is incomplete" };
}
function quantityEditor(parse = parseQuantity) {
  return defineLineItemsEditor<Row, number | null, string>({
    toDraft: (value) => (value === null ? "" : String(value)),
    parse,
    render: QuantityInput,
  });
}
function quantityColumn(
  editor: QuantityEdit["editor"],
  policy: Omit<QuantityEdit, "editor"> = {},
): LineItemsColumn<Row> {
  return { accessorKey: "quantity", label: "Quantity", edit: { editor, ...policy } };
}
function setup(columns: readonly LineItemsColumn<Row>[]) {
  let current!: UseLineItemsReturn<Row>;
  function Harness({
    schema,
    visible,
  }: {
    schema: readonly LineItemsColumn<Row>[];
    visible: boolean;
  }) {
    current = useLineItems({ columns: schema, defaultLines: initial });
    return <LineItems.Root value={current}>{visible && <LineItems.Table />}</LineItems.Root>;
  }
  const view = render(<Harness schema={columns} visible />, { wrapper: createAppShellWrapper() });
  return {
    user: userEvent.setup(),
    current: () => current,
    rerender: (schema = columns, visible = true) =>
      view.rerender(<Harness schema={schema} visible={visible} />),
  };
}
function quantityInput() {
  return screen.getByRole("textbox", { name: "Quantity, line 1" }) as HTMLInputElement;
}
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("LineItems editor adapters", () => {
  it("retains an invalid custom draft and accessible error without adopting it, then clears explicitly", async () => {
    const { user, current } = setup([quantityColumn(quantityEditor())]);
    const input = quantityInput();
    await user.click(input);
    fireEvent.change(input, { target: { value: "-" } });
    expect(screen.getByTestId("adopted").textContent).toBe("1");
    expect(current().lines[0].quantity).toBe(1);
    expect(current().isDirty).toBe(false);
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(input.value).toBe("-");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toContain(
      "Quantity is incomplete",
    );
    expect(current().lines[0].quantity).toBe(1);
    fireEvent.change(input, { target: { value: "2" } });
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(current().lines[0].quantity).toBe(2);
    expect(screen.getByTestId("adopted").textContent).toBe("2");
    fireEvent.change(input, { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(current().lines[0].quantity).toBeNull();
  });

  it.each([new Error("Private parser detail"), "Private parser detail"])(
    "retains parser exceptions as generic input errors without exposing private details: %s",
    async (exception) => {
      const editor = quantityEditor(() => {
        throw exception;
      });
      const { user, current } = setup([quantityColumn(editor)]);
      const input = quantityInput();
      fireEvent.change(input, { target: { value: "2" } });
      await user.click(screen.getByRole("button", { name: "Confirm" }));
      expect(input.value).toBe("2");
      expect(current().lines[0].quantity).toBe(1);
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(
        document.getElementById(input.getAttribute("aria-describedby")!)?.textContent,
      ).toContain("Enter a valid value.");
      expect(screen.queryByText("Private parser detail")).toBeNull();
    },
  );

  it.each([{ ok: true }, { ok: false }, { ok: false, message: 12 }])(
    "rejects malformed untyped parse results without adopting undefined: %j",
    async (result) => {
      const editor = quantityEditor(() => result as unknown as ReturnType<typeof parseQuantity>);
      const { user, current } = setup([quantityColumn(editor)]);
      const input = quantityInput();
      fireEvent.change(input, { target: { value: "2" } });
      await user.click(screen.getByRole("button", { name: "Confirm" }));
      expect(current().lines[0].quantity).toBe(1);
      expect(current().isDirty).toBe(false);
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(
        document.getElementById(input.getAttribute("aria-describedby")!)?.textContent,
      ).toContain("Enter a valid value.");
    },
  );

  it("rejects a retained commit callback after its row is removed", async () => {
    let commit!: QuantityContext["onCommit"];
    const editor = defineLineItemsEditor<Row, number | null, string>({
      toDraft: String,
      parse: parseQuantity,
      render: (context) => {
        commit = context.onCommit;
        return <QuantityInput {...context} />;
      },
    });
    const { current } = setup([quantityColumn(editor)]);
    const retained = commit;
    act(() => current().removeLine("A"));
    await expect(retained()).resolves.toBe(false);
    expect(current().lines).toEqual([]);
  });

  it("mounts custom render with Hooks and retains local state, DOM identity, focus and draft on rerender", async () => {
    const editor = quantityEditor();
    const { user, rerender, current } = setup([quantityColumn(editor)]);
    const input = quantityInput();
    await user.click(screen.getByRole("button", { name: "Local 0" }));
    await user.click(input);
    fireEvent.change(input, { target: { value: "12" } });
    rerender([quantityColumn(editor)]);
    expect(quantityInput()).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(screen.getByRole("button", { name: "Local 1" })).toBeDefined();
    expect(input.value).toBe("12");
    expect(current().lines[0].quantity).toBe(1);
  });

  it("keeps equivalent fresh builtin configurations on the same focused input with its draft", async () => {
    const { user, rerender, current } = setup([quantityColumn({ type: "number" })]);
    const input = quantityInput();
    await user.click(input);
    fireEvent.change(input, { target: { value: "12" } });
    rerender([quantityColumn({ type: "number" })]);
    expect(quantityInput()).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("12");
    await user.keyboard("{Enter}");
    expect(current().lines[0].quantity).toBe(12);
  });

  it("uses updated builtin bounds even when the editor object is retained", async () => {
    const editor = { type: "date" as const, options: { min: "2026-12-01" } };
    const column: LineItemsColumn<Row> = { accessorKey: "day", label: "Day", edit: { editor } };
    const { user, rerender, current } = setup([column]);
    await user.click(screen.getByRole("button", { name: /^Day/ }));
    editor.options.min = "2026-12-11";
    rerender([{ ...column }]);
    await user.click(screen.getByRole("button", { name: /^Day/ }));
    const popup = document.querySelector<HTMLElement>('[data-slot="table-cell-calendar"]')!;
    const day = Array.from(popup.querySelectorAll("button")).find(
      (button) => button.textContent === "20" && !button.hasAttribute("data-outside-month"),
    )!;
    await user.click(day);
    expect(current().lines[0].day).toBe("2026-12-20");
  });

  it("parses the latest draft when custom UI changes and commits within the same event", async () => {
    const editor = defineLineItemsEditor<Row, number | null, string>({
      toDraft: (value) => String(value),
      parse: parseQuantity,
      render: (context) => (
        <button
          onClick={() => {
            context.onChange("4");
            void context.onCommit();
          }}
        >
          Choose four
        </button>
      ),
    });
    const { user, current } = setup([quantityColumn(editor)]);
    await user.click(screen.getByRole("button", { name: "Choose four" }));
    expect(current().lines[0].quantity).toBe(4);
  });

  it("passes only the public context to custom render", () => {
    let received: QuantityContext | undefined;
    const editor = defineLineItemsEditor<Row, number | null, string>({
      toDraft: (value) => String(value),
      parse: parseQuantity,
      render: (context) => {
        received = context;
        return <QuantityInput {...context} />;
      },
    });
    setup([quantityColumn(editor)]);
    expect(received).toHaveProperty("value", 1);
    expect(received).toHaveProperty("draft", "1");
    expect(received).toHaveProperty("status", "idle");
    expect(received).not.toHaveProperty("ui");
    expect(received).not.toHaveProperty("session");
    expect(received).not.toHaveProperty("Render");
  });

  it("keeps untouched structured drafts clean and adopts immutable edits without mutating their baseline", async () => {
    type Draft = { amount: string; unit: string };
    const parse = vi.fn((draft: Draft) => ({
      ok: true as const,
      value: { amount: Number(draft.amount), unit: draft.unit },
    }));
    const editor = defineLineItemsEditor<Row, Row["packed"], Draft>({
      toDraft: (value) => ({ amount: String(value?.amount ?? ""), unit: value?.unit ?? "pcs" }),
      parse,
      render: (context) => (
        <>
          <Input
            aria-label="Amount"
            value={context.draft.amount}
            onFocus={context.onBegin}
            onChange={(event) => context.onChange({ ...context.draft, amount: event.target.value })}
          />
          <button
            onClick={() => {
              void context.onCommit();
            }}
          >
            Confirm packed
          </button>
        </>
      ),
    });
    const { user, current } = setup([{ accessorKey: "packed", edit: { editor } }]);
    const original = current().lines[0].packed;
    const input = screen.getByRole("textbox", { name: "Amount" });
    await user.click(input);
    await user.click(screen.getByRole("button", { name: "Confirm packed" }));
    expect(parse).not.toHaveBeenCalled();
    expect(current().lines[0].packed).toBe(original);
    expect(current().isDirty).toBe(false);
    fireEvent.change(input, { target: { value: "2" } });
    await user.click(screen.getByRole("button", { name: "Confirm packed" }));
    expect(current().lines[0].packed).toEqual({ amount: 2, unit: "pcs" });
    expect(current().lines[0].packed).not.toBe(original);
    expect(original).toEqual({ amount: 1, unit: "pcs" });
  });

  it("retains logical drafts across table detachment while resetting component-local state", async () => {
    const editor = quantityEditor();
    const { user, rerender, current } = setup([quantityColumn(editor)]);
    await user.click(screen.getByRole("button", { name: "Local 0" }));
    fireEvent.change(quantityInput(), { target: { value: "-" } });
    rerender(undefined, false);
    expect(screen.queryByRole("textbox")).toBeNull();
    rerender();
    expect(quantityInput().value).toBe("-");
    expect(screen.getByRole("button", { name: "Local 0" })).toBeDefined();
    expect(current().lines[0].quantity).toBe(1);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(quantityInput().value).toBe("1");
    expect(current().isDirty).toBe(false);
  });

  it("deduplicates pending checks, retains rejected drafts and supports explicit retry", async () => {
    const request = deferred();
    const check = vi.fn().mockReturnValueOnce(request.promise).mockReturnValue(undefined);
    const { user, current } = setup([
      quantityColumn(quantityEditor(), { onValueCommitted: check }),
    ]);
    fireEvent.change(quantityInput(), { target: { value: "2" } });
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(check).toHaveBeenCalledTimes(1);
    expect(current().lines[0].quantity).toBe(1);
    await act(async () => {
      request.reject(new Error("Private check detail"));
      await request.promise.catch(() => {});
    });
    expect(quantityInput().value).toBe("2");
    expect(quantityInput().getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByText("Private check detail")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(check).toHaveBeenCalledTimes(2);
    expect(current().lines[0].quantity).toBe(2);
  });

  it.each(["replace", "new-draft", "revert", "update", "remove"] as const)(
    "prevents late adoption after %s through the custom commit pipeline",
    async (action) => {
      const request = deferred();
      const check = () => request.promise;
      const editor = quantityEditor();
      const { user, current, rerender } = setup([
        quantityColumn(editor, { onValueCommitted: check }),
      ]);
      fireEvent.change(quantityInput(), { target: { value: "2" } });
      await user.click(screen.getByRole("button", { name: "Confirm" }));
      if (action === "replace")
        rerender([quantityColumn(quantityEditor(), { onValueCommitted: check })]);
      if (action === "new-draft") fireEvent.change(quantityInput(), { target: { value: "3" } });
      if (action === "revert") act(() => current().revert());
      if (action === "update") act(() => current().updateField("A", "quantity", 7));
      if (action === "remove") act(() => current().removeLine("A"));
      await act(async () => {
        request.resolve();
        await request.promise;
      });
      expect(current().lines).toHaveLength(action === "remove" ? 0 : 1);
      if (action !== "remove")
        expect(current().lines[0].quantity).toBe(action === "update" ? 7 : 1);
      if (action === "new-draft") expect(quantityInput().value).toBe("3");
    },
  );

  it("never passes an old draft into a replacement component with a different draft type", () => {
    const { rerender, current } = setup([quantityColumn(quantityEditor())]);
    fireEvent.change(quantityInput(), { target: { value: "-" } });
    const replacement = defineLineItemsEditor<Row, number | null, { text: string }>({
      toDraft: (value) => ({ text: String(value) }),
      parse: (draft) => parseQuantity(draft.text),
      render: (context) => (
        <Input aria-label="Replacement" value={context.draft.text.toUpperCase()} readOnly />
      ),
    });
    expect(() => rerender([quantityColumn(replacement)])).not.toThrow();
    expect((screen.getByRole("textbox", { name: "Replacement" }) as HTMLInputElement).value).toBe(
      "1",
    );
    expect(current().lines[0].quantity).toBe(1);
  });

  it("captures definition functions so later mutation cannot change an existing editor contract", async () => {
    const definition = {
      toDraft: (value: number | null) => String(value),
      parse: parseQuantity,
      render: QuantityInput,
    };
    const editor = defineLineItemsEditor<Row, number | null, string>(definition);
    definition.parse = () => ({ ok: true, value: 99 });
    const { user, current } = setup([quantityColumn(editor)]);
    expect(Object.isFrozen(editor)).toBe(true);
    fireEvent.change(quantityInput(), { target: { value: "2" } });
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(current().lines[0].quantity).toBe(2);
  });

  it.each(["toString", "constructor", "__proto__", "hasOwnProperty"])(
    "rejects inherited registry keys instead of resolving %s",
    (type) => {
      expect(() => resolveLineItemsEditor({ type })).toThrow("Unsupported LineItems cell editor");
    },
  );

  it("validates unsupported and incomplete editor configurations at the resolver boundary", () => {
    for (const config of [
      null,
      false,
      { type: "unknown" },
      { type: "custom" },
      { type: "text", options: {} },
      { type: "number", options: {} },
      { type: "boolean", options: {} },
      { type: "combobox" },
      { type: "combobox", options: [] },
      { type: "combobox", fetcher: async () => [], getOptionLabel: () => "Label" },
      { type: "combobox", options: { fetcher: async () => [] } },
      {
        type: "combobox",
        options: { options: [], fetcher: async () => [], getOptionLabel: () => "Label" },
      },
      { type: "date", min: "2026-12-01" },
      { type: "date", options: null },
      { type: "date", options: { min: "2026-12-31", max: "2026-12-01" } },
    ])
      expect(() => resolveLineItemsEditor(config)).toThrow();
  });
});
