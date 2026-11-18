import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import { createLineItemsDocumentStore } from "./document/store";
import { createLineItemsEditing } from "./editing";
import type { LineItemsColumn, LineItemsEditor, UseLineItemsReturn } from "./types";

afterEach(cleanup);
type Row = { id?: string; value?: string | number | null };
type Kind = "text" | "number" | "combobox" | "date";
const initialValue = (kind: Kind) => (kind === "number" ? 2 : "2026-12-01");
function editor(
  kind: Kind,
  clearValue?: false | (() => Row["value"]),
): LineItemsEditor<Row, Row["value"]> {
  if (kind === "combobox")
    return {
      editorType: kind,
      editorOptions: { options: [{ value: "2026-12-01", label: "First day" }] },
      clearValue,
    };
  return { editorType: kind, clearValue };
}
function setup(
  edit: LineItemsEditor<Row, Row["value"]>,
  initial: Row["value"],
  locale: "en" | "ja" = "en",
) {
  let value!: UseLineItemsReturn<Row>;
  const columns: LineItemsColumn<Row>[] = [{ accessorKey: "value", label: "Value", edit }];
  const configurations = buildConfigurations({ modules: [], locale, timeZone: "UTC" });
  function Owner({ show = true }: { show?: boolean }) {
    value = useLineItems<Row>({
      columns,
      defaultLines: [{ id: "A", value: initial }],
      orderer: false,
    });
    return (
      <MemoryRouter>
        <AppShellConfigContext.Provider value={{ configurations }}>
          <LineItems.Root value={value}>{show && <LineItems.Table />}</LineItems.Root>
        </AppShellConfigContext.Provider>
      </MemoryRouter>
    );
  }
  const view = render(<Owner />);
  return {
    ...view,
    get value() {
      return value;
    },
    user: userEvent.setup(),
    rerender: () => view.rerender(<Owner />),
  };
}
const textbox = () => screen.getByRole<HTMLInputElement>("textbox", { name: /^Value,/ });
const dateTrigger = () => screen.getByRole("button", { name: /^Value,/ });
async function clear(kind: Kind, user: ReturnType<typeof userEvent.setup>) {
  if (kind === "date") {
    await user.click(dateTrigger());
    await user.click(screen.getByRole("button", { name: "Clear" }));
  } else if (kind === "combobox") {
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "None" }));
  } else {
    act(() => textbox().focus());
    fireEvent.change(textbox(), { target: { value: "" } });
    fireEvent.keyDown(textbox(), { key: "Enter" });
  }
}

