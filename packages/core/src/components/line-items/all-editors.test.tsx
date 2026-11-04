import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { LineItems } from "./line-items";
import { createLineItemHelper } from "./column-helper";
import { useLineItems } from "./use-line-items";
import type { LineItemsChangeSet, LineItemsColumn, UseLineItemsReturn } from "./types";

afterEach(cleanup);
type Row = {
  id?: string;
  enabled: boolean;
  day: string | null;
  unit: string | null;
  priority: 1 | 2 | null;
  supplier: string | null;
  pack: { units: number } | null;
};
const { column } = createLineItemHelper<Row>();
const columns = [
  column({
    accessorKey: "enabled",
    label: "Enabled",
    type: "text",
    edit: { editorType: "boolean" },
  }),
  column({
    accessorKey: "day",
    label: "Date",
    type: "date",
    edit: { editorType: "date", min: "2026-12-01", max: "2026-12-31" },
  }),
  column({
    accessorKey: "unit",
    label: "Unit",
    render: (row) => (row.unit === "box" ? "Display box" : "Display each"),
    edit: {
      editorType: "combobox",
      options: [
        { value: "pcs", label: "Each" },
        { value: "box", label: "Box" },
      ],
    },
  }),
  column({
    accessorKey: "priority",
    label: "Priority",
    type: "number",
    edit: {
      editorType: "combobox",
      options: [
        { value: 1, label: "Normal" },
        { value: 2, label: "High" },
      ],
    },
  }),
  column({
    accessorKey: "supplier",
    label: "Supplier",
    type: "text",
    edit: {
      editorType: "combobox",
      fetcher: { fn: async () => [{ value: "S2", label: "Second supplier" }], debounceMs: 0 },
      getOptionLabel: (value) => (value === "S1" ? "Current supplier" : "Second supplier"),
    },
  }),
  column({
    accessorKey: "pack",
    label: "Pack",
    render: (row) => `${row.pack?.units ?? 0} units`,
    edit: {
      editorType: "custom",
      renderEditor: ({ value, onCommit, onCancel, ariaLabel }) => (
        <button
          aria-label={`Increase ${ariaLabel}`}
          onClick={() => onCommit({ units: (value?.units ?? 0) + 1 })}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel();
          }}
        >
          Increase
        </button>
      ),
    },
  }),
];
let current: UseLineItemsReturn<Row>;
const initial: Row[] = [
  {
    id: "A",
    enabled: false,
    day: "2026-12-10",
    unit: "pcs",
    priority: 1,
    supplier: "S1",
    pack: { units: 5 },
  },
];
function Harness({ schema = columns }: { schema?: readonly LineItemsColumn<Row>[] }) {
  const model = useLineItems<Row>({ columns: schema, defaultLines: initial });
  current = model;
  const [saved, setSaved] = useState<LineItemsChangeSet<Row> | null>(null);
  return (
    <>
      <LineItems.Root value={model}>
        <LineItems.Table />
      </LineItems.Root>
      <button onClick={() => model.revert()}>Discard</button>
      <button
        onClick={() => {
          void model.commitEdits().then(setSaved);
        }}
      >
        Save
      </button>
      <output data-testid="saved">{JSON.stringify(saved)}</output>
    </>
  );
}
function setup(schema?: readonly LineItemsColumn<Row>[]) {
  render(<Harness schema={schema} />, { wrapper: createAppShellWrapper("en") });
  return userEvent.setup();
}
function dayButton(day: string) {
  const popup = document.querySelector<HTMLElement>('[data-slot="table-cell-calendar"]')!;
  return within(popup)
    .getAllByRole("button")
    .find((button) => button.textContent === day && !button.hasAttribute("data-outside-month"))!;
}

