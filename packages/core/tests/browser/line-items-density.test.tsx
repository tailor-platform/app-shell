import { fireEvent, render } from "@testing-library/react";
import {
  Button,
  DataTable,
  LineItems,
  createColumnHelper,
  createLineItemHelper,
  useDataTable,
  useLineItems,
} from "@tailor-platform/app-shell";
import { AppShell } from "@tailor-platform/app-shell/testing";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { beforeEach, describe, expect, it } from "vitest";

type Row = { id: string; sku: string; quantity: number | null };
const rows: Row[] = [{ id: "A", sku: "SKU-1", quantity: 1 }];
const li = createLineItemHelper<Row>();
const dt = createColumnHelper<Row>();
const dataTableColumns = [
  dt.column({ id: "sku", label: "SKU", type: "text" }),
  dt.column({ id: "quantity", label: "Qty", type: "number" }),
];

function Fixture({ multiline = false }: { multiline?: boolean }) {
  const lines = useLineItems<Row>({
    defaultLines: rows,
    columns: [
      li.column({
        accessorKey: "sku",
        label: "SKU",
        render: (row) =>
          multiline ? (
            <span>
              <span className="block">{row.sku}</span>
              <span className="block">Additional detail</span>
            </span>
          ) : (
            row.sku
          ),
      }),
      li.column({
        accessorKey: "quantity",
        label: "Qty",
        type: "number",
        edit: { editorType: "number" },
        width: "flex",
      }),
    ],
    rowActions: {
      width: 128,
      render: () => (
        <div className="flex gap-1">
          <Button size="xs" variant="ghost" aria-label="Move up">
            <ChevronUp />
          </Button>
          <Button size="xs" variant="ghost" aria-label="Move down">
            <ChevronDown />
          </Button>
          <Button size="xs" variant="ghost" aria-label="Remove">
            <Trash2 />
          </Button>
        </div>
      ),
    },
  });
  const table = useDataTable({ columns: dataTableColumns, data: { rows } });
  return (
    <div style={{ width: 800 }}>
      <LineItems.Root value={lines}>
        <LineItems.Table aria-label="Editable lines" />
      </LineItems.Root>
      <DataTable.Root value={table}>
        <DataTable.Table />
      </DataTable.Root>
    </div>
  );
}

beforeEach(async () => {
  await document.fonts.ready;
});

function renderFixture(multiline = false) {
  return render(
    <AppShell modules={[]} memory initialEntries={["/"]} locale="en">
      <Fixture multiline={multiline} />
    </AppShell>,
  );
}

describe("LineItems row density with shipped CSS", () => {
  it("matches ordinary DataTable rows even with xs action controls, including while editing", async () => {
    const view = renderFixture();
    await expect
      .poll(() => view.container.querySelector('[data-slot="line-items-table"] tbody tr'))
      .not.toBeNull();
    const line = view.container.querySelector<HTMLElement>(
      '[data-slot="line-items-table"] tbody tr',
    )!;
    const reference = view.container.querySelector<HTMLElement>('[data-slot="data-table-row"]')!;
    await expect
      .poll(() =>
        Math.abs(line.getBoundingClientRect().height - reference.getBoundingClientRect().height),
      )
      .toBeLessThan(1);
    expect(line.getBoundingClientRect().height).toBeLessThan(40);
    const actions = line.querySelector<HTMLElement>('[data-slot="line-items-row-actions"]')!;
    expect(getComputedStyle(actions).paddingTop).toBe("4px");
    expect(getComputedStyle(actions).paddingBottom).toBe("4px");
    const before = line.getBoundingClientRect().height;
    fireEvent.focus(view.getByRole("textbox", { name: "Qty, line 1" }));
    expect(line.getBoundingClientRect().height).toBeCloseTo(before, 1);
  });

  it("allows multiline content to grow instead of forcing a fixed row height", async () => {
    const view = renderFixture(true);
    await expect
      .poll(() => view.container.querySelector('[data-slot="line-items-table"] tbody tr'))
      .not.toBeNull();
    const line = view.container.querySelector<HTMLElement>(
      '[data-slot="line-items-table"] tbody tr',
    )!;
    const reference = view.container.querySelector<HTMLElement>('[data-slot="data-table-row"]')!;
    expect(line.getBoundingClientRect().height).toBeGreaterThan(
      reference.getBoundingClientRect().height + 10,
    );
  });
});
