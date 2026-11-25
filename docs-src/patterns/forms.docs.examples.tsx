import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  Combobox,
  DatePicker,
  Dialog,
  Field,
  Fieldset,
  Form,
  Grid,
  Layout,
  Select,
  Sheet,
  Text,
  Textarea,
} from "@tailor-platform/app-shell";

const STATUSES = ["Active", "On hold", "Inactive"];
const CURRENCIES = ["JPY", "USD", "EUR", "GBP"];
const BUYERS = ["Aiko Tanaka", "Kenji Sato", "Yuki Suzuki", "Ren Yamada"];
const WAREHOUSES = [
  { id: 1, name: "Tokyo DC" },
  { id: 2, name: "Osaka DC" },
  { id: 3, name: "Nagoya DC" },
];

// ─── Small modal ────────────────────────────────────────────────────────────

type SupplierDraft = { name: string; code: string; status: string };

/**
 * `size="sm"` (24rem): a handful of fields. The grid inside is narrower than
 * 400px, so `maxColumns={2}` shows one column and every field stacks.
 */
export function ModalFormSmall() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={<Button variant="outline" />}>Rename supplier</Dialog.Trigger>
      <Dialog.Content size="sm">
        <Dialog.Header>
          <Dialog.Title>Rename supplier</Dialog.Title>
        </Dialog.Header>
        {/* The form scrolls in `Dialog.Body`; the footer submits it through `form="…"`. */}
        <Dialog.Body>
          <Form<SupplierDraft>
            id="rename-supplier-form"
            noValidate
            onFormSubmit={(values) => {
              window.alert(`Saving ${values.name}`);
              setOpen(false);
            }}
          >
            <Grid maxColumns={2} gapX={6} gapY={4}>
              <Field.Root name="name">
                <Field.Label required>Supplier name</Field.Label>
                <Field.Control required defaultValue="Kansai Textile Co." />
                <Field.Error match="valueMissing">Supplier name is required.</Field.Error>
              </Field.Root>
              <Field.Root name="code">
                <Field.Label required>Code</Field.Label>
                <Field.Control required defaultValue="SUP-0042" />
                <Field.Error match="valueMissing">Code is required.</Field.Error>
              </Field.Root>
              <Field.Root name="status">
                <Field.Label>Status</Field.Label>
                <Select items={STATUSES} defaultValue="Active" />
              </Field.Root>
            </Grid>
          </Form>
        </Dialog.Body>
        <Dialog.Footer>
          {/* Inside a `<Form>` an untyped button submits, so Cancel is `type="button"`. */}
          <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
          <Button type="submit" form="rename-supplier-form">
            Save
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ─── Large modal and sheet: the same body ──────────────────────────────────

/**
 * The body of a longer overlay form: plain sections (a `Fieldset` with a
 * legend, no card) separated by a rule, each with its own `Grid`. The same
 * component goes in a `Dialog` or a `Sheet` unchanged.
 */
function OrderLineFields() {
  return (
    <div className="flex flex-col gap-6">
      <Fieldset.Root className="flex flex-col gap-4">
        <Fieldset.Legend>Item</Fieldset.Legend>
        <Grid maxColumns={2} gapX={6} gapY={4}>
          <Grid.Item colSpan={2}>
            <Field.Root name="item">
              <Field.Label required>Item</Field.Label>
              <Field.Control required defaultValue="Cotton twill, navy, 150cm" />
            </Field.Root>
          </Grid.Item>
          <Field.Root name="quantity">
            <Field.Label required>Quantity</Field.Label>
            <Field.Control type="number" required min={1} defaultValue="120" />
          </Field.Root>
          <Field.Root name="unitPrice">
            <Field.Label required>Unit price</Field.Label>
            <Field.Control type="number" required min={0} step="0.01" defaultValue="840" />
          </Field.Root>
          <Field.Root name="currency">
            <Field.Label>Currency</Field.Label>
            <Select items={CURRENCIES} defaultValue="JPY" />
          </Field.Root>
        </Grid>
      </Fieldset.Root>

      <Fieldset.Root className="flex flex-col gap-4 border-t border-border pt-6">
        <Fieldset.Legend>Delivery</Fieldset.Legend>
        <Grid maxColumns={2} gapX={6} gapY={4}>
          <Field.Root name="deliveryDate">
            <Field.Label>Delivery date</Field.Label>
            <DatePicker />
          </Field.Root>
          {/*
           * Object items would otherwise reach `onFormSubmit` as JSON.
           * `itemToStringValue` picks what is submitted; `mapItem` what is shown.
           */}
          <Field.Root name="warehouse">
            <Field.Label>Warehouse</Field.Label>
            <Combobox
              items={WAREHOUSES}
              mapItem={(w) => ({ label: w.name, key: String(w.id) })}
              itemToStringValue={(w) => String(w.id)}
              placeholder="Select warehouse"
            />
          </Field.Root>
          {/* Free text always takes the full row. */}
          <Grid.Item colSpan="full">
            <Field.Root name="notes">
              <Field.Label>Notes</Field.Label>
              <Textarea placeholder="Packing or delivery instructions" />
            </Field.Root>
          </Grid.Item>
        </Grid>
      </Fieldset.Root>
    </div>
  );
}

