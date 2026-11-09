import {
  Button,
  Layout,
  LineItems,
  useLineItems,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { ListIcon } from "lucide-react";

type OrderLine = {
  id?: string;
  item: string | null;
  quantity: number | null;
  unitPrice: number | null;
  status: string | null;
};

const LineItemsPage = () => {
  const lineItems = useLineItems<OrderLine>({
    defaultLines: [
      { id: "line-1", item: "Notebook", quantity: 2, unitPrice: 5, status: "open" },
      { id: "line-2", item: "Pen", quantity: 3, unitPrice: 1.5, status: "closed" },
      { id: "line-3", item: "Pencil", quantity: 4, unitPrice: 1, status: "open" },
      { id: "line-4", item: "Eraser", quantity: 2, unitPrice: 0.75, status: "open" },
      { id: "line-5", item: "Ruler", quantity: 1, unitPrice: 2, status: "closed" },
    ],
    columns: [
      { accessorKey: "item", label: "Item", edit: { editorType: "text" } },
      {
        accessorKey: "quantity",
        label: "Quantity",
        type: "number",
        edit: { editorType: "number" },
      },
      {
        accessorKey: "unitPrice",
        label: "Unit price",
        type: "money",
        edit: { editorType: "number" },
      },
      {
        accessorKey: "status",
        label: "Status",
        edit: {
          editorType: "combobox",
          options: [
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
          ],
        },
      },
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
      },
    ],
  });

  return (
    <Layout>
      <Layout.Header title="Line Items" />
      <Layout.Column>
        <LineItems.Root value={lineItems}>
          <LineItems.Table aria-label="Order line items" />
        </LineItems.Root>
        <div className="astw:flex astw:gap-2">
          <Button
            type="button"
            onClick={() =>
              lineItems.addLine({ item: "New item", quantity: 1, unitPrice: 1, status: "open" })
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
