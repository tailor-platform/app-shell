// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createLineItemsDocument } from "./document/model";
import { assertLineItemsEditor, lineItemsEditors } from "./editor-factory";
import type { LineItemsColumn, LineItemsEditor } from "./types";

vi.mock("react", () => {
  throw new Error("Document validation must not load React or editor UI");
});
vi.mock("./line-items-cell", () => {
  throw new Error("Document validation must not load the UI adapters");
});

type Row = { id?: string; value: string | number | null };
const settings = {
  text: { editorType: "text" },
  number: { editorType: "number" },
  date: { editorType: "date", withTime: true },
  combobox: {
    editorType: "combobox",
    options: Object.freeze([{ value: "open", label: "Open" }]),
  },
} satisfies {
  [K in keyof typeof lineItemsEditors]: Extract<LineItemsEditor<Row, unknown>, { editorType: K }>;
};

const columns = (edit: unknown) =>
  [{ accessorKey: "value", edit }] as unknown as LineItemsColumn<Row>[];

const document = () =>
  createLineItemsDocument<Row>({
    columns: columns(settings.text),
    lines: [{ id: "A", value: "Initial" }],
  });

describe("headless editor definitions", () => {
  it.each(Object.keys(settings) as (keyof typeof settings)[])(
    "validates %s at document creation and reconfiguration without UI bindings",
    (kind) => {
      const config = columns(settings[kind]);
      const doc = createLineItemsDocument<Row>({ columns: config });
      expect(() => doc.assertColumns(config)).not.toThrow();
      expect(Object.keys(lineItemsEditors)).toContain(kind);
    },
  );

  it.each(["custom", "constructor", "__proto__", { toString: () => "text" }, Object("date")])(
    "rejects an unsupported kind %s without changing the document",
    (editorType) => {
      const doc = document();
      const before = doc.getRows();
      const config = columns({ editorType });
      expect(() => createLineItemsDocument<Row>({ columns: config })).toThrow(
        "Unsupported LineItems editor type",
      );
      expect(() => doc.assertColumns(config)).toThrow("Unsupported LineItems editor type");
      expect(doc.getRows()).toBe(before);
      expect(doc.isDirty()).toBe(false);
    },
  );

  it.each([
    undefined,
    null,
    {},
    () => [],
    [null],
    [{ value: 1, label: "One" }],
    [{ value: "one", label: 1 }],
  ])("rejects malformed fixed options %s without UI preparation", (options) => {
    const edit = { editorType: "combobox", options };
    expect(() => assertLineItemsEditor(edit)).toThrow(
      "Combobox editors require fixed string options",
    );
    const doc = document();
    const before = doc.getRows();
    expect(() => doc.assertColumns(columns(edit))).toThrow(
      "Combobox editors require fixed string options",
    );
    expect(doc.getRows()).toBe(before);
    expect(doc.isDirty()).toBe(false);
  });
});
