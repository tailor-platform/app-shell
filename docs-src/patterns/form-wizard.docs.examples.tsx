import { useState } from "react";
import {
  Button,
  Field,
  Form,
  FormLayout,
  Layout,
  Select,
  Stepper,
} from "@tailor-platform/app-shell";

const OWNERS = ["Tanaka", "Sato", "Suzuki", "Yamada"];
const STEPS = ["Basic info", "Assignment", "Schedule", "Review"] as const;

type Draft = {
  title: string;
  description: string;
  owner: string;
  startDate: string;
  estimate: string;
};

const INITIAL: Draft = {
  title: "",
  description: "",
  owner: "",
  startDate: "",
  estimate: "",
};

export function FormWizard() {
  const onComplete = (finalDraft: Draft) => window.alert(`Creating ${finalDraft.title}`);
  const onCancel = () => {};

  const [step, setStep] = useState(0);
  // Accumulated values. Each step's Form unmounts on navigation, so the draft
  // is what makes Back non-destructive — fields re-read it via `defaultValue`.
  const [draft, setDraft] = useState<Draft>(INITIAL);

  const isLastStep = step === STEPS.length - 1;

  /**
   * Each step is its own `Form`, and "Next" is a `type="submit"` button.
   * `onFormSubmit` fires only after that step's fields pass validation, so
   * progression is gated natively — no manual per-step validity check, and
   * no deferring every error to the final submit.
   */
  const handleStepSubmit = (values: Record<string, unknown>) => {
    const merged = { ...draft, ...(values as Partial<Draft>) };
    setDraft(merged);
    if (isLastStep) {
      onComplete(merged);
      return;
    }
    setStep(step + 1);
  };

  return (
    <Layout>
      <Layout.Header title="Create task" />
      <Layout.Column>
        {/* The Stepper only displays progress: each status comes from `step`.
            Completed steps are clickable, so the user can go back to one. */}
        <Stepper
          aria-label="Create task"
          steps={STEPS.map((label, i) => ({
            id: String(i),
            label,
            status: i < step ? "complete" : i === step ? "current" : "upcoming",
          }))}
          onStepClick={(id) => setStep(Number(id))}
        />

        <Form key={step} noValidate onFormSubmit={handleStepSubmit}>
          <FormLayout columns={2}>
            <FormLayout.Section title={STEPS[step]}>
              {step === 0 && (
                <>
                  <Field.Root name="title">
                    <Field.Label>Title</Field.Label>
                    <Field.Control required defaultValue={draft.title} />
                    <Field.Error match="valueMissing">Title is required.</Field.Error>
                  </Field.Root>
                  <Field.Root name="description">
                    <Field.Label>Description</Field.Label>
                    <Field.Control defaultValue={draft.description} />
                  </Field.Root>
                </>
              )}

              {step === 1 && (
                <Field.Root name="owner">
                  <Field.Label>Owner</Field.Label>
                  {/* Uncontrolled like every other field — `defaultValue`
                      restores the prior choice when the user steps Back. */}
                  <Select
                    items={OWNERS}
                    defaultValue={draft.owner || null}
                    placeholder="Assign owner"
                  />
                </Field.Root>
              )}

              {step === 2 && (
                <>
                  <Field.Root name="startDate">
                    <Field.Label>Start date</Field.Label>
                    <Field.Control type="date" required defaultValue={draft.startDate} />
                    <Field.Error match="valueMissing">Start date is required.</Field.Error>
                  </Field.Root>
                  <Field.Root name="estimate">
                    <Field.Label>Estimate (hours)</Field.Label>
                    <Field.Control type="number" min={0} defaultValue={draft.estimate} />
                  </Field.Root>
                </>
              )}

              {step === 3 &&
                (
                  [
                    ["Title", draft.title],
                    ["Owner", draft.owner],
                    ["Start date", draft.startDate],
                    ["Estimate", draft.estimate ? `${draft.estimate}h` : ""],
                  ] as const
                ).map(([label, value]) => (
                  // Review values sit in the same grid, at an input's height
                  <Field.Root key={label}>
                    <Field.Label>{label}</Field.Label>
                    <Field.Value>{value || "—"}</Field.Value>
                  </Field.Root>
                ))}
            </FormLayout.Section>

            <FormLayout.Actions>
              <Button
                type="button"
                variant="outline"
                onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}
              >
                {step === 0 ? "Cancel" : "Back"}
              </Button>
              <Button type="submit">{isLastStep ? "Create" : "Next"}</Button>
            </FormLayout.Actions>
          </FormLayout>
        </Form>
      </Layout.Column>
    </Layout>
  );
}
