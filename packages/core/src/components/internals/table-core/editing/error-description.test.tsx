import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Table } from "@/components/table";
import { CellEditError } from "../cell-edit-error";
import { createCellEditSession } from "../cell-session";
import { EditableCell, type EditableCellOwnerProps } from "./cell";
import { choiceEditor } from "./choice";
import { dateEditor } from "./date";
import { numberEditor, textEditor } from "./typing";
import type { CellEditorLabels } from "./props";

afterEach(cleanup);

const labels: CellEditorLabels = {
  notANumber: "Enter a number",
  revertHint: "Esc to revert",
  callbackError: "Could not confirm",
  errorHint: "Alt+ArrowDown for details",
  showError: "Show error",
  errorDialog: "Cell error",
  closeError: "Close error",
  none: "None",
  noMatches: "No matches",
  chooseTime: "Time",
  clear: "Clear",
  done: "Done",
};

const messages = [
  { message: "Enter a quantity", hint: "Esc to revert" },
  { message: "Enter a quantity.", hint: "Esc to revert" },
  { message: "数量を入力してください", hint: "Escで元に戻す" },
  { message: "数量を入力してください。", hint: "Escで元に戻す" },
];

function expectDescriptions(control: Element, message: string, hint: string) {
  const ids = control.getAttribute("aria-describedby")!.split(/\s+/);
  expect(ids).toHaveLength(2);
  expect(new Set(ids).size).toBe(2);
  const elements = ids.map((id) => document.getElementById(id));
  expect(elements.every((element) => element?.classList.contains("astw:sr-only"))).toBe(true);
  expect(elements.map((element) => element?.textContent)).toEqual([message, hint]);
}

function renderCell(cell: ReactNode) {
  return render(
    <Table.Root>
      <Table.Body>
        <Table.Row>{cell}</Table.Row>
      </Table.Body>
    </Table.Root>,
  );
}

describe.each(["text", "number", "choice", "date"] as const)(
  "%s callback error descriptions",
  (kind) => {
    it.each(messages)("keeps '$message' separate from its hint", ({ message, hint }) => {
      const session = createCellEditSession<unknown>();
      let draft: unknown = "Changed";
      if (kind === "choice") draft = { value: "changed", label: "Changed" };
      if (kind === "date") draft = { day: "2026-12-02", time: null };
      session.begin(draft);
      session.confirm(() => {
        throw new CellEditError(message);
      });
      const props: EditableCellOwnerProps = {
        current: "Initial",
        display: "Initial",
        cellProps: {},
        commit: vi.fn(),
        labels: { ...labels, errorHint: hint },
        session,
        slotPrefix: "test",
        rowKey: "A",
        colKey: "value",
        label: "Value",
        align: "left",
      };
      let cell;
      if (kind === "choice")
        cell = (
          <EditableCell
            {...props}
            editor={choiceEditor}
            options={{ options: [{ value: "changed", label: "Changed" }] }}
          />
        );
      else if (kind === "date")
        cell = <EditableCell {...props} editor={dateEditor} options={{ timeZone: "UTC" }} />;
      else if (kind === "number")
        cell = <EditableCell {...props} editor={numberEditor} options={{}} />;
      else cell = <EditableCell {...props} editor={textEditor} options={{}} />;
      renderCell(cell);
      const control = screen.getByRole("cell").querySelector("input, button")!;
      expect(control.getAttribute("aria-invalid")).toBe("true");
      expectDescriptions(control, message, hint);
      expect(control.getAttribute("aria-keyshortcuts")).toBe("Alt+ArrowDown");
    });
  },
);

it.each(messages)(
  "keeps numeric parse message '$message' separate from its hint",
  ({ message, hint }) => {
    renderCell(
      <EditableCell
        editor={numberEditor}
        options={{}}
        current={2}
        display="2"
        cellProps={{}}
        commit={vi.fn()}
        labels={{ ...labels, notANumber: message, revertHint: hint }}
        slotPrefix="test"
        rowKey="A"
        colKey="value"
        label="Quantity"
        align="left"
      />,
    );
    const control = screen.getByRole("textbox", { name: "Quantity" });
    fireEvent.focus(control);
    fireEvent.change(control, { target: { value: "-" } });
    fireEvent.keyDown(control, { key: "Enter" });
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expectDescriptions(control, message, hint);
  },
);