describe("all LineItems editors adopt through the document controller", () => {
  it("confirms real booleans with the keyboard and Discard restores them", async () => {
    const user = setup();
    const checkbox = screen.getByRole("checkbox", { name: "Enabled, line 1" });
    checkbox.focus();
    const cell = checkbox.closest("td")!;
    expect(cell.className).toContain("background-image:linear-gradient");
    expect(cell.className).not.toContain("astw:focus-within:[background-image:none]");
    await user.keyboard(" ");
    expect(document.activeElement).toBe(checkbox);
    expect(cell.className).not.toContain("astw:focus-within:[background-image:none]");
    expect(current.allLines[0]!.enabled).toBe(true);
    expect(current.getChangeSet().lineChanges).toContainEqual({
      action: "update",
      lineId: "A",
      patch: { enabled: true },
    });
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(current.allLines[0]!.enabled).toBe(false);
    expect(current.isDirty).toBe(false);
  });

  it("adopts a calendar day unchanged, explicitly clears, and cancels without clearing", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: /^Date, line 1/ }));
    await user.click(dayButton("20"));
    expect(current.allLines[0]!.day).toBe("2026-12-20");
    await user.click(screen.getByRole("button", { name: /^Date, line 1/ }));
    await user.keyboard("{Escape}");
    expect(current.allLines[0]!.day).toBe("2026-12-20");
    await user.click(screen.getByRole("button", { name: /^Date, line 1/ }));
    await user.click(screen.getByRole("button", { name: "Clear date" }));
    expect(current.allLines[0]!.day).toBeNull();
  });

  it("validates malformed/out-of-range dates written through commands too", async () => {
    setup();
    for (const day of ["bad", "2026-11-30", "2027-01-01"]) {
      act(() => current.updateField("A", "day", day));
      expect(current.errors.some((error) => error.columnId === "day")).toBe(true);
      await act(async () => {
        expect(await current.commitEdits()).toBeNull();
      });
    }
    act(() => current.updateField("A", "day", "2026-12-31"));
    expect(current.errors).toHaveLength(0);
  });

  it("preserves numeric choices and keeps choice labels independent of display", async () => {
    const user = setup();
    await user.click(screen.getByRole("combobox", { name: "Priority, line 1" }));
    await user.click(screen.getByRole("option", { name: "High" }));
    expect(current.allLines[0]!.priority).toBe(2);
    expect(typeof current.allLines[0]!.priority).toBe("number");
    await user.click(screen.getByRole("combobox", { name: "Unit, line 1" }));
    await user.click(screen.getByRole("option", { name: "Box" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(current.allLines[0]!.unit).toBe("box");
    expect(screen.getByText("Display box")).toBeDefined();
    await waitFor(() =>
      expect(
        JSON.parse(screen.getByTestId("saved").textContent!).lineChanges[0].patch.priority,
      ).toBe(2),
    );
  });

  it("searches remote options without adopting the query or fallback label", async () => {
    const user = setup();
    const combo = screen.getByRole("combobox", { name: "Supplier, line 1" });
    await user.click(combo);
    await screen.findByRole("option", { name: "Second supplier" });
    fireEvent.change(combo, { target: { value: "a query" } });
    expect(current.allLines[0]!.supplier).toBe("S1");
    await user.click(await screen.findByRole("option", { name: "Second supplier" }));
    expect(current.allLines[0]!.supplier).toBe("S2");
  });

  it("keeps custom structured values as objects without serialization", async () => {
    const user = setup();
    const original = current.allLines[0]!.pack;
    await user.click(screen.getByRole("button", { name: "Increase Pack, line 1" }));
    expect(current.allLines[0]!.pack).toEqual({ units: 6 });
    expect(current.allLines[0]!.pack).not.toBe(original);
    expect(original).toEqual({ units: 5 });
    await act(async () => {
      expect(await current.commitEdits()).toMatchObject({
        lineChanges: [{ action: "update", lineId: "A", patch: { pack: { units: 6 } } }],
      });
    });
  });

  it("keeps a failed date visibly aligned with its accessible retained value", async () => {
    const schema = columns.map((entry) =>
      entry.accessorKey === "day"
        ? column({
            ...entry,
            normalize: (value: Row["day"]) => {
              if (value === "2026-12-20") throw new Error("Rejected");
              return value;
            },
          })
        : entry,
    );
    const user = setup(schema);
    await user.click(screen.getByRole("button", { name: /^Date, line 1/ }));
    await user.click(dayButton("20"));
    expect(current.allLines[0]!.day).toBe("2026-12-10");
    const trigger = screen.getByRole("button", { name: "Date, line 1, 2026-12-20" });
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
    expect(trigger.closest("td")?.querySelector('span[aria-hidden="true"]')?.textContent).toBe(
      "2026-12-20",
    );
    await act(async () => {
      expect(await current.commitEdits()).toBeNull();
    });
  });

  it("keeps a failed choice visible even after blur", async () => {
    const schema = columns.map((entry) =>
      entry.accessorKey === "unit"
        ? column({
            ...entry,
            normalize: (value: Row["unit"]) => {
              if (value === "box") throw new Error("Rejected");
              return value;
            },
          })
        : entry,
    );
    const user = setup(schema);
    const combo = screen.getByRole("combobox", { name: "Unit, line 1" }) as HTMLInputElement;
    await user.click(combo);
    await user.click(screen.getByRole("option", { name: "Box" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(current.allLines[0]!.unit).toBe("pcs");
    expect(combo.value).toBe("Box");
    expect(combo.className).not.toContain("astw:text-transparent");
    expect(combo.closest("td")?.querySelector('span[aria-hidden="true"]')?.className).toContain(
      "astw:invisible",
    );
  });

  it("closes a portaled calendar when Discard cancels its logical session", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: /^Date, line 1/ }));
    expect(screen.getByRole("grid")).toBeDefined();
    act(() => current.revert());
    await waitFor(() => expect(screen.queryByRole("grid")).toBeNull());
    expect(current.hasUnsavedChanges()).toBe(false);
  });

  it("closes choice search on Discard without adopting its query", async () => {
    const user = setup();
    const combo = screen.getByRole("combobox", { name: "Unit, line 1" }) as HTMLInputElement;
    await user.click(combo);
    fireEvent.change(combo, { target: { value: "Box" } });
    act(() => current.revert());
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(combo.value).toBe("Each");
    expect(current.allLines[0]!.unit).toBe("pcs");
  });
});