/** `size="lg"` (45rem): two columns, plain sections. */
export function ModalFormLarge() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={<Button variant="outline" />}>Edit order line</Dialog.Trigger>
      <Dialog.Content size="lg">
        <Dialog.Header>
          <Dialog.Title>Edit order line</Dialog.Title>
          <Dialog.Description>PO-2026-0187, line 3</Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
          <Form
            id="order-line-dialog-form"
            noValidate
            onFormSubmit={() => {
              window.alert("Saving line 3");
              setOpen(false);
            }}
          >
            <OrderLineFields />
          </Form>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
          <Button type="submit" form="order-line-dialog-form">
            Save line
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/** The same body in a sheet, for editing while the list or record stays in view. */
export function SheetForm() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet.Root open={open} onOpenChange={setOpen}>
      <Sheet.Trigger render={<Button variant="outline" />}>
        Edit order line in a sheet
      </Sheet.Trigger>
      <Sheet.Content size="lg">
        <Sheet.Header>
          <Sheet.Title>Edit order line</Sheet.Title>
          <Sheet.Description>PO-2026-0187, line 3</Sheet.Description>
        </Sheet.Header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <Form
            id="order-line-sheet-form"
            noValidate
            onFormSubmit={() => {
              window.alert("Saving line 3");
              setOpen(false);
            }}
          >
            <OrderLineFields />
          </Form>
        </div>
        <Sheet.Footer>
          <Sheet.Close render={<Button type="button" variant="outline" />}>Cancel</Sheet.Close>
          <Button type="submit" form="order-line-sheet-form">
            Save line
          </Button>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  );
}

// ─── Routed modal ──────────────────────────────────────────────────────────

type ProductDraft = { name: string };

// The form has its own URL but renders as a popup over the list: both
// `/products` and `/products/create` render this same component, so the list
// stays visible underneath. Local state stands in for the router here; in a
// real app `isCreateOpen` derives from the route and the handlers call
// `useNavigate()` to move between the two paths.
export function ModalFormRouted() {
  const [isCreateOpen, setCreateOpen] = useState(false);
  return (
    <Layout>
      <Layout.Header
        title="Products"
        actions={[
          <Button key="create" onClick={() => setCreateOpen(true)}>
            Create
          </Button>,
        ]}
      />
      <Layout.Column>{/* products list — see page/document-collection */}</Layout.Column>

      <Dialog.Root open={isCreateOpen} onOpenChange={setCreateOpen}>
        <Dialog.Content size="sm">
          <Dialog.Header>
            <Dialog.Title>Create product</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Form<ProductDraft>
              id="create-product-form"
              noValidate
              onFormSubmit={(values) => {
                window.alert(`Saving ${values.name}`);
                setCreateOpen(false);
              }}
            >
              <Grid maxColumns={2} gapX={6} gapY={4}>
                <Field.Root name="name">
                  <Field.Label required>Name</Field.Label>
                  <Field.Control required />
                  <Field.Error match="valueMissing">Name is required.</Field.Error>
                </Field.Root>
              </Grid>
            </Form>
          </Dialog.Body>
          <Dialog.Footer>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-product-form">
              Save
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </Layout>
  );
}

// ─── Second level: confirm ─────────────────────────────────────────────────

type ContactDraft = { email: string };

// A confirmation on top of the form modal. It is rendered inside the form
// dialog's content, so Escape and an outside press close only the confirm,
// and focus returns to the form when it closes.
export function ModalFormConfirm() {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const close = () => {
    setConfirmOpen(false);
    setDirty(false);
    setOpen(false);
  };

  const requestClose = () => (dirty ? setConfirmOpen(true) : close());

  return (
    // Escape, the close button and a press on the scrim all arrive as `onOpenChange(false)`.
    <Dialog.Root open={open} onOpenChange={(next) => (next ? setOpen(true) : requestClose())}>
      <Dialog.Trigger render={<Button variant="outline" />}>Add contact</Dialog.Trigger>
      <Dialog.Content size="sm">
        <Dialog.Header>
          <Dialog.Title>Add contact</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Form<ContactDraft>
            id="add-contact-form"
            noValidate
            onFormSubmit={(values) => {
              window.alert(`Saving ${values.email}`);
              close();
            }}
          >
            <Grid maxColumns={2} gapX={6} gapY={4} onInput={() => setDirty(true)}>
              <Field.Root name="email">
                <Field.Label required>Email</Field.Label>
                <Field.Control type="email" required />
                <Field.Error match="valueMissing">Email is required.</Field.Error>
              </Field.Root>
            </Grid>
          </Form>
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-contact-form">
            Save
          </Button>
        </Dialog.Footer>

        <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Dialog.Content size="sm">
            <Dialog.Header>
              <Dialog.Title>Discard changes?</Dialog.Title>
              <Dialog.Description>The contact you typed will be lost.</Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.Close render={<Button type="button" variant="outline" />}>
                Keep editing
              </Dialog.Close>
              <Button type="button" variant="destructive" onClick={close}>
                Discard
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "supplier", title: "Supplier", description: "Who the order is placed with." },
  { id: "delivery", title: "Delivery", description: "Where and when the goods arrive." },
  { id: "notes", title: "Notes", description: "Shown to the supplier on the order." },
] as const;

