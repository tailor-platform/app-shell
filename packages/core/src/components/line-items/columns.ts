import { parseDateValue } from "@/components/internals/table-core/date-values";
import type { LineItemsCellError, LineItemsColumn } from "./types";

type PropertyRule<T> = {
  key: keyof T & string;
  columnId: string;
  commit: "document" | "metadata";
  normalize?: (value: unknown, row: Readonly<T>) => unknown;
  validate?: (value: unknown, row: Readonly<T>) => string | null | undefined;
  equals?: (left: unknown, right: unknown, row: Readonly<T>) => boolean;
  dateBounds?: { min?: string; max?: string };
};

/** Resolves heterogeneous property callbacks once, after their public types have been checked. */
export function compileLineItemsColumns<T extends Record<string, unknown>>(
  columns: readonly LineItemsColumn<T>[],
) {
  const ids = new Set<string>();
  const groups = new Map<string, LineItemsColumn<T>[]>();
  for (const column of columns) {
    const id = column.id ?? column.accessorKey;
    if (!id || ids.has(id)) throw new Error("Column IDs must be non-empty and unique");
    ids.add(id);
    if (column.accessorKey !== undefined) {
      const existing = groups.get(column.accessorKey) ?? [];
      existing.push(column);
      groups.set(column.accessorKey, existing);
    }
  }
  const rules = new Map<string, PropertyRule<T>>();
  for (const [key, group] of groups) {
    const owners = group.filter(
      (column) =>
        column.edit !== undefined ||
        column.normalize !== undefined ||
        column.validate !== undefined ||
        column.equals !== undefined ||
        column.commit !== undefined,
    );
    if (owners.length > 1) throw new Error(`Property "${key}" has multiple rule/edit owners`);
    const owner = owners[0] ?? group[0]!;
    const rule = owner as unknown as PropertyRule<T>;
    rules.set(key, {
      key,
      columnId: owner.id ?? key,
      commit: owner.commit ?? "document",
      normalize: rule.normalize,
      validate: rule.validate,
      equals: rule.equals,
      dateBounds:
        owner.edit?.editorType === "date"
          ? { min: owner.edit.min, max: owner.edit.max }
          : undefined,
    });
  }
  const documentKeys = [...rules.values()]
    .filter((rule) => rule.commit === "document")
    .map((rule) => rule.key);
  const metadataKeys = [...rules.values()]
    .filter((rule) => rule.commit === "metadata")
    .map((rule) => rule.key);

  return {
    documentKeys,
    metadataKeys,
    normalize(row: Readonly<T>): T {
      const context = Object.freeze({ ...row });
      const next = { ...row } as T;
      // Every normalizer sees the same merged input, not a preceding column's output.
      for (const rule of rules.values()) {
        if (rule.normalize) {
          (next as Record<string, unknown>)[rule.key] = rule.normalize(context[rule.key], context);
        }
      }
      return next;
    },
    equals(key: string, left: unknown, right: unknown, row: Readonly<T>): boolean {
      return rules.get(key)?.equals?.(left, right, row) ?? Object.is(left, right);
    },
    validate(rows: readonly T[], getLineKey: (row: T) => string): LineItemsCellError[] {
      const errors: LineItemsCellError[] = [];
      for (const row of rows) {
        for (const rule of rules.values()) {
          const value = row[rule.key];
          const invalidDate =
            rule.dateBounds &&
            value !== undefined &&
            parseDateValue(value, rule.dateBounds) === undefined;
          const message = invalidDate
            ? "Enter a valid date within the allowed range."
            : rule.validate?.(value, row);
          if (message) errors.push({ lineKey: getLineKey(row), columnId: rule.columnId, message });
        }
      }
      return errors;
    },
  };
}
