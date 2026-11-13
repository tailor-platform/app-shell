import {
  Badge,
  Button,
  DataTable,
  Link,
  Sheet,
  Text,
  Toolbar,
  createColumnHelper,
  useDataTable,
  useLocation,
  useSearchParams,
} from "@tailor-platform/app-shell";
import { useState } from "react";

// 🧪 Dummy Data: local records keep navigation and drawer behavior easy to inspect.
type Order = {
  id: string;
  customer: string;
  total: number;
  status: "ready" | "restricted";
  note: string;
};

const ORDERS: Order[] = [
  {
    id: "ORD-1001",
    customer: "Northstar Supply",
    total: 1280,
    status: "ready",
    note: "Select and copy this text without opening the record.",
  },
  {
    id: "ORD-1002",
    customer: "Harbor Trading",
    total: 845.5,
    status: "ready",
    note: "The customer link has its own destination, separate from the row action.",
  },
  {
    id: "ORD-1003",
    customer: "Pine Works",
    total: 2400,
    status: "restricted",
    note: "The primary action is unavailable; selection and related links still work.",
  },
];

const { column } = createColumnHelper<Order>();

export function RowInteractionDemo() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("row-demo-order");
  const customer = searchParams.get("row-demo-customer");
  const detailOrder = ORDERS.find((order) => order.id === orderId);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [feedback, setFeedback] = useState("No secondary action yet.");

  const columns = [
    column({ id: "id", label: "Order", type: "text", width: 140 }),
    column({
      id: "customer",
      label: "Customer (related link)",
      type: "link",
      width: 230,
      typeOptions: {
        href: (row) => `${pathname}?row-demo-customer=${encodeURIComponent(row.customer)}`,
      },
    }),
    column({
      id: "total",
      label: "Total (edit configured)",
      type: "money",
      width: 200,
      edit: {
        canEdit: (row) => row.id === "ORD-1001",
        onValueCommitted: (row, total) =>
          setFeedback(`${row.id}: total draft ${total ?? "empty"} (not saved).`),
      },
    }),
    column({
      id: "status",
      label: "Access (custom renderer)",
      width: 210,
      render: (row) => (
        <Badge
          variant={row.status === "ready" ? "success" : "neutral"}
          className="astw:cursor-inherit"
        >
          {row.status === "ready" ? "Available" : "Restricted"}
        </Badge>
      ),
    }),
    column({
      id: "note",
      label: "Note (custom renderer)",
      width: 430,
      render: (row) => <Text.span>{row.note}</Text.span>,
    }),
  ];
  const rowActions = [
    {
      id: "flag",
      label: "Flag for review",
      onClick: (row: Order) => setFeedback(`Flagged ${row.id} for review (menu action only).`),
    },
  ];
  const linkTable = useDataTable({
    columns,
    data: { rows: ORDERS },
    rowSelection: {},
    rowActions,
    rowInteraction: {
      type: "link",
      label: "Open",
      getLabel: (row) => row.id,
      canApply: (row) => row.status !== "restricted",
      href: (row) => `${pathname}?row-demo-order=${encodeURIComponent(row.id)}`,
    },
  });
  const clickTable = useDataTable({
    columns,
    data: { rows: ORDERS },
    rowSelection: {},
    rowActions,
    rowInteraction: {
      type: "click",
      label: "Edit",
      getLabel: (row) => row.id,
      canApply: (row) => row.status !== "restricted",
      onClick: (row) => setEditingOrder(row),
    },
  });

  return (
    <div className="space-y-6">
      {(detailOrder || customer) && (
        <section
          aria-labelledby="row-interaction-detail-heading"
          className="space-y-2 rounded-md border border-border bg-muted/40 p-4"
        >
          <Text.h3 id="row-interaction-detail-heading" variant="heading-sm">
            {detailOrder ? `Order details: ${detailOrder.id}` : `Customer details: ${customer}`}
          </Text.h3>
          <Text.p>
            {detailOrder
              ? `${detailOrder.customer} · $${detailOrder.total.toFixed(2)}`
              : "This is the related customer destination, not the order's primary action."}
          </Text.p>
          <Text.p variant="body-sm" className="text-muted-foreground">
            This destination is stored in the URL: reload, use Back, or open the link in a new tab.
          </Text.p>
          <Link to={pathname} className="text-primary underline underline-offset-4">
            Back to the list
          </Link>
        </section>
      )}

      <section aria-labelledby="row-interaction-link-heading" className="space-y-3">
        <Text.h3 id="row-interaction-link-heading" variant="heading-sm">
          Link — open order details
        </Text.h3>
        <Text.p variant="body-sm" className="max-w-3xl text-muted-foreground">
          Row clicks and Open come from one rowInteraction definition. Order, Access, and Note all
          activate the same primary action without column-specific configuration. Total has edit
          configured: neither editable nor read-only totals open the record. Open is a real link
          styled as a button; Cmd/Ctrl-click, middle-click, and the browser link menu work on Open
          itself. Built-in related links, checkboxes, and the secondary menu keep their clicks
          independent. Custom interactive renderers should call event.stopPropagation(), as with
          ordinary React row-click handlers.
        </Text.p>
        <DataTable.Root value={linkTable}>
          <Toolbar.Root>
            <Toolbar.Row className="justify-end" aria-label="Order navigation table controls">
              <Toolbar.Group>
                <DataTable.ColumnSettings />
              </Toolbar.Group>
            </Toolbar.Row>
          </Toolbar.Root>
          <DataTable.Table />
        </DataTable.Root>
      </section>

      <section aria-labelledby="row-interaction-click-heading" className="space-y-3">
        <Text.h3 id="row-interaction-click-heading" variant="heading-sm">
          Click — open an edit drawer
        </Text.h3>
        <Text.p variant="body-sm" className="max-w-3xl text-muted-foreground">
          Edit is a real button: Tab to it and press Enter or Space, or click Order, Access, or
          Note. Only ORD-1001's total can be edited; all Total cells stay outside row activation,
          including read-only ones. Total drafts are reported below, not saved. The restricted row
          cannot open the drawer. No renderer opt-in or DOM marker is required.
        </Text.p>
        <DataTable.Root value={clickTable}>
          <DataTable.Table />
        </DataTable.Root>
      </section>

      <Text
        variant="body-sm"
        className="text-muted-foreground"
        render={<output aria-live="polite" />}
      >
        {feedback}
      </Text>

      <Sheet.Root
        side="right"
        open={editingOrder !== null}
        onOpenChange={(open) => {
          if (!open) setEditingOrder(null);
        }}
      >
        <Sheet.Content>
          <Sheet.Header>
            <Sheet.Title>Edit {editingOrder?.id}</Sheet.Title>
            <Sheet.Description>
              Opened by the click-type primary action, without navigating to another page.
            </Sheet.Description>
          </Sheet.Header>
          <div className="space-y-3 p-4">
            <Text.p>{editingOrder?.customer}</Text.p>
            <Text.p variant="body-sm" className="text-muted-foreground">
              Prototype only — no record is changed. Close the drawer or press Esc to return to the
              table.
            </Text.p>
          </div>
          <Sheet.Footer>
            <Sheet.Close render={<Button variant="outline" />}>Close drawer</Sheet.Close>
          </Sheet.Footer>
        </Sheet.Content>
      </Sheet.Root>
    </div>
  );
}
