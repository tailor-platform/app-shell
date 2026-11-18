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
  void [quantity, order, wrong];
  return null;
}
