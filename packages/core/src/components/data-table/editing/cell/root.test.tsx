import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { useState } from "react";
import { createAppShellWrapper } from "../../../../../tests/test-utils";
import type { CellEditState } from "../../types";
import {
  Harness,
  LINES,
  column,
  noop,
  receivedColumn,
  renderTable,
  retype,
  skuColumn,
  type Line,
} from "./test-utils";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderInAppRouter(ui: React.ReactElement) {
  const user = userEvent.setup();
  const router = createMemoryRouter([
    {
      path: "/",
      element: (
        <>
          {ui}
          <Link to="/elsewhere">Elsewhere</Link>
        </>
      ),
    },
    { path: "/elsewhere", element: <p>Somewhere else</p> },
  ]);
  render(<RouterProvider router={router} />, { wrapper: createAppShellWrapper("en") });
  return user;
}

function wouldWarnOnUnload() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

const blocked = (cell: Element | null | undefined) =>
  cell?.className.includes("astw:cursor-not-allowed") ?? false;

describe("DataTable inline editing", () => {
  describe("rendering", () => {
    it("renders an editor only where canEdit allows it, named by the column label", () => {
      renderTable(
        <Harness
          columns={(update) => [
            skuColumn,
            receivedColumn(vi.fn(), update, { canEdit: (row) => row.id !== "2" }),
          ]}
        />,
      );
      const inputs = screen.getAllByRole("textbox", { name: "Received" });
      expect(inputs).toHaveLength(2);
      expect(inputs.map((input) => (input as HTMLInputElement).value)).toEqual(["12", "10"]);
      expect(screen.queryByRole("textbox", { name: "SKU" })).toBeNull();
    });

    it("keeps an editable link cell as text and a read-only one as a link", () => {
      renderTable(
        <Harness
          columns={() => [
            column({
              id: "supplier",
              label: "Supplier",
              type: "link",
              typeOptions: { href: (row) => `/suppliers/${row.supplier}` },
              edit: { canEdit: (row) => row.id === "1", onValueCommitted: noop },
            }),
          ]}
        />,
      );
      expect(screen.getAllByRole("textbox", { name: "Supplier" })).toHaveLength(1);
      expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
        "Globex",
        "Acme",
      ]);
    });

    it("keeps rows without an id read-only and warns once", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderTable(
        <Harness
          rows={LINES.map(({ id: _id, ...rest }) => rest as unknown as Line)}
          columns={(update) => [receivedColumn(vi.fn(), update)]}
        />,
      );
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain("has no `id`");
    });

    it("uses typeOptions for display precision", async () => {
      const user = renderTable(
        <Harness
          columns={(update) => [
            column({
              id: "received",
              label: "Received",
              type: "number",
              typeOptions: { maxDecimals: 2 },
              edit: { onValueCommitted: (row, value) => update(row.id, { received: value }) },
            }),
          ]}
        />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "2.5{Enter}");
      expect(input.parentElement?.textContent).toContain("2.5");
    });
  });

  describe("interplay", () => {
    it("lets canEdit follow row selection", async () => {
      const user = renderTable(
        <Harness
          columns={(update) => [
            receivedColumn(vi.fn(), update, { canEdit: (_, { selected }) => selected }),
          ]}
          options={{ rowSelection: {} }}
        />,
      );
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
      const [selectFirst] = screen.getAllByRole("checkbox", { name: "Select row" });
      await user.click(selectFirst);
      expect(screen.getAllByRole("textbox", { name: "Received" })).toHaveLength(1);
      await user.click(selectFirst);
      expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    });

    it("updates editability when controlled selected ids change externally", async () => {
      function ControlledSelection() {
        const [selectedIds, setSelectedIds] = useState(["2"]);
        return (
          <>
            <button onClick={() => setSelectedIds(["1"])}>Select first externally</button>
            <Harness
              columns={(update) => [
                skuColumn,
                receivedColumn(vi.fn(), update, { canEdit: (_, { selected }) => selected }),
              ]}
              options={{ rowSelection: { selectedIds, onChange: setSelectedIds } }}
            />
          </>
        );
      }
      const user = renderTable(<ControlledSelection />);
      const firstRow = screen.getByText("TS-M").closest("tr")!;
      const secondRow = screen.getByText("TS-L").closest("tr")!;
      expect(within(firstRow).queryByRole("textbox")).toBeNull();
      expect(within(secondRow).getByRole("textbox", { name: "Received" })).toBeDefined();
      await user.click(screen.getByRole("button", { name: "Select first externally" }));
      expect((within(firstRow).getByRole("textbox") as HTMLInputElement).value).toBe("12");
      expect(within(secondRow).queryByRole("textbox")).toBeNull();
    });

    it("shows a not-allowed cursor on read-only cells of a table people edit", () => {
      renderTable(
        <Harness
          columns={(update) => [
            skuColumn,
            receivedColumn(vi.fn(), update, { canEdit: (row) => row.id !== "2" }),
          ]}
        />,
      );
      const skuCell = screen.getByText("TS-M").closest("td");
      const [editable] = screen.getAllByRole("textbox", { name: "Received" });
      const lockedRow = screen.getByText("TS-L").closest("tr");
      expect(blocked(skuCell)).toBe(true);
      expect(blocked(editable.closest("td"))).toBe(false);
      expect(blocked(lockedRow?.querySelectorAll("td")[1])).toBe(true);
    });

    it("keeps the default cursor when no column is editable, or rows are clickable", () => {
      renderTable(<Harness columns={() => [skuColumn]} />);
      expect(screen.getByText("TS-M").closest("td")?.className).not.toContain("cursor-not-allowed");
      cleanup();
      renderTable(
        <Harness
          columns={(update) => [skuColumn, receivedColumn(vi.fn(), update)]}
          options={{ onClickRow: noop }}
        />,
      );
      expect(screen.getByText("TS-M").closest("td")?.className).not.toContain("cursor-not-allowed");
    });

    it("never fires onClickRow from an editable cell", async () => {
      const onClickRow = vi.fn();
      const user = renderTable(
        <Harness
          columns={(update) => [skuColumn, receivedColumn(vi.fn(), update)]}
          options={{ onClickRow }}
        />,
      );
      await user.click(screen.getAllByRole("textbox", { name: "Received" })[0]);
      expect(onClickRow).not.toHaveBeenCalled();
      await user.click(screen.getByText("TS-M"));
      expect(onClickRow).toHaveBeenCalledTimes(1);
    });

    it("opens the cell context menu on a resting editor", async () => {
      renderTable(<Harness columns={(update) => [receivedColumn(vi.fn(), update)]} />);
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      fireEvent.contextMenu(input);
      expect(await screen.findByRole("menuitem", { name: "Copy value" })).toBeTruthy();
    });

    it("leaves the browser context menu alone while typing", async () => {
      const user = renderTable(<Harness columns={(update) => [receivedColumn(vi.fn(), update)]} />);
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await user.click(input);
      const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
      fireEvent(input, event);
      expect(event.defaultPrevented).toBe(false);
      expect(screen.queryByRole("menuitem", { name: "Copy value" })).toBeNull();
    });
  });

  it("drops an unticked row's editor from Tab navigation", async () => {
    const user = renderTable(
      <Harness
        columns={(update) => [
          receivedColumn(vi.fn(), update, { canEdit: (_, { selected }) => selected }),
        ]}
        options={{ rowSelection: {} }}
      />,
    );
    const boxes = screen.getAllByRole("checkbox", { name: "Select row" });
    for (const box of boxes) await user.click(box);
    await user.click(boxes[1]);
    const [first, third] = screen.getAllByRole("textbox", { name: "Received" });
    act(() => first.focus());
    await user.tab();
    expect(document.activeElement).toBe(third);
  });

  it("types each column's edit config without validation or persistence options", () => {
    column({
      id: "received",
      type: "number",
      edit: {
        canEdit: (row, state) => {
          expectTypeOf(row).toEqualTypeOf<Line>();
          expectTypeOf(state).toEqualTypeOf<CellEditState>();
          return true;
        },
        onValueCommitted: (row, value) => {
          expectTypeOf(row).toEqualTypeOf<Line>();
          expectTypeOf(value).toEqualTypeOf<number | null>();
        },
      },
    });
    column({
      id: "price",
      type: "money",
      edit: {
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<number | null>();
        },
      },
    });
    column({
      id: "note",
      type: "text",
      edit: {
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<string | null>();
        },
      },
    });
    column({
      id: "supplier",
      type: "link",
      typeOptions: { href: () => "/" },
      edit: { onValueCommitted: noop },
    });
    column({
      id: "expected",
      type: "date",
      edit: {
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<string | null>();
        },
      },
    });
    column({
      id: "status",
      type: "badge",
      edit: {
        options: [{ value: "open", label: "Open" }],
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<string | null>();
        },
      },
    });
    // @ts-expect-error — business constraints are consumer-owned
    column({ id: "received", type: "number", edit: { min: 0, onValueCommitted: noop } });
    column({
      id: "note",
      type: "text",
      // @ts-expect-error — validation is not an editor option
      edit: { validate: () => undefined, onValueCommitted: noop },
    });
    // @ts-expect-error — required state is consumer-owned
    column({ id: "note", type: "text", edit: { required: true, onValueCommitted: noop } });
    // @ts-expect-error — display precision belongs to typeOptions
    column({ id: "price", type: "money", edit: { maxDecimals: 2, onValueCommitted: noop } });
    // @ts-expect-error — calendar business bounds are consumer-owned
    column({ id: "expected", type: "date", edit: { max: "2027-01-01", onValueCommitted: noop } });
    // @ts-expect-error — onCommit is replaced by a value-change notification
    column({ id: "note", type: "text", edit: { onCommit: noop } });
    // @ts-expect-error — dropdown choices aren't a number / money option
    column({ id: "received", type: "number", edit: { options: [], onValueCommitted: noop } });
    // @ts-expect-error — columns without a type have no built-in editor
    column({ id: "sku", render: () => null, edit: { onValueCommitted: noop } });
    column({
      id: "received",
      type: "number",
      // @ts-expect-error — an emptied cell notifies null
      edit: { onValueCommitted: (_row, _value: number) => {} },
    });
  });

  describe("affordance", () => {
    it("shows an icon only for dropdown and date editors", () => {
      renderTable(
        <Harness
          rows={LINES.map((line) => ({ ...line, expected: "2026-10-01" }))}
          columns={(update) => [
            skuColumn,
            receivedColumn(vi.fn(), update),
            column({
              id: "supplier",
              label: "Supplier",
              type: "text",
              edit: { options: [{ value: "Acme", label: "Acme" }], onValueCommitted: noop },
            }),
            column({
              id: "expected",
              label: "Expected",
              type: "date",
              edit: { onValueCommitted: noop },
            }),
          ]}
        />,
      );
      const cells = screen.getAllByRole("row")[1].querySelectorAll("td");
      expect(cells[0].querySelector("svg")).toBeNull();
      expect(cells[1].querySelector("svg")).toBeNull();
      expect(cells[2].querySelector(".lucide-chevron-down")).not.toBeNull();
      expect(cells[3].querySelector(".lucide-calendar-days")).not.toBeNull();
    });

    it("leaves editable column headers unmarked", () => {
      renderTable(<Harness columns={(update) => [skuColumn, receivedColumn(vi.fn(), update)]} />);
      const [, received] = screen.getAllByRole("columnheader");
      expect(received.querySelector("svg")).toBeNull();
      expect(received.textContent).toBe("Received");
    });

    it("marks only the rows that can be edited", () => {
      renderTable(
        <Harness
          columns={(update) => [
            receivedColumn(vi.fn(), update, { canEdit: (row) => row.id === "1" }),
          ]}
        />,
      );
      const [first, second] = screen.getAllByRole("row").slice(1);
      expect(first.querySelector("td[data-editable]")).not.toBeNull();
      expect(second.querySelector("td[data-editable]")).toBeNull();
    });
  });

  describe("leaving the page", () => {
    it("does not hold navigation for a returned promise", async () => {
      let finish = noop;
      const onValueCommitted = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
      const user = renderInAppRouter(
        <Harness
          columns={() => [
            column({
              id: "received",
              label: "Received",
              type: "number",
              edit: { onValueCommitted },
            }),
          ]}
        />,
      );
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "20");
      await user.click(screen.getByRole("link", { name: "Elsewhere" }));
      expect(await screen.findByText("Somewhere else")).toBeTruthy();
      expect(onValueCommitted).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).toBeNull();
      await act(async () => finish());
    });

    it("does not register an unload guard for drafts or parse failures", async () => {
      const user = renderTable(<Harness columns={(update) => [receivedColumn(vi.fn(), update)]} />);
      const [input] = screen.getAllByRole("textbox", { name: "Received" });
      await retype(user, input, "20");
      expect(wouldWarnOnUnload()).toBe(false);
      await retype(user, input, "abc{Enter}");
      expect(wouldWarnOnUnload()).toBe(false);
    });
  });
});
