import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type {
  BadgeCellEditOptions,
  CellEditState,
  DateCellEditOptions,
  DateTimeDraft,
  NumberCellEditOptions,
  TextCellEditOptions,
} from "@/index";
import { createAppShellWrapper } from "../../../../../tests/test-utils";
import { DataTable } from "../../data-table";
import { useDataTable } from "../../use-data-table";
import type { Column } from "../../types";

afterEach(cleanup);

type Row = { id: string; value: string | number | null };
type EditorType = "text" | "number" | "money";

function Harness({
  value,
  type,
  onValueChange,
  onValueCommitted,
}: {
  value: Row["value"];
  type: EditorType;
  onValueChange: (row: Row, draft: string | null) => void;
  onValueCommitted: (row: Row, value: unknown) => void;
}) {
  const columns: Column<Row>[] = [
    { id: "value", label: "Value", type, edit: { onValueChange, onValueCommitted } },
  ];
  const table = useDataTable<Row>({ columns, data: { rows: [{ id: "1", value }] } });
  return (
    <DataTable.Root value={table}>
      <DataTable.Table />
    </DataTable.Root>
  );
}

function renderEditor(value: Row["value"] = 12, type: EditorType = "number") {
  const onValueChange = vi.fn();
  const onValueCommitted = vi.fn();
  const ui = (next: Row["value"]) => (
    <MemoryRouter>
      <Harness
        value={next}
        type={type}
        onValueChange={onValueChange}
        onValueCommitted={onValueCommitted}
      />
    </MemoryRouter>
  );
  const view = render(ui(value), { wrapper: createAppShellWrapper("en") });
  const input = screen.getByRole("textbox", { name: "Value" }) as HTMLInputElement;
  return {
    input,
    onValueChange,
    onValueCommitted,
    rerender: (next: Row["value"]) => view.rerender(ui(next)),
    unmount: view.unmount,
    drafts: () => onValueChange.mock.calls.map(([, draft]) => draft),
  };
}

describe("DataTable editor drafts", () => {
  it.each(["number", "money"] as const)(
    "notifies unparsed %s drafts, including incomplete input, before confirmation",
    (type) => {
      const { input, onValueChange, onValueCommitted, drafts } = renderEditor(12, type);
      act(() => input.focus());
      expect(onValueChange).not.toHaveBeenCalled();
      fireEvent.change(input, { target: { value: "-" } });
      fireEvent.change(input, { target: { value: "-3.50" } });
      expect(drafts()).toEqual(["-", "-3.50"]);
      expect(onValueCommitted).not.toHaveBeenCalled();
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith({ id: "1", value: 12 }, -3.5);
      expect(onValueChange.mock.invocationCallOrder[1]).toBeLessThan(
        onValueCommitted.mock.invocationCallOrder[0],
      );
      expect(drafts()).toEqual(["-", "-3.50"]);
    },
  );

  it("keeps raw IME drafts after composition ends and normalizes only on cell confirmation", () => {
    const { input, onValueCommitted, drafts } = renderEditor();
    act(() => input.focus());
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "１５" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(drafts()).toEqual(["１５"]);
    expect(onValueCommitted).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    expect(input.value).toBe("１５");
    expect(drafts()).toEqual(["１５"]);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith({ id: "1", value: 12 }, 15);
  });

  it("notifies empty direct text as a raw string and confirms it as null", () => {
    const { input, onValueCommitted, drafts } = renderEditor("Note", "text");
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "" } });
    expect(drafts()).toEqual([""]);
    expect(onValueCommitted).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith({ id: "1", value: "Note" }, null);
  });

  it("restores the latest data on Escape and notifies only the changed draft", () => {
    const { input, onValueChange, onValueCommitted, drafts, rerender } = renderEditor();
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "7" } });
    rerender(18);
    expect(input.value).toBe("7");
    expect(drafts()).toEqual(["7"]);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("18");
    expect(drafts()).toEqual(["7", "18"]);
    expect(onValueCommitted).not.toHaveBeenCalled();
    onValueChange.mockClear();
    fireEvent.keyDown(input, { key: "Escape" });
    act(() => input.blur());
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it("holds malformed numeric drafts on Enter and Tab, then notifies restoration on blur", () => {
    const { input, onValueCommitted, drafts, rerender } = renderEditor();
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "-" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.keyDown(input, { key: "Tab" });
    expect(document.activeElement).toBe(input);
    expect(drafts()).toEqual(["-"]);
    expect(onValueCommitted).not.toHaveBeenCalled();
    rerender(20);
    expect(input.value).toBe("-");
    act(() => input.blur());
    expect(input.value).toBe("20");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(drafts()).toEqual(["-", "20"]);
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it("compares confirmation with the latest data rather than an edit-start snapshot", () => {
    const { input, onValueCommitted, drafts, rerender } = renderEditor();
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "18.00" } });
    rerender(18);
    expect(input.value).toBe("18.00");
    expect(drafts()).toEqual(["18.00"]);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onValueCommitted).not.toHaveBeenCalled();
    expect(drafts()).toEqual(["18.00"]);
  });

  it("preserves an untouched active draft during external updates and confirms against latest data", () => {
    const { input, onValueChange, onValueCommitted, rerender } = renderEditor();
    act(() => input.focus());
    rerender(18);
    expect(input.value).toBe("12");
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith({ id: "1", value: 18 }, 12);
  });

  it("follows external data while there is no active draft without notifying", () => {
    const { input, onValueChange, onValueCommitted, rerender } = renderEditor();
    rerender(18);
    expect(input.value).toBe("18");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "ends editing on Enter (shift: %s) while keeping same-cell focus",
    (shiftKey) => {
      const { input, onValueCommitted } = renderEditor();
      act(() => input.focus());
      fireEvent.change(input, { target: { value: "18" } });
      fireEvent.keyDown(input, { key: "Enter", shiftKey });
      expect(onValueCommitted).toHaveBeenCalledExactlyOnceWith({ id: "1", value: 12 }, 18);
      expect(document.activeElement).toBe(input);
      expect(input.readOnly).toBe(true);
      expect(input.value).toBe("12");
      expect(input.className).toContain("astw:text-transparent");
      expect(input.closest("td")?.querySelector("span")?.className).not.toContain("astw:invisible");
      fireEvent.keyDown(input, { key: "Enter" });
      expect(input.readOnly).toBe(false);
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(2);
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
    },
  );

  it("restarts editing when the focused display cell is clicked", () => {
    const { input, onValueCommitted } = renderEditor();
    act(() => input.focus());
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.readOnly).toBe(true);
    fireEvent.mouseDown(input, { button: 0 });
    fireEvent.mouseUp(input, { button: 0 });
    expect(input.readOnly).toBe(false);
    expect(document.activeElement).toBe(input);
    expect(onValueCommitted).not.toHaveBeenCalled();
  });

  it("discards an active draft on unmount without either notification", () => {
    const { input, onValueChange, onValueCommitted, unmount } = renderEditor();
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "18" } });
    onValueChange.mockClear();
    unmount();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onValueCommitted).not.toHaveBeenCalled();
  });
});

