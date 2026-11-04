import { useState } from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SelectionAction } from "@/components/internals/table-core/selection-types";
import { createAppShellWrapper } from "../../../tests/test-utils";
import { Button } from "@/components/button";
import { Toolbar } from "@/components/toolbar";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import type { UseLineItemsReturn } from "./types";

afterEach(cleanup);
type Row = { id: string; name: string };
let model: UseLineItemsReturn<Row>;
function Harness({
  actions = true,
  selected = ["A", "missing"],
  actionList,
}: {
  actions?: boolean;
  selected?: string[];
  actionList?: SelectionAction[];
}) {
  const [keys, setKeys] = useState(selected);
  model = useLineItems<Row>({
    columns: [{ accessorKey: "name", label: "Name" }],
    defaultLines: [
      { id: "A", name: "One" },
      { id: "B", name: "Two" },
    ],
    rowSelection: {
      selectedIds: keys,
      onChange: setKeys,
      actions: actions
        ? (actionList ?? [{ id: "delete", label: "Delete", onClick: () => {} }])
        : undefined,
    },
  });
  return (
    <LineItems.Root value={model}>
      <Toolbar.Root>
        <Toolbar.Row aria-label="Tools">
          <Button>Columns</Button>
        </Toolbar.Row>
      </Toolbar.Root>
      <LineItems.Table />
      <LineItems.Footer>
        <div className="document-actions">
          <Button>Add line</Button>
          <Button>Save</Button>
        </div>
      </LineItems.Footer>
    </LineItems.Root>
  );
}

describe("LineItems.Footer", () => {
  it("requires Root", () => {
    expect(() => render(<LineItems.Footer />)).toThrow(
      "LineItems.Footer must be rendered inside LineItems.Root",
    );
  });

  it("shares Root selection, ignores stale keys, and provides count/Clear without changing the document", async () => {
    const { container } = render(<Harness />, { wrapper: createAppShellWrapper("en") });
    const bar = screen.getByRole("group", { name: "Bulk actions" });
    expect(screen.queryByRole("button", { name: "Add line" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(within(bar).getByText("1 of 2 selected")).toBeDefined();
    expect(
      screen.getByRole("checkbox", { name: "Select line 1" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      container.querySelector('[data-slot="line-items-footer"]')!.hasAttribute("data-selecting"),
    ).toBe(true);
    expect(container.querySelector('[data-slot="line-items"]')!.className).toContain(
      "astw:overflow-clip",
    );
    const header = screen.getByRole("checkbox", { name: "Select all visible lines" });
    await userEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(document.activeElement).toBe(header);
    expect(screen.getByRole("button", { name: "Add line" })).toBeDefined();
    expect(model.hasUnsavedChanges()).toBe(false);
  });

  it("uses the leading control as a focus fallback when search disables the selection header", async () => {
    render(<Harness />, { wrapper: createAppShellWrapper("en") });
    act(() => model.setSearchQuery("No matches"));
    await userEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add line" }));
    expect(model.searchQuery).toBe("No matches");
  });

  it("uses plain div layout for the exclusive bulk bar and ordinary children", async () => {
    const { container } = render(<Harness />, { wrapper: createAppShellWrapper("en") });
    const footer = container.querySelector('[data-slot="line-items-footer"]')!;
    expect(footer.querySelector('[data-slot^="toolbar"]')).toBeNull();
    expect(footer.querySelector(".document-actions")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(footer.querySelector(".document-actions")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
    expect(footer.querySelector('[data-slot^="toolbar"]')).toBeNull();
  });

  it("leaves ordinary footer controls visible when there are no bulk action nodes", () => {
    render(<Harness actions={false} />, { wrapper: createAppShellWrapper("en") });
    expect(screen.getByRole("button", { name: "Add line" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Clear selection" })).toBeNull();
  });

  it("shares DataTable overflow and pending-action behavior, including bar remounts", async () => {
    let resolve!: () => void;
    const request = new Promise<void>((done) => {
      resolve = done;
    });
    const run = vi.fn<SelectionAction["onClick"]>(() => request);
    const actionList: SelectionAction[] = [
      { id: "work", label: "Work", onClick: run },
      { id: "two", label: "Two", onClick: () => {} },
      { id: "three", label: "Three", onClick: () => {} },
      { id: "four", label: "Four", onClick: () => {} },
    ];
    render(<Harness actionList={actionList} />, { wrapper: createAppShellWrapper("en") });
    expect(screen.getByRole("button", { name: "More actions" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Four" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Work" }));
    expect(run.mock.calls[0]?.[0]).toEqual(["A"]);
    expect(model.pendingActionId).toBe("work");
    expect(
      (screen.getByRole("button", { name: "Clear selection" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    act(() => model.clearSelection?.());
    act(() => model.toggleRowSelection?.(model.allLines[1]!));
    expect((screen.getByRole("button", { name: "Work" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => {
      resolve();
      await request;
    });
    expect(model.pendingActionId).toBeNull();
    expect(model.selectedIds).toEqual(["B"]);
  });

  it("localizes the selection controls", () => {
    render(<Harness />, { wrapper: createAppShellWrapper("ja") });
    expect(
      within(screen.getByRole("group", { name: "一括操作" })).getByText("2 行中 1 行を選択中"),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "選択を解除" })).toBeDefined();
  });
});
