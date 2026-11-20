import type * as React from "react";
import { Button, Card, Grid, Text } from "@tailor-platform/app-shell";
import { ModalForm } from "./overlay-templates";
import { NewSupplierFields } from "./fields";

// 🔽 Guide: how to build a form with Grid. Mirrors the Forms pattern docs

// Renders `backticked` spans as inline code.
function Prose({ children }: { children: string }) {
  return (
    <Text.p className="text-muted-foreground">
      {children.split("`").map((part, i) =>
        i % 2 ? (
          <code key={i} className="rounded bg-muted px-1 py-0.5 text-body-sm text-foreground">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </Text.p>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border bg-muted p-4 text-body-sm">
      <code>{children}</code>
    </pre>
  );
}

function GuideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card.Root>
      <div className="flex flex-col gap-3 p-6">
        <Text.h3 variant="heading-md">{title}</Text.h3>
        {children}
      </div>
    </Card.Root>
  );
}

function Rules({ items, bullet }: { items: string[]; bullet?: boolean }) {
  return (
    <ol
      className={`flex flex-col gap-1.5 pl-5 text-muted-foreground ${bullet ? "list-disc" : "list-decimal"}`}
    >
      {items.map((item) => (
        <li key={item}>
          {item.split("`").map((part, i) =>
            i % 2 ? (
              <code key={i} className="rounded bg-muted px-1 py-0.5 text-body-sm text-foreground">
                {part}
              </code>
            ) : (
              part
            ),
          )}
        </li>
      ))}
    </ol>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-left text-body-sm">
        <thead className="bg-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-t border-border">
              {row.map((cell, i) => (
                <td key={i} className="px-3 py-2 align-top text-muted-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 🔽 Static stand-in for an open dialog: the same panel width and padding as
// `Dialog.Content size`, so both sizes can be compared without opening them.
function DialogPreview({
  label,
  width,
  description,
}: {
  label: string;
  width: number;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Text variant="body-sm" className="text-muted-foreground">
        {label} ({width}px panel)
      </Text>
      <div
        style={{ width, maxWidth: "100%" }}
        className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-lg"
      >
        <div className="flex flex-col gap-1">
          <Text.h3 variant="heading-md">New supplier</Text.h3>
          <Text.p className="text-muted-foreground">{description}</Text.p>
        </div>
        <Grid maxColumns={2} gapX={6} gapY={4}>
          <NewSupplierFields />
        </Grid>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="button">Create</Button>
        </div>
      </div>
    </div>
  );
}

export function BuildAForm() {
  return (
    <section className="flex flex-col gap-4 pt-8">
      <div className="flex flex-col gap-1">
        <Text.h2 variant="heading-lg">How to build a form</Text.h2>
        <Text.p className="text-muted-foreground">
          The rules from the Forms pattern, built with Grid + Card + Fieldset. One{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-body-sm text-foreground">Form</code>{" "}
          wraps everything; Grid decides the columns.
        </Text.p>
      </div>

      <GuideCard title="1. Pick the container">
        <Table
          head={["If the form…", "Use"]}
          rows={[
            [
              "Has header fields plus line items",
              'Layout maxWidth="xl", Grid maxColumns={4} for the header, sections in the view\'s order',
            ],
            ["Has ordered steps that depend on earlier answers", "A wizard: one Form per step"],
            [
              "Needs its own URL, or is long enough to scroll",
              'Layout maxWidth="lg" with card sections; add a section nav from about three sections',
            ],
            [
              "Edits part of a record shown beside it",
              'Sheet (size="lg") with Grid maxColumns={2}',
            ],
            [
              "Anything else",
              "Dialog sized to the form (sm–xl); plain sections once it has groups",
            ],
          ]}
        />
        <Prose>
          In a Dialog, put the `Form` inside `Dialog.Body` and submit from `Dialog.Footer` with
          `form="po-form"`, so the footer stays visible however long the form gets. On a page, Save
          lives in `Layout.Header`; add a sticky action bar as well when the form scrolls.
        </Prose>
      </GuideCard>

      <GuideCard title="2. Choose the column maximum">
        <Prose>
          `maxColumns` is a maximum. The grid steps down as its container narrows: under 400px → 1,
          from 400px → 2, from 640px → 3, from 880px → 4. Use `2` for dialogs, sheets and most
          pages, `3` for wide page sections, `4` for the header fields of a document form (PO,
          invoice). Keep related fields next to each other in source order; the grid fills left to
          right.
        </Prose>
      </GuideCard>

      <GuideCard title="3. Size each field by its value">
        <Rules
          items={[
            "Size by the value, not the label. Ask how long the value the user types or picks usually is.",
            "One short value takes one column, the default: codes, numbers, amounts, dates, statuses, single picks, emails, phone numbers.",
            "A value that often runs long, or is two values, takes two columns (`colSpan={2}`): full names and titles, a street line, a date range.",
            'Free text, sentences and anything that is not a single value take the full row (`colSpan="full"`): notes, a checkbox with a sentence label, a file upload, an alert, a table, totals.',
            "Keep related fields together in source order (currency and amount, city and postcode). A group that must stay together, such as an address, goes in a `Fieldset.Root` inside a `Grid.Item colSpan={2}` with its own nested Grid.",
            "Do not widen a field to fill a row. An empty cell at the end of a row is fine; a stretched short field reads as a longer value than it is.",
            "Do not size for small screens. Numeric spans are capped at the columns shown, so `colSpan={3}` in a two-column grid covers both and no field needs a mobile variant.",
          ]}
        />
        <Table
          head={["Field", "Width"]}
          rows={[
            [
              "Text, select, combobox, date, number, money, code, email, phone",
              "One column (default)",
            ],
            ["Names and titles, date ranges", "<Grid.Item colSpan={2}>"],
            [
              "Textarea, checkbox or switch with a sentence label, file upload",
              '<Grid.Item colSpan="full">',
            ],
            ["Alerts, tables, line items, totals", '<Grid.Item colSpan="full">'],
            ["Address block", "<Grid.Item colSpan={2}> around a Fieldset with a nested Grid"],
          ]}
        />
        <Prose>
          `colSpan` only works on a direct child of the Grid, because the grid clamps the span to
          its own column count. `Grid.Item` is that direct child; wrap the `Field.Root` in it
          instead of wrapping it in a plain `div`.
        </Prose>
        <Code>{`<Grid maxColumns={2} gapX={6} gapY={4}>
  <Field.Root name="code">…</Field.Root>                 {/* one column */}
  <Grid.Item colSpan={2}>                                {/* two columns */}
    <Field.Root name="legalName">…</Field.Root>
  </Grid.Item>
  <Grid.Item colSpan="full">                             {/* full row */}
    <Field.Root name="notes"><Textarea /></Field.Root>
  </Grid.Item>
</Grid>`}</Code>
      </GuideCard>

      <GuideCard title="4. Group fields into sections">
        <Prose>
          Use sections once a form has more than about eight fields or two natural groups. On a page
          each section is a card; inside a Dialog or Sheet use the plain variant, a heading with a
          divider between one section and the next. Give sections an `id` to link to them from a
          section nav, and derive the nav labels and the headings from one array so they cannot
          drift. Keep to about six sections; more than that is a wizard. This demo's `FormSection`
          is the recipe.
        </Prose>
        <Code>{`<FormSection id="delivery" title="Delivery" description="Where and when the goods arrive.">
  <Field.Root name="shipTo">…</Field.Root>
  <Field.Root name="expectedDelivery">…</Field.Root>
</FormSection>

{/* Inside a Dialog or Sheet */}
<FormSection variant="plain" title="Billing">…</FormSection>`}</Code>
      </GuideCard>

      <GuideCard title="5. Mark required fields and wire the form">
        <Prose>
          Put `required` on `Field.Label` for the `*` marker and on the control for validation. One
          `Form` wraps every section; do not nest a `Form` per section. Fields are uncontrolled and
          arrive through `onFormSubmit`; dropdowns only need a wrapping `Field.Root`.
        </Prose>
        <Code>{`<Layout maxWidth="lg">
  <Layout.Header
    title="New purchase order"
    actions={[<Button key="save" type="submit" form="po-form">Create</Button>]}
  />
  <Layout.Column>
    <Form id="po-form" onFormSubmit={save}>
      <FormSection title="Supplier">…</FormSection>
      <FormSection title="Delivery">…</FormSection>
    </Form>
  </Layout.Column>
</Layout>`}</Code>
      </GuideCard>

      <GuideCard title="6. Modal forms">
        <Prose>
          A modal is the default for Create and Edit: it keeps the user on the parent screen. The
          dialog width follows the form's length, and the Grid inside reflows to the dialog, not the
          viewport.
        </Prose>
        <Rules
          items={[
            "`Dialog.Content size` sets the width: `sm` for 1–3 short fields, `md` (default) for up to about 6 fields, `lg` for 6–12 fields grouped in plain sections, `xl` for a wide form with a table.",
            'Put the `Form` inside `Dialog.Body` so long forms scroll while the header and footer stay put. Submit from `Dialog.Footer` with `form="supplier-form"`.',
            "Use `Grid maxColumns={2}` for `md` and up. In `sm` the grid drops to one column by itself, so the same markup works at every size.",
            "Use plain sections (no card) inside the dialog: a heading with a divider between groups.",
            'Use `Form onFormSubmit`, never a bare `form onSubmit`. Cancel is `type="button"`.',
            "At most two modal levels: the second is a confirmation or a picker.",
            "Fifteen or more fields, or grouped sections, belong on a page. Multi-step flows belong in a routed wizard, not a modal.",
          ]}
        />
        <Table
          head={["Size", "Panel width", "Grid inside (body is 3rem narrower)", "Use for"]}
          rows={[
            ["sm", "24rem (384px)", "1 column (336px)", "Rename, change status, 1–3 short fields"],
            [
              "md (default)",
              "32rem (512px)",
              "2 columns (464px)",
              "Quick create or edit, up to about 6 fields",
            ],
            ["lg", "45rem (720px)", "2–3 columns (672px)", "6–12 fields in plain sections"],
            [
              "xl",
              "60rem (960px)",
              "up to 4 columns (912px)",
              "Wide forms, header fields plus a table",
            ],
          ]}
        />
        <div className="flex flex-wrap items-start gap-6">
          <DialogPreview label="sm · 24rem" width={384} description="Small: one column." />
          <DialogPreview label="md · 32rem" width={512} description="Medium: two columns." />
        </div>
        <Text.p className="text-muted-foreground">Or open them as real dialogs:</Text.p>
        <div className="flex gap-2">
          <ModalForm
            trigger={<Button variant="outline">Open sm (1 column)</Button>}
            size="sm"
            title="New supplier"
            description="Small: the grid drops to one column."
            submitLabel="Create"
          >
            <Grid maxColumns={2} gapX={6} gapY={4}>
              <NewSupplierFields />
            </Grid>
          </ModalForm>
          <ModalForm
            trigger={<Button variant="outline">Open md (2 columns)</Button>}
            size="md"
            title="New supplier"
            description="Medium: the same markup shows two columns."
            submitLabel="Create"
          >
            <Grid maxColumns={2} gapX={6} gapY={4}>
              <NewSupplierFields />
            </Grid>
          </ModalForm>
        </div>
        <Code>{`<ModalForm size="sm" title="New supplier" submitLabel="Create">
  <Grid maxColumns={2} gapX={6} gapY={4}>   {/* 1 column in sm, 2 in md */}
    <Grid.Item colSpan="full">…name…</Grid.Item>
    <Field.Root name="code">…</Field.Root>
    <Field.Root name="country">…</Field.Root>
  </Grid>
</ModalForm>`}</Code>
      </GuideCard>

      <GuideCard title="Anti-patterns">
        <Rules
          bullet
          items={[
            "Hand-writing `grid md:grid-cols-2` on a form: it follows the viewport, not the dialog.",
            "Wrapping a `Field.Root` in a `div` inside the Grid: its `colSpan` is dropped.",
            "More than about six sections, or a separate `Form` per section.",
            "Required-marker convention that varies between sections.",
            "Mirroring field values into `useState` when `onFormSubmit` returns the payload.",
          ]}
        />
      </GuideCard>
    </section>
  );
}
