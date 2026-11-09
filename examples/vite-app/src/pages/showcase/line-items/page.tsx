import {
  Button,
  Layout,
  LineItems,
  useLineItems,
  type AppShellPageProps,
} from "@tailor-platform/app-shell";
import { ListIcon } from "lucide-react";

type OrderLine = { id?: string; item: string; quantity: number; unitPrice: number };

const LineItemsPage = () => {
  const lineItems = useLineItems<OrderLine>({
    defaultLines: [
      { id: "line-1", item: "Notebook", quantity: 2, unitPrice: 5 },
      { id: "line-2", item: "Pen", quantity: 3, unitPrice: 1.5 },
      { id: "line-3", item: "Pencil", quantity: 4, unitPrice: 1 },
      { id: "line-4", item: "Eraser", quantity: 2, unitPrice: 0.75 },
      { id: "line-5", item: "Ruler", quantity: 1, unitPrice: 2 },
    ],
    columns: [
      { accessorKey: "item", label: "Item" },
      { accessorKey: "quantity", label: "Quantity", type: "number" },
      { accessorKey: "unitPrice", label: "Unit price", type: "money" },
      {
        id: "actions",
        label: "Actions",
        align: "right",
        render: (line) => (
          <Button
            type="button"
            variant="link"
            className="astw:h-auto astw:p-0"
            aria-label={`Delete ${line.item}`}
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
            onClick={() => lineItems.addLine({ item: "New item", quantity: 1, unitPrice: 1 })}
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
