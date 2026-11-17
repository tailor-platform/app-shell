import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AppShellConfigContext, buildConfigurations } from "@/contexts/appshell-context";
import { LineItems } from "./line-items";
import { useLineItems } from "./use-line-items";
import type { UseLineItemsReturn } from "./types";
import { Table } from "@/components/table";
import { createCellEditSession } from "@/components/internals/table-core/cell-session";
import { EditableCell } from "@/components/internals/table-core/editing/cell";
import { textEditor, numberEditor } from "@/components/internals/table-core/editing/typing";
import { choiceEditor } from "@/components/internals/table-core/editing/choice";
import { dateEditor } from "@/components/internals/table-core/editing/date";
import type { CellEditorLabels } from "@/components/internals/table-core/editing/props";

// Exercise the shared presentation with the document-retained sessions used by LineItems.
afterEach(cleanup);
const labels: CellEditorLabels = {
  notANumber: "Not a number",
  revertHint: "Esc to revert",
  callbackError: "Could not confirm",
  errorHint: "Check the value",
  showError: "Show error",
  errorDialog: "Cell error",
  closeError: "Close error",
  none: "None",
  noMatches: "No matches",
  chooseTime: "Time",
  clear: "Clear",
  done: "Done",
  unconfirmed: "Unconfirmed input",
  confirming: "Confirming input",
};

function setup({ numeric = false, retained = true, commit = vi.fn() } = {}) {
  const session = createCellEditSession<unknown>();
  function View({ show = true }: { show?: boolean }) {
    return show ? (
      <Table.Root>
        <Table.Body>
          <Table.Row>
            <EditableCell<Record<string, never>, string | number | null>
              editor={numeric ? numberEditor : textEditor}
              options={{}}
              current={numeric ? 2 : "Initial"}
              display={numeric ? "2" : "Initial"}
              cellProps={{}}
              session={retained ? session : undefined}
              commit={commit}
              labels={labels}
              slotPrefix="line-items"
              rowKey="A"
              colKey="value"
              label="Value"
              align="left"
            />
          </Table.Row>
        </Table.Body>
      </Table.Root>
    ) : null;
  }
  const view = render(<View />);
  return {
    ...view,
    session,
    commit,
    user: userEvent.setup(),
    show: (show: boolean) => view.rerender(<View show={show} />),
  };
}
const input = () => screen.getByRole("textbox", { name: "Value" }) as HTMLInputElement;
const marker = () => document.querySelector('[data-slot="line-items-cell-unconfirmed"]');
function draft(value: string) {
  act(() => input().focus());
  fireEvent.change(input(), { target: { value } });
}

