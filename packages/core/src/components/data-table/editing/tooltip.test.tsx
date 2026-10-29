import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { createAppShellWrapper } from "../../../../tests/test-utils";
import { DataTable } from "../data-table";
import { useDataTable } from "../use-data-table";
import type { Column } from "../types";

afterEach(cleanup);

type Row = { id: string; value: string | number | null };

function Harness({ col, value }: { col: Column<Row>; value: Row["value"] }) {
  const table = useDataTable<Row>({ columns: [col], data: { rows: [{ id: "1", value }] } });
  return (
    <MemoryRouter>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
    </MemoryRouter>
  );
}

const editors: {
  name: string;
  value: Row["value"];
  col: Column<Row>;
  role: "textbox" | "combobox" | "button";
}[] = [
  {
    name: "text",
    value: "A long cell value",
    col: { type: "text", edit: { onValueCommitted: vi.fn() } },
    role: "textbox",
  },
  {
    name: "number",
    value: 12345,
    col: { type: "number", edit: { onValueCommitted: vi.fn() } },
    role: "textbox",
  },
  {
    name: "dropdown",
    value: "warehouse-id",
    col: {
      type: "text",
      edit: {
        options: [{ value: "warehouse-id", label: "A long warehouse label" }],
        onValueCommitted: vi.fn(),
      },
    },
    role: "combobox",
  },
  {
    name: "date",
    value: "2026-10-02",
    col: { type: "date", edit: { onValueCommitted: vi.fn() } },
    role: "button",
  },
];

function setup(col: Column<Row>, value: Row["value"]) {
  const column = { id: "value", label: "Value", truncate: true, ...col };
  const view = render(<Harness col={column} value={value} />, {
    wrapper: createAppShellWrapper("en"),
  });
  return {
    user: userEvent.setup(),
    ...view,
    update: (next: Row["value"]) => view.rerender(<Harness col={column} value={next} />),
  };
}

const queryTooltip = () => document.querySelector('[data-slot="tooltip-content"]');
const findTooltip = () =>
  waitFor(() => {
    const tooltip = queryTooltip();
    expect(tooltip).not.toBeNull();
    return tooltip!;
  });

describe("editable cell truncation tooltips", () => {
  it.each(editors)(
    "shows the full $name value only at rest, without remounting its editor",
    async ({ value, col, role }) => {
      const { user } = setup(col, value);
      const editor = screen.getByRole(role, { name: /^Value/ });
      const cell = editor.closest("td")!;
      await user.hover(cell);
      expect((await findTooltip()).textContent).toBe(String(value));
      await user.click(editor);
      await waitFor(() => expect(queryTooltip()).toBeNull());
      expect(screen.getByRole(role, { name: /^Value/ })).toBe(editor);
      await user.keyboard("{Escape}");
      await user.unhover(cell);
      await user.hover(cell);
      expect((await findTooltip()).textContent).toBe(String(value));
      expect(screen.getByRole(role, { name: /^Value/ })).toBe(editor);
    },
  );

  it("keeps numeric parsing feedback instead of the full-value tooltip while editing", async () => {
    const { user } = setup({ type: "number", edit: { onValueCommitted: vi.fn() } }, 12345);
    const editor = screen.getByRole("textbox", { name: "Value" });
    await user.click(editor);
    await user.clear(editor);
    await user.keyboard("-{Enter}");
    const tooltip = await findTooltip();
    expect(tooltip.textContent).toContain("Enter a number");
    expect(tooltip.textContent).not.toContain("12345");
    expect(editor.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(editor);
  });

  it("preserves an active draft and focus when external data gains a tooltip value", async () => {
    const { user, update } = setup({ type: "text", edit: { onValueCommitted: vi.fn() } }, null);
    const editor = screen.getByRole("textbox", { name: "Value" }) as HTMLInputElement;
    await user.click(editor);
    await user.type(editor, "Unfinished");
    update("External value");
    expect(screen.getByRole("textbox", { name: "Value" })).toBe(editor);
    expect(editor.value).toBe("Unfinished");
    expect(document.activeElement).toBe(editor);
    expect(queryTooltip()).toBeNull();
  });
});
