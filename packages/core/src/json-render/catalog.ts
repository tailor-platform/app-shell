import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

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
        value: z.string().nullable(),
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
        value: z.string().nullable(),
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
        checked: z.boolean().nullable(),
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
        value: z.string().nullable(),
      }),
      description: "Labeled radio group field",
    },
  },
  actions: {
    submit_form: {
      params: z.object({}),
      description: "Submit the form and pass current state to onSubmit handler",
    },
  },
});