const anchorIdFor = (id: string) => `section-${id}`;

/**
 * A routed page: `Layout maxWidth="lg"` caps the width, Save and Cancel sit in
 * the header, and each section is a `Card` holding a `Fieldset` and a `Grid`.
 * One `Form` wraps every section.
 */
export function PageForm() {
  const onCancel = () => {};
  return (
    <Layout maxWidth="lg">
      <Layout.Header
        title="New purchase order"
        actions={[
          <Button key="cancel" variant="outline" onClick={onCancel}>
            Cancel
          </Button>,
          <Button key="save" type="submit" form="purchase-order-form">
            Create
          </Button>,
        ]}
      />
      <Layout.Column>
        <Form
          id="purchase-order-form"
          noValidate
          className="flex flex-col gap-4"
          onFormSubmit={(values) => window.alert(`Saving ${Object.keys(values).length} fields`)}
        >
          {/* Optional anchor nav: labels come from the same array as the section titles. */}
          <nav aria-label="Sections" className="flex gap-4">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${anchorIdFor(section.id)}`}
                className="text-body-md text-muted-foreground hover:text-foreground"
              >
                {section.title}
              </a>
            ))}
          </nav>

          {/* ✅ Reusable section: Card + Fieldset + Grid. */}
          <Card.Root id={anchorIdFor("supplier")}>
            <Card.Content>
              <Fieldset.Root className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <Fieldset.Legend>
                    <Text.h3 variant="heading-md">{SECTIONS[0].title}</Text.h3>
                  </Fieldset.Legend>
                  <Text.p className="text-muted-foreground">{SECTIONS[0].description}</Text.p>
                </div>
                <Grid maxColumns={2} gapX={6} gapY={4}>
                  <Field.Root name="supplier">
                    <Field.Label required>Supplier</Field.Label>
                    <Combobox
                      items={["Kansai Textile Co.", "Hokuriku Fibers", "Osaka Dye Works"]}
                      required
                      placeholder="Select supplier"
                    />
                    <Field.Error match="valueMissing">Supplier is required.</Field.Error>
                  </Field.Root>
                  <Field.Root name="buyer">
                    <Field.Label>Buyer</Field.Label>
                    <Select items={BUYERS} placeholder="Assign buyer" />
                  </Field.Root>
                  <Field.Root name="reference">
                    <Field.Label>Supplier reference</Field.Label>
                    <Field.Control />
                  </Field.Root>
                  <Field.Root name="currency">
                    <Field.Label>Currency</Field.Label>
                    <Select items={CURRENCIES} defaultValue="JPY" />
                  </Field.Root>
                </Grid>
              </Fieldset.Root>
            </Card.Content>
          </Card.Root>

          <Card.Root id={anchorIdFor("delivery")}>
            <Card.Content>
              <Fieldset.Root className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <Fieldset.Legend>
                    <Text.h3 variant="heading-md">{SECTIONS[1].title}</Text.h3>
                  </Fieldset.Legend>
                  <Text.p className="text-muted-foreground">{SECTIONS[1].description}</Text.p>
                </div>
                <Grid maxColumns={2} gapX={6} gapY={4}>
                  <Field.Root name="deliveryDate">
                    <Field.Label required>Delivery date</Field.Label>
                    <DatePicker isRequired />
                  </Field.Root>
                  <Field.Root name="warehouse">
                    <Field.Label>Warehouse</Field.Label>
                    <Combobox
                      items={WAREHOUSES}
                      mapItem={(w) => ({ label: w.name, key: String(w.id) })}
                      itemToStringValue={(w) => String(w.id)}
                      placeholder="Select warehouse"
                    />
                  </Field.Root>
                  {/* A street line is long: two columns. */}
                  <Grid.Item colSpan={2}>
                    <Field.Root name="street">
                      <Field.Label>Street</Field.Label>
                      <Field.Control />
                    </Field.Root>
                  </Grid.Item>
                </Grid>
              </Fieldset.Root>
            </Card.Content>
          </Card.Root>

          <Card.Root id={anchorIdFor("notes")}>
            <Card.Content>
              <Fieldset.Root className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <Fieldset.Legend>
                    <Text.h3 variant="heading-md">{SECTIONS[2].title}</Text.h3>
                  </Fieldset.Legend>
                  <Text.p className="text-muted-foreground">{SECTIONS[2].description}</Text.p>
                </div>
                <Grid maxColumns={2} gapX={6} gapY={4}>
                  <Grid.Item colSpan="full">
                    <Field.Root name="notes">
                      <Field.Label>Notes</Field.Label>
                      <Textarea />
                    </Field.Root>
                  </Grid.Item>
                </Grid>
              </Fieldset.Root>
            </Card.Content>
          </Card.Root>
        </Form>
      </Layout.Column>
    </Layout>
  );
}

// ─── Multi-step ────────────────────────────────────────────────────────────

const STEPS = ["Basic info", "Assignment", "Review"] as const;

type TaskDraft = { title: string; description: string; owner: string; startDate: string };

const INITIAL: TaskDraft = { title: "", description: "", owner: "", startDate: "" };

/**
 * Steps on a page. Each step is its own `Form`, keyed by the step so it
 * remounts; "Next" is a submit button, so `onFormSubmit` gates progress on
 * that step's validation. Values build up in `draft`, which every field reads
 * back through `defaultValue`, so Back loses nothing.
 */
export function StepsForm() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<TaskDraft>(INITIAL);
  const isLastStep = step === STEPS.length - 1;

  const handleStepSubmit = (values: Record<string, unknown>) => {
    const merged = { ...draft, ...(values as Partial<TaskDraft>) };
    setDraft(merged);
    if (isLastStep) {
      window.alert(`Creating ${merged.title}`);
      return;
    }
    setStep(step + 1);
  };

  return (
    <Layout maxWidth="lg">
      <Layout.Header title="Create task" />
      <Layout.Column>
        <Form key={step} noValidate className="flex flex-col gap-4" onFormSubmit={handleStepSubmit}>
          <Card.Root>
            <Card.Content>
              <Fieldset.Root className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  {/* Step indicator: the steps by name, then the current one as the legend. */}
                  <div className="flex flex-wrap items-center gap-2">
                    {STEPS.map((label, i) => (
                      <Badge
                        key={label}
                        variant={i === step ? "default" : i < step ? "success" : "neutral"}
                      >
                        {i + 1}. {label}
                      </Badge>
                    ))}
                  </div>
                  <Fieldset.Legend>
                    <Text.h3 variant="heading-md">{STEPS[step]}</Text.h3>
                  </Fieldset.Legend>
                  <Text.p className="text-muted-foreground">
                    Step {step + 1} of {STEPS.length}
                  </Text.p>
                </div>

                {step === 0 && (
                  <Grid maxColumns={2} gapX={6} gapY={4}>
                    <Field.Root name="title">
                      <Field.Label required>Title</Field.Label>
                      <Field.Control required defaultValue={draft.title} />
                      <Field.Error match="valueMissing">Title is required.</Field.Error>
                    </Field.Root>
                    <Grid.Item colSpan="full">
                      <Field.Root name="description">
                        <Field.Label>Description</Field.Label>
                        <Textarea defaultValue={draft.description} />
                      </Field.Root>
                    </Grid.Item>
                  </Grid>
                )}

                {step === 1 && (
                  <Grid maxColumns={2} gapX={6} gapY={4}>
                    <Field.Root name="owner">
                      <Field.Label>Owner</Field.Label>
                      <Select
                        items={BUYERS}
                        defaultValue={draft.owner || null}
                        placeholder="Assign owner"
                      />
                    </Field.Root>
                    <Field.Root name="startDate">
                      <Field.Label required>Start date</Field.Label>
                      <Field.Control type="date" required defaultValue={draft.startDate} />
                      <Field.Error match="valueMissing">Start date is required.</Field.Error>
                    </Field.Root>
                  </Grid>
                )}

                {step === 2 && (
                  <dl className="grid grid-cols-2 gap-2 text-body-md">
                    <dt className="text-muted-foreground">Title</dt>
                    <dd>{draft.title}</dd>
                    <dt className="text-muted-foreground">Owner</dt>
                    <dd>{draft.owner || "—"}</dd>
                    <dt className="text-muted-foreground">Start date</dt>
                    <dd>{draft.startDate || "—"}</dd>
                  </dl>
                )}
              </Fieldset.Root>
            </Card.Content>
          </Card.Root>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
            <Button type="submit">{isLastStep ? "Create" : "Next"}</Button>
          </div>
        </Form>
      </Layout.Column>
    </Layout>
  );
}
