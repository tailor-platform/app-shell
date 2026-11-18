import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { XIcon } from "lucide-react";
import {
  Button,
  DataTable,
  LineItems,
  SidebarLayout,
  defineModule,
  useDataTable,
  useLineItems,
  type LineItemsColumn,
} from "@tailor-platform/app-shell";
import { AppShell } from "@tailor-platform/app-shell/testing";
import { describe, expect, it } from "vitest";

type Line = { id?: string; item: string | null };
const items = ["Notebook", "Pen", "Pencil", "Eraser", "Ruler"];
function Page({
  editable,
  align,
  normalButtons = false,
}: {
  editable: boolean;
  align: "left" | "center" | "right";
  normalButtons?: boolean;
}) {
  const renderItem = normalButtons
    ? (line: { item: string | null }) => (
        <Button type="button" variant="ghost" size="xs" className="align-middle">
          {line.item}
        </Button>
      )
    : undefined;
  const table = useDataTable<{ id: string; item: string }>({
    columns: [
      {
        id: "item",
        label: "Item",
        type: "text",
        render: renderItem,
        align: align === "right" ? "right" : "left",
      },
    ],
    data: { rows: items.map((item, index) => ({ id: String(index), item })) },
  });
  const lineItems = useLineItems<Line>({
    orderer: editable,
    defaultLines: items.map((item, index) => ({ id: String(index), item })),
    columns: [
      {
        accessorKey: "item",
        label: "Item",
        render: renderItem,
        align: normalButtons ? align : undefined,
        edit: editable ? { editorType: "text" } : undefined,
      },
      ...(editable
        ? [
            {
              id: "operations",
              label: "Actions",
              width: 64,
              align,
              headerProps: () => ({ className: "text-center! first:pl-2! last:pr-2!" }),
              cellProps: () => ({ className: "py-1! first:pl-2! last:pr-2!" }),
              render: (line) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="align-middle"
                  aria-label={`Delete ${line.item}`}
                  onClick={() => lineItems.removeLine(lineItems.getLineKey(line))}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              ),
            } satisfies LineItemsColumn<Line>,
          ]
        : []),
    ],
  });
  return (
    <>
      <div data-testid="reference-table">
        <DataTable.Root value={table}>
          <DataTable.Table />
        </DataTable.Root>
      </div>
      <LineItems.Root value={lineItems}>
        <LineItems.Table aria-label="Order lines" />
      </LineItems.Root>
    </>
  );
}

const lineItemsRows = () => [
  ...document.querySelectorAll<HTMLElement>('[data-slot="line-items-table"] tbody tr'),
];

describe("LineItems compact action cells", () => {
  it.each([
    { editable: true, align: "left", normalButtons: false },
    { editable: true, align: "center", normalButtons: false },
    { editable: true, align: "right", normalButtons: false },
    { editable: false, align: "left", normalButtons: false },
    { editable: false, align: "left", normalButtons: true },
    { editable: false, align: "right", normalButtons: true },
  ] as const)(
    "matches DataTable rows (editable: $editable, align: $align, normal buttons: $normalButtons)",
    async ({ editable, align, normalButtons }) => {
      const user = userEvent.setup();
      render(
        <AppShell
          memory
          initialEntries={["/rows"]}
          locale="en"
          modules={[
            defineModule({
              path: "rows",
              meta: { title: "Rows" },
              component: () => (
                <Page editable={editable} align={align} normalButtons={normalButtons} />
              ),
              resources: [],
            }),
          ]}
        >
          <SidebarLayout />
        </AppShell>,
      );
      await screen.findByRole("table", { name: "Order lines" });
      const referenceRows = screen.getByTestId("reference-table").querySelectorAll("tbody tr");
      expect(lineItemsRows()).toHaveLength(referenceRows.length);
      lineItemsRows().forEach((row, index) => {
        expect(row.getBoundingClientRect().height).toBeCloseTo(
          referenceRows[index].getBoundingClientRect().height,
          1,
        );
      });
      if (!editable) {
        expect(screen.queryByRole("button", { name: "Delete Notebook" })).toBeNull();
        const cell = lineItemsRows()[0].querySelector("td")!;
        expect(getComputedStyle(cell).paddingTop).toBe("8px");
        expect(getComputedStyle(cell).paddingBottom).toBe("8px");
        if (normalButtons) expect(getComputedStyle(cell).textAlign).toBe(align);
        return;
      }
      const remove = screen.getByRole("button", { name: "Delete Notebook" });
      const bounds = remove.getBoundingClientRect();
      expect(bounds.width).toBe(28);
      expect(bounds.height).toBe(28);
      const header = document.querySelector<HTMLElement>(
        '[data-slot="line-items-table"] th[data-col-key="operations"]',
      )!;
      const headerStyle = getComputedStyle(header);
      expect(headerStyle.textAlign).toBe("center");
      expect(headerStyle.paddingLeft).toBe("8px");
      expect(headerStyle.paddingRight).toBe("8px");
      const headerBounds = header.getBoundingClientRect();
      const cell = remove.closest("td")!;
      const cellStyle = getComputedStyle(cell);
      const cellBounds = cell.getBoundingClientRect();
      expect(cellStyle.textAlign).toBe(align);
      expect(cellStyle.paddingLeft).toBe("8px");
      expect(cellStyle.paddingRight).toBe("8px");
      if (align === "center") {
        expect(headerBounds.left + headerBounds.width / 2).toBeCloseTo(
          bounds.left + bounds.width / 2,
          1,
        );
      } else if (align === "left") {
        expect(bounds.left).toBeCloseTo(cellBounds.left + parseFloat(cellStyle.paddingLeft), 1);
      } else {
        expect(bounds.right).toBeCloseTo(cellBounds.right - parseFloat(cellStyle.paddingRight), 1);
      }
      expect(cellStyle.paddingTop).toBe("4px");
      expect(cellStyle.paddingBottom).toBe("4px");
      remove.focus();
      await user.keyboard("{ArrowLeft}");
      expect(document.activeElement).toBe(remove);
      expect(getComputedStyle(remove).boxShadow).not.toBe("none");
      await user.click(remove);
      await waitFor(() => expect(lineItemsRows()).toHaveLength(4));
      expect(screen.queryByRole("button", { name: "Delete Notebook" })).toBeNull();
    },
  );
});
