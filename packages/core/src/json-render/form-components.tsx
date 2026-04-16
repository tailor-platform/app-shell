import * as React from "react";
import { useBoundProp, type Components } from "@json-render/react";

import { Card } from "@/components/card";
import { Checkbox } from "@/components/checkbox";
import { Field } from "@/components/field";
import { Fieldset } from "@/components/fieldset";
import { Form } from "@/components/form";
import { Grid } from "@/components/grid";
import { Input } from "@/components/input";
import { RadioGroup } from "@/components/radio-group";
import { Select } from "@/components/select-standalone";

import type { catalog } from "./catalog";

/**
 * Builds the form component registry for json-render.
 * Takes an errorsRef to pass server-side errors to Form.
 */
export function buildFormComponents(
  errorsRef: React.RefObject<Record<string, string[]> | undefined>,
): Components<typeof catalog> {
  return {
    Form: ({ props, children }) => (
      <Form errors={errorsRef.current ?? undefined} className="astw:flex astw:flex-col astw:gap-4">
        {props.title && <h2 className="astw:text-lg astw:font-semibold">{props.title}</h2>}
        {children}
      </Form>
    ),

    Card: ({ props, children }) => (
      <Card.Root>
        {(props.title || props.description) && (
          <Card.Header
            title={props.title ?? undefined}
            description={props.description ?? undefined}
          />
        )}
        <Card.Content>{children}</Card.Content>
      </Card.Root>
    ),

    Grid: ({ props, children }) => (
      <Grid cols={props.cols} gap={props.gap ?? undefined}>
        {children}
      </Grid>
    ),

    Fieldset: ({ props, children }) => (
      <Fieldset.Root disabled={props.disabled ?? undefined}>
        {props.legend && <Fieldset.Legend>{props.legend}</Fieldset.Legend>}
        {children}
      </Fieldset.Root>
    ),

    TextField: ({ props, bindings }) => {
      const [value, setValue] = useBoundProp<string>(props.value ?? undefined, bindings?.value);
      return (
        <Field.Root name={props.name} disabled={props.disabled ?? undefined}>
          <Field.Label>{props.label}</Field.Label>
          <Input
            type={props.type ?? "text"}
            name={props.name}
            placeholder={props.placeholder ?? undefined}
            required={props.required ?? undefined}
            disabled={props.disabled ?? undefined}
            value={value ?? ""}
            min={props.min ?? undefined}
            max={props.max ?? undefined}
            minLength={props.minLength ?? undefined}
            maxLength={props.maxLength ?? undefined}
            pattern={props.pattern ?? undefined}
            onChange={(e) => setValue(e.target.value)}
          />
          {props.description && <Field.Description>{props.description}</Field.Description>}
          <Field.Error />
        </Field.Root>
      );
    },

    SelectField: ({ props, bindings }) => {
      type Option = { label: string; value: string };
      const [value, setValue] = useBoundProp<string>(props.value ?? undefined, bindings?.value);
      const selectedItem =
        value != null ? (props.options.find((o: Option) => o.value === value) ?? null) : null;
      return (
        <Field.Root name={props.name} disabled={props.disabled ?? undefined}>
          <Field.Label>{props.label}</Field.Label>
          <Select<Option>
            items={props.options}
            value={selectedItem}
            onValueChange={(item) => setValue(item?.value ?? "")}
            placeholder={props.placeholder ?? undefined}
            disabled={props.disabled ?? undefined}
            mapItem={(o: Option) => ({ label: o.label, key: o.value })}
          />
          {props.description && <Field.Description>{props.description}</Field.Description>}
          <Field.Error />
        </Field.Root>
      );
    },

    CheckboxField: ({ props, bindings }) => {
      const [checked, setChecked] = useBoundProp<boolean>(
        props.checked ?? undefined,
        bindings?.checked,
      );
      return (
        <Field.Root name={props.name} disabled={props.disabled ?? undefined}>
          <div className="astw:flex astw:items-center astw:gap-2">
            <Checkbox.Root
              name={props.name}
              checked={checked ?? false}
              onCheckedChange={(value) => setChecked(value)}
              disabled={props.disabled ?? undefined}
              required={props.required ?? undefined}
            >
              <Checkbox.Indicator />
            </Checkbox.Root>
            <Field.Label>{props.label}</Field.Label>
          </div>
          {props.description && <Field.Description>{props.description}</Field.Description>}
          <Field.Error />
        </Field.Root>
      );
    },

    RadioGroupField: ({ props, bindings }) => {
      const [value, setValue] = useBoundProp<string>(props.value ?? undefined, bindings?.value);
      return (
        <Field.Root name={props.name} disabled={props.disabled ?? undefined}>
          <Field.Label>{props.label}</Field.Label>
          <RadioGroup.Root
            name={props.name}
            value={value ?? ""}
            onValueChange={(v) => setValue(v as string)}
            disabled={props.disabled ?? undefined}
            required={props.required ?? undefined}
          >
            {props.options.map((option: { label: string; value: string }) => (
              <label
                key={option.value}
                className="astw:flex astw:items-center astw:gap-2 astw:cursor-pointer"
              >
                <RadioGroup.Item value={option.value}>
                  <RadioGroup.Indicator />
                </RadioGroup.Item>
                <span className="astw:text-sm">{option.label}</span>
              </label>
            ))}
          </RadioGroup.Root>
          {props.description && <Field.Description>{props.description}</Field.Description>}
          <Field.Error />
        </Field.Root>
      );
    },
  };
}
