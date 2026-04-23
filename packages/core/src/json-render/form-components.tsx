import * as React from "react";
import { useBoundProp, type Components } from "@json-render/react";

import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Checkbox } from "@/components/checkbox";
import { Field } from "@/components/field";
import { Fieldset } from "@/components/fieldset";
import { Form } from "@/components/form";
import { Grid } from "@/components/grid";
import { Input } from "@/components/input";
import { RadioGroup } from "@/components/radio-group";
import { Select } from "@/components/select-standalone";
import { Table } from "@/components/table";

import { builtInFunctions } from "./built-in-functions";

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
        <Card.Content className="astw:flex astw:flex-col astw:gap-4">{children}</Card.Content>
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
      const [value, setValue] = useBoundProp<string>(
        (props.value as string | null) ?? undefined,
        bindings?.value,
      );
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
      const [value, setValue] = useBoundProp<string>(
        (props.value as string | null) ?? undefined,
        bindings?.value,
      );
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
            className="astw:w-full"
          />
          {props.description && <Field.Description>{props.description}</Field.Description>}
          <Field.Error />
        </Field.Root>
      );
    },

    CheckboxField: ({ props, bindings }) => {
      const [checked, setChecked] = useBoundProp<boolean>(
        (props.checked as boolean | null) ?? undefined,
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
      const [value, setValue] = useBoundProp<string>(
        (props.value as string | null) ?? undefined,
        bindings?.value,
      );
      return (
        <Field.Root name={props.name} disabled={props.disabled ?? undefined}>
          <Field.Label>{props.label}</Field.Label>
          <RadioGroup.Root
            name={props.name}
            value={value ?? ""}
            onValueChange={(v) => setValue(v as string)}
            disabled={props.disabled ?? undefined}
            required={props.required ?? undefined}
            className={
              props.orientation === "horizontal" ? "astw:flex-row astw:flex-wrap" : undefined
            }
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

    Text: ({ props }) => {
      return <p className="astw:text-sm astw:text-foreground">{String(props.text ?? "")}</p>;
    },

    ReadonlyField: ({ props }) => {
      return (
        <Field.Root>
          <Field.Label>{props.label}</Field.Label>
          <Input value={String(props.value ?? "")} disabled readOnly onChange={() => {}} />
        </Field.Root>
      );
    },

    TableField: ({ props, bindings }) => {
      type RowData = Record<string, unknown>;
      type ColumnDef = {
        key: string;
        label: string;
        type: "text" | "number" | "select" | "readonly";
        options?: { label: string; value: string }[] | null;
        computeFn?: string | null;
        computeArgs?: Record<string, unknown> | null;
        width?: string | null;
      };
      type FooterDef = {
        aggregation: "sum" | "avg" | "count" | "min" | "max";
        template?: string | null;
      };

      const [rows, setRows] = useBoundProp<RowData[]>(
        Array.isArray(props.value) ? (props.value as RowData[]) : [],
        bindings?.value,
      );

      const columns = props.columns as ColumnDef[];
      const footer = props.footer as Record<string, FooterDef> | null | undefined;
      const safeRows = rows ?? [];

      const resolveCell = (col: ColumnDef, row: RowData): unknown => {
        if (col.type !== "readonly" || !col.computeFn) return row[col.key];
        const fn = builtInFunctions[col.computeFn];
        if (!fn) return null;
        const resolvedArgs = Object.fromEntries(
          Object.entries(col.computeArgs ?? {}).map(([k, v]) => {
            if (v !== null && typeof v === "object" && "$row" in v) {
              return [k, Number(row[(v as { $row: string }).$row] ?? 0)];
            }
            return [k, v];
          }),
        );
        return fn(resolvedArgs);
      };

      const computeFooterValue = (colKey: string, def: FooterDef): string => {
        const col = columns.find((c) => c.key === colKey);
        if (!col) return "";
        const values = safeRows.map((r) => Number(resolveCell(col, r) ?? 0));
        let raw: number;
        switch (def.aggregation) {
          case "sum":
            raw = values.reduce((a, b) => a + b, 0);
            break;
          case "avg":
            raw = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            break;
          case "count":
            raw = values.length;
            break;
          case "min":
            raw = values.length ? Math.min(...values) : 0;
            break;
          case "max":
            raw = values.length ? Math.max(...values) : 0;
            break;
          default:
            raw = 0;
        }
        if (def.template) {
          return def.template.replace("{{value}}", String(raw));
        }
        return String(raw);
      };

      const updateCell = (rowIndex: number, key: string, value: unknown) => {
        setRows(safeRows.map((row, i) => (i === rowIndex ? { ...row, [key]: value } : row)));
      };

      const addRow = () => {
        const defaultValues = (props.defaultRowValues as RowData | null) ?? {};
        const emptyRow: RowData = Object.fromEntries(
          columns
            .filter((col) => col.type !== "readonly")
            .map((col) => [col.key, defaultValues[col.key] ?? ""]),
        );
        setRows([...safeRows, emptyRow]);
      };

      const deleteRow = (rowIndex: number) => {
        setRows(safeRows.filter((_, i) => i !== rowIndex));
      };

      const hasFooter = footer && Object.keys(footer).length > 0;
      const showDeleteCol = props.allowDeleteRow ?? false;

      return (
        <div data-slot="table-field" className="astw:flex astw:flex-col astw:gap-2">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                {columns.map((col) => (
                  <Table.Head key={col.key} style={col.width ? { width: col.width } : undefined}>
                    {col.label}
                  </Table.Head>
                ))}
                {showDeleteCol && <Table.Head className="astw:w-10" />}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {safeRows.map((row, rowIndex) => (
                <Table.Row key={rowIndex}>
                  {columns.map((col) => (
                    <Table.Cell key={col.key}>
                      {col.type === "readonly" ? (
                        <span className="astw:text-sm astw:text-muted-foreground">
                          {String(resolveCell(col, row) ?? "")}
                        </span>
                      ) : col.type === "select" ? (
                        <Select<{ label: string; value: string }>
                          items={col.options ?? []}
                          value={col.options?.find((o) => o.value === row[col.key]) ?? null}
                          onValueChange={(item) => updateCell(rowIndex, col.key, item?.value ?? "")}
                          mapItem={(o) => ({ label: o.label, key: o.value })}
                          className="astw:w-full astw:min-w-32"
                        />
                      ) : (
                        <Input
                          type={col.type === "number" ? "number" : "text"}
                          value={String(row[col.key] ?? "")}
                          onChange={(e) =>
                            updateCell(
                              rowIndex,
                              col.key,
                              col.type === "number"
                                ? isNaN(e.target.valueAsNumber)
                                  ? 0
                                  : e.target.valueAsNumber
                                : e.target.value,
                            )
                          }
                          className="astw:w-full astw:min-w-24"
                        />
                      )}
                    </Table.Cell>
                  ))}
                  {showDeleteCol && (
                    <Table.Cell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRow(rowIndex)}
                        aria-label="Delete row"
                      >
                        ×
                      </Button>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
            {hasFooter && (
              <Table.Footer>
                <Table.Row>
                  {columns.map((col) => (
                    <Table.Cell key={col.key}>
                      {footer[col.key] ? computeFooterValue(col.key, footer[col.key]) : null}
                    </Table.Cell>
                  ))}
                  {showDeleteCol && <Table.Cell />}
                </Table.Row>
              </Table.Footer>
            )}
          </Table.Root>
          {(props.allowAddRow ?? false) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="astw:self-start"
            >
              + 行を追加
            </Button>
          )}
        </div>
      );
    },
  };
}
