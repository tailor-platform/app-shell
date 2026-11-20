import {
  useLineItems,
  type LineItemsChangeset,
  type LineItemsColumn,
} from "@tailor-platform/app-shell";

type Line = { id?: string; quantity: number; notes?: string | null };
const columns: LineItemsColumn<Line>[] = [
  { accessorKey: "quantity", equals: (baseline, current) => baseline === current },
  { accessorKey: "notes", equals: (baseline, current) => baseline === current },
];

export function ChangesetConsumer() {
  const lines = useLineItems<Line>({ columns });
  const changes: LineItemsChangeset<Line> = lines.getChanges();
  const quantity: number | undefined = changes.updated[0]?.changes.quantity;
  const order: readonly string[] | null = changes.order;
  // @ts-expect-error Changes retain the declared property's value type.
  const wrong: string = changes.updated[0].changes.quantity;
  async function save() {
    const prepared: LineItemsChangeset<Line> | null = await lines.commitChanges();
    if (prepared === null) return;
    try {
      lines.replaceLines([{ id: "confirmed", quantity: 2 }]);
      const locked: boolean = lines.isSaveLocked;
      void locked;
      // @ts-expect-error Confirmed replacements preserve consumer property types.
      lines.replaceLines([{ id: "confirmed", quantity: "invalid" }]);
    } finally {
      lines.finishSave();
    }
  }
  void [quantity, order, wrong, save];
  return null;
}