it("exports editor option types and types callbacks by editor output at the package root", () => {
  const number: NumberCellEditOptions<Row> = {
    canEdit: (row, state) => {
      expectTypeOf(row).toEqualTypeOf<Row>();
      expectTypeOf(state).toEqualTypeOf<CellEditState>();
      return true;
    },
    onValueChange: (_row, draft) => {
      expectTypeOf(draft).toEqualTypeOf<string>();
    },
    onValueCommitted: (_row, value) => {
      expectTypeOf(value).toEqualTypeOf<number | null>();
    },
  };
  const text: TextCellEditOptions<Row> = {
    onValueChange: (_row, draft) => {
      expectTypeOf(draft).toEqualTypeOf<string | null>();
    },
    onValueCommitted: (_row, value) => {
      expectTypeOf(value).toEqualTypeOf<string | null>();
    },
  };
  const badge: BadgeCellEditOptions<Row> = {
    onValueChange: (_row, draft) => {
      expectTypeOf(draft).toEqualTypeOf<string | null>();
    },
    onValueCommitted: (_row, value) => {
      expectTypeOf(value).toEqualTypeOf<string | null>();
    },
  };
  const date: DateCellEditOptions<Row> = {
    onValueChange: (_row, draft) => {
      expectTypeOf(draft).toEqualTypeOf<string | DateTimeDraft | null>();
    },
    onValueCommitted: (_row, value) => {
      expectTypeOf(value).toEqualTypeOf<string | null>();
    },
  };
  expectTypeOf<DateTimeDraft>().toEqualTypeOf<{ day: string | null; time: string | null }>();
  expectTypeOf(number).toEqualTypeOf<NumberCellEditOptions<Row>>();
  expectTypeOf(text).toEqualTypeOf<TextCellEditOptions<Row>>();
  expectTypeOf(badge).toEqualTypeOf<BadgeCellEditOptions<Row>>();
  expectTypeOf(date).toEqualTypeOf<DateCellEditOptions<Row>>();
});
