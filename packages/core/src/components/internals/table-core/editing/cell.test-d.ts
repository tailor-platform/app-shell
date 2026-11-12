import type { ComponentProps } from "react";
import { expectTypeOf, test } from "vitest";
import { EditableCell, type EditableCellOwnerProps } from "./cell";
import { choiceEditor } from "./choice";
import { dateEditor } from "./date";
import { numberEditor, textEditor } from "./typing";
import type { CellEditorOptions, CellEditorOutput, CellEditorProps } from "./props";

declare const ownerProps: EditableCellOwnerProps;

test("injected editors retain required options without a kind discriminator", () => {
  type ChoiceOptions = CellEditorOptions<typeof choiceEditor>;
  type DateOptions = CellEditorOptions<typeof dateEditor>;
  expectTypeOf<ChoiceOptions["options"]>().toEqualTypeOf<
    readonly { value: string; label: string }[]
  >();
  expectTypeOf<DateOptions["withTime"]>().toEqualTypeOf<boolean | undefined>();
  expectTypeOf<DateOptions["timeZone"]>().toEqualTypeOf<string>();
  expectTypeOf<keyof ChoiceOptions>().toEqualTypeOf<"options" | "renderOption">();
  expectTypeOf<keyof DateOptions>().toEqualTypeOf<"withTime" | "timeZone">();
  expectTypeOf<Extract<keyof CellEditorProps<unknown>, "timeZone">>().toEqualTypeOf<never>();
  expectTypeOf<Extract<keyof EditableCellOwnerProps, "timeZone">>().toEqualTypeOf<never>();

  EditableCell({
    ...ownerProps,
    editor: choiceEditor,
    options: {
      options: [{ value: "open", label: "Open" }],
      renderOption: (value, label) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        expectTypeOf(label).toEqualTypeOf<string>();
        return label;
      },
    },
  });
  EditableCell({ ...ownerProps, editor: dateEditor, options: { withTime: true, timeZone: "UTC" } });
  EditableCell({ ...ownerProps, editor: dateEditor, options: { timeZone: "UTC" } });
  EditableCell({ ...ownerProps, editor: textEditor, options: {} });
  EditableCell({ ...ownerProps, editor: numberEditor, options: {} });
});

test("editor implementations expose their confirmed output types", () => {
  expectTypeOf<CellEditorOutput<typeof textEditor>>().toEqualTypeOf<string | null>();
  expectTypeOf<CellEditorOutput<typeof numberEditor>>().toEqualTypeOf<number | null>();
  expectTypeOf<CellEditorOutput<typeof choiceEditor>>().toEqualTypeOf<string | null>();
  expectTypeOf<CellEditorOutput<typeof dateEditor>>().toEqualTypeOf<string | null>();
  expectTypeOf<CellEditorOptions<typeof numberEditor>>().toEqualTypeOf<Record<string, never>>();
  expectTypeOf<CellEditorOutput<object>>().toEqualTypeOf<never>();

  const commitNumber: ComponentProps<typeof numberEditor.Editor>["commit"] = (value) => {
    expectTypeOf(value).toEqualTypeOf<number | null>();
  };
  commitNumber(12.5);
  commitNumber(null);
  // @ts-expect-error The numeric input cannot confirm text.
  commitNumber("12.5");

  const commitText: ComponentProps<typeof textEditor.Editor>["commit"] = (value) => {
    expectTypeOf(value).toEqualTypeOf<string | null>();
  };
  commitText("text");
  commitText(null);
  // @ts-expect-error The text input cannot confirm a numeric value.
  commitText(12.5);
});

test("cell confirmation types are inferred only from the selected editor", () => {
  EditableCell({
    ...ownerProps,
    editor: numberEditor,
    options: {},
    commit: (value) => {
      expectTypeOf(value).toEqualTypeOf<number | null>();
    },
  });
  EditableCell({
    ...ownerProps,
    editor: choiceEditor,
    options: { options: [] },
    commit: (value) => {
      expectTypeOf(value).toEqualTypeOf<string | null>();
    },
  });
  EditableCell({
    ...ownerProps,
    editor: numberEditor,
    options: {},
    // @ts-expect-error A callback cannot widen a number editor's output to text.
    commit: (_value: string | null) => {},
  });
  EditableCell({
    ...ownerProps,
    editor: numberEditor,
    options: {},
    // @ts-expect-error A number editor can confirm null on clear.
    commit: (_value: number) => {},
  });
  EditableCell({
    ...ownerProps,
    editor: dateEditor,
    options: { timeZone: "UTC" },
    // @ts-expect-error A callback cannot change the confirmed output of a date editor.
    commit: (_value: number | null) => {},
  });
});

test("options cannot widen or disagree with the injected editor", () => {
  // @ts-expect-error Choice options remain required.
  EditableCell({ ...ownerProps, editor: choiceEditor });
  // @ts-expect-error A choice editor requires its fixed choices.
  EditableCell({ ...ownerProps, editor: choiceEditor, options: {} });
  // @ts-expect-error Date options cannot substitute for choice options.
  EditableCell({ ...ownerProps, editor: choiceEditor, options: { withTime: true } });
  // @ts-expect-error Fixed candidates use options, not a second choices shape.
  EditableCell({ ...ownerProps, editor: choiceEditor, options: { choices: [] } });
  // @ts-expect-error A date editor cannot receive choice options.
  EditableCell({ ...ownerProps, editor: dateEditor, options: { timeZone: "UTC", options: [] } });
  // @ts-expect-error The date adapter must resolve its timezone before rendering.
  EditableCell({ ...ownerProps, editor: dateEditor, options: { withTime: true } });
  // @ts-expect-error A timezone is not part of the generic cell contract.
  EditableCell({ ...ownerProps, editor: numberEditor, options: {}, timeZone: "UTC" });
  // @ts-expect-error A number editor has no date options.
  EditableCell({ ...ownerProps, editor: numberEditor, options: { withTime: true } });
  // @ts-expect-error Options describe the selected editor, not another kind.
  EditableCell({ ...ownerProps, editor: textEditor, options: { type: "number" } });
});
