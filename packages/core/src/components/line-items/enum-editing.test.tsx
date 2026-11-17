import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import type { LineItemsColumn, UseLineItemsReturn } from "./types";

afterEach(cleanup);

it("adopts selected nullable enum values rather than their labels", async () => {
  type Row = { id?: string; status: "draft" | "confirmed" | null };
  const checked = vi.fn((_row: Readonly<Row>, _value: Row["status"]) => {});
  const columns: LineItemsColumn<Row>[] = [
    {
      accessorKey: "status",
      label: "Status",
      edit: {
        editorType: "combobox",
        editorOptions: {
          options: [
            { value: "draft", label: "Draft" },
            { value: "confirmed", label: "Confirmed" },
          ],
        },
        onValueCommitted: checked,
      },
    },
  ];
  let value!: UseLineItemsReturn<Row>;
  function Owner() {
    value = useLineItems<Row>({
      columns,
      defaultLines: [{ id: "A", status: "draft" }],
      orderer: false,
    });
    return (
      <LineItems.Root value={value}>
        <LineItems.Table />
      </LineItems.Root>
    );
  }
  render(
    <MemoryRouter>
      <AppShellConfigContext.Provider
        value={{ configurations: buildConfigurations({ modules: [], locale: "en" }) }}
      >
        <Owner />
      </AppShellConfigContext.Provider>
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: "Status, Row 1" }));
  await user.click(screen.getByRole("option", { name: "Confirmed" }));
  expect(checked).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ status: "draft" }),
    "confirmed",
  );
  expect(value.lines[0].status).toBe("confirmed");
  expect(value.isDirty).toBe(true);
  expect(screen.getByRole("cell").textContent).toBe("Confirmed");
});
