import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { ICON_SPACE_CLASS_NAME } from "@/components/internals/table-core/editing/shared";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import type { LineItemsColumn } from "./types";

afterEach(cleanup);
type Row = { id?: string; value: string | null; amount: number | null; allowed: boolean };
const canEdit = (row: Row) => row.allowed;
const configurations = buildConfigurations({ modules: [], locale: "en", timeZone: "UTC" });

function setup(kind: "combobox" | "date" | "text" | "number", align: "left" | "center" | "right") {
  const presentation = {
    label: "Value",
    align,
    cellProps: () => ({ style: { backgroundColor: "lavender" }, title: "Cell presentation" }),
  };
  let column: LineItemsColumn<Row>;
  if (kind === "number") {
    column = {
      ...presentation,
      accessorKey: "amount",
      type: "number",
      edit: { editorType: "number", canEdit },
    };
  } else if (kind === "combobox") {
    column = {
      ...presentation,
      accessorKey: "value",
      edit: {
        editorType: "combobox",
        canEdit,
        editorOptions: { options: [{ value: "2026-12-01", label: "Closing day" }] },
      },
    };
  } else {
    column = {
      ...presentation,
      accessorKey: "value",
      type: kind,
      edit: { editorType: kind, canEdit },
    };
  }
  function Owner() {
    const value = useLineItems<Row>({
      columns: [column],
      defaultLines: [
        { id: "A", value: "2026-12-01", amount: 12, allowed: true },
        { id: "B", value: "2026-12-01", amount: 12, allowed: false },
      ],
      orderer: false,
    });
    return (
      <MemoryRouter>
        <AppShellConfigContext.Provider value={{ configurations }}>
          <LineItems.Root value={value}>
            <LineItems.Table />
          </LineItems.Root>
        </AppShellConfigContext.Provider>
      </MemoryRouter>
    );
  }
  render(<Owner />);
}

describe("LineItems mixed-permission icon spacing", () => {
  it.each(["left", "center", "right"] as const)(
    "reserves the same icon space in editable and readonly rows with %s alignment",
    (align) => {
      for (const kind of ["combobox", "date", "text", "number"] as const) {
        setup(kind, align);
        const [editable, readonly] = screen.getAllByRole("cell");
        const hasIcon = kind === "combobox" || kind === "date";
        for (const cell of [editable, readonly]) {
          const preview = Array.from(cell.children).find((child) =>
            child.classList.contains("astw:block"),
          );
          expect(preview?.classList.contains(ICON_SPACE_CLASS_NAME) ?? false).toBe(hasIcon);
          expect(cell.classList.contains(`astw:text-${align}`)).toBe(true);
          expect(cell.style.backgroundColor).toBe("lavender");
          expect(cell.title).toBe("Cell presentation");
        }
        expect(editable.hasAttribute("data-editable")).toBe(true);
        expect(readonly.hasAttribute("data-editable")).toBe(false);
        expect(within(readonly).queryByRole("combobox")).toBeNull();
        expect(within(readonly).queryByRole("textbox")).toBeNull();
        expect(within(readonly).queryByRole("button")).toBeNull();
        expect(readonly.querySelector("svg")).toBeNull();
        expect(readonly.textContent).toBe(editable.firstElementChild?.textContent);
        cleanup();
      }
    },
  );
});
