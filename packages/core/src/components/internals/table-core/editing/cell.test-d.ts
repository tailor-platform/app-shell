import type { ComponentProps } from "react";
import { expectTypeOf, test } from "vitest";
import { EditableCell, type EditableCellOwnerProps } from "./cell";
import { choiceEditor } from "./choice";
import { dateEditor } from "./date";
import { numberEditor, textEditor } from "./typing";

declare const ownerProps: EditableCellOwnerProps;

test("injected editors retain required options without a kind discriminator", () => {
  type ChoiceOptions = ComponentProps<typeof choiceEditor.Editor>["options"];
  type DateOptions = ComponentProps<typeof dateEditor.Editor>["options"];
  expectTypeOf<ChoiceOptions["choices"]>().toEqualTypeOf<
    readonly { value: string; label: string }[]
  >();
  expectTypeOf<DateOptions["withTime"]>().toEqualTypeOf<boolean | undefined>();
  expectTypeOf<keyof ChoiceOptions>().toEqualTypeOf<"choices" | "renderOption">();
  expectTypeOf<keyof DateOptions>().toEqualTypeOf<"withTime">();

  EditableCell({
    ...ownerProps,
    editor: choiceEditor,
    options: {
      choices: [{ value: "open", label: "Open" }],
      renderOption: (value, label) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        expectTypeOf(label).toEqualTypeOf<string>();
        return label;
      },
    },
  });
  EditableCell({ ...ownerProps, editor: dateEditor, options: { withTime: true } });
  EditableCell({ ...ownerProps, editor: textEditor, options: {} });
  EditableCell({ ...ownerProps, editor: numberEditor, options: {} });
});

test("options cannot widen or disagree with the injected editor", () => {
  // @ts-expect-error Choice options remain required.
  EditableCell({ ...ownerProps, editor: choiceEditor });
  // @ts-expect-error A choice editor requires its fixed choices.
  EditableCell({ ...ownerProps, editor: choiceEditor, options: {} });
  // @ts-expect-error Date options cannot substitute for choice options.
  EditableCell({ ...ownerProps, editor: choiceEditor, options: { withTime: true } });
  // @ts-expect-error A date editor cannot receive choice options.
  EditableCell({ ...ownerProps, editor: dateEditor, options: { choices: [] } });
  // @ts-expect-error A number editor has no date options.
  EditableCell({ ...ownerProps, editor: numberEditor, options: { withTime: true } });
  // @ts-expect-error Options describe the selected editor, not another kind.
  EditableCell({ ...ownerProps, editor: textEditor, options: { type: "number" } });
});
