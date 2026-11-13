import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { cleanup, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { Link, MemoryRouter, useLocation } from "react-router";
import type { Column, RowInteraction, UseDataTableOptions } from "@/index";
import { testData, wrapper as AppShellWrapper, type TestRow } from "./test-utils";
import { DataTable } from "./data-table";
import { useDataTable } from "./use-data-table";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.getSelection()?.removeAllRanges();
});

const testColumns: Column<TestRow>[] = [
  { id: "name", label: "Name", type: "text" },
  { id: "status", label: "Status", type: "text" },
];
const base = { columns: testColumns, data: testData };
const linkInteraction: RowInteraction<TestRow> = {
  type: "link",
  label: "Details",
  getLabel: (row) => row.name,
  href: (row) => `/records/${row.id}`,
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AppShellWrapper>{children}</AppShellWrapper>
    </MemoryRouter>
  );
}

function Harness({
  options,
  hideColumns = false,
}: {
  options: UseDataTableOptions<TestRow>;
  hideColumns?: boolean;
}) {
  const table = useDataTable(options);
  const location = useLocation();
  return (
    <>
      <output data-testid="location">{location.pathname}</output>
      {hideColumns && (
        <button type="button" onClick={table.hideAllColumns}>
          Hide data columns
        </button>
      )}
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
    </>
  );
}

const dataRows = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLTableRowElement>('[data-slot="data-table-row"]'));
const primaryActions = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>('[data-slot="data-table-row-primary-action"]'),
  );
const headerCells = (container: HTMLElement) =>
  container.querySelectorAll('[data-slot="data-table-header"] th');