describe("document-owned draft presentation", () => {
  it("keeps a dismissed LineItems error and unadopted draft when its table remounts", async () => {
    type Row = { id?: string; name: string | null };
    const commit = vi.fn(() => {
      throw new Error("Rejected");
    });
    let value!: UseLineItemsReturn<Row>;
    const configurations = buildConfigurations({ modules: [], locale: "en", timeZone: "UTC" });
    function Owner({ show = true }: { show?: boolean }) {
      value = useLineItems<Row>({
        columns: [
          {
            accessorKey: "name",
            label: "Name",
            edit: { editorType: "text", onValueCommitted: commit },
          },
        ],
        defaultLines: [{ id: "A", name: "Initial" }],
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
    const field = () => screen.getByRole("textbox", { name: "Name, Row 1" }) as HTMLInputElement;
    act(() => field().focus());
    expect(marker()).toBeNull();
    fireEvent.change(field(), { target: { value: "Retained" } });
    expect(marker()).not.toBeNull();
    view.rerender(<Owner show={false} />);
    expect(commit).not.toHaveBeenCalled();
    view.rerender(<Owner />);
    expect(field().value).toBe("Retained");
    expect(marker()).not.toBeNull();
    expect(document.activeElement).not.toBe(field());
    fireEvent.keyDown(field(), { key: "Enter" });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Close error details" }));
    view.rerender(<Owner show={false} />);
    view.rerender(<Owner />);
    expect(field().value).toBe("Retained");
    expect(field().getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByRole("dialog", { name: "Error for Name, Row 1" })).toBeNull();
    expect(value.lines[0].name).toBe("Initial");
    expect(value.isDirty).toBe(false);
    expect(commit).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Show error for Name, Row 1" }));
    expect(await screen.findByRole("dialog", { name: "Error for Name, Row 1" })).toBeDefined();
  });

  it("marks actual changes, not focus or a cosmetic numeric change", () => {
    const editor = setup({ numeric: true });
    act(() => input().focus());
    expect(marker()).toBeNull();
    fireEvent.change(input(), { target: { value: "2.00" } });
    expect(marker()).toBeNull();
    fireEvent.change(input(), { target: { value: "2.5" } });
    expect(marker()).not.toBeNull();
    const description = document.getElementById(input().getAttribute("aria-describedby")!);
    expect(description?.textContent).toBe("Unconfirmed input");
    expect(marker()?.getAttribute("aria-hidden")).toBe("true");
    expect(marker()?.hasAttribute("tabindex")).toBe(false);
    expect(document.querySelector('[data-slot="tooltip-content"]')?.textContent).toBe(
      "Unconfirmed input",
    );
    act(() => editor.session.cancel());
    expect(marker()).toBeNull();
  });

  it("restores a marked draft without focusing or committing during teardown", async () => {
    const editor = setup();
    draft("Retained");
    editor.show(false);
    expect(editor.commit).not.toHaveBeenCalled();
    editor.show(true);
    expect(input().value).toBe("Retained");
    expect(marker()).not.toBeNull();
    expect(document.activeElement).not.toBe(input());
    expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();
    expect(editor.commit).not.toHaveBeenCalled();
    await editor.user.hover(screen.getByRole("cell"));
    await waitFor(() =>
      expect(document.querySelector('[data-slot="tooltip-content"]')?.textContent).toBe(
        "Unconfirmed input",
      ),
    );
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(input().value).toBe("Initial");
    expect(marker()).toBeNull();
  });

  it("uses a spinner while confirming and clears it on completion", async () => {
    let resolve!: () => void;
    const request = new Promise<void>((success) => {
      resolve = success;
    });
    const editor = setup({ commit: vi.fn(() => request) });
    draft("Pending");
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(marker()).toBeNull();
    const status = document.querySelector('[data-slot="line-items-cell-confirming"]');
    expect(status?.querySelector('[data-slot="spinner"]')).not.toBeNull();
    expect(screen.getByRole("cell").getAttribute("aria-busy")).toBe("true");
    expect(document.getElementById(input().getAttribute("aria-describedby")!)?.textContent).toBe(
      "Confirming input",
    );
    editor.show(false);
    editor.show(true);
    expect(document.querySelector('[data-slot="line-items-cell-confirming"]')).not.toBeNull();
    expect(editor.commit).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve();
      await request;
    });
    expect(document.querySelector('[data-slot="line-items-cell-confirming"]')).toBeNull();
    expect(screen.getByRole("cell").getAttribute("aria-busy")).toBeNull();
  });

  it("retains dismissal through remount, allows reopening and opens a new retry failure", async () => {
    const error = new Error("Rejected");
    const editor = setup({
      commit: vi.fn(() => {
        throw error;
      }),
    });
    draft("Rejected draft");
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(marker()).toBeNull();
    expect(await screen.findByRole("dialog", { name: "Cell error" })).toBeDefined();
    await editor.user.click(screen.getByRole("button", { name: "Close error" }));
    expect(screen.queryByRole("dialog", { name: "Cell error" })).toBeNull();
    editor.show(false);
    editor.show(true);
    expect(input().value).toBe("Rejected draft");
    expect(input().getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByRole("dialog", { name: "Cell error" })).toBeNull();
    fireEvent.keyDown(input(), { key: "ArrowDown", altKey: true });
    expect(await screen.findByRole("dialog", { name: "Cell error" })).toBeDefined();
    await editor.user.click(screen.getByRole("button", { name: "Close error" }));
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(editor.commit).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("dialog", { name: "Cell error" })).toBeDefined();
  });

  it("does not add draft markers to local DataTable-style sessions", () => {
    setup({ retained: false });
    draft("Changed");
    expect(marker()).toBeNull();
    expect(input().hasAttribute("aria-describedby")).toBe(false);
  });

  it.each(["choice", "date"] as const)(
    "restores a marked %s draft without opening its popup",
    (kind) => {
      const session = createCellEditSession<unknown>();
      session.change(
        kind === "choice"
          ? { value: "closed", label: "Closed" }
          : { day: "2026-10-20", time: null },
      );
      const common = {
        session,
        display: "Initial",
        cellProps: {},
        commit: vi.fn(),
        labels,
        slotPrefix: "line-items",
        rowKey: "A",
        colKey: "value",
        label: "Value",
        align: "left" as const,
      };
      render(
        <Table.Root>
          <Table.Body>
            <Table.Row>
              {kind === "choice" ? (
                <EditableCell
                  {...common}
                  editor={choiceEditor}
                  options={{ options: [{ value: "closed", label: "Closed" }] }}
                  current="open"
                />
              ) : (
                <EditableCell
                  {...common}
                  editor={dateEditor}
                  options={{ timeZone: "UTC" }}
                  current="2026-10-02"
                />
              )}
            </Table.Row>
          </Table.Body>
        </Table.Root>,
      );
      expect(marker()).not.toBeNull();
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(document.querySelector('[data-slot="line-items-cell-calendar"]')).toBeNull();
      expect(common.commit).not.toHaveBeenCalled();
    },
  );
});
