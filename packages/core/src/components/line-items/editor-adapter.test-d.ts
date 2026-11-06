import { createElement, forwardRef, memo, useState } from "react";
import { expectTypeOf, test } from "vitest";
import {
  defineLineItemsEditor,
  type LineItemsColumn,
  type LineItemsCustomEditorContext,
  type LineItemsEditor,
} from "./index";
import { editorFactories, type createEditorFactories, type EditorFactory } from "./editors";
import type { LineItemsEditorType } from "./types";

type Row = {
  id: string;
  quantity: number | null;
  required: number;
  name: string | null;
  broad: string | number | null;
  packed: { amount: number; unit: string } | null;
  priority: 1 | 2 | null;
};
type QuantityContext = LineItemsCustomEditorContext<Row, number | null, string>;
function QuantityInput(context: QuantityContext) {
  const [local] = useState(0);
  return createElement("input", { value: context.draft, "data-local": local });
}

test("custom definitions keep adopted values, drafts and component context precisely typed", () => {
  const editor = defineLineItemsEditor<Row, number | null, string>({
    toDraft: (value) => {
      expectTypeOf(value).toEqualTypeOf<number | null>();
      return value === null ? "" : String(value);
    },
    parse: (draft) => {
      expectTypeOf(draft).toEqualTypeOf<string>();
      return draft === "" ? { ok: true, value: null } : { ok: true, value: Number(draft) };
    },
    render: (context) => {
      expectTypeOf(context).toEqualTypeOf<QuantityContext>();
      expectTypeOf(context.row).toEqualTypeOf<Readonly<Row>>();
      expectTypeOf(context.value).toEqualTypeOf<number | null>();
      expectTypeOf(context.draft).toEqualTypeOf<string>();
      expectTypeOf(context.onCommit()).toEqualTypeOf<Promise<boolean>>();
      expectTypeOf(context.status).toEqualTypeOf<"idle" | "editing" | "confirming" | "failed">();
      expectTypeOf(context.error).toEqualTypeOf<
        Readonly<{ source: "parse" | "change" | "commit"; error: unknown }> | undefined
      >();
      expectTypeOf(context.invalid).toEqualTypeOf<boolean>();
      expectTypeOf(context.describedBy).toEqualTypeOf<string | undefined>();
      context.onChange("-");
      // @ts-expect-error The draft is text even though the adopted value is numeric.
      context.onChange(2);
      // @ts-expect-error Confirmation must parse the session draft, not accept a bypass value.
      void context.onCommit(2);
      // @ts-expect-error The public row snapshot is readonly.
      context.row.quantity = 2;
      // @ts-expect-error Session plumbing is private to the adapter.
      void context.ui;
      return createElement(QuantityInput, context);
    },
  });
  const columns: LineItemsColumn<Row>[] = [
    {
      accessorKey: "quantity",
      edit: {
        editor,
        onValueCommitted: (row, value) => {
          expectTypeOf(row).toEqualTypeOf<Readonly<Row>>();
          expectTypeOf(value).toEqualTypeOf<number | null>();
        },
      },
    },
    {
      accessorKey: "broad",
      edit: {
        editor: { type: "number" },
        onValueCommitted: (_row, value) => {
          expectTypeOf(value).toEqualTypeOf<Row["broad"]>();
        },
      },
    },
  ];
  void columns;
  // @ts-expect-error A numeric custom editor cannot attach to a text property.
  const wrongField: LineItemsColumn<Row> = { accessorKey: "name", edit: { editor } };
  // @ts-expect-error A nullable output cannot attach to a required numeric property.
  const wrongOutput: LineItemsColumn<Row> = { accessorKey: "required", edit: { editor } };
  const requiredEditor = defineLineItemsEditor<Row, number, string>({
    toDraft: String,
    parse: (draft) => ({ ok: true, value: Number(draft) }),
    render: () => null,
  });
  // @ts-expect-error This editor cannot initialize a draft from an existing null.
  const wrongInput: LineItemsColumn<Row> = {
    accessorKey: "quantity",
    edit: { editor: requiredEditor },
  };
  type OtherRow = Omit<Row, "id"> & { id: number };
  const otherEditor = defineLineItemsEditor<OtherRow, number | null, string>({
    toDraft: String,
    parse: (draft) => ({ ok: true, value: Number(draft) }),
    render: () => null,
  });
  // @ts-expect-error The renderer's row contract must fit the consuming row type.
  const wrongRow: LineItemsColumn<Row> = { accessorKey: "quantity", edit: { editor: otherEditor } };
  void wrongField;
  void wrongOutput;
  void wrongInput;
  void wrongRow;
});

