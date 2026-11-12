import type { createLineItemsCellPreparers } from "./line-items-cell";

type UIAdapters = ReturnType<typeof createLineItemsCellPreparers>["bindings"];

/** Headless registration: validate settings without UI, then select an adapter for rendering. */
interface LineItemsEditorDefinition<TAdapter> {
  validate: (settings: unknown) => void;
  bind: (ui: UIAdapters) => TAdapter;
}

/** The single registration point for editor kinds, settings validation, and UI adapter selection. */
export const lineItemsEditors = {
  text: {
    validate: () => {},
    bind: (ui) => ui.text,
  },
  number: {
    validate: () => {},
    bind: (ui) => ui.number,
  },
  date: {
    validate: () => {},
    bind: (ui) => ui.date,
  },
  combobox: {
    validate: (settings) => {
      if (
        typeof settings !== "object" ||
        settings === null ||
        !("options" in settings) ||
        !Array.isArray(settings.options) ||
        settings.options.some(
          (option: unknown) =>
            typeof option !== "object" ||
            option === null ||
            !("value" in option) ||
            typeof option.value !== "string" ||
            !("label" in option) ||
            typeof option.label !== "string",
        )
      )
        throw new Error("Combobox editors require fixed string options");
    },
    bind: (ui) => ui.choice,
  },
} satisfies Record<string, LineItemsEditorDefinition<unknown>>;

/** Validate settings through the same definitions used for rendering, without loading UI modules. */
export function assertLineItemsEditor(edit: { editorType: unknown; editorOptions?: unknown }) {
  const kind = edit.editorType;
  if (typeof kind !== "string" || !Object.hasOwn(lineItemsEditors, kind))
    throw new Error("Unsupported LineItems editor type");
  lineItemsEditors[kind as keyof typeof lineItemsEditors].validate(edit.editorOptions);
}
