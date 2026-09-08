/* pattern: form/wizard */
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Field,
  Fieldset,
  Form,
  Layout,
  Select,
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

type Props = {
  onComplete: (draft: Draft) => void;
  onCancel: () => void;
};

export default function WizardForm({ onComplete, onCancel }: Props) {
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
        <Card.Root>
          <Card.Content>
            <div className="flex items-center gap-2">
              {STEPS.map((label, i) => (
                <Badge
                  key={label}
                  variant={i === step ? "default" : i < step ? "success" : "neutral"}
                >
                  {i + 1}. {label}
                </Badge>
              ))}
            </div>
          </Card.Content>
        </Card.Root>

        <Form key={step} noValidate onFormSubmit={handleStepSubmit}>
          <Card.Root>
            <Card.Header title={STEPS[step]} />
            <Card.Content>
              {step === 0 && (
                <Fieldset.Root className="space-y-4">
                  <Field.Root name="title">
                    <Field.Label>Title</Field.Label>
                    <Field.Control required defaultValue={draft.title} />
                    <Field.Error match="valueMissing">Title is required.</Field.Error>
                  </Field.Root>
                  <Field.Root name="description">
                    <Field.Label>Description</Field.Label>
                    <Field.Control defaultValue={draft.description} />
                  </Field.Root>
                </Fieldset.Root>
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
                <Fieldset.Root className="grid gap-4 md:grid-cols-2">
                  <Field.Root name="startDate">
                    <Field.Label>Start date</Field.Label>
                    <Field.Control type="date" required defaultValue={draft.startDate} />
                    <Field.Error match="valueMissing">Start date is required.</Field.Error>
                  </Field.Root>
                  <Field.Root name="estimate">
                    <Field.Label>Estimate (hours)</Field.Label>
                    <Field.Control type="number" min={0} defaultValue={draft.estimate} />
                  </Field.Root>
                </Fieldset.Root>
              )}

              {step === 3 && (
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Title</dt>
                  <dd>{draft.title}</dd>
                  <dt className="text-muted-foreground">Owner</dt>
                  <dd>{draft.owner || "—"}</dd>
                  <dt className="text-muted-foreground">Start date</dt>
                  <dd>{draft.startDate || "—"}</dd>
                  <dt className="text-muted-foreground">Estimate</dt>
                  <dd>{draft.estimate ? `${draft.estimate}h` : "—"}</dd>
                </dl>
              )}
            </Card.Content>
          </Card.Root>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}
            >
              {step === 0 ? "Cancel" : "Back"}
            </Button>
            <Button type="submit">{isLastStep ? "Create" : "Next"}</Button>
          </div>
        </Form>
      </Layout.Column>
    </Layout>
  );
}
