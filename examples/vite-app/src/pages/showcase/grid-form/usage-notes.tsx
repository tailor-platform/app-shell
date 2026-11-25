import { Card, Text } from "@tailor-platform/app-shell";

// 🔽 Usage notes: what changed in Grid and how to compose a form with it.

const SNIPPETS = [
  {
    title: "1. Container-responsive columns",
    body: "`maxColumns` is the most columns to show. The grid steps down to one column as its own container narrows (≥400px → 2, ≥640px → 3, ≥880px → 4), so the same markup fits a page, a dialog and a sheet. Before, `columns={{ md: 2 }}` followed the viewport, and `minChildWidth` overrode `columns` and had no maximum.",
    code: `// Before: viewport breakpoints, wrong inside a dialog or sheet
<Grid columns={{ initial: 1, md: 2, lg: 3 }} gap={4}>…</Grid>

// After: follows the container
<Grid maxColumns={3} gapX={6} gapY={4}>
  <Field.Root name="supplier">…</Field.Root>
  <Field.Root name="currency">…</Field.Root>
</Grid>`,
  },
  {
    title: "2. Spans clamped to the columns shown",
    body: 'A numeric `colSpan` never exceeds the columns currently shown, so no implicit columns appear when the container narrows. `colSpan="full"` always takes the whole row. Responsive `colSpan` objects and explicit placement behave as before.',
    code: `<Grid maxColumns={3}>
  {/* 1, 2 or 3 columns, depending on the container */}
  <Grid.Item colSpan={3}>
    <Field.Root name="address">…</Field.Root>
  </Grid.Item>

  {/* always the full row */}
  <Grid.Item colSpan="full">
    <Field.Root name="notes">
      <Textarea />
    </Field.Root>
  </Grid.Item>
</Grid>`,
  },
  {
    title: "3. Fields fill their cells",
    body: "In `maxColumns` mode a `Field.Root` stretches to its cell, whether it is a direct child or inside a `Grid.Item`, so Selects and Comboboxes line up with Inputs.",
    code: `<Grid maxColumns={2}>
  <Field.Root name="supplier">
    <Field.Label>Supplier</Field.Label>
    <Combobox items={SUPPLIERS} />   {/* fills the column */}
  </Field.Root>
</Grid>`,
  },
  {
    title: "4. A form section is Card + Fieldset + Grid",
    body: "The legend names the group, the description is announced with it, and `maxColumns` reflows with the section's width. See `form-section.tsx`.",
    code: `<Card.Root>
  <Fieldset.Root className="flex flex-col gap-4 p-6">
    <Fieldset.Legend>
      <Text.h3 variant="heading-md">Delivery</Text.h3>
    </Fieldset.Legend>
    <Grid maxColumns={2} gapX={6} gapY={4}>
      <Field.Root name="shipTo">…</Field.Root>
      <Field.Root name="expectedDelivery">…</Field.Root>
      <Grid.Item colSpan="full">
        <Field.Root name="instructions">…</Field.Root>
      </Grid.Item>
    </Grid>
  </Fieldset.Root>
</Card.Root>`,
  },
  {
    title: "5. Dialogs and sheets use the same markup",
    body: "Put the Grid inside the body. It measures the dialog's width, not the viewport's.",
    code: `<Dialog.Body>
  <Form id="supplier-form" onFormSubmit={save}>
    <Grid maxColumns={2} gapX={6} gapY={4}>
      <NewSupplierFields />
    </Grid>
  </Form>
</Dialog.Body>`,
  },
];

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

export function UsageNotes() {
  return (
    <section className="flex flex-col gap-4 pt-8">
      <div className="flex flex-col gap-1">
        <Text.h2 variant="heading-lg">How Grid improved</Text.h2>
        <Text.p className="text-muted-foreground">
          Three additions to Grid make it a form layout. Everything above is built with them.
        </Text.p>
      </div>
      {SNIPPETS.map((snippet) => (
        <Card.Root key={snippet.title}>
          <div className="flex flex-col gap-3 p-6">
            <Text.h3 variant="heading-md">{snippet.title}</Text.h3>
            <Prose>{snippet.body}</Prose>
            <pre className="overflow-x-auto rounded-md border border-border bg-muted p-4 text-body-sm">
              <code>{snippet.code}</code>
            </pre>
          </div>
        </Card.Root>
      ))}
    </section>
  );
}
