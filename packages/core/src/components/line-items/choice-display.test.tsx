import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import type { LineItemsColumn } from "./types";

afterEach(cleanup);
type Row = { id?: string; value: string | null; allowed: boolean };
const rawValue = "2026-12-01";
const choiceLabel = "First closing day";
const edit = {
  editorType: "combobox" as const,
  canEdit: (row: Row) => row.allowed,
  editorOptions: { options: [{ value: rawValue, label: choiceLabel }] },
};
const base = { accessorKey: "value" as const, label: "Value", edit };
const configurations = buildConfigurations({ modules: [], locale: "en", timeZone: "UTC" });

function setup(column: LineItemsColumn<Row>) {
  function Owner() {
    const value = useLineItems<Row>({
      columns: [column],
      defaultLines: [
        { id: "A", value: rawValue, allowed: true },
        { id: "B", value: rawValue, allowed: false },
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
  return render(<Owner />);
}

describe("LineItems choice display policy", () => {
  it("formats the raw date in both editable and readonly rows, not its choice label", () => {
    setup({
      ...base,
      type: "date",
      typeOptions: { locale: "en-US", dateFormat: "short" },
    });
    expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Dec 1, 2026",
      "Dec 1, 2026",
    ]);
    expect(screen.getByRole<HTMLInputElement>("combobox").value).toBe(choiceLabel);
  });

  it.each([undefined, "text", "link", "badge"] as const)(
    "retains choice labels for %s display in editable and readonly rows",
    (type) => {
      const href = vi.fn((row: Row) => `/lines/${row.id}?date=${row.value}`);
      let column: LineItemsColumn<Row>;
      if (type === "link") column = { ...base, type, typeOptions: { href } };
      else if (type === "badge")
        column = {
          ...base,
          type,
          typeOptions: { badgeVariantMap: { [rawValue]: "success" } },
        };
      else column = { ...base, type };
      setup(column);
      const cells = screen.getAllByRole("cell");
      expect(cells.map((cell) => cell.textContent)).toEqual([choiceLabel, choiceLabel]);
      expect(screen.getAllByRole("combobox")).toHaveLength(1);
      if (type === "link") {
        expect(within(cells[0]).queryByRole("link")).toBeNull();
        expect(within(cells[1]).getByRole("link").getAttribute("href")).toBe(
          `/lines/B?date=${rawValue}`,
        );
        expect(href).toHaveBeenCalledWith(expect.objectContaining({ id: "B", value: rawValue }));
      }
      if (type === "badge")
        for (const cell of cells)
          expect(cell.querySelector('[class*="bg-success-solid"]')).not.toBeNull();
    },
  );

  it.each([null, "Custom date"])(
    "keeps custom date output %s ahead of built-in formatting",
    (output) => {
      setup({ ...base, type: "date", render: () => output });
      expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
        output ?? "",
        output ?? "",
      ]);
    },
  );
});
