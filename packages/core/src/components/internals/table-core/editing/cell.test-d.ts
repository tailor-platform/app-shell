import { expectTypeOf, test } from "vitest";
import type { CellEditorConfig, EditableCellProps } from "./cell";

test("registered editor configs retain their discriminators and required fields", () => {
  expectTypeOf<CellEditorConfig["type"]>().toEqualTypeOf<"text" | "number" | "choice" | "date">();
  expectTypeOf<EditableCellProps<"text">["config"]["type"]>().toEqualTypeOf<"text">();
  expectTypeOf<EditableCellProps<"number">["config"]["type"]>().toEqualTypeOf<"number">();
  expectTypeOf<Extract<CellEditorConfig, { type: "choice" }>["options"]>().toEqualTypeOf<
    readonly { value: string; label: string }[]
  >();
  expectTypeOf<Extract<CellEditorConfig, { type: "date" }>["withTime"]>().toEqualTypeOf<
    boolean | undefined
  >();
});

test("registry-derived configs reject missing or mismatched editor options", () => {
  const choice: CellEditorConfig = {
    type: "choice",
    options: [{ value: "open", label: "Open" }],
    renderOption: (value, label) => {
      expectTypeOf(value).toEqualTypeOf<string>();
      expectTypeOf(label).toEqualTypeOf<string>();
      return label;
    },
  };
  const date: CellEditorConfig = { type: "date", withTime: true };
  // @ts-expect-error Choice options remain required.
  const missingOptions: CellEditorConfig = { type: "choice" };
  // @ts-expect-error Date configs do not accept choice options.
  const dateOptions: CellEditorConfig = { type: "date", options: [] };
  // @ts-expect-error Number configs do not accept date options.
  const numberOptions: CellEditorConfig = { type: "number", withTime: true };
  // @ts-expect-error Only registered editor kinds are supported.
  const unknownKind: CellEditorConfig = { type: "boolean" };
  // @ts-expect-error A date cell cannot receive a choice config.
  const mismatched: EditableCellProps<"date">["config"] = { type: "choice", options: [] };
  void choice;
  void date;
  void missingOptions;
  void dateOptions;
  void numberOptions;
  void unknownKind;
  void mismatched;
});