describe("LineItems Clear policy", () => {
  it.each<Kind>(["text", "number", "combobox", "date"])(
    "resolves %s Clear to undefined before checking and adopting",
    async (kind) => {
      const resolve = vi.fn(() => undefined);
      const check = vi.fn();
      const view = setup({ ...editor(kind, resolve), onValueCommitted: check }, initialValue(kind));
      view.rerender();
      expect(resolve).not.toHaveBeenCalled();
      await clear(kind, view.user);
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(check).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ value: initialValue(kind) }),
        undefined,
      );
      expect(view.value.lines[0].value).toBeUndefined();
      expect(Object.hasOwn(view.value.lines[0], "value")).toBe(true);
      expect(view.value.isDirty).toBe(true);
    },
  );

  it.each<Kind>(["text", "number", "combobox", "date"])(
    "keeps the existing null default for %s",
    async (kind) => {
      const check = vi.fn();
      const view = setup({ ...editor(kind), onValueCommitted: check }, initialValue(kind));
      await clear(kind, view.user);
      expect(check).toHaveBeenCalledExactlyOnceWith(expect.anything(), null);
      expect(view.value.lines[0].value).toBeNull();
    },
  );

  it.each<Kind>(["text", "number", "combobox", "date"])(
    "does not resolve %s Clear merely by focusing/opening and leaving an empty value",
    async (kind) => {
      const resolve = vi.fn(() => null);
      const check = vi.fn();
      const view = setup({ ...editor(kind, resolve), onValueCommitted: check }, undefined);
      if (kind === "date") {
        await view.user.click(dateTrigger());
        await view.user.keyboard("{Escape}");
      } else if (kind === "combobox") {
        await view.user.click(screen.getByRole("combobox"));
        await view.user.keyboard("{Escape}");
      } else {
        await view.user.click(textbox());
        await view.user.tab();
      }
      view.rerender();
      expect(resolve).not.toHaveBeenCalled();
      expect(check).not.toHaveBeenCalled();
      expect(view.value.lines[0].value).toBeUndefined();
      expect(view.value.isDirty).toBe(false);
    },
  );

  it.each(
    (["text", "number"] as const).flatMap((kind) =>
      (["Enter", "Tab", "blur"] as const).map((action) => ({ kind, action })),
    ),
  )(
    "rejects forbidden empty $kind input on $action without losing its draft",
    ({ kind, action }) => {
      const check = vi.fn();
      const view = setup({ ...editor(kind, false), onValueCommitted: check }, initialValue(kind));
      const input = textbox();
      act(() => input.focus());
      fireEvent.change(input, { target: { value: "" } });
      if (action === "blur") fireEvent.blur(input);
      else fireEvent.keyDown(input, { key: action });
      expect(input.value).toBe("");
      expect(input.getAttribute("aria-invalid")).toBe("true");
      const description = input
        .getAttribute("aria-describedby")!
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent)
        .join(" ");
      expect(description).toContain("This field cannot be cleared.");
      fireEvent.keyDown(input, { key: "Tab" });
      fireEvent.blur(input);
      view.rerender();
      expect(textbox().value).toBe("");
      expect(view.value.lines[0].value).toBe(initialValue(kind));
      expect(view.value.isDirty).toBe(false);
      expect(check).not.toHaveBeenCalled();
    },
  );

  it("retains and explains a forbidden Clear first attempted on blur", () => {
    const check = vi.fn();
    const view = setup({ ...editor("number", false), onValueCommitted: check }, 2, "ja");
    const input = textbox();
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(textbox().value).toBe("");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("この項目は空にできません。", { selector: "p" })).toBeDefined();
    expect(view.value.lines[0].value).toBe(2);
    expect(check).not.toHaveBeenCalled();
  });

  it("omits None from a combobox that cannot be cleared", async () => {
    const view = setup(editor("combobox", false), "2026-12-01");
    await view.user.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("option", { name: "None" })).toBeNull();
    expect(screen.getByRole("option", { name: "First day" })).toBeDefined();
  });

  it.each([false, true])(
    "omits date Clear while preserving calendar and datetime Done (withTime %s)",
    async (withTime) => {
      const view = setup(
        { editorType: "date", editorOptions: { withTime }, clearValue: false },
        "2026-12-01",
      );
      await view.user.click(dateTrigger());
      expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
      if (withTime) expect(screen.getByRole("button", { name: "Done" })).toBeDefined();
      expect(document.querySelector('[data-slot="line-items-cell-calendar"]')).not.toBeNull();
    },
  );

  it.each([
    { kind: "text" as const, empty: "" },
    { kind: "number" as const, empty: 0 },
  ])("uses an explicitly chosen $empty for $kind", async ({ kind, empty }) => {
    const check = vi.fn();
    const view = setup(
      { ...editor(kind, () => empty), onValueCommitted: check },
      initialValue(kind),
    );
    await clear(kind, view.user);
    expect(check).toHaveBeenCalledExactlyOnceWith(expect.anything(), empty);
    expect(view.value.lines[0].value).toBe(empty);
  });

  it("evaluates Clear once per pending confirmation and never adopts its unresolved output", async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const resolve = vi.fn(() => undefined);
    const check = vi.fn(() => pending);
    const view = setup({ ...editor("number", resolve), onValueCommitted: check }, 2);
    const input = textbox();
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "" } });
    expect(resolve).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter" });
    view.rerender();
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(check).toHaveBeenCalledExactlyOnceWith(expect.anything(), undefined);
    expect(view.value.lines[0].value).toBe(2);
    expect(view.value.isDirty).toBe(false);
    await act(async () => {
      finish();
      await pending;
    });
    expect(view.value.lines[0].value).toBeUndefined();
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it.each(["combobox", "date"] as const)(
    "resolves explicit %s Clear from an empty value without treating open/close as Clear",
    async (kind) => {
      let finish!: () => void;
      const pending = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const resolve = vi.fn(() => "2026-12-01");
      const check = vi.fn(() => pending);
      const view = setup({ ...editor(kind, resolve), onValueCommitted: check }, undefined);
      expect(resolve).not.toHaveBeenCalled();
      await clear(kind, view.user);
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(check).toHaveBeenCalledExactlyOnceWith(expect.anything(), "2026-12-01");
      expect(view.value.lines[0].value).toBeUndefined();
      expect(document.querySelector('[data-slot="line-items-cell-confirming"]')).not.toBeNull();
      await act(async () => {
        finish();
        await pending;
      });
      expect(view.value.lines[0].value).toBe("2026-12-01");
      expect(resolve).toHaveBeenCalledTimes(1);
    },
  );

  it("does not run a check when the resolved Clear value is already adopted", async () => {
    const resolve = vi.fn(() => 0);
    const check = vi.fn();
    const view = setup({ ...editor("number", resolve), onValueCommitted: check }, 0);
    await clear("number", view.user);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(check).not.toHaveBeenCalled();
    expect(view.value.lines[0].value).toBe(0);
    expect(view.value.isDirty).toBe(false);
  });

  it("rejects asynchronous Clear results supplied by untyped callers", async () => {
    const check = vi.fn();
    const invalid = {
      editorType: "number",
      clearValue: () => Promise.reject(new Error("Async Clear")),
      onValueCommitted: check,
    } as unknown as LineItemsEditor<Row, Row["value"]>;
    const view = setup(invalid, 2);
    await clear("number", view.user);
    expect(view.value.lines[0].value).toBe(2);
    expect(view.value.isDirty).toBe(false);
    expect(textbox().getAttribute("aria-invalid")).toBe("true");
    expect(check).not.toHaveBeenCalled();
  });

  it("validates malformed Clear configuration and leaves direct document commands independent", () => {
    const invalid = { editorType: "number", clearValue: 0 } as unknown as LineItemsEditor<
      Row,
      Row["value"]
    >;
    expect(() => setup(invalid, 2)).toThrow(
      "LineItems clearValue must be false or a synchronous function",
    );
    const columns: LineItemsColumn<Row>[] = [
      { accessorKey: "value", edit: editor("number", false) },
    ];
    const store = createLineItemsDocumentStore<Row>({ columns, lines: [{ id: "A", value: 2 }] });
    const editing = createLineItemsEditing(store, columns);
    const session = editing.getSession(store.getSnapshot()[0], columns[0]);
    session.change("");
    editing.updateField("A", "value", undefined);
    expect(store.getSnapshot()[0].value).toBeUndefined();
    expect(session.getState()).toEqual({ status: "idle" });
  });
});
