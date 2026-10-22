import { useRef, useState } from "react";
import {
  Button,
  DataTable,
  Text,
  createColumnHelper,
  useDataTable,
} from "@tailor-platform/app-shell";

type ErrorDemoRow = {
  id: string;
  name: string;
  note: string | null;
  quantity: number | null;
  code: string | null;
};

const { column } = createColumnHelper<ErrorDemoRow>();

function checkNote(value: string | null) {
  if (value?.includes("!")) throw new Error("Remove ! from the note");
  if (value?.includes("?"))
    throw new Error(
      "Notes can't contain questions. Send open questions to the receiving team through the comments panel so they are tracked against this purchase order.",
    );
}

/** Callback failures use the table's default popover unless content is overridden. */
export function EditingErrorsDemo() {
  const [rows, setRows] = useState<ErrorDemoRow[]>([
    { id: "error-demo", name: "Prototype row", note: "Ready", quantity: 5, code: "SKU-100" },
  ]);
  const [savingCount, setSavingCount] = useState(0);
  const [feedback, setFeedback] = useState("No action yet.");
  const quantityRevision = useRef(0);
  const update = (id: string, patch: Partial<ErrorDemoRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const columns = [
    column({ id: "name", label: "Item", type: "text", width: 160 }),
    column({
      id: "note",
      label: "Draft note",
      type: "text",
      width: 200,
      edit: {
        onValueChange: (_row, draft) => checkNote(draft),
        onValueCommitted: (row, value) => update(row.id, { note: value }),
      },
    }),
    column({
      id: "quantity",
      label: "Async quantity",
      type: "number",
      width: 160,
      edit: {
        onValueChange: () => {
          quantityRevision.current += 1;
        },
        onValueCommitted: async (row, value) => {
          const revision = ++quantityRevision.current;
          setSavingCount((count) => count + 1);
          try {
            await new Promise<void>((resolve) => setTimeout(resolve, 600));
            if (value === 13) throw new Error("Quantity 13 was rejected by the simulated server");
            if (revision === quantityRevision.current) {
              update(row.id, { quantity: value });
            }
          } finally {
            setSavingCount((count) => count - 1);
          }
        },
      },
    }),
    column({
      id: "code",
      label: "Custom code",
      type: "text",
      width: 180,
      edit: {
        onValueCommitted: (row, value) => {
          if (!value?.startsWith("SKU-")) throw new Error("Item code must start with SKU-");
          update(row.id, { code: value });
        },
        error: {
          render: ({ row, error }) => (
            <div className="space-y-2">
              <Text variant="label-md">Code issue for {row.name}</Text>
              <Text variant="body-sm">
                {error instanceof Error ? error.message : "The code could not be accepted."}
              </Text>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFeedback("Use a code beginning with SKU-, for example SKU-101.")}
              >
                Show valid code example
              </Button>
            </div>
          ),
        },
      },
    }),
  ];
  const table = useDataTable({ columns, data: { rows } });

  return (
    <div className="space-y-3">
      <ul className="list-inside list-disc space-y-1 text-body-sm text-muted-foreground">
        <li>
          In <strong>Draft note</strong>, type <code>!</code> to throw from{" "}
          <code>onValueChange</code>. The failed draft stays visible and cannot be confirmed until
          you remove <code>!</code>. Type <code>?</code> instead to see a longer message wrap. Press
          Esc to restore the adopted note and clear its error together.
        </li>
        <li>
          Set <strong>Async quantity</strong> to <code>13</code> and press Enter. The returned
          Promise rejects after 600 ms; <code>13</code> stays visible while pending and after
          failure. Enter retries the same draft. Change it to <code>14</code> to save successfully,
          or press Esc to restore the adopted quantity. To test stale failures, confirm 13 and start
          typing another value before the rejection arrives.
        </li>
        <li>
          Set <strong>Custom code</strong> to <code>bad</code> and press Enter. Open its error
          popover and use <strong>Show valid code example</strong> to try interactive custom
          content. The failed <code>bad</code> draft remains editable; change it to{" "}
          <code>SKU-101</code> and confirm to adopt a valid code.
        </li>
      </ul>
      <Text variant="body-sm" className="text-muted-foreground">
        Click an error icon or press Alt+ArrowDown in its editor to inspect the popover without
        confirming or discarding the draft. Pending and failed drafts survive Tab or blur without
        trapping focus. Only successful confirmation clears the draft; only the consumer adopts
        successful values. The standard popover adds no reset action. Closing error details keeps
        the draft; Esc in the editor cancels the draft and its error together.
      </Text>
      <DataTable.Root value={table}>
        <DataTable.Table />
        <DataTable.Footer>
          <div className="space-y-1">
            <Text variant="body-sm" className="text-muted-foreground" aria-live="polite">
              Saves in flight: {savingCount}
            </Text>
            <Text variant="body-sm" render={<output />}>
              {feedback}
            </Text>
          </div>
        </DataTable.Footer>
      </DataTable.Root>
    </div>
  );
}
