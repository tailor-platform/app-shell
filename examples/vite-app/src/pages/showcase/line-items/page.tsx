import {
  Button,
  Layout,
  LineItems,
  Tabs,
  useLineItems,
  type AppShellPageProps,
  type LineItemsColumn,
} from "@tailor-platform/app-shell";
import { ListIcon } from "lucide-react";
import { useCallback, useState } from "react";

type OrderLine = {
  id?: string;
  item: string | null;
  quantity: number | null;
  unitPrice: number | null;
  status: string | null;
  dueDate: string | null;
};

const LineItemsPage = () => {
  const [editable, setEditable] = useState(true);
  const canEdit = useCallback(() => editable, [editable]);
  const lineItems = useLineItems<OrderLine>({
    orderer: editable,
    defaultLines: [
      {
        id: "line-1",
        item: "Notebook",
        quantity: 2,
        unitPrice: 5,
        status: "open",
        dueDate: "2026-11-16",
      },
      {
        id: "line-2",
        item: "Pen",
        quantity: 3,
        unitPrice: 1.5,
        status: "closed",
        dueDate: "2026-11-17",
      },
      {
        id: "line-3",
        item: "Pencil",
        quantity: 4,
        unitPrice: 1,
        status: "open",
        dueDate: "2026-11-18",
      },
      {
        id: "line-4",
        item: "Eraser",
        quantity: 2,
        unitPrice: 0.75,
        status: "open",
        dueDate: "2026-11-19",
      },
      {
        id: "line-5",
        item: "Ruler",
        quantity: 1,
        unitPrice: 2,
        status: "closed",
        dueDate: "2026-11-20",
      },
    ],
    columns: [
      { accessorKey: "item", label: "Item", edit: { editorType: "text", canEdit } },
      {
        accessorKey: "quantity",
        label: "Quantity",
        type: "number",
        edit: { editorType: "number", canEdit },
      },
      {
        accessorKey: "unitPrice",
        label: "Unit price",
        type: "money",
        edit: { editorType: "number", canEdit },
      },
      {
        accessorKey: "status",
        label: "Status",
        edit: {
          editorType: "combobox",
          canEdit,
          options: [
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
          ],
        },
      },
      {
        accessorKey: "dueDate",
        label: "Due date",
        type: "date",
        edit: { editorType: "date", canEdit },
      },
      ...(editable
        ? [
            {
              id: "actions",
              label: "Actions",
              width: 96,
              align: "right",
              render: (line) => (
                <Button
                  type="button"
                  variant="link"
                  className="astw:h-auto astw:p-0"
                  aria-label={`Delete ${line.item ?? "line"}`}
                  onClick={() => lineItems.removeLine(lineItems.getLineKey(line))}
                >
                  Delete
                </Button>
              ),
            } satisfies LineItemsColumn<OrderLine>,
          ]
        : []),
    ],
  });

  return (
    <Layout>
      <Layout.Header title="Line Items" />
      <Layout.Column>
        <Tabs.Root
          value={editable ? "editable" : "readonly"}
          onValueChange={(value) => setEditable(value === "editable")}
        >
          <Tabs.List aria-label="Editing mode">
            <Tabs.Tab value="editable">Editable</Tabs.Tab>
            <Tabs.Tab value="readonly">Readonly</Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
        <LineItems.Root value={lineItems}>
          <LineItems.Table aria-label="Order line items" />
        </LineItems.Root>
        {editable && (
          <div className="astw:flex astw:gap-2">
            <Button
              type="button"
              onClick={() =>
                lineItems.addLine({
                  item: "New item",
                  quantity: 1,
                  unitPrice: 1,
                  status: "open",
                  dueDate: null,
                })
              }
            >
              Add line
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!lineItems.isDirty}
              onClick={lineItems.revert}
            >
              Discard changes
            </Button>
          </div>
        )}
      </Layout.Column>
    </Layout>
  );
};

LineItemsPage.appShellPageProps = {
  meta: {
    title: "Line Items",
    icon: <ListIcon />,
  },
} satisfies AppShellPageProps;

export default LineItemsPage;