describe("DataTable row interaction", () => {
  it("rejects mixed interaction modes and legacy/new options, including through spreads", () => {
    const missingHref = { type: "link" as const, label: "Details" };
    // @ts-expect-error Link interactions require a destination.
    const invalidLink: RowInteraction<TestRow> = missingHref;

    const bothCallbacks = { ...linkInteraction, onClick: (_row: TestRow) => {} };
    // @ts-expect-error A navigation interaction cannot also declare a click action.
    const invalidInteraction: RowInteraction<TestRow> = bothCallbacks;

    const clickWithHref = {
      type: "click" as const,
      label: "Edit",
      onClick: (_row: TestRow) => {},
      href: (row: TestRow) => `/records/${row.id}`,
    };
    // @ts-expect-error A click interaction cannot also declare a link destination.
    const invalidClick: RowInteraction<TestRow> = clickWithHref;

    const mixedOptions = {
      ...base,
      rowInteraction: linkInteraction,
      onClickRow: (_row: TestRow) => {},
    };
    // @ts-expect-error Legacy and new interaction APIs are mutually exclusive.
    const invalidOptions: UseDataTableOptions<TestRow> = { ...mixedOptions };

    expect([invalidLink, invalidInteraction, invalidClick, invalidOptions]).toHaveLength(4);
  });

  it("infers each interaction callback's row from the table data", () => {
    const { result } = renderHook(
      () =>
        useDataTable({
          ...base,
          rowInteraction: {
            type: "click",
            label: "Edit",
            getLabel: (row) => {
              expectTypeOf(row).toEqualTypeOf<TestRow>();
              return row.name;
            },
            canApply: (row) => {
              expectTypeOf(row).toEqualTypeOf<TestRow>();
              return row.status === "Active";
            },
            onClick: (row) => {
              expectTypeOf(row).toEqualTypeOf<TestRow>();
            },
          },
        }),
      { wrapper },
    );
    expect(result.current.rowInteraction?.type).toBe("click");
  });

  it("generates visible native links in one pinned actions column without a menu", () => {
    const { container } = render(
      <Harness options={{ ...base, rowInteraction: linkInteraction }} />,
      { wrapper },
    );
    const link = screen.getByRole("link", { name: "Details: Alice" });
    expect(link.getAttribute("href")).toBe("/records/1");
    expect(link.textContent).toContain("Details");
    expect(link.getAttribute("role")).toBeNull();
    expect(link.className).toContain("astw:hover:bg-accent");
    expect(link.classList.contains("astw:border")).toBe(false);
    expect(screen.getByRole("link", { name: "Details: Bob" }).getAttribute("href")).toBe(
      "/records/2",
    );
    expect(headerCells(container)).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Row actions" })).toBeNull();
    for (const row of dataRows(container)) {
      expect(row.cells).toHaveLength(3);
      expect(row.getAttribute("role")).toBeNull();
      expect(row.getAttribute("tabindex")).toBeNull();
      expect(row.lastElementChild?.getAttribute("style")).toContain("sticky");
    }
  });

  it("activates the identified primary action even when its cell is not last", () => {
    const onClick = vi.fn();
    const { container } = render(
      <Harness options={{ ...base, rowInteraction: { type: "click", label: "Edit", onClick } }} />,
      { wrapper },
    );
    const row = dataRows(container)[0];
    const extraCell = document.createElement("td");
    row.append(extraCell);
    fireEvent.click(within(row).getByText("Alice"));
    extraCell.remove();
    expect(onClick).toHaveBeenCalledExactlyOnceWith(testData.rows[0]);
  });

  it("keeps internal action IDs unique across tables with the same record IDs", () => {
    const first = vi.fn();
    const second = vi.fn();
    const data = {
      rows: [
        { ...testData.rows[0], id: "record one" },
        { ...testData.rows[1], id: "record_one" },
      ],
    };
    const { container } = render(
      <>
        <Harness
          options={{
            ...base,
            data,
            rowInteraction: { type: "click", label: "Edit", onClick: first },
          }}
        />
        <Harness
          options={{
            ...base,
            data,
            rowInteraction: { type: "click", label: "Edit", onClick: second },
          }}
        />
      </>,
      { wrapper },
    );
    const ids = primaryActions(container).map((action) => action.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(4);
    fireEvent.click(dataRows(container)[2].cells[0]);
    expect(second).toHaveBeenCalledExactlyOnceWith(data.rows[0]);
    expect(first).not.toHaveBeenCalled();
  });

  it("uses label alone when no row identity is provided", () => {
    render(
      <Harness
        options={{
          ...base,
          rowInteraction: { type: "link", label: "Details", href: (row) => `/records/${row.id}` },
        }}
      />,
      { wrapper },
    );
    expect(screen.getAllByRole("link", { name: "Details" })).toHaveLength(2);
  });

  it("preserves the primary link's native context menu and modified-click behavior", () => {
    render(<Harness options={{ ...base, rowInteraction: linkInteraction }} />, { wrapper });
    const link = screen.getByRole("link", { name: "Details: Alice" });
    expect(fireEvent.contextMenu(link)).toBe(true);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(fireEvent.click(link, { metaKey: true })).toBe(true);
    expect(screen.getByTestId("location").textContent).toBe("/");
  });

  it("preserves native Tab order through related links, primary actions, menus, and selection", async () => {
    const user = userEvent.setup();
    const commit = vi.fn();
    const { container } = render(
      <Harness
        options={{
          ...base,
          columns: [
            { id: "name", label: "Name", type: "text", edit: { onValueCommitted: commit } },
            {
              id: "customer",
              label: "Customer",
              render: (row) => (
                <Link to={`/customers/${row.id}`} onClick={(event) => event.stopPropagation()}>
                  Customer {row.name}
                </Link>
              ),
            },
          ],
          rowInteraction: linkInteraction,
          rowSelection: {},
          rowActions: [{ id: "archive", label: "Archive", onClick: vi.fn() }],
        }}
      />,
      { wrapper },
    );
    const [firstRow, secondRow] = dataRows(container);
    const firstEditor = within(firstRow).getByRole("textbox");
    const secondEditor = within(secondRow).getByRole("textbox");
    await user.click(secondEditor);
    await user.type(secondEditor, " updated");
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Customer Bob" }));
    expect(commit).toHaveBeenCalledWith(testData.rows[1], "Bob updated");
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Details: Bob" }));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Customer Bob" }));
    await user.click(secondEditor);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(
      within(secondRow).getByRole("checkbox", { name: "Select row" }),
    );
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(
      within(firstRow).getByRole("button", { name: "Row actions" }),
    );
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Details: Alice" }));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Customer Alice" }));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(firstEditor);
  });

  it.each(["id", "label"] as const)(
    "does not share a navigation namespace with the primary action (%s)",
    async (source) => {
      const user = userEvent.setup();
      const { container } = render(
        <Harness
          options={{
            ...base,
            data: { rows: [testData.rows[0]] },
            columns: [
              {
                id: source === "id" ? "__datatable_actions__" : undefined,
                label: source === "label" ? "__datatable_actions__" : "Name",
                type: "text",
                accessor: (row) => row.name,
                edit: { onValueCommitted: vi.fn() },
              },
              { id: "status", label: "Status", type: "text", edit: { onValueCommitted: vi.fn() } },
            ],
            rowInteraction: linkInteraction,
          }}
        />,
        { wrapper },
      );
      const [firstEditor, secondEditor] = within(dataRows(container)[0]).getAllByRole("textbox");
      await user.tab();
      expect(document.activeElement).toBe(firstEditor);
      await user.tab();
      expect(document.activeElement).toBe(secondEditor);
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(firstEditor);
      await user.tab();
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("link", { name: "Details: Alice" }));
    },
  );

  it.each([
    ["id", "left"],
    ["label", "left"],
    ["id", "right"],
    ["label", "right"],
  ] as const)(
    "keeps sticky offsets separate when a data column %s collides with the actions key on the %s",
    (source, side) => {
      const measuredWidths: Record<string, number> = {
        "column:__datatable_actions__": 120,
        __datatable_actions__: 50,
        "column:outer": 40,
        "column:inner": 30,
      };
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
        function (this: HTMLElement) {
          const width = measuredWidths[this.dataset.measureKey ?? ""] ?? 80;
          return {
            x: 0,
            y: 0,
            left: 0,
            right: width,
            top: 0,
            bottom: 24,
            width,
            height: 24,
            toJSON: () => ({}),
          };
        },
      );

      const collisionColumn = {
        id: source === "id" ? "__datatable_actions__" : undefined,
        label: source === "label" ? "__datatable_actions__" : "Collision",
        type: "text" as const,
        pin: side,
      };
      const columns =
        side === "left"
          ? [
              collisionColumn,
              { id: "next", label: "Next", type: "text" as const, pin: "left" as const },
            ]
          : [
              { id: "inner", label: "Inner", type: "text" as const, pin: "right" as const },
              collisionColumn,
              { id: "outer", label: "Outer", type: "text" as const, pin: "right" as const },
            ];
      const { container } = render(
        <Harness
          options={{
            ...base,
            columns,
            data: { rows: [testData.rows[0]] },
            rowInteraction: linkInteraction,
          }}
        />,
        { wrapper },
      );

      if (side === "left") {
        expect(
          container.querySelector<HTMLElement>(
            '[data-slot="data-table-header"] th[data-col-key="next"]',
          )?.style.left,
        ).toBe("120px");
      } else {
        expect(
          container.querySelector<HTMLElement>(
            '[data-slot="data-table-header"] th[data-col-key="inner"]',
          )?.style.right,
        ).toBe("210px");
      }
    },
  );

  it("preserves native Tab order when leaving a choice editor", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        options={{
          ...base,
          data: { rows: [testData.rows[0]] },
          columns: [
            {
              id: "status",
              label: "Status",
              type: "text",
              edit: {
                options: [
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                ],
                onValueCommitted: vi.fn(),
              },
            },
            {
              id: "customer",
              label: "Customer",
              render: (row) => <Link to={`/customers/${row.id}`}>Customer</Link>,
            },
          ],
          rowInteraction: linkInteraction,
        }}
      />,
      { wrapper },
    );
    await user.tab();
    const editor = screen.getByRole("combobox");
    expect(document.activeElement).toBe(editor);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Customer" }));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(editor);
  });

  it("keeps numeric validation before native Tab movement", async () => {
    const user = userEvent.setup();
    const commit = vi.fn();
    render(
      <Harness
        options={{
          ...base,
          data: { rows: [testData.rows[0]] },
          columns: [
            {
              id: "amount",
              label: "Amount",
              type: "number",
              accessor: () => 10,
              edit: { onValueCommitted: commit },
            },
            {
              id: "customer",
              label: "Customer",
              render: (row) => <Link to={`/customers/${row.id}`}>Customer</Link>,
            },
          ],
          rowInteraction: linkInteraction,
        }}
      />,
      { wrapper },
    );
    const editor = screen.getByRole("textbox");
    await user.click(editor);
    await user.clear(editor);
    await user.type(editor, "not a number");
    await user.tab();
    expect(document.activeElement).toBe(editor);
    expect(commit).not.toHaveBeenCalled();
  });

  it("supports navigation from the primary link and the row background", async () => {
    const user = userEvent.setup();
    render(<Harness options={{ ...base, rowInteraction: linkInteraction }} />, { wrapper });
    await user.click(screen.getByRole("link", { name: "Details: Bob" }));
    expect(screen.getByTestId("location").textContent).toBe("/records/2");
    await user.click(screen.getByText("Alice"));
    expect(screen.getByTestId("location").textContent).toBe("/records/1");
  });

  it("exposes the primary action to native keyboard navigation", async () => {
    const user = userEvent.setup();
    render(<Harness options={{ ...base, rowInteraction: linkInteraction }} />, { wrapper });
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Details: Alice" }));
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("location").textContent).toBe("/records/1");
  });

  it.each([
    { metaKey: true },
    { ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
    { button: 2 },
  ])("does not run the row shortcut for modified/non-primary clicks: %j", (event) => {
    const onClick = vi.fn();
    render(
      <Harness options={{ ...base, rowInteraction: { type: "click", label: "Edit", onClick } }} />,
      { wrapper },
    );
    fireEvent.click(screen.getByText("Alice"), event);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("exposes a disabled link without a destination, Tab stop, or active row shortcut", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        options={{
          ...base,
          rowInteraction: { ...linkInteraction, canApply: (row) => row.id !== "1" },
        }}
      />,
      { wrapper },
    );
    const disabled = screen.getByRole("link", { name: "Details: Alice" });
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    expect(disabled.getAttribute("href")).toBeNull();
    expect(disabled.tabIndex).toBe(-1);
    fireEvent.click(screen.getByText("Alice"));
    fireEvent.click(disabled);
    expect(screen.getByTestId("location").textContent).toBe("/");
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Details: Bob" }));
  });

  it("runs a click interaction exactly once from either its button or its row", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Harness
        options={{
          ...base,
          rowInteraction: { type: "click", label: "Edit", getLabel: (row) => row.name, onClick },
        }}
      />,
      { wrapper },
    );
    const button = screen.getByRole("button", { name: "Edit: Alice" });
    expect(button.className).toContain("astw:hover:bg-accent");
    expect(button.classList.contains("astw:border")).toBe(false);
    await user.click(button);
    expect(onClick).toHaveBeenCalledExactlyOnceWith(testData.rows[0]);
    await user.click(screen.getByText("Bob"));
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onClick).toHaveBeenLastCalledWith(testData.rows[1]);
  });

  it("disables a primary button and its row shortcut together", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Harness
        options={{
          ...base,
          rowInteraction: {
            type: "click",
            label: "Edit",
            getLabel: (row) => row.name,
            canApply: (row) => row.id !== "1",
            onClick,
          },
        }}
      />,
      { wrapper },
    );
    const disabled = screen.getByRole("button", { name: "Edit: Alice" });
    expect(disabled.hasAttribute("disabled")).toBe(true);
    await user.click(disabled);
    await user.click(screen.getByText("Alice"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "supports custom display renderers without column interaction options (element: %s)",
    (element) => {
      const onClick = vi.fn();
      render(
        <Harness
          options={{
            ...base,
            columns: [
              {
                id: "name",
                label: "Name",
                render: (row) => (element ? <span>{row.name}</span> : row.name),
              },
            ],
            rowInteraction: { type: "click", label: "Edit", onClick },
          }}
        />,
        { wrapper },
      );
      fireEvent.click(screen.getByText("Alice"));
      expect(onClick).toHaveBeenCalledExactlyOnceWith(testData.rows[0]);
    },
  );

  it("keeps built-in related links independent while their cell padding retains row activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { container } = render(
      <Harness
        options={{
          ...base,
          columns: [
            {
              id: "name",
              label: "Name",
              type: "link",
              typeOptions: { href: (row) => `/customers/${row.id}` },
            },
          ],
          rowInteraction: { type: "click", label: "Edit", onClick },
        }}
      />,
      { wrapper },
    );
    await user.click(screen.getByRole("link", { name: "Alice" }));
    expect(screen.getByTestId("location").textContent).toBe("/customers/1");
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.click(dataRows(container)[0].cells[0]);
    expect(onClick).toHaveBeenCalledExactlyOnceWith(testData.rows[0]);
  });

  it("keeps the built-in badge overflow control separate from ordinary row clicks", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onParentClick = vi.fn();
    const { container } = render(
      <div role="presentation" onClick={onParentClick}>
        <Harness
          options={{
            ...base,
            columns: [
              {
                id: "status",
                label: "Status",
                type: "badge",
                accessor: (row) => [row.status, "Other"],
                typeOptions: { maxVisible: 1 },
              },
            ],
            rowInteraction: { type: "click", label: "Edit", onClick },
          }}
        />
      </div>,
      { wrapper },
    );
    const row = dataRows(container)[0];
    fireEvent.click(within(row).getByText("Active"));
    expect(onClick).toHaveBeenCalledExactlyOnceWith(testData.rows[0]);
    expect(onParentClick).toHaveBeenCalledOnce();
    onClick.mockClear();
    onParentClick.mockClear();
    await user.click(within(row).getByRole("button", { name: "+1" }));
    expect(await screen.findByText("Other")).toBeDefined();
    expect(onClick).not.toHaveBeenCalled();
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it("keeps active editors separate from row activation", () => {
    const onClick = vi.fn();
    const { container } = render(
      <Harness
        options={{
          ...base,
          columns: [
            {
              id: "name",
              label: "Name",
              type: "text",
              edit: { onValueCommitted: vi.fn() },
            },
          ],
          rowInteraction: { type: "click", label: "Edit", onClick },
        }}
      />,
      { wrapper },
    );
    fireEvent.click(dataRows(container)[0].cells[0]);
    fireEvent.click(screen.getAllByRole("textbox")[0]);
    expect(onClick).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "keeps read-only edit columns outside the shortcut (custom render: %s)",
    async (customRender) => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const { container } = render(
        <Harness
          options={{
            ...base,
            columns: [
              {
                id: "name",
                label: "Name",
                type: "text",
                render: customRender ? (row) => <span>{row.name}</span> : undefined,
                edit: { canEdit: () => false, onValueCommitted: vi.fn() },
              },
            ],
            rowInteraction: { type: "click", label: "Edit", getLabel: (row) => row.name, onClick },
          }}
        />,
        { wrapper },
      );
      const cell = dataRows(container)[0].cells[0];
      expect(screen.queryByRole("textbox")).toBeNull();
      fireEvent.click(cell);
      fireEvent.click(screen.getByText("Alice"));
      expect(onClick).not.toHaveBeenCalled();
      await user.click(screen.getByRole("button", { name: "Edit: Alice" }));
      expect(onClick).toHaveBeenCalledExactlyOnceWith(testData.rows[0]);
    },
  );

  it("keeps hierarchy controls separate while its display label activates the row", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Harness
        options={{
          ...base,
          columns: [testColumns[1]],
          data: { rows: [testData.rows[0]] },
          subRows: {
            getSubRows: (row) => (row.id === "1" ? [testData.rows[1]] : []),
            hierarchyColumn: { label: "Hierarchy", type: "text", accessor: (row) => row.name },
          },
          rowSelection: {},
          rowInteraction: { type: "click", label: "Edit", onClick },
        }}
      />,
      { wrapper },
    );
    const label = screen.getByText("Alice");
    const caret = screen.getByRole("button", { name: "Expand row Alice" });
    await user.click(label);
    expect(onClick).toHaveBeenCalledExactlyOnceWith(testData.rows[0]);
    onClick.mockClear();
    await user.click(caret);
    await user.click(screen.getAllByRole("checkbox", { name: "Select row" })[0]);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("honors stopPropagation from custom links, buttons, and labelled inputs", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const customAction = vi.fn();
    const columns: Column<TestRow>[] = [
      testColumns[0],
      {
        id: "controls",
        label: "Controls",
        render: (row) => (
          <>
            <Link to={`/customers/${row.id}`} onClick={(event) => event.stopPropagation()}>
              Customer {row.name}
            </Link>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                customAction();
              }}
            >
              Custom {row.name}
            </button>
            <label onClick={(event) => event.stopPropagation()}>
              Select {row.name}
              <input type="checkbox" />
            </label>
          </>
        ),
      },
    ];
    render(
      <Harness
        options={{ ...base, columns, rowInteraction: { type: "click", label: "Edit", onClick } }}
      />,
      { wrapper },
    );
    await user.click(screen.getByRole("link", { name: "Customer Alice" }));
    expect(screen.getByTestId("location").textContent).toBe("/customers/1");
    await user.click(screen.getByRole("button", { name: "Custom Alice" }));
    await user.click(screen.getByText("Select Alice"));
    expect(customAction).toHaveBeenCalledOnce();
    const checkbox = screen.getByRole("checkbox", { name: "Select Alice" }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not mistake outer accessibility containers or static cell roles for controls", () => {
    const onClick = vi.fn();
    render(
      <section aria-label="Orders" tabIndex={-1}>
        <Harness
          options={{
            ...base,
            columns: [
              {
                id: "name",
                label: "Name",
                render: (row) => (
                  <span role="note" aria-label={row.name}>
                    {row.name}
                  </span>
                ),
              },
            ],
            rowInteraction: { type: "click", label: "Edit", onClick },
          }}
        />
      </section>,
      { wrapper },
    );
    fireEvent.click(screen.getByText("Alice"));
    expect(onClick).toHaveBeenCalledExactlyOnceWith(testData.rows[0]);
  });

  it("does not treat portaled content as a row-background click", () => {
    const onClick = vi.fn();
    const columns: Column<TestRow>[] = [
      {
        id: "name",
        label: "Name",
        render: (row) => (
          <>
            {row.name}
            {createPortal(
              <div data-testid={`popup-${row.id}`}>Popup {row.name}</div>,
              document.body,
            )}
          </>
        ),
      },
    ];
    render(
      <Harness
        options={{ ...base, columns, rowInteraction: { type: "click", label: "Edit", onClick } }}
      />,
      { wrapper },
    );
    fireEvent.click(screen.getByTestId("popup-1"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not navigate after selecting row text", () => {
    const onClick = vi.fn();
    render(
      <Harness options={{ ...base, rowInteraction: { type: "click", label: "Edit", onClick } }} />,
      { wrapper },
    );
    const cell = screen.getByText("Alice");
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(cell);
    selection.addRange(range);
    expect(selection.toString()).toBe("Alice");
    fireEvent.click(cell);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps row selection and detail expansion separate from the primary action", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Harness
        options={{
          ...base,
          rowInteraction: { type: "click", label: "Edit", onClick },
          rowSelection: {},
          rowExpansion: {
            getLabel: (row) => row.name,
            render: (row) => <div>Expanded {row.name}</div>,
          },
        }}
      />,
      { wrapper },
    );
    await user.click(screen.getAllByRole("checkbox", { name: "Select row" })[0]);
    await user.click(screen.getByRole("button", { name: "Expand row Alice" }));
    expect(screen.getByText("Expanded Alice")).toBeDefined();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("shares one actions cell with the secondary menu without activating the primary action", async () => {
    const user = userEvent.setup();
    const primary = vi.fn();
    const secondary = vi.fn();
    const { container } = render(
      <Harness
        options={{
          ...base,
          rowInteraction: { type: "click", label: "Edit", onClick: primary },
          rowActions: [{ id: "archive", label: "Archive", onClick: secondary }],
        }}
      />,
      { wrapper },
    );
    expect(headerCells(container)).toHaveLength(3);
    const row = dataRows(container)[0];
    expect(row.cells).toHaveLength(3);
    expect(within(row.cells[2]).getByRole("button", { name: "Edit" })).toBeDefined();
    await user.click(within(row.cells[2]).getByRole("button", { name: "Row actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Archive" }));
    expect(secondary).toHaveBeenCalledExactlyOnceWith(testData.rows[0]);
    expect(primary).not.toHaveBeenCalled();
  });

  it("preserves primary actions after all data columns are hidden", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Harness options={{ ...base, rowInteraction: linkInteraction }} hideColumns />,
      { wrapper },
    );
    await user.click(screen.getByRole("button", { name: "Hide data columns" }));
    expect(headerCells(container)).toHaveLength(1);
    expect(dataRows(container)[0].cells).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Details: Alice" })).toBeDefined();
  });

  it.each([false, true])(
    "keeps header, body, and column-footer spans aligned (loading: %s)",
    (loading) => {
      const columns: Column<TestRow>[] = [{ ...testColumns[0], footer: "Total" }, testColumns[1]];
      const { container } = render(
        <Harness options={{ ...base, columns, loading, rowInteraction: linkInteraction }} />,
        { wrapper },
      );
      expect(headerCells(container)).toHaveLength(3);
      expect(container.querySelector("tbody tr")?.children).toHaveLength(3);
      expect(container.querySelector("tfoot tr")?.children).toHaveLength(3);
    },
  );

  it("includes the generated actions column in an error row's colspan", () => {
    const { container } = render(
      <Harness
        options={{ ...base, error: new Error("Unavailable"), rowInteraction: linkInteraction }}
      />,
      { wrapper },
    );
    expect(container.querySelector("tbody td")?.getAttribute("colspan")).toBe("3");
  });

  it.each(["link", "overflow"] as const)(
    "preserves legacy control bubbling when row interaction changes (%s)",
    async (kind) => {
      const user = userEvent.setup();
      const onClickRow = vi.fn();
      const onPrimaryClick = vi.fn();
      const onParentClick = vi.fn();
      const columns: Column<TestRow>[] =
        kind === "link"
          ? [
              {
                id: "name",
                label: "Name",
                type: "link",
                typeOptions: { href: (row) => `/customers/${row.id}` },
              },
            ]
          : [
              {
                id: "status",
                label: "Status",
                type: "badge",
                accessor: (row) => [row.status, "Other"],
                typeOptions: { maxVisible: 1 },
              },
            ];
      const options = {
        ...base,
        columns,
        rowActions: [{ id: "inspect", label: "Inspect", onClick: vi.fn() }],
      };
      const interaction = { type: "click" as const, label: "Edit", onClick: onPrimaryClick };
      const { container, rerender } = render(
        <div role="presentation" onClick={onParentClick}>
          <Harness options={{ ...options, onClickRow }} />
        </div>,
        { wrapper },
      );
      const control = () =>
        within(dataRows(container)[0]).getByRole(kind === "link" ? "link" : "button", {
          name: kind === "link" ? "Alice" : "+1",
        });
      await user.click(control());
      if (kind === "link") expect(screen.getByTestId("location").textContent).toBe("/customers/1");
      else expect(await screen.findByText("Other")).toBeDefined();
      expect(onClickRow).toHaveBeenCalledExactlyOnceWith(testData.rows[0]);
      expect(onParentClick).toHaveBeenCalledOnce();
      onClickRow.mockClear();
      onParentClick.mockClear();

      rerender(
        <div role="presentation" onClick={onParentClick}>
          <Harness options={{ ...options, rowInteraction: interaction }} />
        </div>,
      );
      await user.click(control());
      expect(onPrimaryClick).not.toHaveBeenCalled();
      expect(onClickRow).not.toHaveBeenCalled();
      expect(onParentClick).not.toHaveBeenCalled();

      rerender(
        <div role="presentation" onClick={onParentClick}>
          <Harness options={{ ...options, onClickRow }} />
        </div>,
      );
      await user.click(control());
      expect(onClickRow).toHaveBeenCalledExactlyOnceWith(testData.rows[0]);
      expect(onParentClick).toHaveBeenCalledOnce();
      expect(onPrimaryClick).not.toHaveBeenCalled();
    },
  );

  it("preserves the legacy callback without generating a primary action", () => {
    const onClickRow = vi.fn();
    const { container } = render(
      <Harness
        options={{
          ...base,
          columns: [{ ...testColumns[0], render: (row) => row.name }, testColumns[1]],
          onClickRow,
        }}
      />,
      { wrapper },
    );
    fireEvent.click(screen.getByText("Alice"));
    expect(onClickRow).toHaveBeenCalledExactlyOnceWith(testData.rows[0]);
    expect(primaryActions(container)).toHaveLength(0);
    expect(headerCells(container)).toHaveLength(2);
  });
});
