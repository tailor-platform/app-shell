import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { getLineItemsEditing, LINE_ITEMS_EDITING } from "./editing";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import type { LineItemsColumn, UseLineItemsReturn } from "./types";

afterEach(cleanup);

type Row = { id?: string; name: string | null };
const configurations = buildConfigurations({ modules: [], locale: "en" });

it.each(["spread", "assign"] as const)(
  "edits through a %s copy and retains the document draft across fresh copies and view remounts",
  (copy) => {
    const check = vi.fn();
    const columns: LineItemsColumn<Row>[] = [
      { accessorKey: "name", label: "Name", edit: { editorType: "text", onValueCommitted: check } },
    ];
    let value!: UseLineItemsReturn<Row>;
    function Harness({ show = true }: { show?: boolean }) {
      value = useLineItems({
        columns,
        defaultLines: [{ id: "A", name: "Initial" }],
        orderer: false,
      });
      const copied = copy === "spread" ? { ...value } : Object.assign({}, value);
      return (
        <MemoryRouter>
          <AppShellConfigContext.Provider value={{ configurations }}>
            <LineItems.Root value={copied}>{show && <LineItems.Table />}</LineItems.Root>
          </AppShellConfigContext.Provider>
        </MemoryRouter>
      );
    }
    const view = render(<Harness />, { wrapper: StrictMode });
    const original = value;
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "Name, Row 1" });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "Retained" } });

    view.rerender(<Harness />);
    expect(value).not.toBe(original);
    expect(value[LINE_ITEMS_EDITING]).toBe(original[LINE_ITEMS_EDITING]);
    expect(screen.getByRole("textbox")).toBe(input);
    expect(input.value).toBe("Retained");
    expect(document.activeElement).toBe(input);

    view.rerender(<Harness show={false} />);
    expect(check).not.toHaveBeenCalled();
    expect(value.lines[0].name).toBe("Initial");
    expect(value.isDirty).toBe(false);
    view.rerender(<Harness />);
    const restored = screen.getByRole<HTMLInputElement>("textbox", { name: "Name, Row 1" });
    expect(restored.value).toBe("Retained");
    fireEvent.keyDown(restored, { key: "Enter" });
    expect(check).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ name: "Initial" }),
      "Retained",
    );
    expect(value.lines[0].name).toBe("Retained");
    expect(value.isDirty).toBe(true);
  },
);

it("keeps copied document handles isolated", () => {
  const columns: LineItemsColumn<Row>[] = [{ accessorKey: "name", edit: { editorType: "text" } }];
  const { result } = renderHook(() => ({
    first: useLineItems({ columns, defaultLines: [{ id: "A", name: "First" }] }),
    second: useLineItems({ columns, defaultLines: [{ id: "A", name: "Second" }] }),
  }));
  const first = getLineItemsEditing<Row>({ ...result.current.first });
  const second = getLineItemsEditing<Row>({ ...result.current.second });
  expect(first).not.toBe(second);
  const firstSession = first.getSession(result.current.first.lines[0], columns[0]);
  const secondSession = second.getSession(result.current.second.lines[0], columns[0]);
  firstSession.begin("First draft");
  secondSession.begin("Second draft");
  act(() => result.current.first.updateField("A", "name", "Updated"));
  expect(firstSession.getState()).toEqual({ status: "idle" });
  expect(secondSession.getState()).toEqual({ status: "editing", draft: "Second draft" });
  expect(result.current.second.lines[0].name).toBe("Second");
});

it("rejects values without a document editing handle", () => {
  expect(() => getLineItemsEditing({})).toThrow(
    "Editable LineItems requires the value returned by useLineItems",
  );
});
