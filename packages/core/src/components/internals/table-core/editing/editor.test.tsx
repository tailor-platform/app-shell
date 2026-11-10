import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Table } from "@/components/table";
import { createCellEditSession } from "../cell-session";
import { EditableCell } from "./cell";
import { TypingEditor } from "./typing";
import type { CellEditorLabels } from "./props";

afterEach(cleanup);

const labels: CellEditorLabels = {
  notANumber: "Not a number",
  revertHint: "Press Escape to revert",
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
};

describe("editor composition", () => {
  it("renders and confirms a typing control without cell display or table props", () => {
    const commit = vi.fn();
    const { container } = render(
      <TypingEditor
        config={{ type: "number" }}
        current={12.5}
        commit={commit}
        labels={labels}
        slotPrefix="test"
        rowKey="A"
        colKey="value"
        label="Value"
        align="left"
        timeZone="UTC"
      >
        {({ input }) => <section>{input}</section>}
      </TypingEditor>,
    );
    expect(container.querySelector("td")).toBeNull();
    expect(container.querySelector("section > input")).not.toBeNull();
    const input = screen.getByRole("textbox", { name: "Value" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "14.5" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(commit).toHaveBeenCalledWith(14.5);
  });

  it("uses the choice entry's editor, icon and preview visibility", () => {
    render(
      <Table.Root>
        <Table.Body>
          <Table.Row>
            <EditableCell
              config={{ type: "choice", options: [{ value: "open", label: "Open" }] }}
              current="open"
              display="Formatted choice"
              cellProps={{ align: "left" }}
              commit={vi.fn()}
              labels={labels}
              slotPrefix="test"
              rowKey="A"
              colKey="choice"
              label="Choice"
              align="left"
              timeZone="UTC"
            />
          </Table.Row>
        </Table.Body>
      </Table.Root>,
    );
    const cell = screen.getByRole("cell");
    const input = screen.getByRole("combobox", { name: "Choice" });
    const preview = cell.firstElementChild!;
    expect(cell.querySelector(".lucide-chevron-down")).not.toBeNull();
    expect(preview.textContent).toBe("Formatted choice");
    expect(preview.className).toContain("astw:forced-colors:invisible");
    expect(preview.className.split(" ")).not.toContain("astw:invisible");
    fireEvent.focus(input);
    expect(preview.className.split(" ")).toContain("astw:invisible");
  });

  it.each(["confirming", "failed"] as const)(
    "keeps a retained %s date preview visible with the calendar closed",
    (status) => {
      const session = createCellEditSession<unknown>();
      render(
        <Table.Root>
          <Table.Body>
            <Table.Row>
              <EditableCell
                config={{ type: "date" }}
                current="2026-10-02"
                display="Formatted date"
                cellProps={{ align: "left" }}
                session={session}
                commit={vi.fn()}
                labels={labels}
                slotPrefix="test"
                rowKey="A"
                colKey="date"
                label="Date"
                align="left"
                timeZone="UTC"
              />
            </Table.Row>
          </Table.Body>
        </Table.Root>,
      );
      const cell = screen.getByRole("cell");
      expect(screen.getByRole("button", { name: "Date, Formatted date" }).parentElement).toBe(cell);
      act(() => {
        session.begin({ day: "2026-10-20", time: null });
        session.confirm(() => {
          if (status === "failed") throw new Error("Rejected");
          return new Promise<void>(() => {});
        });
      });
      expect(cell.textContent).toContain("2026-10-20");
      expect(screen.getByRole("button", { name: "Date, 2026-10-20" }).parentElement).toBe(cell);
      expect(document.querySelector('[data-slot="test-cell-calendar"]')).toBeNull();
      expect(cell.getAttribute("aria-busy")).toBe(status === "confirming" ? "true" : null);
      act(() => session.cancel());
      expect(cell.textContent).toContain("Formatted date");
      expect(screen.getByRole("button", { name: "Date, Formatted date" })).toBeDefined();
    },
  );
});
