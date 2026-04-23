import {
  defineCatalog,
  DynamicBooleanSchema,
  DynamicStringSchema,
  type ComputedFunction,
} from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

// Re-export for use in render-json.tsx
export type { ComputedFunction };

export const catalog = defineCatalog(schema, {
  components: {
    Form: {
      props: z.object({ title: z.string().nullable() }),
      slots: ["default"],
      description: "Root form container",
    },
    Card: {
      props: z.object({
        title: z.string().nullable(),
        description: z.string().nullable(),
      }),
      slots: ["default"],
      description: "Bordered card for grouping a region of the form",
    },
    Grid: {
      props: z.object({
        cols: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
          z.literal(5),
          z.literal(6),
        ]),
        gap: z.enum(["none", "sm", "md", "lg"]).nullable(),
      }),
      slots: ["default"],
      description: "CSS Grid layout container. Use to place multiple fields side by side.",
    },
    Fieldset: {
      props: z.object({
        legend: z.string().nullable(),
        disabled: z.boolean().nullable(),
      }),
      slots: ["default"],
      description: "Groups related fields with an accessible legend",
    },
    TextField: {
      props: z.object({
        name: z.string(),
        label: z.string(),
        type: z.enum(["text", "email", "password", "number", "tel"]).nullable(),
        placeholder: z.string().nullable(),
        description: z.string().nullable(),
        required: z.boolean().nullable(),
        disabled: z.boolean().nullable(),
        value: DynamicStringSchema.nullable(),
        min: z.number().nullable(),
        max: z.number().nullable(),
        minLength: z.number().nullable(),
        maxLength: z.number().nullable(),
        pattern: z.string().nullable(),
      }),
      description: "Labeled text input field with validation",
    },
    SelectField: {
      props: z.object({
        name: z.string(),
        label: z.string(),
        options: z.array(z.object({ label: z.string(), value: z.string() })),
        placeholder: z.string().nullable(),
        description: z.string().nullable(),
        required: z.boolean().nullable(),
        disabled: z.boolean().nullable(),
        value: DynamicStringSchema.nullable(),
      }),
      description: "Labeled select/combobox field with options",
    },
    CheckboxField: {
      props: z.object({
        name: z.string(),
        label: z.string(),
        description: z.string().nullable(),
        required: z.boolean().nullable(),
        disabled: z.boolean().nullable(),
        checked: DynamicBooleanSchema.nullable(),
      }),
      description: "Labeled checkbox field",
    },
    RadioGroupField: {
      props: z.object({
        name: z.string(),
        label: z.string(),
        options: z.array(z.object({ label: z.string(), value: z.string() })),
        description: z.string().nullable(),
        required: z.boolean().nullable(),
        disabled: z.boolean().nullable(),
        value: DynamicStringSchema.nullable(),
        orientation: z.enum(["vertical", "horizontal"]).nullable(),
      }),
      description: "Labeled radio group field",
    },
    Text: {
      props: z.object({
        // z.any() is intentional: text accepts $computed expressions (and
        // nested $computed in args) which are not expressible in
        // DynamicStringSchema. Runtime resolution is handled by json-render.
        text: z.any(),
      }),
      description:
        "Displays a static or dynamically-computed text value. Use $computed or $state for derived values.",
    },
    ReadonlyField: {
      props: z.object({
        label: z.string(),
        value: z.any(),
      }),
      description:
        "Labeled read-only input that displays a computed or static value. Use instead of TextField when the value is derived and not user-editable.",
    },
    TableField: {
      props: z.object({
        name: z.string(),
        /** Static column definitions. Each column specifies key, label, input type, and optional computed cell config. */
        columns: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            type: z.enum(["text", "number", "select", "readonly"]),
            /** Options for type="select" cells. */
            options: z.array(z.object({ label: z.string(), value: z.string() })).nullable(),
            /** Built-in function name to evaluate for type="readonly" cells. */
            computeFn: z.string().nullable(),
            /**
             * Args passed to computeFn. Use { "$row": "key" } to reference
             * the value of another cell in the same row.
             */
            computeArgs: z.record(z.string(), z.unknown()).nullable(),
            /** Optional inline CSS width (e.g. "8rem", "120px"). */
            width: z.string().nullable(),
          }),
        ),
        /** Row data array. Bind via $bindState to keep rows in state. */
        value: z.any(),
        /**
         * Footer aggregation config keyed by column key.
         * Only columns listed here will show a footer cell.
         */
        footer: z
          .record(
            z.string(),
            z.object({
              aggregation: z.enum(["sum", "avg", "count", "min", "max"]),
              /**
               * Optional string template for the footer cell value.
               * Use {{value}} as a placeholder for the aggregated number.
               * Example: "合計: {{value}} 円"
               * If omitted, the raw number is displayed.
               */
              template: z.string().nullable(),
            }),
          )
          .nullable(),
        /** Show an "Add row" button below the table. */
        allowAddRow: z.boolean().nullable(),
        /** Show a delete button on each row. */
        allowDeleteRow: z.boolean().nullable(),
        /** Default cell values used when adding a new row. */
        defaultRowValues: z.record(z.string(), z.unknown()).nullable(),
      }),
      description:
        "An editable table for line-item input. Column definitions are static props; rows are managed dynamically via $bindState. Supports readonly computed columns (computeFn/computeArgs) and footer aggregation (sum, avg, count, min, max). Footer cells support a template string with {{value}} placeholder for custom display formatting.",
    },
  },
  actions: {
    submit_form: {
      params: z.object({}),
      description: "Submit the form and pass current state to onSubmit handler",
    },
  },
  functions: {
    multiply: {
      description: "Multiply two numbers. Args: { a: number, b: number } → number",
    },
    add: {
      description: "Add two numbers. Args: { a: number, b: number } → number",
    },
    subtract: {
      description: "Subtract b from a. Args: { a: number, b: number } → number",
    },
    divide: {
      description:
        "Divide a by b. Returns null when b is 0. Args: { a: number, b: number } → number | null",
    },
    formatCurrency: {
      description:
        "Format a number as a currency string. Args: { value: number, currency?: string, locale?: string } → string. Defaults: currency='USD', locale='en-US'",
    },
    formatNumber: {
      description:
        "Format a number with fixed decimal places. Args: { value: number, decimals?: number } → string. Default: decimals=2",
    },
    formatPercent: {
      description:
        "Format a decimal as a percentage string (e.g. 0.1 → '10.0%'). Args: { value: number, decimals?: number } → string. Default: decimals=1",
    },
    sum: {
      description:
        "Sum an array of numbers. Args: { values: number[] } → number. Each element may be a $computed or $state expression.",
    },
    product: {
      description:
        "Multiply an array of numbers together. Args: { values: number[] } → number. Each element may be a $computed or $state expression.",
    },
  },
});
