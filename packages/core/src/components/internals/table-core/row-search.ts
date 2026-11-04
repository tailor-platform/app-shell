type SearchColumn<T> = {
  getValue: (row: T) => unknown;
  search?: (row: T, query: string) => boolean;
};

const normalize = (text: string) => text.normalize("NFKC").toLowerCase().trim();

function scalarText(value: unknown): string {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
    case "bigint":
      return String(value);
    default:
      return "";
  }
}

/** Presentation-only substring search; arbitrary objects require an explicit matcher. */
export function filterRowsByQuery<T>(
  rows: readonly T[],
  columns: readonly SearchColumn<T>[],
  query: string,
): readonly T[] {
  const search = normalize(query);
  if (!search) return rows;
  return rows.filter((row) =>
    columns.some((column) => {
      if (column.search) return column.search(row, search);
      const value = column.getValue(row);
      const values = Array.isArray(value) ? value : [value];
      return values.some((item) => normalize(scalarText(item)).includes(search));
    }),
  );
}
