import * as React from "react";
import {
  Button,
  Combobox,
  Dialog,
  Field,
  Form,
  FormLayout,
  Layout,
  Select,
  Stepper,
  Textarea,
  useNavigate,
  type StepperStep,
} from "@tailor-platform/app-shell";
import { BUYERS, CURRENCIES, INCOTERMS, SUPPLIERS, WAREHOUSES } from "./fields";

// 🔽 T5 — Wizard. Ordered steps where each one is checked before the next.
//
// Each step is its own `Form`, keyed by the step so it remounts cleanly, and
// "Next" is a submit button: `onFormSubmit` fires only once the step's fields
// pass validation. Values collect in a `draft` above the forms, and every
// field reads its starting value from it, so Back loses nothing.

const BACK = "/showcase/form-templates";

// 🧪 Dummy Data: Replace with real data later
const STEPS = [
  { id: "supplier", title: "Supplier", description: "Who you're buying from" },
  { id: "delivery", title: "Delivery", description: "Where the goods arrive" },
  { id: "approval", title: "Approval", description: "Who signs it off" },
  { id: "review", title: "Review", description: "Check and create" },
];

type Draft = Partial<{
  supplier: string;
  supplierReference: string;
  currency: string;
  shipTo: string;
  incoterms: string;
  deliveryInstructions: string;
  buyer: string;
  costCenter: string;
  approvalNote: string;
}>;

// 🧪 Dummy Data: Replace with real data later
const INITIAL_DRAFT: Draft = { currency: "USD", buyer: "Hanna Suzuki" };

// ✅ Reusable Component: Can be moved to components/ui/ (a wizard state hook)
function useWizard(onComplete: (draft: Draft) => void) {
  const [step, setStep] = React.useState(0);
  const [draft, setDraft] = React.useState<Draft>(INITIAL_DRAFT);
  const isLast = step === STEPS.length - 1;

  const submitStep = (values: Record<string, unknown>) => {
    const merged = { ...draft, ...(values as Draft) };
    setDraft(merged);
    if (isLast) onComplete(merged);
    else setStep(step + 1);
  };

  // The Stepper only displays progress; the page decides each step's status.
  const steps: StepperStep[] = STEPS.map((s, i) => ({
    id: s.id,
    label: s.title,
    status: i < step ? "complete" : i === step ? "current" : "upcoming",
  }));

  return {
    step,
    draft,
    isLast,
    steps,
    submitStep,
    back: () => setStep((s) => Math.max(0, s - 1)),
    goTo: (id: string) => setStep(STEPS.findIndex((s) => s.id === id)),
    reset: () => {
      setStep(0);
      setDraft(INITIAL_DRAFT);
    },
  };
}

// 🔽 The fields of one step. Every field starts from the draft.
function StepFields({ step, draft }: { step: number; draft: Draft }) {
  switch (STEPS[step].id) {
    case "supplier":
      return (
        <>
          <Field.Root name="supplier">
            <Field.Label required>Supplier</Field.Label>
            <Combobox
              items={SUPPLIERS}
              defaultValue={draft.supplier ?? null}
              placeholder="Search suppliers"
              required
            />
            <Field.Error match="valueMissing">Choose a supplier.</Field.Error>
          </Field.Root>
          <Field.Root name="supplierReference">
            <Field.Label>Supplier reference</Field.Label>
            <Field.Control defaultValue={draft.supplierReference} placeholder="e.g. SO-88213" />
          </Field.Root>
          <Field.Root name="currency">
            <Field.Label required>Currency</Field.Label>
            <Select items={CURRENCIES} defaultValue={draft.currency ?? null} required />
          </Field.Root>
        </>
      );
    case "delivery":
      return (
        <>
          <Field.Root name="shipTo">
            <Field.Label required>Ship to</Field.Label>
            <Select
              items={WAREHOUSES}
              defaultValue={draft.shipTo ?? null}
              placeholder="Select warehouse"
              required
            />
            <Field.Error match="valueMissing">Choose a warehouse.</Field.Error>
          </Field.Root>
          <Field.Root name="incoterms">
            <Field.Label>Incoterms</Field.Label>
            <Select
              items={INCOTERMS}
              defaultValue={draft.incoterms ?? null}
              placeholder="Select incoterms"
            />
          </Field.Root>
          <Field.Root name="deliveryInstructions">
            <Field.Label>Delivery instructions</Field.Label>
            <Textarea
              rows={3}
              defaultValue={draft.deliveryInstructions}
              placeholder="Dock hours, contact on arrival, pallet limits…"
            />
          </Field.Root>
        </>
      );
    case "approval":
      return (
        <>
          <Field.Root name="buyer">
            <Field.Label required>Buyer</Field.Label>
            <Combobox items={BUYERS} defaultValue={draft.buyer ?? null} required />
          </Field.Root>
          <Field.Root name="costCenter">
            <Field.Label>Cost center</Field.Label>
            <Field.Control defaultValue={draft.costCenter} placeholder="CC-4100" />
          </Field.Root>
          <Field.Root name="approvalNote">
            <Field.Label>Note to the approver</Field.Label>
            <Textarea rows={3} defaultValue={draft.approvalNote} />
          </Field.Root>
        </>
      );
    default:
      return <ReviewValues draft={draft} />;
  }
}