test("render accepts components including memo and forwardRef, but not elements or incompatible props", () => {
  const definition = {
    toDraft: (value: number | null) => String(value),
    parse: (draft: string) => ({ ok: true as const, value: Number(draft) }),
  };
  defineLineItemsEditor<Row, number | null, string>({ ...definition, render: QuantityInput });
  defineLineItemsEditor<Row, number | null, string>({ ...definition, render: memo(QuantityInput) });
  const ForwardedInput = forwardRef<HTMLInputElement, QuantityContext>((context, ref) =>
    createElement("input", { ref, value: context.draft }),
  );
  defineLineItemsEditor<Row, number | null, string>({ ...definition, render: ForwardedInput });
  defineLineItemsEditor<Row, number | null, string>({
    ...definition,
    // @ts-expect-error render is a component definition rather than a rendered element instance.
    render: createElement("input"),
  });
  defineLineItemsEditor<Row, number | null, string>({
    ...definition,
    // @ts-expect-error The component cannot require a numeric draft from this text-draft editor.
    render: (_context: { draft: number }) => null,
  });
  defineLineItemsEditor<Row, number | null, string>({
    ...definition,
    // @ts-expect-error Parsing must produce the declared adopted value type.
    parse: (draft) => ({ ok: true, value: draft }),
    render: QuantityInput,
  });
  // @ts-expect-error Custom handles cannot be forged from a type discriminator alone.
  const forged: LineItemsEditor<Row, number | null> = { type: "custom" };
  const irrelevant: LineItemsEditor<Row, string | null> = {
    type: "text",
    // @ts-expect-error A text editor has no date-range setting.
    options: { min: "2026-01-01" },
  };
  const wrongChoice: LineItemsEditor<Row, Row["priority"]> = {
    type: "combobox",
    options: {
      // @ts-expect-error Choice output must fit the property's literal values.
      options: [{ value: 3, label: "Invalid" }],
    },
  };
  void forged;
  void irrelevant;
  void wrongChoice;
});

test("editor type determines the nested options shape", () => {
  const date: LineItemsEditor<Row, string | null> = {
    type: "date",
    options: { min: "2026-01-01" },
  };
  const defaultDate: LineItemsEditor<Row, string | null> = { type: "date" };
  const remote: LineItemsColumn<Row> = {
    accessorKey: "priority",
    edit: {
      editor: {
        type: "combobox",
        options: {
          fetcher: async () => [],
          getOptionLabel: (value, row) => {
            expectTypeOf(value).toEqualTypeOf<1 | 2>();
            expectTypeOf(row).toEqualTypeOf<Row>();
            return String(value);
          },
        },
      },
    },
  };
  const flatDate: LineItemsEditor<Row, string | null> = {
    type: "date",
    // @ts-expect-error Date settings belong inside editor.options.
    min: "2026-01-01",
  };
  const flatChoices: LineItemsEditor<Row, number | null> = {
    type: "combobox",
    // @ts-expect-error options is a configuration object, not the choice array itself.
    options: [{ value: 1, label: "One" }],
  };
  const wrongDate: LineItemsEditor<Row, string | null> = {
    type: "date",
    // @ts-expect-error Date settings do not accept choice candidates.
    options: { options: [] },
  };
  void date;
  void defaultDate;
  void remote;
  void flatDate;
  void flatChoices;
  void wrongDate;
});

test("factory signatures determine editor kinds, options and field compatibility", () => {
  type Factories = ReturnType<typeof createEditorFactories<Row, Row["priority"]>>;
  type ChoiceConfig = Parameters<Factories["combobox"]>[0];
  expectTypeOf<
    Extract<LineItemsEditor<Row, Row["priority"]>, { type: "combobox" }>
  >().toEqualTypeOf<{ type: "combobox" } & ChoiceConfig>();
  expectTypeOf<
    Parameters<ReturnType<typeof createEditorFactories<Row, number>>["number"]>[0]
  >().toEqualTypeOf<never>();
  expectTypeOf<
    Parameters<ReturnType<typeof createEditorFactories<Row, Date | null>>["date"]>[0]
  >().toEqualTypeOf<never>();
  expectTypeOf<keyof typeof editorFactories>().toEqualTypeOf<LineItemsEditorType>();
  expectTypeOf<LineItemsEditor<Row, number | null>["type"]>().toEqualTypeOf<
    "number" | "combobox" | "custom"
  >();
  expectTypeOf<LineItemsEditor<Row, number>["type"]>().toEqualTypeOf<"custom">();

  const { custom, ...incomplete } = editorFactories;
  // @ts-expect-error Every editor kind requires an implementation.
  const missing: Record<LineItemsEditorType, EditorFactory> = incomplete;
  const extra: Record<LineItemsEditorType, EditorFactory> = {
    ...editorFactories,
    // @ts-expect-error A runtime registry cannot include an unregistered kind.
    unsupported: editorFactories.text,
  };
  void custom;
  void missing;
  void extra;
});

test("structured custom drafts can differ completely from their adopted values", () => {
  type Draft = { amount: string; unit: string };
  const editor = defineLineItemsEditor<Row, Row["packed"], Draft>({
    toDraft: (value) => ({ amount: String(value?.amount ?? ""), unit: value?.unit ?? "pcs" }),
    parse: (draft) => ({ ok: true, value: { amount: Number(draft.amount), unit: draft.unit } }),
    render: (context) => {
      expectTypeOf(context.draft).toEqualTypeOf<Draft>();
      expectTypeOf(context.value).toEqualTypeOf<Row["packed"]>();
      context.onChange({ amount: "-", unit: "box" });
      // @ts-expect-error Every draft snapshot must contain all structured input fields.
      context.onChange({ amount: "2" });
      // @ts-expect-error The amount input remains text until parsing succeeds.
      context.onChange({ amount: 2, unit: "box" });
      return null;
    },
  });
  const column: LineItemsColumn<Row> = { accessorKey: "packed", edit: { editor } };
  void column;
});
