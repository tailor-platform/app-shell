import {
  Button,
  CellEditError,
  Checkbox,
  Layout,
  LineItems,
  Tabs,
  Text,
  Textarea,
  useLineItems,
  type AppShellPageProps,
  type LineItemsColumn,
} from "@tailor-platform/app-shell";
import { ListIcon, XIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";

type OrderLine = {
  id?: string;
  item: string | null;
  quantity: number | null;
  unitPrice: number | null;
  status: string | null;
  dueDate: string | null;
  notes?: string;
};

const previewValue = (_key: string, value: unknown) =>
  value === undefined ? "[undefined]" : value;

const validateQuantity = async (_row: Readonly<OrderLine>, value: number | null) => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  if (value === null || !Number.isSafeInteger(value) || value <= 0) {
    throw new CellEditError("Quantity must be a positive safe integer.");
  }
};

const initialLines: OrderLine[] = [
  {
    id: "line-1",
    item: "Notebook",
    quantity: 2,
    unitPrice: 5,
    status: "open",
    dueDate: "2026-11-16",
    notes: "Deliver together",
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
];

const LineItemsPage = () => {
  const [editable, setEditable] = useState(true);
  const [failSave, setFailSave] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Not saved.");
  // Simulated backend state, separate from the hook's current local edits.
  const savedLines = useRef(initialLines);
  const nextServerId = useRef(1);
  const canEdit = useCallback(() => editable, [editable]);
  const lineItems = useLineItems<OrderLine>({
    orderer: false,
    defaultLines: initialLines,
    columns: [
      {
        accessorKey: "item",
        label: "Item",
        equals: (baseline, current) => baseline?.toLowerCase() === current?.toLowerCase(),
        edit: { editorType: "text", canEdit },
      },
      {
        accessorKey: "quantity",
        label: "Quantity",
        type: "number",
        typeOptions: { maxDecimals: 0 },
        edit: { editorType: "number", canEdit, onValueCommitted: validateQuantity },
      },
      {
        accessorKey: "unitPrice",
        label: "Unit price",
        type: "money",
      },
      {
        id: "total",
        label: "Total",
        type: "money",
        accessor: (line) => (line.quantity ?? 0) * (line.unitPrice ?? 0),
      },
      {
        accessorKey: "status",
        label: "Status",
        edit: {
          editorType: "combobox",
          canEdit,
          editorOptions: {
            options: [
              { value: "open", label: "Open" },
              { value: "closed", label: "Closed" },
            ],
          },
        },
      },
      {
        accessorKey: "dueDate",
        label: "Due date",
        type: "date",
        edit: { editorType: "date", canEdit },
      },
      {
        accessorKey: "notes",
        label: "Notes",
        edit: { editorType: "text", canEdit, clearValue: () => undefined },
      },
      ...(editable
        ? [
            {
              id: "actions",
              label: "Actions",
              width: 64,
              align: "center",
              headerProps: () => ({ className: "first:pl-2! last:pr-2!" }),
              cellProps: () => ({ className: "py-1! first:pl-2! last:pr-2!" }),
              render: (line) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="align-middle"
                  aria-label={`Delete ${line.item ?? "line"}`}
                  disabled={lineItems.isSaveLocked}
                  onClick={() => lineItems.removeLine(lineItems.getLineKey(line))}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              ),
            } satisfies LineItemsColumn<OrderLine>,
          ]
        : []),
    ],
  });
  const changes = lineItems.getChanges();

  const handleSave = async () => {
    setSaveStatus("Confirming input…");
    try {
      const prepared = await lineItems.commitChanges();
      if (prepared === null) {
        setSaveStatus("Input could not be confirmed. Correct it and retry.");
        return;
      }
      try {
        setSaveStatus("Saving…");
        await new Promise((resolve) => setTimeout(resolve, 700));
        if (failSave) throw new Error("Simulated save failed. Unsaved changes are retained.");

        const confirmed = new Map(savedLines.current.map((line) => [line.id!, { ...line }]));
        for (const line of prepared.removed) confirmed.delete(line.id!);
        for (const update of prepared.updated)
          confirmed.set(update.lineKey, { ...confirmed.get(update.lineKey)!, ...update.changes });
        const savedKeys = new Map<string, string>();
        for (const line of prepared.added) {
          const id = `saved-line-${nextServerId.current++}`;
          savedKeys.set(lineItems.getLineKey(line), id);
          confirmed.set(id, { ...line, id });
        }
        const order = prepared.order ?? [...confirmed.keys()];
        const rows = order.map((key) => confirmed.get(savedKeys.get(key) ?? key)!);
        savedLines.current = rows;
        lineItems.replaceLines(rows);
        setSaveStatus("Saved. Confirmed data is the new baseline.");
      } finally {
        lineItems.finishSave();
      }
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "The save could not be completed.");
    }
  };

  return (
    <Layout>
      <Layout.Header title="Line Items" />
      <Layout.Column>
        <Tabs.Root
          value={editable ? "editable" : "readonly"}
          onValueChange={(value) => {
            if (!lineItems.isSaveLocked) setEditable(value === "editable");
          }}
        >
          <Tabs.List aria-label="Editing mode">
            <Tabs.Tab value="editable" disabled={lineItems.isSaveLocked}>
              Editable
            </Tabs.Tab>
            <Tabs.Tab value="readonly" disabled={lineItems.isSaveLocked}>
              Readonly
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
        {editable && (
          <Text variant="body-sm" className="text-muted-foreground">
            Press Enter to commit a cell, or Save while still typing. Quantity uses asynchronous
            validation and must be a positive safe integer. Rejected input stays out of committed
            changes. Unit price is readonly: precision-sensitive decimal editing and manual ordering
            are outside this initial-release example.
          </Text>
        )}
        <LineItems.Root value={lineItems}>
          <LineItems.Table aria-label="Order line items" />
        </LineItems.Root>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={lineItems.isSaveLocked}
              onClick={() =>
                lineItems.addLine({
                  item: "New item",
                  quantity: 1,
                  unitPrice: 1,
                  status: "open",
                  dueDate: null,
                  notes: "New line note",
                })
              }
            >
              Add line
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={lineItems.isSaveLocked}
              onClick={lineItems.revert}
            >
              Discard changes
            </Button>
            <Button type="button" disabled={lineItems.isSaveLocked} onClick={handleSave}>
              Save
            </Button>
            <Checkbox
              label="Simulate save failure"
              checked={failSave}
              onCheckedChange={setFailSave}
              disabled={lineItems.isSaveLocked}
            />
          </div>
        )}
        <Text render={<output aria-label="Save status" />}>{saveStatus}</Text>
        <Text variant="body-sm" className="text-muted-foreground">
          Save confirms drafts, then persists the returned changeset through a simulated backend.
          Failed saves retain local changes; successful saves adopt the confirmed full collection
          and server IDs as a new baseline. Case-insensitive equivalent values are not written.
          Saving blocks new edits without changing the editing permission.
        </Text>
        <section aria-labelledby="line-items-api-title" className="flex flex-col gap-3">
          <Text.h2 id="line-items-api-title">API inspection</Text.h2>
          <Text render={<output aria-label="Line change summary" />}>
            isDirty: {String(lineItems.isDirty)} · Added: {changes.added.length} · Updated:{" "}
            {changes.updated.length} · Removed: {changes.removed.length} · Order changed:{" "}
            {String(changes.order !== null)}
          </Text>
          <Text variant="body-sm" className="text-muted-foreground">
            These previews read committed state only. Reading changes does not confirm drafts,
            validate, save, or reset the baseline. An empty changeset does not mean there are no
            pending drafts.
          </Text>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <Text variant="body-sm">
                Change Notebook to NOTEBOOK: Item uses case-insensitive equals, so the committed
                value changes without a field update. Discard still restores the original value.
              </Text>
            </li>
            <li>
              <Text variant="body-sm">
                Change Quantity from 2 to 5, then back to 2, or add then delete a new line: the net
                change disappears. Edit then delete a saved line to see its original baseline row in
                removed.
              </Text>
            </li>
            <li>
              <Text variant="body-sm">
                Clear Notes to commit undefined. This preview shows it as the string [undefined];
                ordinary JSON serialization would omit that field. Consumers must map clears for
                their transport.
              </Text>
            </li>
            <li>
              <Text variant="body-sm">
                Order contains the complete final line-key sequence when added or removed membership
                changes; null means unchanged. Manual ordering is disabled in this initial-release
                example.
              </Text>
            </li>
          </ul>
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <section aria-labelledby="line-items-lines-title" className="min-w-0 space-y-2">
              <Text.h3 id="line-items-lines-title">Committed lines</Text.h3>
              <Textarea
                aria-labelledby="line-items-lines-title"
                readOnly
                className="h-80 resize-y bg-muted font-mono"
                value={JSON.stringify(
                  lineItems.lines.map((line) => ({
                    lineKey: lineItems.getLineKey(line),
                    ...line,
                  })),
                  previewValue,
                  2,
                )}
              />
            </section>
            <section aria-labelledby="line-items-changes-title" className="min-w-0 space-y-2">
              <Text.h3 id="line-items-changes-title">getChanges()</Text.h3>
              <Textarea
                aria-labelledby="line-items-changes-title"
                readOnly
                className="h-80 resize-y bg-muted font-mono"
                value={JSON.stringify(changes, previewValue, 2)}
              />
            </section>
          </div>
        </section>
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