// 🔽 Review step — read-only values in the same grid, so they line up as the form did
function ReviewValues({ draft }: { draft: Draft }) {
  const rows: [string, string | undefined][] = [
    ["Supplier", draft.supplier],
    ["Supplier reference", draft.supplierReference],
    ["Currency", draft.currency],
    ["Ship to", draft.shipTo],
    ["Incoterms", draft.incoterms],
    ["Buyer", draft.buyer],
    ["Cost center", draft.costCenter],
  ];
  return (
    <>
      {rows.map(([label, value]) => (
        <Field.Root key={label}>
          <Field.Label className="text-muted-foreground">{label}</Field.Label>
          <Field.Value>{value || "—"}</Field.Value>
        </Field.Root>
      ))}
    </>
  );
}

// 🔽 T5a — Wizard in a dialog: the Stepper sits under the title, Back on the left
export function WizardDialog({ trigger }: { trigger: React.ReactElement }) {
  const [open, setOpen] = React.useState(false);
  const formId = React.useId();
  const wizard = useWizard(() => setOpen(false));

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) wizard.reset();
      }}
    >
      <Dialog.Trigger render={trigger} />
      <Dialog.Content size="lg">
        <Dialog.Header>
          <Dialog.Title>New purchase order</Dialog.Title>
        </Dialog.Header>
        <Stepper aria-label="Steps" steps={wizard.steps} onStepClick={wizard.goTo} />
        <Dialog.Body>
          <Form key={wizard.step} id={formId} onFormSubmit={wizard.submitStep}>
            <FormLayout columns={2}>
              <StepFields step={wizard.step} draft={wizard.draft} />
            </FormLayout>
          </Form>
        </Dialog.Body>
        <Dialog.Footer>
          {wizard.step > 0 && (
            <Button type="button" variant="outline" className="mr-auto" onClick={wizard.back}>
              Back
            </Button>
          )}
          <Dialog.Close render={<Button variant="ghost" />}>Cancel</Dialog.Close>
          <Button type="submit" form={formId}>
            {wizard.isLast ? "Create" : "Next"}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// 🔽 T5b — Wizard on a page: a vertical Stepper beside the form on wide
// screens, a horizontal one above it on narrow screens.
export function WizardPage() {
  const navigate = useNavigate();
  const wizard = useWizard(() => navigate(BACK));
  const current = STEPS[wizard.step];

  const verticalSteps: StepperStep[] = wizard.steps.map((s, i) => ({
    ...s,
    description: STEPS[i].description,
  }));

  return (
    <Layout maxWidth="xl">
      <Layout.Header
        title="New purchase order"
        actions={[
          <Button key="cancel" variant="outline" onClick={() => navigate(BACK)}>
            Cancel
          </Button>,
        ]}
      />
      <Layout.Column area="left" className="lg:sticky lg:top-4 lg:self-start">
        <div className="hidden lg:block">
          <Stepper
            aria-label="Steps"
            orientation="vertical"
            steps={verticalSteps}
            onStepClick={wizard.goTo}
          />
        </div>
      </Layout.Column>
      <Layout.Column area="main">
        <div className="flex flex-col gap-6">
          <div className="lg:hidden">
            <Stepper aria-label="Steps" steps={wizard.steps} onStepClick={wizard.goTo} />
          </div>
          <Form key={wizard.step} onFormSubmit={wizard.submitStep}>
            <FormLayout columns={2}>
              <FormLayout.Section title={current.title} description={current.description}>
                <StepFields step={wizard.step} draft={wizard.draft} />
              </FormLayout.Section>
              <FormLayout.Actions>
                {wizard.step > 0 && (
                  <Button type="button" variant="outline" onClick={wizard.back}>
                    Back
                  </Button>
                )}
                <Button type="submit">{wizard.isLast ? "Create" : "Next"}</Button>
              </FormLayout.Actions>
            </FormLayout>
          </Form>
        </div>
      </Layout.Column>
    </Layout>
  );
}
